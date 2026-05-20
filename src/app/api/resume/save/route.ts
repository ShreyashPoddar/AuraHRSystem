import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { extracted, filename } = await req.json();

    const db = await getDb();

    // Check for duplicate email
    const isDupe = extracted.email && db.candidates.some((c: any) => c.email === extracted.email);
    if (isDupe) {
      return NextResponse.json({ error: 'Candidate with this email already exists', duplicate: true }, { status: 409 });
    }

    const skillTags = (extracted.skillsList || []).slice(0, 6);

    const newCandidate: any = {
      id: `pdf_${Date.now()}`,
      name: extracted.name || 'Unnamed Candidate',
      email: extracted.email || '',
      role: extracted.education?.degree ? `${extracted.education.degree} Graduate` : 'Applicant',
      status: 'Applied',
      matchPercent: Math.floor(55 + Math.random() * 30),
      matchTags: skillTags,
      phone: extracted.phone || '',
      education: extracted.education?.degree || 'Not specified',
      institute: extracted.education?.institute || '',
      aiInterviewScore: undefined,
      salaryExpectation: null,
      source: 'PDF_Upload',
      gender: 'Other',
      score: { technical: 70, culture: 70, communication: 70, leadership: 65, adaptability: 70 },
      interviewLogs: [],
      assessments: [],
      totalExpYears: extracted.totalExpYears,
      stageHistory: [{ from: null, to: 'Applied', timestamp: new Date().toISOString() }]
    };

    db.candidates.push(newCandidate);
    await saveDb(db);

    return NextResponse.json({ success: true, candidate: newCandidate });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save candidate' }, { status: 500 });
  }
}
