import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { employees } = await req.json();
    if (!employees || !Array.isArray(employees)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const db = await getDb();
    let addedCount = 0;
    let duplicateCount = 0;

    for (const emp of employees) {
      const isDuplicate = db.employees.some(
        e => (e.pan && emp.pan && e.pan === emp.pan) || (e.email && emp.email && e.email === emp.email)
      );

      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      db.employees.push({
        id: Math.random().toString(36).substr(2, 9),
        name: emp.name || 'Unknown',
        email: emp.email || '',
        role: emp.role || 'Employee',
        location: emp.location || db.settings.defaultState,
        salary: Number(emp.ctc) || 0,
        pan: emp.pan || '',
        aadhar: emp.aadhar || '',
        uan: emp.uan || '',
        taxRegime: emp.taxRegime === 'old' ? 'old' : 'new',
        state: emp.state || db.settings.defaultState
      });
      addedCount++;
    }

    await saveDb(db);

    return NextResponse.json({ 
      success: true, 
      added: addedCount, 
      duplicates: duplicateCount 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}
