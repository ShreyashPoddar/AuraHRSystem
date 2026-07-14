/**
 * auth-server.ts — Server-side authentication guard for AuraHR API routes.
 *
 * IMPORTANT: This file is server-side ONLY. Do not import from src/lib/moodle.ts.
 * Extracts the caller's token from the Authorization header or aurahr_token cookie,
 * validates it against Moodle, and confirms the user has the 'organization' role.
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Private helpers ────────────────────────────────────────────────────────────

function getEnv(): { moodleUrl: string; adminToken: string } {
  const moodleUrl   = process.env.MOODLE_URL;
  const adminToken  = process.env.MOODLE_ADMIN_TOKEN;
  if (!moodleUrl)   throw new Error('MOODLE_URL is not configured.');
  if (!adminToken)  throw new Error('MOODLE_ADMIN_TOKEN is not configured.');
  return { moodleUrl, adminToken };
}

/** Extracts the caller's Moodle token from Authorization header or cookie. */
function extractToken(request: NextRequest): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const t = authHeader.slice(7).trim();
    if (t) return t;
  }

  // 2. Cookie: aurahr_token=<token>
  const cookie = request.cookies.get('aurahr_token');
  if (cookie?.value) return cookie.value;

  return null;
}

// ── Public guard ───────────────────────────────────────────────────────────────

/**
 * Validates that the incoming request is authenticated as an organization user.
 *
 * Returns `{ userId: number }` on success.
 * Returns a NextResponse (401 or 403) on failure — the caller must return this
 * response immediately from its route handler.
 *
 * Usage:
 *   const session = await requireOrganizationSession(request);
 *   if (session instanceof NextResponse) return session;
 *   // session.userId is now available
 */
export async function requireOrganizationSession(
  request: NextRequest
): Promise<{ userId: number } | NextResponse> {
  const { moodleUrl, adminToken } = getEnv();

  // ── Step 1: Extract token ────────────────────────────────────────────────────
  const userToken = extractToken(request);
  if (!userToken) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: no token provided' },
      { status: 401 }
    );
  }

  // ── Step 2: Validate token via core_webservice_get_site_info ────────────────
  // This is the canonical Moodle "whoami" call. If the token is invalid or
  // expired, Moodle returns an exception object.
  let userId: number;
  try {
    const qs = new URLSearchParams({
      wstoken:            userToken,
      wsfunction:         'core_webservice_get_site_info',
      moodlewsrestformat: 'json',
    });
    const res  = await fetch(`${moodleUrl}/webservice/rest/server.php?${qs.toString()}`, {
      cache: 'no-store',
    });
    const data = await res.json() as Record<string, unknown>;

    if (data.exception || typeof data.userid !== 'number') {
      console.warn(`[Auth] Token validation failed: ${JSON.stringify(data).substring(0, 120)}`);
      return NextResponse.json(
        { success: false, error: 'Unauthorized: invalid or expired token' },
        { status: 401 }
      );
    }
    userId = data.userid as number;
  } catch (err) {
    console.error('[Auth] core_webservice_get_site_info fetch error:', err);
    return NextResponse.json(
      { success: false, error: 'Unauthorized: could not verify token' },
      { status: 401 }
    );
  }

  // ── Step 3: Confirm organization role ───────────────────────────────────────
  // Uses the ADMIN token (not the user token) to read the user's department field.
  // The department field stores the role ('organization' | 'candidate') set during signup.
  try {
    const qs = [
      `wstoken=${encodeURIComponent(adminToken)}`,
      `wsfunction=core_user_get_users_by_field`,
      `moodlewsrestformat=json`,
      `field=id`,
      `values[0]=${encodeURIComponent(String(userId))}`,
    ].join('&');

    const res   = await fetch(`${moodleUrl}/webservice/rest/server.php?${qs}`, {
      cache: 'no-store',
    });
    const users = await res.json() as Array<Record<string, unknown>>;

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: user not found' },
        { status: 403 }
      );
    }

    const department = users[0].department as string | undefined;
    if (department !== 'organization') {
      console.warn(`[Auth] Role check failed for userId ${userId}: department="${department}"`);
      return NextResponse.json(
        { success: false, error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error('[Auth] Role check fetch error:', err);
    return NextResponse.json(
      { success: false, error: 'Forbidden: could not verify role' },
      { status: 403 }
    );
  }

  return { userId };
}
