import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { isValidStage, normaliseLegacyStage } from '@/lib/pipeline';
import { notifyKekaManualOverride } from '@/lib/keka';

/**
 * PATCH /api/applicants/[id]/stage
 *
 * Moves a candidate to a new pipeline stage. Accepts all 12 internal
 * stages defined in @/lib/pipeline.ts.
 *
 * Body:
 *   { stage: PipelineStage, reason?: string, adminId?: string }
 *
 * Keka sync is triggered via notifyKekaManualOverride() after every
 * successful update. See @/lib/keka.ts for the injection point.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { stage, reason, adminId } = body as {
      stage: string;
      reason?: string;
      adminId?: string;
    };

    if (!stage) {
      return NextResponse.json({ error: 'Stage required' }, { status: 400 });
    }

    // Accept both new-style 12-stage values and legacy Moodle-style values
    const normalisedStage = isValidStage(stage) ? stage : normaliseLegacyStage(stage);

    if (!isValidStage(normalisedStage)) {
      return NextResponse.json(
        { error: `Invalid stage: "${stage}". Must be one of the 12 pipeline stages.` },
        { status: 400 },
      );
    }

    const db = await getDb();
    const idx = db.candidates.findIndex(c => c.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const prev = db.candidates[idx].status;

    // Update stage
    db.candidates[idx].status = normalisedStage;

    // Append to audit trail
    db.candidates[idx].stageHistory = [
      ...(db.candidates[idx].stageHistory || []),
      {
        from: prev,
        to: normalisedStage,
        timestamp: new Date().toISOString(),
        actor: adminId ?? 'system',
        ...(reason ? { reason } : {}),
      },
    ];

    await saveDb(db);

    // ── Keka Sync (Injection Point) ───────────────────────────────
    // This is a fire-and-forget call so it never blocks the HTTP response.
    // The actual implementation is in @/lib/keka.ts.
    notifyKekaManualOverride(id, normalisedStage, adminId ?? 'unknown', reason).catch(
      (err) => console.error('[Keka] syncKekaStage failed:', err),
    );
    // ─────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, candidate: db.candidates[idx] });
  } catch (e) {
    console.error('[Stage Update Error]', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
