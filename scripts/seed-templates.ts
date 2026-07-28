/**
 * seed-templates.ts
 *
 * Seeds the EmailTemplate table with 3 starter templates for the
 * "Contact Candidate" feature.
 *
 * Run with:
 *   npx tsx scripts/seed-templates.ts
 */

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding email templates...');

  await prisma.emailTemplate.createMany({
    data: [
      {
        name: 'Application Received',
        category: 'general',
        subject: 'We received your application — {{jobTitle}}',
        body: `<div style="font-family: serif; background: #faf8f3; padding: 32px; border-radius: 12px; color: #2d2a24;">
  <h2 style="color: #c8a84b; margin-bottom: 16px;">Thank you for applying!</h2>
  <p>Dear <strong>{{candidateName}}</strong>,</p>
  <p>
    We are pleased to confirm that we have received your application for the
    <strong>{{jobTitle}}</strong> position at AuraHR.
  </p>
  <p>
    Our team will carefully review your profile and reach out with next steps.
    We appreciate your interest and the time you took to apply.
  </p>
  <p style="margin-top: 24px; color: #6b6456; font-size: 13px;">
    Warm regards,<br/>The AuraHR Recruitment Team
  </p>
</div>`,
      },
      {
        name: 'Request More Information',
        category: 'general',
        subject: 'Quick follow-up on your application — {{jobTitle}}',
        body: `<div style="font-family: serif; background: #faf8f3; padding: 32px; border-radius: 12px; color: #2d2a24;">
  <h2 style="color: #c8a84b; margin-bottom: 16px;">We'd love to learn more about you</h2>
  <p>Dear <strong>{{candidateName}}</strong>,</p>
  <p>
    Thank you for applying for the <strong>{{jobTitle}}</strong> role. We have been
    reviewing your application and would like to request a few additional details to
    help us better evaluate your candidacy.
  </p>
  <p>
    Could you please send us an updated resume and/or any additional information
    about your most recent experience that is relevant to this role? You can simply
    reply to this email.
  </p>
  <p>
    We look forward to hearing from you and appreciate your continued interest in
    joining AuraHR.
  </p>
  <p style="margin-top: 24px; color: #6b6456; font-size: 13px;">
    Warm regards,<br/>The AuraHR Recruitment Team
  </p>
</div>`,
      },
      {
        name: 'Not Moving Forward',
        category: 'rejection',
        subject: 'Update on your application — {{jobTitle}}',
        body: `<div style="font-family: serif; background: #faf8f3; padding: 32px; border-radius: 12px; color: #2d2a24;">
  <h2 style="color: #c8a84b; margin-bottom: 16px;">An update on your application</h2>
  <p>Dear <strong>{{candidateName}}</strong>,</p>
  <p>
    Thank you for your interest in the <strong>{{jobTitle}}</strong> position at AuraHR
    and for the time you invested in your application.
  </p>
  <p>
    After careful consideration, we have decided to move forward with other candidates
    whose experience more closely aligns with our current requirements. This was a
    difficult decision given the calibre of applications we received.
  </p>
  <p>
    We truly appreciate your effort and encourage you to apply for future openings
    that match your skills and experience. We will keep your profile on file for
    upcoming opportunities.
  </p>
  <p>
    We wish you all the best in your job search and future endeavours.
  </p>
  <p style="margin-top: 24px; color: #6b6456; font-size: 13px;">
    Kind regards,<br/>The AuraHR Recruitment Team
  </p>
</div>`,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Done — 3 email templates seeded.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
