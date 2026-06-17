/**
 * GET /api/moodle-check
 *
 * Diagnostic endpoint — runs three sequential checks and returns a JSON report:
 *   1. Is the Moodle host reachable at all? (HTTP GET to the Moodle homepage)
 *   2. Is the admin token valid? (core_webservice_get_site_info)
 *   3. Does the admin token have create_user capability?
 *      (dry-run core_user_create_users with deliberately bad data → expects
 *       a Moodle validation error, NOT a capability/auth error)
 *
 * Visit http://localhost:3000/api/moodle-check in your browser to run.
 * DELETE this file before deploying to production.
 */

import { NextResponse } from 'next/server';

const MOODLE_URL  = process.env.MOODLE_URL  || 'http://localhost/moodle';
const ADMIN_TOKEN = process.env.MOODLE_ADMIN_TOKEN || '';

export async function GET() {
  const report: Record<string, unknown> = {
    config: {
      MOODLE_URL,
      ADMIN_TOKEN: ADMIN_TOKEN ? ADMIN_TOKEN.substring(0, 8) + '...' : '(NOT SET)',
    },
  };

  // ── Check 1: Reachability ────────────────────────────────────────────────
  try {
    const pingRes = await fetch(`${MOODLE_URL}`, { signal: AbortSignal.timeout(5000) });
    report.check1_reachability = {
      ok: true,
      status: pingRes.status,
      url: MOODLE_URL,
    };
  } catch (e: unknown) {
    const err = e as Error & { cause?: { code?: string } };
    report.check1_reachability = {
      ok: false,
      error: err.message,
      code: err.cause?.code ?? null,
      diagnosis:
        err.cause?.code === 'ECONNREFUSED'
          ? '❌ XAMPP/Apache is not running on this port, or the URL/port in MOODLE_URL is wrong.'
          : err.message?.includes('timeout')
          ? '❌ Connection timed out — firewall or wrong host?'
          : '❌ Unknown network error.',
    };
    // No point continuing if host is unreachable.
    return NextResponse.json(report, { status: 200 });
  }

  // ── Check 2: Admin token validity ─────────────────────────────────────────
  if (!ADMIN_TOKEN) {
    report.check2_admin_token = { ok: false, error: 'MOODLE_ADMIN_TOKEN is not set in .env.local' };
    return NextResponse.json(report, { status: 200 });
  }

  try {
    const siteInfoUrl =
      `${MOODLE_URL}/webservice/rest/server.php` +
      `?wstoken=${ADMIN_TOKEN}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`;
    const siteRes  = await fetch(siteInfoUrl, { signal: AbortSignal.timeout(8000) });
    const siteData = await siteRes.json() as Record<string, unknown>;

    if (siteData.exception) {
      report.check2_admin_token = {
        ok: false,
        errorcode: siteData.errorcode,
        message: siteData.message,
        diagnosis:
          siteData.errorcode === 'invalidtoken'
            ? '❌ Token is wrong or expired. Re-generate it in Moodle → Site Admin → Web Services → Manage Tokens.'
            : siteData.errorcode === 'servicenotavailable'
            ? '❌ The web service is disabled. Enable it in Moodle → Site Admin → Advanced Features → Enable web services.'
            : '❌ Moodle rejected the token — see message above.',
      };
    } else {
      report.check2_admin_token = {
        ok: true,
        sitename: siteData.sitename,
        username: siteData.username,
        functions: (siteData.functions as Array<{ name: string }>)
          ?.map((f) => f.name)
          .filter((n) => n.includes('user') || n.includes('aurahr'))
          .slice(0, 20),
      };
    }
  } catch (e: unknown) {
    report.check2_admin_token = { ok: false, error: (e as Error).message };
    return NextResponse.json(report, { status: 200 });
  }

  // ── Check 3: create_users capability (intentional bad-data dry run) ───────
  try {
    // Send intentionally missing required fields — if the token has the right
    // capability, Moodle returns a field-validation error (not auth/capability error).
    const dryRunUrl =
      `${MOODLE_URL}/webservice/rest/server.php` +
      `?wstoken=${ADMIN_TOKEN}&wsfunction=core_user_create_users&moodlewsrestformat=json` +
      `&users[0][username]=__dryrun_probe__&users[0][firstname]=Test&users[0][lastname]=Probe` +
      `&users[0][email]=invalid-email-intentional&users[0][password]=BadPwd1`;
    const dryRes  = await fetch(dryRunUrl, { signal: AbortSignal.timeout(8000) });
    const dryData = await dryRes.json() as Record<string, unknown>;

    if (dryData.exception) {
      const code = String(dryData.errorcode ?? '');
      const isCapabilityError = code.includes('nopermission') || code.includes('accessdenied') || code.includes('forbidden');
      report.check3_create_users_capability = {
        ok: !isCapabilityError,
        errorcode: code,
        message: dryData.message,
        diagnosis: isCapabilityError
          ? `❌ Admin token does NOT have core_user_create_users permission. Add it to the "${process.env.MOODLE_SERVICE || 'aurahr_jobs'}" web service in Moodle.`
          : `✅ Token has capability. Moodle rejected the dry-run data as expected (errorcode: ${code}).`,
      };
    } else if (Array.isArray(dryData)) {
      // Unlikely — would mean it actually created a user with bad data. Clean up manually.
      report.check3_create_users_capability = {
        ok: true,
        warning: '⚠️ Dry-run probe accidentally created a user — delete __dryrun_probe__ from Moodle admin.',
        createdId: (dryData[0] as { id?: number })?.id,
      };
    }
  } catch (e: unknown) {
    report.check3_create_users_capability = { ok: false, error: (e as Error).message };
  }

  return NextResponse.json(report, { status: 200 });
}
