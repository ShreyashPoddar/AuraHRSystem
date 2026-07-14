import { NextRequest, NextResponse } from 'next/server';
import { fetchKekaCandidates } from '@/lib/kekaHire';

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Missing required query parameter: jobId (e.g., ?jobId=abc123)' },
      { status: 400 }
    );
  }

  try {
    const candidates = await fetchKekaCandidates(jobId);
    return NextResponse.json({ success: true, count: candidates.length, candidates });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
