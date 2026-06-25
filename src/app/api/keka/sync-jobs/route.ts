import { NextResponse } from 'next/server';
import { fetchKekaJobs } from '@/lib/kekaHire';

export async function GET() {
  try {
    const jobs = await fetchKekaJobs();
    return NextResponse.json({ success: true, count: jobs.length, jobs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
