/**
 * Keka HR Integration — Webhook Placeholder Service
 *
 * This file contains empty placeholder functions that mark the exact
 * injection points where Keka API calls will be made in the future.
 *
 * INTEGRATION GUIDE (for the Keka team):
 * 1. Set KEKA_API_URL and KEKA_API_KEY in .env.local
 * 2. Implement each function below using the Keka Recruit API.
 *    API docs: https://developers.keka.com/reference/recruit
 * 3. Each function corresponds to one pipeline state transition.
 *
 * DO NOT remove these stubs — they are the documented injection points.
 */

import type { PipelineStage } from '@/lib/pipeline';

// ── Environment Config ────────────────────────────────────────────

const KEKA_API_URL = process.env.KEKA_API_URL ?? '';
const KEKA_API_KEY = process.env.KEKA_API_KEY ?? '';

// ── Core Sync Function ────────────────────────────────────────────

/**
 * [KEKA INJECTION POINT — PRIMARY]
 *
 * Synchronises a candidate's pipeline stage with Keka HR.
 * Called every time a candidate transitions between stages.
 *
 * @param candidateId   - AuraHR internal candidate / application ID
 * @param newStage      - The target PipelineStage the candidate is moving to
 * @param reason        - Optional freetext reason (used for Rejected / On Hold)
 * @param metadata      - Optional extra payload (scores, timestamps, etc.)
 *
 * TODO: Implement using Keka Recruit API:
 *   PATCH /v1/recruit/candidates/{id}/stage
 *   Body: { stage: kekaStageId, note: reason }
 */
export async function syncKekaStage(
  candidateId: string | number,
  newStage: PipelineStage,
  reason?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  // ── PLACEHOLDER — BEGIN IMPLEMENTATION HERE ──────────────────
  //
  // Example implementation:
  //
  // if (!KEKA_API_URL || !KEKA_API_KEY) {
  //   console.warn('[Keka] API not configured — skipping sync');
  //   return;
  // }
  //
  // const kekaStageId = mapAuraStageToKeka(newStage);
  //
  // await fetch(`${KEKA_API_URL}/v1/recruit/candidates/${candidateId}/stage`, {
  //   method: 'PATCH',
  //   headers: {
  //     'Authorization': `Bearer ${KEKA_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     stage: kekaStageId,
  //     note: reason,
  //     metadata,
  //   }),
  // });
  //
  // ── END PLACEHOLDER ──────────────────────────────────────────

  console.log(
    `[Keka STUB] syncKekaStage — candidateId=${candidateId}, stage="${newStage}"${reason ? `, reason="${reason}"` : ''}`,
  );
}

// ── Specific Event Placeholders ───────────────────────────────────

/**
 * [KEKA INJECTION POINT — AI SCREENING]
 *
 * Called when the AI JD Parser produces a score and the candidate is
 * automatically classified as Shortlisted, On Hold, or Rejected.
 *
 * @param candidateId - AuraHR candidate ID
 * @param stage       - 'Shortlisted' | 'On Hold' | 'Rejected'
 * @param jdScore     - The raw JD match score (0–100)
 * @param threshold   - The configured passing threshold
 */
export async function notifyKekaAIScreeningResult(
  candidateId: string | number,
  stage: 'Shortlisted' | 'On Hold' | 'Rejected',
  jdScore: number,
  threshold: number,
): Promise<void> {
  // TODO: Post a comment/activity to the Keka candidate timeline.
  await syncKekaStage(candidateId, stage, `AI Screening score: ${jdScore} (threshold: ${threshold})`);
}

/**
 * [KEKA INJECTION POINT — ASSESSMENT STARTED]
 *
 * Called when Moodle fires a `quiz_started` event for a candidate.
 * Updates Keka that the candidate has begun the technical assessment.
 *
 * @param candidateId - AuraHR candidate ID
 * @param assessmentId - Moodle assessment ID
 */
export async function notifyKekaAssessmentStarted(
  candidateId: string | number,
  assessmentId: string | number,
): Promise<void> {
  // TODO: Create a Keka activity: "Candidate started technical assessment #{assessmentId}"
  await syncKekaStage(candidateId, 'Assessment In Progress', `Started assessment ${assessmentId}`);
}

/**
 * [KEKA INJECTION POINT — ASSESSMENT SUBMITTED]
 *
 * Called when Moodle fires a `quiz_submitted` event.
 *
 * @param candidateId  - AuraHR candidate ID
 * @param assessmentId - Moodle assessment ID
 * @param score        - Candidate's assessment score (0–100)
 */
export async function notifyKekaAssessmentSubmitted(
  candidateId: string | number,
  assessmentId: string | number,
  score: number,
): Promise<void> {
  // TODO: Create a Keka activity with the submission score.
  await syncKekaStage(
    candidateId,
    'Assessment Completed',
    `Assessment ${assessmentId} submitted with score ${score}`,
  );
}

/**
 * [KEKA INJECTION POINT — ASSESSMENT GRADED]
 *
 * Called after the backend evaluates the submission. Transitions to
 * `Assessment Cleared` (passed) or `Rejected` (failed).
 *
 * @param candidateId  - AuraHR candidate ID
 * @param passed       - Whether the candidate met the pass threshold
 * @param score        - Final evaluated score
 * @param passThreshold - The threshold required to pass
 */
export async function notifyKekaAssessmentGraded(
  candidateId: string | number,
  passed: boolean,
  score: number,
  passThreshold: number,
): Promise<void> {
  const newStage: PipelineStage = passed ? 'Assessment Cleared' : 'Rejected';
  await syncKekaStage(
    candidateId,
    newStage,
    `Assessment score: ${score} (pass threshold: ${passThreshold})`,
    { passed, score, passThreshold },
  );
}

/**
 * [KEKA INJECTION POINT — CANDIDATE IMPORTED]
 *
 * Called when a candidate is first pulled from Keka or submitted via
 * the AuraHR portal. Sets the initial `Imported` stage in Keka as a note.
 *
 * @param candidateId - AuraHR candidate ID
 * @param source      - Origin of the import (e.g. 'keka_portal', 'manual', 'csv')
 */
export async function notifyKekaCandidateImported(
  candidateId: string | number,
  source = 'portal',
): Promise<void> {
  // TODO: Tag the candidate in Keka with the import source.
  await syncKekaStage(candidateId, 'Imported', `Imported via ${source}`);
}

/**
 * [KEKA INJECTION POINT — ADMIN MANUAL OVERRIDE]
 *
 * Called when an admin manually moves a candidate to any stage
 * (bypassing automated gates). Logs the override to Keka.
 *
 * @param candidateId - AuraHR candidate ID
 * @param newStage    - The target stage
 * @param adminId     - ID of the admin performing the action
 * @param reason      - Freetext reason for the override
 */
export async function notifyKekaManualOverride(
  candidateId: string | number,
  newStage: PipelineStage,
  adminId: string | number,
  reason?: string,
): Promise<void> {
  // TODO: Post an audit note to Keka: "Manual override by admin #{adminId}"
  await syncKekaStage(
    candidateId,
    newStage,
    `Manual override by admin ${adminId}${reason ? `: ${reason}` : ''}`,
  );
}

// ── Stage Mapping Stub ────────────────────────────────────────────

/**
 * [KEKA INJECTION POINT — STAGE MAPPING]
 *
 * Maps AuraHR's internal PipelineStage strings to Keka's own stage IDs.
 * Replace the placeholder values with real Keka stage IDs once the
 * Keka Recruit stage list has been retrieved from their API.
 *
 * Endpoint to fetch stage list:
 *   GET /v1/recruit/stages
 */
function mapAuraStageToKeka(stage: PipelineStage): string {
  // TODO: Replace placeholder string values with real Keka stage IDs.
  const map: Record<PipelineStage, string> = {
    'Imported':               'KEKA_STAGE_NEW',
    'Under AI Screening':     'KEKA_STAGE_SCREENING',
    'Shortlisted':            'KEKA_STAGE_SHORTLISTED',
    'Screening Scheduled':    'KEKA_STAGE_SCREENING_SCHED',
    'Screening Cleared':      'KEKA_STAGE_SCREENING_CLEARED',
    'Assessment Invited':     'KEKA_STAGE_ASSESSMENT',
    'Assessment In Progress': 'KEKA_STAGE_ASSESSMENT_INPROG',
    'Assessment Completed':   'KEKA_STAGE_ASSESSMENT_DONE',
    'Assessment Cleared':     'KEKA_STAGE_ASSESSMENT_PASSED',
    'Rejected':               'KEKA_STAGE_REJECTED',
    'On Hold':                'KEKA_STAGE_HOLD',
    'Hired / Offer stage':    'KEKA_STAGE_OFFER',
  };
  return map[stage] ?? 'KEKA_STAGE_UNKNOWN';
}
