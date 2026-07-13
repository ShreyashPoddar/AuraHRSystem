/**
 * /api/keka/ingest — Single-candidate ingestion route.
 *
 * HTTP concerns only: auth, JSON parsing, input coercion, status mapping.
 * All business logic lives in src/lib/ingest-candidate.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationSession } from '@/lib/auth-server';
import { ingestCandidate, type IngestCandidateInput } from '@/lib/ingest-candidate';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth guard ────────────────────────────────────────────────────────────────
  const session = await requireOrganizationSession(request);
  if (session instanceof NextResponse) return session;

  // ── Parse body ────────────────────────────────────────────────────────────────
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Coerce kekaUuid to string | null — never fabricate a cuid fallback.
  const kekaUuid = typeof raw.kekaUuid === 'string' && raw.kekaUuid.trim() !== ''
    ? raw.kekaUuid.trim()
    : null;

  const input: IngestCandidateInput = {
    kekaUuid,
    name:    raw.name    as string,
    email:   raw.email   as string,
    jdScore: raw.jdScore as number,
    jobId:   raw.jobId   as number | undefined,
  };

  // ── Run pipeline and map result to HTTP status ────────────────────────────────
  const result = await ingestCandidate(input);

  switch (result.status) {
    case 'created':
      return NextResponse.json({ success: true, ...result }, { status: 201 });
    case 'already_exists':
      return NextResponse.json({ success: true, ...result }, { status: 200 });
    case 'invalid_input':
      return NextResponse.json({ success: false, ...result }, { status: 400 });
    case 'moodle_failed':
      return NextResponse.json({ success: false, ...result, stage: 'moodle_create' }, { status: 502 });
    case 'partial_failure':
      return NextResponse.json({ success: false, ...result, stage: 'prisma_create' }, { status: 207 });
  }
}
