import { NextRequest, NextResponse } from 'next/server';
import { fetchKekaCandidates } from '@/lib/kekaHire';

// ── In-memory TTL cache (per worker process) ───────────────────────────────────
// Avoids redundant Keka API calls when multiple components fetch the same jobId
// within a short window (e.g. layout sidebar + detail page loading simultaneously).
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const candidatesCache = new Map<string, { data: any; expiresAt: number }>();

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Missing required query parameter: jobId (e.g., ?jobId=abc123)' },
      { status: 400 }
    );
  }

  // ── Cache read ─────────────────────────────────────────────────────────────
  const cached = candidatesCache.get(jobId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const candidates = await fetchKekaCandidates(jobId);
    const responseData = { success: true, count: candidates.length, candidates };

    // ── Cache write (successful responses only) ────────────────────────────
    candidatesCache.set(jobId, { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
