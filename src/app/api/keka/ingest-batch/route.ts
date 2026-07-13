/**
 * /api/keka/ingest-batch — Batch candidate ingestion route.
 *
 * Accepts up to INGEST_BATCH_MAX candidates in one request and processes them
 * via a concurrency-controlled pool (INGEST_CONCURRENCY workers at a time).
 * Each candidate is isolated: one failure does not cancel the rest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationSession } from '@/lib/auth-server';
import {
  ingestCandidate,
  INGEST_CONCURRENCY,
  INGEST_BATCH_MAX,
  type IngestCandidateInput,
  type IngestCandidateResult,
} from '@/lib/ingest-candidate';

// ── Concurrency pool ───────────────────────────────────────────────────────────

interface PoolEntry {
  input:  IngestCandidateInput;
  index:  number;
}

interface PoolResult {
  index:  number;
  input:  IngestCandidateInput;
  result: IngestCandidateResult | { status: 'error'; error: string };
}

/**
 * Runs `tasks` through a concurrency pool of `limit` simultaneous workers.
 * Each task is wrapped in its own try/catch so one failure cannot block others.
 */
async function runConcurrentPool(
  tasks:  PoolEntry[],
  limit:  number
): Promise<PoolResult[]> {
  const results: PoolResult[] = new Array(tasks.length);
  let   nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      // Claim the next task atomically within the synchronous tick.
      const taskIndex = nextIndex++;
      const task      = tasks[taskIndex];

      try {
        const result = await ingestCandidate(task.input);
        results[taskIndex] = { index: task.index, input: task.input, result };
      } catch (err: unknown) {
        // Isolate catastrophic failures — should never reach here given
        // ingestCandidate's internal try/catch, but defend anyway.
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Batch] Unexpected worker error at index ${task.index}:`, message);
        results[taskIndex] = {
          index:  task.index,
          input:  task.input,
          result: { status: 'error', error: message },
        };
      }
    }
  }

  // Spawn exactly `limit` workers. Each drains the shared queue until empty.
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth guard ────────────────────────────────────────────────────────────────
  const session = await requireOrganizationSession(request);
  if (session instanceof NextResponse) return session;

  // ── Parse body ────────────────────────────────────────────────────────────────
  let raw: { jobId?: unknown; candidates?: unknown };
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  // ── Validate candidates array ─────────────────────────────────────────────────
  if (!Array.isArray(raw.candidates) || raw.candidates.length === 0) {
    return NextResponse.json(
      { success: false, error: 'candidates must be a non-empty array' },
      { status: 400 }
    );
  }
  if (raw.candidates.length > INGEST_BATCH_MAX) {
    return NextResponse.json(
      { success: false, error: `Batch exceeds maximum of ${INGEST_BATCH_MAX} candidates` },
      { status: 400 }
    );
  }

  // Resolve optional top-level jobId — applied to all candidates if present.
  const batchJobId: number | undefined =
    typeof raw.jobId === 'number' && Number.isInteger(raw.jobId) && raw.jobId > 0
      ? raw.jobId
      : undefined;

  // ── Build task list ────────────────────────────────────────────────────────────
  const tasks: PoolEntry[] = (raw.candidates as Array<Record<string, unknown>>).map(
    (c, i) => ({
      index: i,
      input: {
        // Coerce kekaUuid — null is valid (pipeline returns invalid_input for it)
        kekaUuid: typeof c.kekaUuid === 'string' && c.kekaUuid.trim() !== ''
          ? c.kekaUuid.trim()
          : null,
        name:    c.name    as string,
        email:   c.email   as string,
        jdScore: c.jdScore as number,
        // Per-candidate jobId wins over the batch-level jobId.
        jobId:   (typeof c.jobId === 'number' && Number.isInteger(c.jobId) && c.jobId > 0)
          ? (c.jobId as number)
          : batchJobId,
      } satisfies IngestCandidateInput,
    })
  );

  const startedAt = Date.now();

  // ── Run pool ───────────────────────────────────────────────────────────────────
  const poolResults = await runConcurrentPool(tasks, INGEST_CONCURRENCY);

  // ── Build summary ──────────────────────────────────────────────────────────────
  const summary = {
    total:          poolResults.length,
    created:        poolResults.filter(r => r.result.status === 'created').length,
    already_exists: poolResults.filter(r => r.result.status === 'already_exists').length,
    invalid_input:  poolResults.filter(r => r.result.status === 'invalid_input').length,
    moodle_failed:  poolResults.filter(r => r.result.status === 'moodle_failed').length,
    partial_failure:poolResults.filter(r => r.result.status === 'partial_failure').length,
    error:          poolResults.filter(r => r.result.status === 'error').length,
    durationMs:     Date.now() - startedAt,
  };

  console.log(
    `[Batch Ingest] Completed ${summary.total} candidates in ${summary.durationMs}ms — ` +
    `created=${summary.created} exists=${summary.already_exists} ` +
    `invalid=${summary.invalid_input} failed=${summary.moodle_failed + summary.partial_failure + summary.error}`
  );

  return NextResponse.json(
    {
      success: true,
      summary,
      results: poolResults.map(r => ({
        index:  r.index,
        email:  r.input.email,
        ...r.result,
      })),
    },
    { status: 200 }
  );
}
