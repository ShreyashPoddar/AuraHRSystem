import { NextResponse } from 'next/server';
import { MOODLE_EVENT_TO_STAGE, isValidStage } from '@/lib/pipeline';
import {
  notifyKekaAssessmentStarted,
  notifyKekaAssessmentSubmitted,
  notifyKekaAssessmentGraded,
} from '@/lib/keka';
import { moodleCall } from '@/lib/moodle';

/**
 * POST /api/moodle-events
 *
 * Internal webhook receiver for Moodle assessment lifecycle events.
 * Moodle → AuraHR (this route) → Stage transition + Keka sync.
 *
 * Expected body:
 * {
 *   event:         'quiz_started' | 'quiz_submitted' | 'quiz_passed' | 'quiz_failed'
 *   applicationId: number   (Moodle application / candidate ID)
 *   assessmentId?: number
 *   score?:        number   (0–100, for submitted/graded events)
 *   passThreshold?: number  (required for graded events)
 * }
 *
 * Security: In production, validate an HMAC signature from Moodle.
 * TODO: Add HMAC verification header check before going to production.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      event: string;
      applicationId: number;
      assessmentId?: number;
      score?: number;
      passThreshold?: number;
    };

    const { event, applicationId, assessmentId, score, passThreshold } = body;

    if (!event || !applicationId) {
      return NextResponse.json({ error: 'event and applicationId are required' }, { status: 400 });
    }

    // Resolve the stage from the event type
    const newStage = MOODLE_EVENT_TO_STAGE[event];
    if (!newStage) {
      return NextResponse.json({ error: `Unknown Moodle event: ${event}` }, { status: 400 });
    }

    // ── Update the application stage in Moodle ────────────────────
    // Map PipelineStage back to Moodle's lowercase internal stages.
    // Moodle's local_aurahr_jobs_update_stage uses its own stage names.
    const moodleStageMap: Record<string, string> = {
      'Assessment In Progress': 'academia',
      'Assessment Completed':   'academia',
      'Assessment Cleared':     'interview',
      'Rejected':               'rejected',
    };
    const moodleStage = moodleStageMap[newStage];

    if (moodleStage) {
      try {
        await moodleCall<unknown>('local_aurahr_jobs_update_stage', {
          applicationid: applicationId,
          stage: moodleStage,
        });
      } catch (moodleErr) {
        // Non-fatal — log and continue so Keka sync still fires
        console.error('[Moodle Event] Failed to update Moodle stage:', moodleErr);
      }
    }

    // ── Keka Sync (Injection Points) ─────────────────────────────
    const candidateId = String(applicationId);

    switch (event) {
      case 'quiz_started':
        await notifyKekaAssessmentStarted(candidateId, assessmentId ?? 0);
        break;

      case 'quiz_submitted':
        await notifyKekaAssessmentSubmitted(candidateId, assessmentId ?? 0, score ?? 0);
        break;

      case 'quiz_passed':
        await notifyKekaAssessmentGraded(candidateId, true, score ?? 0, passThreshold ?? 60);
        break;

      case 'quiz_failed':
        await notifyKekaAssessmentGraded(candidateId, false, score ?? 0, passThreshold ?? 60);
        break;

      default:
        break;
    }
    // ─────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      event,
      newStage,
      applicationId,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[Moodle Event Handler Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
