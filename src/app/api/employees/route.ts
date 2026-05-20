import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  return NextResponse.json({ employees: db.employees || [] });
}
