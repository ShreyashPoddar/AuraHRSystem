import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { rows } = await req.json();
    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getDb();
    let added = 0;
    let duplicates = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Extract key fields from mapping
      const name = row.name || row.full_name || row['Full Name'] || 'Unknown';
      const email = row.email || row['Email'] || '';
      const phone = row.phone || row['Phone'] || row['Contact'] || '';
      const role = row.role || row['Role'] || row['Designation'] || row['Last Designation'] || '';
      const ctc = parseFloat(String(row.ctc || row['Current CTC'] || row['CurrentCTC'] || '0').replace(/[^\d.]/g, '')) || 0;
      const expectedCtc = parseFloat(String(row.expectedCtc || row['Expected CTC'] || row['ExpectedCTC'] || '0').replace(/[^\d.]/g, '')) || 0;
      const noticePeriod = row.noticePeriod || row['Notice Period'] || row['NoticePeriod'] || '30 days';
      const skills = row.skills || row['Primary Skills'] || row['Skills'] || '';
      const institute = row.institute || row['College'] || row['Institute'] || '';
      const pan = row.pan || row['PAN'] || '';
      const source = row.source || row['Source'] || 'CSV Import';
      const gender = row.gender || row['Gender'] || 'Other';

      // Dedup check
      const isDupe = db.candidates.some(c => (email && c.name === name) || (pan && (c as any).pan === pan));
      if (isDupe) { duplicates++; continue; }

      if (!name || name === 'Unknown') {
        errors.push({ row: i + 1, reason: 'Missing name field' });
        continue;
      }

      // Convert CTC from Lakhs if < 1000 (assume Lakhs input)
      const ctcAnnual = ctc > 0 && ctc < 1000 ? ctc * 100000 : ctc;
      const expectedCtcAnnual = expectedCtc > 0 && expectedCtc < 1000 ? expectedCtc * 100000 : expectedCtc;

      const skillTags = skills
        ? skills.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 5)
        : ['Unspecified'];

      db.candidates.push({
        id: `csv_${Date.now()}_${i}`,
        name,
        role: role || 'Applicant',
        status: 'Applied',
        matchPercent: Math.floor(60 + Math.random() * 30),
        matchTags: skillTags,
        phone,
        education: row.education || row['Education'] || 'Incomplete',
        institute,
        aiInterviewScore: undefined,
        salaryExpectation: expectedCtcAnnual || ctcAnnual,
        source,
        gender,
        score: { technical: 70, culture: 70, communication: 70, leadership: 65, adaptability: 70 },
        interviewLogs: [],
        assessments: [],
        // Extended fields
        noticePeriod,
        currentCTC: ctcAnnual,
        expectedCTC: expectedCtcAnnual,
        pan
      } as any);
      added++;
    }

    await saveDb(db);
    return NextResponse.json({ success: true, added, duplicates, errors });

  } catch (e) {
    return NextResponse.json({ error: 'Failed to convert' }, { status: 500 });
  }
}
