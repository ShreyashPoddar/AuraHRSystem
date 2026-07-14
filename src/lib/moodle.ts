/**
 * Moodle Web Services API Client for AuraHR.
 *
 * All backend communication flows through Moodle's REST Web Services:
 *   Next.js Client → /api/moodle (proxy) → Moodle /webservice/rest/server.php
 *
 * The proxy hides the Moodle token server-side. The client sends
 * the user's auth token which is forwarded by the proxy.
 */

// ── Types ────────────────────────────────────────────────────────

export interface MoodleError {
  exception: string;
  errorcode: string;
  message: string;
  debuginfo?: string;
}

export interface MoodleLoginResponse {
  token: string;
  privatetoken?: string;
}

export interface MoodleUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  // Custom fields for role detection.
  roles?: Array<{ roleid: number; shortname: string }>;
  role?: string;
}

export interface SignupData {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'organization' | 'candidate';
  company?: string;
}

// ── Cookie helpers ───────────────────────────────────────────────

const TOKEN_KEY = 'aurahr_token';
const USER_KEY  = 'aurahr_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string): void {
  // Secure, SameSite=Strict, 7-day expiry.
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; expires=${expires}; SameSite=Strict`;
}

export function clearToken(): void {
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${USER_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getStoredUser(): MoodleUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${USER_KEY}=([^;]*)`));
    return match ? JSON.parse(decodeURIComponent(match[1])) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: MoodleUser): void {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${USER_KEY}=${encodeURIComponent(JSON.stringify(user))}; path=/; expires=${expires}; SameSite=Strict`;
}

// ── Core API call ────────────────────────────────────────────────

/**
 * Call a Moodle Web Service function via the Next.js proxy.
 *
 * @param wsfunction - The Moodle web service function name (e.g., 'local_aurahr_jobs_list_jobs')
 * @param params     - Key-value parameters to pass to the function
 * @returns          - Typed response from Moodle
 * @throws           - Error with Moodle's error message on failure
 */
export async function moodleCall<T>(
  wsfunction: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch('/api/moodle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wsfunction, params, token }),
  });

  if (!res.ok) {
    throw new Error(`Moodle proxy error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Moodle returns { exception, errorcode, message } on errors.
  if (data && data.exception) {
    const err = data as MoodleError;
    throw new Error(`[${err.errorcode}] ${err.message}`);
  }

  return data as T;
}

// ── Auth functions ───────────────────────────────────────────────

/**
 * Authenticate a user via Moodle's token endpoint.
 * On success, stores the token in a cookie and fetches user profile.
 */
export async function moodleLogin(
  username: string,
  password: string
): Promise<{ token: string; user: MoodleUser }> {
  const res = await fetch('/api/moodle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      username,
      password,
    }),
  });

  // Always parse the body first — even on non-OK responses the proxy returns
  // a JSON { error: "..." } with the actual Moodle reason.
  const data = await res.json().catch(() => ({})) as { token?: string; user?: MoodleUser; error?: string };

  if (!res.ok || data.error) {
    throw new Error(data.error || 'Login failed. Please check your credentials.');
  }

  const { token, user } = data as { token: string; user: MoodleUser };

  setToken(token);
  setStoredUser(user);

  return { token, user };
}

/**
 * Create a new user account via Moodle's user creation web service.
 */
export async function moodleSignup(data: SignupData): Promise<{ id: number }> {
  const res = await fetch('/api/moodle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'signup',
      ...data,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Signup failed. Please try again.');
  }

  return await res.json();
}

/**
 * Log out — clear stored credentials.
 */
export function moodleLogout(): void {
  clearToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
