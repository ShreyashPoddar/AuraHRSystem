// ── Module-level token cache ──────────────────────────────────────────────────
// Stores the token and expiry time across all calls within the same server
// process lifetime. This prevents hammering login.keka.com once per candidate
// during bulk operations, which causes ConnectTimeoutError / ENOTFOUND crashes.
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getKekaAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60-second safety buffer already applied)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('[Keka Auth] Returning cached token, expires in', Math.round((tokenExpiry - Date.now()) / 1000), 's');
    return cachedToken;
  }

  const clientId = process.env.KEKA_CLIENT_ID;
  const clientSecret = process.env.KEKA_CLIENT_SECRET;
  const apiKey = process.env.KEKA_API_KEY;

  if (!clientId || !clientSecret || !apiKey) {
    throw new Error('Missing Keka API credentials in environment variables.');
  }

  // Use kekademo.com if sandbox is enabled, otherwise use production domain
  const domain = process.env.KEKA_IS_SANDBOX === 'true' ? 'login.kekademo.com' : 'login.keka.com';
  const url = `https://${domain}/connect/token`;

  const body = new URLSearchParams({
    grant_type: 'kekaapi',
    client_id: clientId,
    client_secret: clientSecret,
    api_key: apiKey,
    scope: 'kekaapi',
  });

  try {
    console.log('[Keka Auth] Fetching fresh access token from', domain);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Keka auth failed:', response.status, errorText);
      throw new Error(`Failed to authenticate with Keka API: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('No access_token returned from Keka API');
    }

    // Cache the token. Subtract 60 seconds from expires_in as a safety buffer
    // to avoid using a token that's about to expire mid-bulk-operation.
    const expiresInMs = ((data.expires_in ?? 3600) - 60) * 1000;
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + expiresInMs;
    console.log('[Keka Auth] Token cached, valid for', Math.round(expiresInMs / 1000), 's');

    return cachedToken;
  } catch (error) {
    // Invalidate cache on error so the next call retries the auth
    cachedToken = null;
    tokenExpiry = null;
    console.error('Error in getKekaAccessToken:', error);
    throw error;
  }
}
