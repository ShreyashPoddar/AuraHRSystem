import { NextResponse } from 'next/server';
import { evaluateAIScreeningResult } from '@/lib/pipeline';
import { notifyKekaAIScreeningResult } from '@/lib/keka';
import { moodleCall } from '@/lib/moodle';

/**
 * POST /api/ai-screening
 *
 * Triggers the AI Evaluation Gate for a candidate.
 * Called immediately after a candidate is imported (or on demand by admin).
 *
 * Flow:
 *   1. Candidate is `Imported`
 *   2. This route updates stage to `Under AI Screening`
 *   3. Calls local_aurahr_jobs_update_stage on Moodle
 *   4. Once the JD score is available, evaluates the threshold
 *   5. Transitions to `Shortlisted` / `On Hold` / `Rejected`
 *   6. Calls Keka injection point
 *
 * Body:
 * {
 *   applicationId: number   (Moodle application ID)
 *   jdScore: number         (0–100 JD match score from AI parser)
 *   threshold?: number      (default: 70)
 *   marginPct?: number      (default: 10 — score within margin goes On Hold)
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      applicationId: number;
      jdScore: number;
      threshold?: number;
      marginPct?: number;
    };

    const { applicationId, jdScore, threshold = 70, marginPct = 10 } = body;

    if (!applicationId || jdScore === undefined) {
      return NextResponse.json(
        { error: 'applicationId and jdScore are required' },
        { status: 400 },
      );
    }

    // ── Step 1: Mark as Under AI Screening ────────────────────────
    try {
      await moodleCall<unknown>('local_aurahr_jobs_update_stage', {
        applicationid: applicationId,
        stage: 'screened', // closest Moodle mapping while AI runs
      });
    } catch (err) {
      console.error('[AI Screening] Could not update Moodle to screening stage:', err);
    }

    // ── Step 2: Evaluate score against threshold ──────────────────
    const resultStage = evaluateAIScreeningResult(jdScore, threshold, marginPct);

    // ── Step 3: Update Moodle to final stage ─────────────────────
    const moodleStageMap: Record<string, string> = {
      Shortlisted: 'screened',
      'On Hold':   'applied',  // stays in applied bucket with a note
      Rejected:    'rejected',
    };
    const moodleTarget = moodleStageMap[resultStage] ?? 'screened';

    try {
      await moodleCall<unknown>('local_aurahr_jobs_update_stage', {
        applicationid: applicationId,
        stage: moodleTarget,
      });
    } catch (err) {
      console.error('[AI Screening] Could not update Moodle to result stage:', err);
    }

    // ── Step 4: Keka Sync (Injection Point) ──────────────────────
    await notifyKekaAIScreeningResult(
      String(applicationId),
      resultStage as 'Shortlisted' | 'On Hold' | 'Rejected',
      jdScore,
      threshold,
    ).catch((err) => console.error('[Keka] notifyKekaAIScreeningResult failed:', err));
    // ─────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      applicationId,
      jdScore,
      threshold,
      resultStage,
      moodleStage: moodleTarget,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[AI Screening Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
