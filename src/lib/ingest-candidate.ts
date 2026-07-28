/**
 * ingest-candidate.ts — Core business logic for Keka candidate ingestion.
 *
 * This module is the single source of truth for the 8-step pipeline.
 * It is consumed by both the single-record route (/api/keka/ingest) and
 * the batch route (/api/keka/ingest-batch). Route handlers only deal with
 * HTTP concerns (auth, parsing, status codes); all pipeline logic lives here.
 */

import { prisma } from '@/lib/prisma';
import {
  moodleAdminCreateUser,
  moodleAdminGetUserByEmail,
  moodleAdminApplyToJob,
} from '@/lib/moodle-server';

// ── Public constants ───────────────────────────────────────────────────────────

/** Maximum number of candidates processed concurrently in a batch. */
export const INGEST_CONCURRENCY = 5;

/** Maximum number of candidates accepted in a single batch request. */
export const INGEST_BATCH_MAX = 500;

// ── Public types ───────────────────────────────────────────────────────────────

export interface IngestCandidateInput {
  /** The raw Keka UUID. Null is accepted here; validation happens inside and
   *  produces an 'invalid_input' result rather than throwing. */
  kekaUuid: string | null;
  name: string;
  email: string;
  jdScore: number;
  /** Optional Moodle job ID (positive integer). Ignored if absent or non-integer. */
  jobId?: number;
}

export type IngestCandidateResult =
  | { status: 'created'; moodleId: number; candidateId: string }
  | { status: 'already_exists'; moodleId: number | null }
  | { status: 'moodle_failed'; error: string }
  | { status: 'partial_failure'; moodleId: number; error: string }
  | { status: 'invalid_input'; error: string };

// ── Private helpers ────────────────────────────────────────────────────────────

/**
 * Email activation stub. Accepts a stable (email, token) contract so any
 * call site survives a drop-in replacement with Resend, Nodemailer, etc.
 * Must never throw — all internal errors are caught and logged here.
 */
export async function sendActivationEmail(email: string, token: string): Promise<void> {
  try {
    console.log(
      `[Email Stub] Would send activation email to ${email.substring(0, 3)}*** ` +
      `with token ${token.substring(0, 8)}...`
    );
    // Replace this block with your real provider call, e.g.:
    // await resend.emails.send({ from: '...', to: email, subject: '...', html: '...' });
  } catch (err) {
    console.error('[Email Stub] Internal error (swallowed):', err);
  }
}

/**
 * Derives a secure temporary password from crypto.randomUUID() entropy.
 * Satisfies Moodle's default policy: ≥8 chars, upper, lower, digit, special.
 * Never stored, never logged.
 */
function generateTempPassword(): string {
  const uuid = crypto.randomUUID().replace(/-/g, ''); // 32 hex chars
  const upper = String.fromCharCode(65 + (parseInt(uuid.slice(0, 2), 16) % 26));
  const lower = String.fromCharCode(97 + (parseInt(uuid.slice(2, 4), 16) % 26));
  const digit = String.fromCharCode(48 + (parseInt(uuid.slice(4, 6), 16) % 10));
  const specials = '!@#$%^&*';
  const special = specials[parseInt(uuid.slice(6, 8), 16) % specials.length];
  const bulk = uuid.slice(8, 22); // 14 hex chars, always alphanumeric
  return `${upper}${lower}${digit}${special}${bulk}`;
}

// ── Core pipeline ──────────────────────────────────────────────────────────────

/**
 * Run the 8-step Keka candidate ingestion pipeline for a single candidate.
 * Returns a typed result union — never throws.
 */
export async function ingestCandidate(
  input: IngestCandidateInput
): Promise<IngestCandidateResult> {
  const { kekaUuid, name, email, jdScore, jobId } = input;

  // ── Input validation ────────────────────────────────────────────────────────
  if (!kekaUuid || typeof kekaUuid !== 'string' || kekaUuid.trim() === '') {
    return { status: 'invalid_input', error: 'Missing or invalid kekaUuid' };
  }
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { status: 'invalid_input', error: 'Missing or invalid name' };
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { status: 'invalid_input', error: 'Missing or invalid email' };
  }
  if (typeof jdScore !== 'number' || !isFinite(jdScore)) {
    return { status: 'invalid_input', error: 'Missing or invalid jdScore' };
  }

  // Resolve optional jobId — must be a positive integer.
  const resolvedJobId: number | null =
    typeof jobId === 'number' && Number.isInteger(jobId) && jobId > 0 ? jobId : null;

  // ── Step 0 — Name parsing ───────────────────────────────────────────────────
  const parts = name.trim().split(/\s+/);
  const firstname = parts[0]?.trim() || 'Unknown';
  const lastname = parts.slice(1).join(' ').trim() || 'Unknown';

  // ── Step 1 — Idempotency check ──────────────────────────────────────────────
  const [existingMoodleUser, existingPrismaCandidate] = await Promise.all([
    moodleAdminGetUserByEmail(email),
    prisma.candidate.findUnique({ where: { email }, select: { id: true } }),
  ]);

  if (existingMoodleUser || existingPrismaCandidate) {
    console.log(`[Ingest] Already exists, skipping: ${email.substring(0, 3)}***`);
    return { status: 'already_exists', moodleId: existingMoodleUser?.id ?? null };
  }

  // ── Step 2 — Generate password (never stored, never logged) ────────────────
  const tempPassword = generateTempPassword();

  // ── Step 3 — Create Moodle account ─────────────────────────────────────────
  let newMoodleId: number;
  try {
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const uuidSuffix = kekaUuid.replace(/-/g, '').slice(-4);
    const username = `${emailPrefix}_${uuidSuffix}`.substring(0, 100);

    const moodleUser = await moodleAdminCreateUser({
      username,
      password: tempPassword,
      firstname,
      lastname,
      email,
    });
    newMoodleId = moodleUser.id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Ingest] Step 3 — Moodle account creation failed:', message);
    return { status: 'moodle_failed', error: message };
  }

  // ── Step 4 — Create Prisma candidate record ─────────────────────────────────
  let prismaCandidate: { id: string };
  try {
    prismaCandidate = await prisma.candidate.create({
      data: {
        name,
        email,
        matchScore: Math.round(jdScore),
        status: 'APPLIED',
        kekaUuid,
        skills: [],
      },
      select: { id: true },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[Ingest] PARTIAL FAILURE: Moodle user created (id: ${newMoodleId}) but Prisma record failed. ` +
      `Manual reconciliation required. Error: ${message}`
    );
    return { status: 'partial_failure', moodleId: newMoodleId, error: message };
  }

  // ── Step 5 — Apply to job (conditional, non-fatal) ──────────────────────────
  if (resolvedJobId !== null) {
    try {
      await moodleAdminApplyToJob(resolvedJobId, newMoodleId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[Ingest] Job application failed for moodleId ${newMoodleId}, jobId ${resolvedJobId}: ${message}`
      );
    }
  }

  // ── Step 6 — Generate and store activation token ────────────────────────────
  let activationToken: string | null = null;
  try {
    const rawToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.activationToken.create({
      data: { token: rawToken, candidateId: prismaCandidate.id, expiresAt },
    });
    activationToken = rawToken;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[Ingest] Activation token failed for candidateId ${prismaCandidate.id} — manual activation needed. Error: ${message}`
    );
  }

  // ── Step 7 — Send activation email (stub) ──────────────────────────────────
  if (activationToken !== null) {
    await sendActivationEmail(email, activationToken);
  }

  // ── Step 8 — Return success ─────────────────────────────────────────────────
  return {
    status: 'created',
    moodleId: newMoodleId,
    candidateId: prismaCandidate.id,
  };
}
