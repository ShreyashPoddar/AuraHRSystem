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
 *  - MOODLE_URL        (default: http://localhost/moodle)
 *  - MOODLE_ADMIN_TOKEN (admin token for user creation)
 *  - MOODLE_SERVICE     (default: aurahr_jobs)
 */

const MOODLE_URL     = process.env.MOODLE_URL || 'http://localhost/moodle';
const ADMIN_TOKEN    = process.env.MOODLE_ADMIN_TOKEN || '';
const MOODLE_SERVICE = process.env.MOODLE_SERVICE || 'aurahr_jobs';

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
    const url = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
    url.searchParams.set('wstoken', token);
    url.searchParams.set('wsfunction', wsfunction);
    url.searchParams.set('moodlewsrestformat', 'json');

    // Flatten params into URL search params (Moodle expects flat key-value pairs).
    const flatParams = flattenParams(params);
    for (const [key, value] of Object.entries(flatParams)) {
      url.searchParams.set(key, value);
    }

    const moodleRes = await fetch(url.toString());
    const data = await moodleRes.json();

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
  const tokenUrl = new URL(`${MOODLE_URL}/login/token.php`);
  tokenUrl.searchParams.set('username', username);
  tokenUrl.searchParams.set('password', password);
  tokenUrl.searchParams.set('service', MOODLE_SERVICE);

  const tokenRes = await fetch(tokenUrl.toString());
  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    return NextResponse.json({ error: tokenData.error }, { status: 401 });
  }

  const { token } = tokenData;

  // Step 2: Fetch user profile using the token.
  const profileUrl = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
  profileUrl.searchParams.set('wstoken', token);
  profileUrl.searchParams.set('wsfunction', 'core_webservice_get_site_info');
  profileUrl.searchParams.set('moodlewsrestformat', 'json');

  const profileRes = await fetch(profileUrl.toString());
  const profile = await profileRes.json();

  if (profile.exception) {
    return NextResponse.json({ error: profile.message }, { status: 500 });
  }

  // Step 3: Fetch extended profile to get 'department' (which we use as role).
  const userUrl = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
  userUrl.searchParams.set('wstoken', token);
  userUrl.searchParams.set('wsfunction', 'core_user_get_users_by_field');
  userUrl.searchParams.set('moodlewsrestformat', 'json');
  userUrl.searchParams.set('field', 'id');
  userUrl.searchParams.set('values[0]', profile.userid);

  const userRes = await fetch(userUrl.toString());
  const userData = await userRes.json();
  
  let role = 'candidate'; // default
  if (Array.isArray(userData) && userData.length > 0) {
    if (userData[0].department) {
      role = userData[0].department;
    }
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
  const url = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
  url.searchParams.set('wstoken', ADMIN_TOKEN);
  url.searchParams.set('wsfunction', 'core_user_create_users');
  url.searchParams.set('moodlewsrestformat', 'json');
  url.searchParams.set('users[0][username]', username);
  url.searchParams.set('users[0][password]', password);
  url.searchParams.set('users[0][firstname]', firstname);
  url.searchParams.set('users[0][lastname]', lastname);
  url.searchParams.set('users[0][email]', email);
  url.searchParams.set('users[0][auth]', 'manual');
  url.searchParams.set('users[0][department]', body.role);

  // Store company as custom profile fields (if configured in Moodle).
  if (body.company) {
    url.searchParams.set('users[0][institution]', body.company);
  }

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.exception) {
    return NextResponse.json({ error: data.message }, { status: 400 });
  }

  // data is an array of created users: [{ id, username }]
  if (Array.isArray(data) && data.length > 0) {
    if (body.role === 'organization') {
      const assignUrl = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
      assignUrl.searchParams.set('wstoken', ADMIN_TOKEN);
      assignUrl.searchParams.set('wsfunction', 'core_role_assign_roles');
      assignUrl.searchParams.set('moodlewsrestformat', 'json');
      assignUrl.searchParams.set('assignments[0][roleid]', '1');
      assignUrl.searchParams.set('assignments[0][userid]', String(data[0].id));
      assignUrl.searchParams.set('assignments[0][contextid]', '1');

      try {
        const assignRes = await fetch(assignUrl.toString());
        const assignData = await assignRes.json();
        if (assignData && assignData.exception) {
          console.error('[Signup Role Assignment Error]', assignData.message);
        } else {
          console.log(`Successfully assigned manager role to user ID ${data[0].id}`);
        }
      } catch (err) {
        console.error('[Signup Role Assignment Exception]', err);
      }
    }

    return NextResponse.json({ id: data[0].id, username: data[0].username });
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
