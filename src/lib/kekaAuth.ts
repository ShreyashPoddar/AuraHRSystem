export async function getKekaAccessToken(): Promise<string> {
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

    return data.access_token;
  } catch (error) {
    console.error('Error in getKekaAccessToken:', error);
    throw error;
  }
}
