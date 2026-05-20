import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const candidates = db.candidates || [];

  const total = candidates.length;
  const byStatus: Record<string, number> = { Applied: 0, Screened: 0, Interview: 0, Offer: 0, Rejected: 0 };
  candidates.forEach(c => { if (byStatus[c.status] !== undefined) byStatus[c.status]++; });

  const byGender = { Male: 0, Female: 0, Other: 0 };
  candidates.forEach(c => {
    const g = c.gender || 'Other';
    byGender[g as keyof typeof byGender] = (byGender[g as keyof typeof byGender] || 0) + 1;
  });

  const bySource: Record<string, number> = {};
  candidates.forEach(c => {
    const s = c.source || 'Other';
    bySource[s] = (bySource[s] || 0) + 1;
  });

  const timeToHireAvg = 18; // days in prototype
  const stages = [
    { stage: 'Applied', avgDays: 2 },
    { stage: 'Screened', avgDays: 5 },
    { stage: 'Interview', avgDays: 8 },
    { stage: 'Offer', avgDays: 3 }
  ];

  return NextResponse.json({
    total,
    byStatus,
    byGender,
    bySource,
    timeToHireAvg,
    stages
  });
}
