import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedResumeUrl,
  fetchAndResolveResumeUrl,
  getMoodleUserIdByEmail,
  updateMoodleUserIdnumber,
} from '@/lib/keka-resume-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/keka/candidate-resume?email={email}&kekaId={kekaId}
 *
 * Lazy, cached resume URL resolver. Called only when an HR admin clicks the
 * resume icon for a candidate whose URL has not yet been loaded.
 *
 * Pipeline:
 *   1. Validate params
 *   2. Check Moodle idnumber cache (getCachedResumeUrl) — zero KEKA calls if hit
 *   3. Cache miss → fetch from KEKA (fetchAndResolveResumeUrl)
 *   4. On fetch success → persist to Moodle idnumber (non-fatal if this fails)
 *   5. Return the URL
 *
 * A missing resume is a 404, not a 500 — the candidate simply has no resume.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email') ?? '';
  const kekaId = searchParams.get('kekaId') ?? '';

  if (!email || !kekaId) {
    return NextResponse.json(
      { success: false, error: 'Both email and kekaId query parameters are required' },
      { status: 400 }
    );
  }

  // ── Step 1: Check Moodle idnumber cache ─────────────────────────────────
  let cachedUrl: string | null = null;
  try {
    cachedUrl = await getCachedResumeUrl(email);
  } catch (err) {
    // Cache check failure (Moodle unreachable, token missing, etc.) is non-fatal.
    // Log and proceed to KEKA fetch — the worst outcome is one extra KEKA call.
    console.warn(
      '[candidate-resume] Cache check failed, proceeding to KEKA fetch:',
      err instanceof Error ? err.message : err
    );
  }

  if (cachedUrl) {
    return NextResponse.json({ success: true, url: cachedUrl, cached: true });
  }

  // ── Step 2: Fetch from KEKA ──────────────────────────────────────────────
  let resolvedUrl: string | null = null;
  try {
    resolvedUrl = await fetchAndResolveResumeUrl(kekaId);
  } catch (err) {
    // A missing or inaccessible resume is not a server error.
    console.warn(
      `[candidate-resume] KEKA fetch failed for kekaId ${kekaId.slice(0, 8)}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return NextResponse.json(
      { success: false, error: 'Resume not available' },
      { status: 404 }
    );
  }

  if (!resolvedUrl) {
    return NextResponse.json(
      { success: false, error: 'Resume not available' },
      { status: 404 }
    );
  }

  // ── Step 3: Persist to Moodle idnumber (non-fatal) ──────────────────────
  try {
    const moodleUserId = await getMoodleUserIdByEmail(email);
    if (moodleUserId) {
      await updateMoodleUserIdnumber(moodleUserId, resolvedUrl);
    }
  } catch (err) {
    // Cache write failure must not block the admin from viewing the resume.
    console.warn(
      `[candidate-resume] Moodle idnumber write failed for kekaId ${kekaId.slice(0, 8)}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return NextResponse.json({ success: true, url: resolvedUrl, cached: false });
}
