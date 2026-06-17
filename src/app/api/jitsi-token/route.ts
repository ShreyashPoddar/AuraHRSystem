import { NextResponse } from 'next/server';
import { createSign, randomUUID } from 'crypto';

/**
 * JaaS JWT Token Generator
 *
 * Generates a signed JWT for use with the 8x8 JaaS Jitsi service (8x8.vc).
 * Tokens grant either moderator (interviewer) or participant (candidate) access.
 *
 * Required environment variables:
 *   JAAS_APP_ID      — Your JaaS App ID (e.g. vpaas-magic-cookie-abc123)
 *   JAAS_API_KEY_ID  — Key ID (kid) from the JaaS dashboard
 *   JAAS_PRIVATE_KEY — RSA private key PEM (with \n escaped as \\n in .env)
 *
 * Usage (GET): /api/jitsi-token?room=ROOM_NAME&isModerator=true&name=John
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const JAAS_APP_ID      = process.env.JAAS_APP_ID || '';
const JAAS_API_KEY_ID  = process.env.JAAS_API_KEY_ID || '';

function parsePrivateKey(): string {
  // First attempt to read the .pem file from disk if it exists
  try {
    const pemPath = join(process.cwd(), 'jaas_private_key.pem');
    if (existsSync(pemPath)) {
      return readFileSync(pemPath, 'utf8').trim();
    }
  } catch (e) {
    console.error('Error reading jaas_private_key.pem from disk:', e);
  }

  const raw = process.env.JAAS_PRIVATE_KEY || '';
  // Handle both literal \n sequences (from .env) and real newlines
  let pem = raw.replace(/\\n/g, '\n');
  // If the key doesn't have actual newlines between PEM header/body/footer, reconstruct it
  if (!pem.includes('\n')) {
    // Key was stored as single flat line — add newlines at PEM boundaries
    pem = pem
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }
  return pem.trim();
}
const JAAS_PRIVATE_KEY = parsePrivateKey();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomParam   = searchParams.get('room') || 'default-room';
  const isModerator = searchParams.get('isModerator') === 'true';
  const name        = searchParams.get('name') || (isModerator ? 'Interviewer' : 'Candidate');
  const email       = searchParams.get('email') || `user@aurahr.local`;

  // Strip JAAS_APP_ID/ prefix if it already exists on the room parameter
  let room = roomParam;
  if (JAAS_APP_ID && room.startsWith(`${JAAS_APP_ID}/`)) {
    room = room.substring(JAAS_APP_ID.length + 1);
  }

  if (!JAAS_APP_ID || !JAAS_API_KEY_ID || !JAAS_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'JaaS credentials not configured. Set JAAS_APP_ID, JAAS_API_KEY_ID, and JAAS_PRIVATE_KEY in .env.local' },
      { status: 500 }
    );
  }

  const now = Math.floor(Date.now() / 1000);

  // ── JWT Header ───────────────────────────────────────────────────
  const kid = JAAS_API_KEY_ID.startsWith(`${JAAS_APP_ID}/`)
    ? JAAS_API_KEY_ID
    : `${JAAS_APP_ID}/${JAAS_API_KEY_ID}`;

  const header = {
    alg: 'RS256',
    kid,
    typ: 'JWT',
  };

  // ── JWT Payload ──────────────────────────────────────────────────
  // JaaS expects the room in the format: `appId/roomName`
  const payload = {
    iss: 'chat',
    aud: 'jitsi',
    iat: now,
    nbf: now - 300,           // 5 minutes in past to tolerate clock skew
    exp: now + 7200,          // 2 hours duration
    sub: JAAS_APP_ID,
    room: '*',                // Wildcard allows authorization for any room under this App ID
    context: {
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        'outbound-call': false,
      },
      user: {
        id: randomUUID(),
        name,
        email,
        avatar: '',
        moderator: isModerator,
      },
    },
  };

  // ── Sign with RS256 ──────────────────────────────────────────────
  try {
    const headerB64  = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sigInput   = `${headerB64}.${payloadB64}`;

    const signer = createSign('RSA-SHA256');
    signer.update(sigInput);
    const signature = signer.sign(JAAS_PRIVATE_KEY, 'base64url');

    const jwt = `${sigInput}.${signature}`;

    return NextResponse.json({ token: jwt, room: `${JAAS_APP_ID}/${room}` });
  } catch (err: any) {
    console.error('[JaaS JWT Error]', err.message);
    return NextResponse.json({ error: `Failed to sign JWT: ${err.message}` }, { status: 500 });
  }
}
