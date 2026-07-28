import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesClient } from '@/lib/aws';
import { SendEmailCommand } from '@aws-sdk/client-ses';

// ── Plain-text → HTML conversion ──────────────────────────────────────────────
// Converts a plain-text email body into a simple styled HTML email, matching
// the visual style used in sendInterviewInvite (src/lib/aws.ts).
// The original plain text is preserved separately for the ContactLog.
function plainTextToHtml(text: string): string {
  // 1. Escape HTML special characters so names/titles with & < > don't break rendering
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 2. Split on double newlines to get paragraphs, then convert single \n to <br/>
  const paragraphs = escaped
    .split(/\n\n/)
    .map((para) => para.replace(/\n/g, '<br/>'))
    .map((para) => `<p>${para}</p>`)
    .join('\n');

  // 3. Wrap in the AuraHR-standard styled container (matches sendInterviewInvite)
  return `<div style="font-family: serif; background: #faf8f3; padding: 32px; border-radius: 12px; color: #2d2a24;">\n${paragraphs}\n</div>`;
}

// GET /api/candidates/contact — returns all email templates ordered by newest first
export async function GET() {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ templates });
  } catch (err) {
    console.error('[GET /api/candidates/contact] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch email templates.' }, { status: 500 });
  }
}

// POST /api/candidates/contact — send (or dry-run) an email and log it
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { candidateId, candidateEmail, templateId, subject, htmlBody, sentBy } = body;

    // Validate required fields
    if (!candidateEmail || !subject || !htmlBody) {
      return NextResponse.json(
        { error: 'Missing required fields: candidateEmail, subject, htmlBody.' },
        { status: 400 }
      );
    }

    const isDryRun = process.env.EMAIL_DRY_RUN === 'true';
    const sender = process.env.SES_SENDER_EMAIL || 'hr@aurahr.com';

    // Convert the plain-text body submitted by the UI into styled HTML for sending.
    // The original plain text (htmlBody) is kept as-is for the ContactLog so it stays
    // human-readable in the audit trail.
    const renderedHtml = plainTextToHtml(htmlBody);

    if (isDryRun) {
      // Log the intended send rather than actually sending
      console.log('[DRY RUN] Email would have been sent:');
      console.log('  To:', candidateEmail);
      console.log('  Subject:', subject);
      console.log('  Body (plain text, pre-conversion):', htmlBody);
      console.log('  Body (rendered HTML):', renderedHtml);
    } else {
      // Send via AWS SES using the rendered HTML
      const command = new SendEmailCommand({
        Destination: { ToAddresses: [candidateEmail] },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: renderedHtml,
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: subject,
          },
        },
        Source: sender,
      });
      await sesClient.send(command);
    }

    // Always write a ContactLog row when candidateId is present.
    // Store the original plain text in body — NOT the rendered HTML — so the log
    // is human-readable when reviewed later.
    if (candidateId) {
      await prisma.contactLog.create({
        data: {
          candidateId: String(candidateId),
          templateId: templateId || null,
          subject,
          body: htmlBody,
          sentBy: sentBy || 'unknown',
        },
      });
    }

    return NextResponse.json({ success: true, dryRun: isDryRun });
  } catch (err) {
    console.error('[POST /api/candidates/contact] Error:', err);
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
}
