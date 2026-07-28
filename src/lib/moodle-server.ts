/**
 * moodle-server.ts — Server-side Moodle helpers for AuraHR.
 *
 * IMPORTANT: This file is server-side ONLY. It reads process.env directly and
 * must never be imported by client components or browser-safe modules.
 * Do NOT import anything from src/lib/moodle.ts (that file uses document.cookie).
 *
 * All Moodle REST calls go directly to MOODLE_URL — never via /api/moodle,
 * which is the client-facing proxy and would create a circular same-process
 * HTTP loop when called from a server route handler.
 *
 * Array parameters MUST use bracket-notation query strings built manually.
 * URLSearchParams percent-encodes '[' and ']' which Moodle rejects with
 * "Missing required key in single structure".
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MoodleCreateUserParams {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
}

export interface MoodleUserRecord {
  id: number;
  username: string;
}

// Moodle returns this shape when an exception occurs instead of the expected payload.
interface MoodleException {
  exception: string;
  errorcode: string;
  message: string;
  debuginfo?: string;
}

function isMoodleException(data: unknown): data is MoodleException {
  return (
    typeof data === 'object' &&
    data !== null &&
    'exception' in data &&
    typeof (data as Record<string, unknown>).exception === 'string'
  );
}

// ── Environment guard ─────────────────────────────────────────────────────────

function getEnv(): { moodleUrl: string; adminToken: string } {
  const moodleUrl = process.env.MOODLE_URL;
  const adminToken = process.env.MOODLE_ADMIN_TOKEN;

  if (!moodleUrl) {
    throw new Error('MOODLE_URL is not configured in environment variables.');
  }
  if (!adminToken) {
    throw new Error('MOODLE_ADMIN_TOKEN is not configured in environment variables.');
  }

  return { moodleUrl, adminToken };
}

// ── moodleAdminCreateUser ─────────────────────────────────────────────────────

/**
 * Creates a Moodle user account via core_user_create_users using the admin token.
 * Uses bracket-notation query string (never URLSearchParams) for the array parameter.
 *
 * @returns The new Moodle user's integer ID.
 * @throws  Error with Moodle's exception message if the call fails.
 */
export async function moodleAdminCreateUser(
  params: MoodleCreateUserParams
): Promise<{ id: number }> {
  const { moodleUrl, adminToken } = getEnv();
  const { username, password, firstname, lastname, email } = params;

  console.log(
    `[moodle-server] core_user_create_users — token: ${adminToken.substring(0, 6)}... username: ${username}`
  );

  // Bracket-notation array params — URLSearchParams must NOT be used here.
  const pairs: [string, string][] = [
    ['wstoken', adminToken],
    ['wsfunction', 'core_user_create_users'],
    ['moodlewsrestformat', 'json'],
    ['users[0][username]', username],
    ['users[0][password]', password],
    ['users[0][firstname]', firstname],
    ['users[0][lastname]', lastname],
    ['users[0][email]', email],
    ['users[0][auth]', 'manual'],
    ['users[0][department]', 'candidate'],
  ];

  const qs = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `${moodleUrl}/webservice/rest/server.php?${qs}`;

  const res = await fetch(url, { method: 'GET', cache: 'no-store' });

  if (!res.ok) {
    throw new Error(
      `core_user_create_users: HTTP ${res.status} ${res.statusText}`
    );
  }

  const data: unknown = await res.json();

  if (isMoodleException(data)) {
    throw new Error(
      `core_user_create_users: [${data.errorcode}] ${data.message}${data.debuginfo ? ` — ${data.debuginfo}` : ''}`
    );
  }

  // Moodle returns an array of created users: [{ id, username }]
  const users = data as Array<{ id: number; username: string }>;
  if (!Array.isArray(users) || users.length === 0 || typeof users[0].id !== 'number') {
    throw new Error(
      `core_user_create_users: Unexpected response shape — ${JSON.stringify(data).substring(0, 200)}`
    );
  }

  return { id: users[0].id };
}

// ── moodleAdminGetUserByEmail ─────────────────────────────────────────────────

/**
 * Looks up a Moodle user by email using core_user_get_users_by_field.
 * Uses the admin token — the logged-in user's token is not required.
 *
 * @returns The user record if found, or null if no match.
 * @throws  Error on network failure or unexpected Moodle exceptions.
 */
export async function moodleAdminGetUserByEmail(
  email: string
): Promise<MoodleUserRecord | null> {
  const { moodleUrl, adminToken } = getEnv();

  console.log(
    `[moodle-server] core_user_get_users_by_field — token: ${adminToken.substring(0, 6)}... field: email`
  );

  const qs = [
    `wstoken=${encodeURIComponent(adminToken)}`,
    `wsfunction=core_user_get_users_by_field`,
    `moodlewsrestformat=json`,
    `field=email`,
    `values[0]=${encodeURIComponent(email)}`,
  ].join('&');

  const url = `${moodleUrl}/webservice/rest/server.php?${qs}`;

  const res = await fetch(url, { method: 'GET', cache: 'no-store' });

  if (!res.ok) {
    throw new Error(
      `core_user_get_users_by_field: HTTP ${res.status} ${res.statusText}`
    );
  }

  const data: unknown = await res.json();

  if (isMoodleException(data)) {
    throw new Error(
      `core_user_get_users_by_field: [${data.errorcode}] ${data.message}`
    );
  }

  const users = data as Array<{ id: number; username: string }>;
  if (!Array.isArray(users)) {
    throw new Error(
      `core_user_get_users_by_field: Unexpected response shape — ${JSON.stringify(data).substring(0, 200)}`
    );
  }

  if (users.length === 0) return null;

  return { id: users[0].id, username: users[0].username };
}

// ── moodleAdminApplyToJob ─────────────────────────────────────────────────────

/**
 * Applies a candidate to a job via local_aurahr_jobs_apply using the admin token.
 * The admin token acts on behalf of the candidate — no user session or impersonation needed.
 *
 * @returns The created application's integer ID.
 * @throws  Error if Moodle rejects the call or returns an exception.
 */
export async function moodleAdminApplyToJob(
  jobId: number,
  userId: number  // NEW — required now, not optional
): Promise<{ id: number }> {
  const { moodleUrl, adminToken } = getEnv();

  const qs = new URLSearchParams({
    wstoken: adminToken,
    wsfunction: 'local_aurahr_jobs_apply',
    moodlewsrestformat: 'json',
    jobid: String(jobId),
    userid: String(userId),  // NEW
  });

  const url = `${moodleUrl}/webservice/rest/server.php?${qs.toString()}`;
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`local_aurahr_jobs_apply: HTTP ${res.status} ${res.statusText}`);
  }

  const data: unknown = await res.json();
  if (isMoodleException(data)) {
    throw new Error(`local_aurahr_jobs_apply: [${(data as any).errorcode}] ${(data as any).message}`);
  }
  const result = data as { id: number };
  if (typeof result.id !== 'number') {
    throw new Error(`local_aurahr_jobs_apply: Unexpected response shape — ${JSON.stringify(data).substring(0, 200)}`);
  }
  return { id: result.id };
}
