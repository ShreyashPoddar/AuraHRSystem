/**
 * keka-resume-server.ts
 *
 * Server-only helpers for resolving and caching Keka resume URLs.
 * All functions read env vars at call time (not module load time) so that
 * test environments can override them via process.env without module re-evaluation.
 *
 * DO NOT import this file from client components — it uses Node.js APIs (Buffer)
 * and makes server-side fetch calls to Moodle and Keka.
 */

import { getKekaAccessToken } from './kekaAuth';
import { uploadToS3 } from './aws';

// ── Moodle helpers ─────────────────────────────────────────────────────────

/**
 * Looks up a Moodle user by email address.
 * Returns the numeric Moodle user ID, or null if not found or on error.
 * Email is never logged in plain text.
 */
export async function getMoodleUserIdByEmail(email: string): Promise<number | null> {
  const moodleUrl = process.env.MOODLE_URL || 'http://127.0.0.1:8080/moodle';
  const adminToken = process.env.MOODLE_ADMIN_TOKEN || '';

  if (!adminToken) {
    console.warn('[keka-resume-server] MOODLE_ADMIN_TOKEN not set — cannot look up user');
    return null;
  }

  // Bracket-notation pattern — never URLSearchParams for array params to Moodle.
  const pairs: [string, string][] = [
    ['wstoken', adminToken],
    ['wsfunction', 'core_user_get_users_by_field'],
    ['moodlewsrestformat', 'json'],
    ['field', 'email'],
    ['values[0]', email],
  ];
  const body = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  try {
    const res = await fetch(`${moodleUrl}/webservice/rest/server.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Moodle API shape is not typed
    const users: any[] = await res.json();
    if (!Array.isArray(users) || users.length === 0) return null;

    return users[0]?.id ? Number(users[0].id) : null;
  } catch (err) {
    console.warn('[keka-resume-server] getMoodleUserIdByEmail failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Writes a resume URL string into the Moodle user's `idnumber` field.
 * `idnumber` (varchar 255) is unused in this project's Moodle install — safe for storage.
 * Throws on Moodle-level errors so callers can decide whether to surface them.
 */
export async function updateMoodleUserIdnumber(moodleUserId: number, resumeUrl: string): Promise<void> {
  const moodleUrl = process.env.MOODLE_URL || 'http://127.0.0.1:8080/moodle';
  const adminToken = process.env.MOODLE_ADMIN_TOKEN || '';

  if (!adminToken) {
    console.warn('[keka-resume-server] MOODLE_ADMIN_TOKEN not set — skipping idnumber update');
    return;
  }

  // Bracket-notation pattern — never URLSearchParams for array params.
  const pairs: [string, string][] = [
    ['wstoken', adminToken],
    ['wsfunction', 'core_user_update_users'],
    ['moodlewsrestformat', 'json'],
    ['users[0][id]', String(moodleUserId)],
    ['users[0][idnumber]', resumeUrl],
  ];
  const body = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  const res = await fetch(`${moodleUrl}/webservice/rest/server.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Moodle core_user_update_users returned ${res.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Moodle error envelope
  const json: any = await res.json();
  if (json?.exception) {
    throw new Error(`Moodle error: ${json.message}`);
  }
}

/**
 * Checks the Moodle `idnumber` field for a cached resume URL.
 *
 * Returns the cached URL string if non-empty, otherwise null.
 * A null return means no resume has been fetched for this user yet — the caller
 * should proceed to fetch from KEKA and then call updateMoodleUserIdnumber to cache it.
 */
export async function getCachedResumeUrl(email: string): Promise<string | null> {
  const moodleUrl = process.env.MOODLE_URL || 'http://127.0.0.1:8080/moodle';
  const adminToken = process.env.MOODLE_ADMIN_TOKEN || '';

  if (!adminToken) return null;

  const moodleUserId = await getMoodleUserIdByEmail(email);
  if (!moodleUserId) return null;

  // Fetch the full user record to read idnumber.
  const pairs: [string, string][] = [
    ['wstoken', adminToken],
    ['wsfunction', 'core_user_get_users_by_field'],
    ['moodlewsrestformat', 'json'],
    ['field', 'id'],
    ['values[0]', String(moodleUserId)],
  ];
  const body = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  try {
    const res = await fetch(`${moodleUrl}/webservice/rest/server.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Moodle API shape
    const users: any[] = await res.json();
    if (!Array.isArray(users) || users.length === 0) return null;

    const idnumber: string | undefined = users[0]?.idnumber;
    return idnumber && idnumber.length > 0 ? idnumber : null;
  } catch (err) {
    console.warn('[keka-resume-server] getCachedResumeUrl failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Keka resume resolver ───────────────────────────────────────────────────

/**
 * Fetches the resume for a single Keka candidate and returns a stable URL.
 *
 * Two code paths based on the Content-Type of the Keka response:
 *
 *   Path A — JSON response (application/json):
 *     Keka returns a JSON envelope containing a pre-signed AWS URL at
 *     data.resumeUrl, data.url, or data.fileUrl. The URL is returned directly.
 *     No file is downloaded or uploaded. The URL may expire (pre-signed TTL).
 *
 *   Path B — Binary PDF stream (application/pdf or application/octet-stream):
 *     Keka streams the raw PDF bytes. The buffer is uploaded to the project's
 *     S3 bucket via uploadToS3() from @/lib/aws under the resumes/ prefix.
 *     The resulting permanent S3 URL is returned.
 *
 * Throws on any unrecoverable error. Callers must catch and treat as non-fatal
 * (show dash in UI rather than surfacing an error state).
 */
export async function fetchAndResolveResumeUrl(kekaId: string): Promise<string | null> {
  const subdomain = process.env.KEKA_SUBDOMAIN || 'rackbank';
  const token = await getKekaAccessToken();
  const resumeEndpoint = `https://${subdomain}.keka.com/api/v1/hire/jobs/candidate/${kekaId}/resume`;

  const response = await fetch(resumeEndpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json, application/pdf, */*',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Keka resume endpoint returned ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';

  // ── Path A: JSON response containing a pre-signed URL ─────────────────
  if (contentType.includes('application/json')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Keka API shape is not typed
    const json: any = await response.json();
    // Keka wraps responses in a `data` envelope; check both shapes defensively.
    const url: string | undefined =
      json?.data?.resumeUrl ??
      json?.data?.url ??
      json?.data?.fileUrl ??
      json?.resumeUrl ??
      json?.url ??
      json?.fileUrl;

    if (!url) {
      throw new Error('JSON response contained no resume URL field');
    }
    return url;
  }

  // ── Path B: Binary PDF stream ──────────────────────────────────────────
  if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Derive a stable filename from the first 12 non-hyphen chars of the kekaId.
    const safeId = kekaId.replace(/-/g, '').slice(0, 12);
    const filename = `keka-${safeId}-${Date.now()}.pdf`;

    await uploadToS3(buffer, filename, 'application/pdf');

    const bucket = process.env.AWS_S3_BUCKET_NAME!;
    const region = process.env.AWS_REGION || 'ap-south-1';
    // uploadToS3 stores the file at resumes/{timestamp}-{filename} — mirror that path here.
    return `https://${bucket}.s3.${region}.amazonaws.com/resumes/${Date.now()}-${filename}`;
  }

  throw new Error(`Unexpected Content-Type from Keka resume endpoint: ${contentType.slice(0, 60)}`);
}
