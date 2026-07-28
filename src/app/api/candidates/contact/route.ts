import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesClient } from '@/lib/aws';
import { SendEmailCommand } from '@aws-sdk/client-ses';

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

    if (isDryRun) {
      // Log the intended send rather than actually sending
      console.log('[DRY RUN] Email would have been sent:');
      console.log('  To:', candidateEmail);
      console.log('  Subject:', subject);
      console.log('  Body (HTML):', htmlBody);
    } else {
      // Send via AWS SES
      const command = new SendEmailCommand({
        Destination: { ToAddresses: [candidateEmail] },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: htmlBody,
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

    // Always write a ContactLog row when candidateId is present
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
