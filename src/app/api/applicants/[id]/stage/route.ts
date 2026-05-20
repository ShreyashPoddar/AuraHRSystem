import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

// PATCH /api/applicants/[id]/stage
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { stage } = await req.json();
    if (!stage) return NextResponse.json({ error: 'Stage required' }, { status: 400 });

    const db = await getDb();
    const idx = db.candidates.findIndex(c => c.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });


    const validStages = ['Applied', 'Screened', 'Interview', 'Offer', 'Rejected'];
    if (!validStages.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });

    const prev = db.candidates[idx].status;
    (db.candidates[idx] as any).status = stage;
    (db.candidates[idx] as any).stageHistory = [
      ...((db.candidates[idx] as any).stageHistory || []),
      { from: prev, to: stage, timestamp: new Date().toISOString() }
    ];

    await saveDb(db);
    return NextResponse.json({ success: true, candidate: db.candidates[idx] });
  } catch (e) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
