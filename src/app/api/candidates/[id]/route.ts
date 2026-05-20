import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const db = await getDb();
    const index = db.candidates.findIndex(c => c.id === params.id);
    
    if (index === -1) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

    db.candidates[index] = { ...db.candidates[index], ...body };
    await saveDb(db);

    return NextResponse.json({ success: true, candidate: db.candidates[index] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
