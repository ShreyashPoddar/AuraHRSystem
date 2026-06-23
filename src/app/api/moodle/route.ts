import { NextResponse } from 'next/server';

/**
 * Moodle Proxy Route — Single entry point for all Moodle Web Service calls.
 *
 * Handles three actions:
 *  1. `login`  — Authenticates user via Moodle token endpoint
 *  2. `signup` — Creates a new user via admin token
 *  3. default  — Proxies web service function calls with user token
 *
 * Environment variables:
 *  - MOODLE_URL          (default: http://localhost/moodle)
 *  - MOODLE_ADMIN_TOKEN  (admin token used for user creation in signup)
 *  - MOODLE_TOKEN_SERVICE (service short-name used by login/token.php for USER tokens)
 *                         Falls back to MOODLE_SERVICE if not set.
 *  - MOODLE_SERVICE      (service short-name for admin-level references, default: aurahr_jobs)
 */

const MOODLE_URL          = process.env.MOODLE_URL          || 'http://localhost/moodle';
const ADMIN_TOKEN         = process.env.MOODLE_ADMIN_TOKEN  || '';
const MOODLE_SERVICE      = process.env.MOODLE_SERVICE      || 'aurahr_jobs';
// MOODLE_TOKEN_SERVICE is the Moodle service short-name that end-users are
// authorised to generate tokens against (i.e. the user-facing service).
// This is separate from MOODLE_SERVICE which was used for admin-level calls.
const MOODLE_TOKEN_SERVICE = process.env.MOODLE_TOKEN_SERVICE || MOODLE_SERVICE;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Login ──────────────────────────────────────────────────
    if (action === 'login') {
      return handleLogin(body.username, body.password);
    }

    // ── Signup ─────────────────────────────────────────────────
    if (action === 'signup') {
      return handleSignup(body);
    }

    // ── Web Service Call ───────────────────────────────────────
    const { wsfunction, params = {}, token } = body;

    console.log(`[Moodle Proxy Request] wsfunction: ${wsfunction}, token: ${token ? token.substring(0, 6) + '...' : 'none'}, params:`, JSON.stringify(params));

    if (!wsfunction) {
      return NextResponse.json({ error: 'Missing wsfunction parameter' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Build Moodle Web Service URL.
    // IMPORTANT: We build the query string manually with bracket-notation keys kept
    // as raw literals. Using URLSearchParams.set() would percent-encode '[' → '%5B'
    // and ']' → '%5D', which Moodle's PHP backend does NOT recognise as array notation,
    // causing "Missing required key in single structure" errors.
    const baseQs = `wstoken=${encodeURIComponent(token)}&wsfunction=${encodeURIComponent(wsfunction)}&moodlewsrestformat=json`;

    // Flatten params into bracket-notation key=value pairs, keeping brackets raw.
    const flatParams = flattenParams(params);
    const paramQs = Object.entries(flatParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    const fullUrl = `${MOODLE_URL}/webservice/rest/server.php?${baseQs}`;

    const moodleRes = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: paramQs,
    });
    
    const responseText = await moodleRes.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (err) {
      console.error(`[Moodle Proxy] Non-JSON response for ${wsfunction}:`, responseText.substring(0, 500));
      return NextResponse.json({ error: `Moodle returned non-JSON response. Check Moodle error logs.` }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal proxy error';
    console.error('[Moodle Proxy Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Login Handler ─────────────────────────────────────────────────

async function handleLogin(username: string, password: string) {
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  // Step 1: Get token from Moodle.
  // Using URLSearchParams here is safe — username/password/service are all scalar
  // values (no bracket notation), so encoding is not an issue.
  const tokenUrl = new URL(`${MOODLE_URL}/login/token.php`);
  tokenUrl.searchParams.set('username', username);
  tokenUrl.searchParams.set('password', password);
  // Use MOODLE_TOKEN_SERVICE (the user-facing service, e.g. 'aurahr_user').
  // This is distinct from MOODLE_SERVICE which may be an admin-only service.
  tokenUrl.searchParams.set('service', MOODLE_TOKEN_SERVICE);

  const tokenRawRes = await fetch(tokenUrl.toString());
  const tokenRawText = await tokenRawRes.text();
  console.log('[Moodle Login] token.php raw response:', tokenRawText);

  let tokenData: Record<string, unknown>;
  try {
    tokenData = JSON.parse(tokenRawText);
  } catch {
    return NextResponse.json({ error: `Moodle token endpoint returned non-JSON: ${tokenRawText.substring(0, 200)}` }, { status: 500 });
  }

  if (tokenData.error) {
    // Strip any HTML Moodle sometimes embeds in error messages.
    const rawError = String(tokenData.error);
    const cleanError = rawError.replace(/<[^>]*>/g, '').trim();
    console.error('[Moodle Login Error]', cleanError);
    return NextResponse.json({ error: cleanError }, { status: 401 });
  }

  const { token } = tokenData;

  // Step 2: Fetch user profile using the token.
  const profileUrl = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
  profileUrl.searchParams.set('wstoken', token as string);
  profileUrl.searchParams.set('wsfunction', 'core_webservice_get_site_info');
  profileUrl.searchParams.set('moodlewsrestformat', 'json');

  const profileRes = await fetch(profileUrl.toString());
  const profile = await profileRes.json();

  if (profile.exception) {
    return NextResponse.json({ error: profile.message }, { status: 500 });
  }

  // Step 3: Fetch extended profile to get 'department' (which we use as role).
  // IMPORTANT: We use ADMIN_TOKEN here, NOT the user's own token.
  // The user's token is scoped to the 'aurahr_user' service which only has
  // core_webservice_get_site_info + local_aurahr_jobs functions. Calling
  // core_user_get_users_by_field with the user's token returns an access error
  // (not an array), so Array.isArray() fails and role always defaults to 'candidate'.
  // The admin token has unrestricted access and solves this cleanly.
  const userQs = [
    `wstoken=${encodeURIComponent(ADMIN_TOKEN)}`,
    `wsfunction=core_user_get_users_by_field`,
    `moodlewsrestformat=json`,
    `field=id`,
    `values[0]=${encodeURIComponent(profile.userid)}`,
  ].join('&');
  const userFullUrl = `${MOODLE_URL}/webservice/rest/server.php?${userQs}`;

  const userRes = await fetch(userFullUrl);
  const userRawText = await userRes.text();
  console.log('[Moodle Login] user profile raw response:', userRawText);

  let userData: unknown;
  try { userData = JSON.parse(userRawText); } catch { userData = null; }

  let role = 'candidate'; // safe default
  if (Array.isArray(userData) && userData.length > 0) {
    const dept = (userData[0] as { department?: string }).department;
    if (dept) {
      role = dept;
      console.log(`[Moodle Login] resolved role from department field: "${role}"`);
    } else {
      console.warn('[Moodle Login] department field is empty — defaulting to candidate');
    }
  } else {
    console.error('[Moodle Login] core_user_get_users_by_field did not return an array. Raw:', userRawText.substring(0, 300));
  }

  return NextResponse.json({
    token,
    user: {
      id: profile.userid,
      username: profile.username,
      firstname: profile.firstname,
      lastname: profile.lastname,
      email: profile.useremail || '',
      role: role,
    },
  });
}

// ── Signup Handler ────────────────────────────────────────────────

async function handleSignup(body: {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  company?: string;
}) {
  if (!ADMIN_TOKEN) {
    return NextResponse.json(
      { error: 'Server is not configured for user registration. MOODLE_ADMIN_TOKEN is missing.' },
      { status: 500 }
    );
  }

  const { username, password, firstname, lastname, email } = body;

  if (!username || !password || !firstname || !lastname || !email) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  // Call core_user_create_users via admin token.
  // CRITICAL: All bracket-notation keys (e.g. users[0][username]) MUST be kept as
  // raw literals in the query string. URLSearchParams.set() percent-encodes '[' and
  // ']' which causes Moodle to drop the entire 'users' array and throw:
  //   "Missing required key in single structure: users"
  // We build the query string manually, encoding only the VALUES.
  const signupPairs: [string, string][] = [
    ['wstoken',              ADMIN_TOKEN],
    ['wsfunction',           'core_user_create_users'],
    ['moodlewsrestformat',   'json'],
    ['users[0][username]',   username],
    ['users[0][password]',   password],
    ['users[0][firstname]',  firstname],
    ['users[0][lastname]',   lastname],
    ['users[0][email]',      email],
    ['users[0][auth]',       'manual'],
    ['users[0][department]', body.role],
  ];

  // Store company in institution field (standard Moodle profile field).
  if (body.company) {
    signupPairs.push(['users[0][institution]', body.company]);
  }

  const signupQs = signupPairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const signupUrl = `${MOODLE_URL}/webservice/rest/server.php?${signupQs}`;

  // Log the outgoing request shape for debugging (token partially redacted).
  const redactedUrl = signupUrl.replace(ADMIN_TOKEN, ADMIN_TOKEN.substring(0, 6) + '...');
  console.log('[Moodle Signup Request URL]', redactedUrl);

  const res = await fetch(signupUrl);

  // Log the raw Moodle response before parsing so errors are always visible.
  const rawText = await res.text();
  console.log('[Moodle Signup Raw Response]', rawText);

  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: `Moodle returned non-JSON response: ${rawText.substring(0, 200)}` }, { status: 500 });
  }

  if (data && typeof data === 'object' && 'exception' in data) {
    const errData = data as unknown as { message: string; debuginfo?: string };
    console.error('[Moodle Signup Error]', errData.message, errData.debuginfo ?? '');
    return NextResponse.json({ error: errData.message }, { status: 400 });
  }

  // data is an array of created users: [{ id, username }]
  if (Array.isArray(data) && data.length > 0) {
    return NextResponse.json({ id: (data[0] as { id: number }).id, username: (data[0] as { username: string }).username });
  }

  return NextResponse.json({ error: 'Unexpected response from Moodle' }, { status: 500 });
}

function flattenParams(params: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenParams(value, paramKey));
    } else if (typeof value === 'boolean') {
      // Moodle's PARAM_BOOL only accepts "0" or "1" — NOT "true"/"false"
      result[paramKey] = value ? '1' : '0';
    } else {
      result[paramKey] = String(value);
    }
  }
  return result;
}
