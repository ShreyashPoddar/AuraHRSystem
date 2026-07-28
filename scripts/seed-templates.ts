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
        body: `Dear {{candidateName}},

Thank you for applying for the {{jobTitle}} role at AuraHR. We're currently reviewing your application and will be in touch soon with an update.

We appreciate your interest in joining our team.

Warm regards,
The AuraHR Recruitment Team`,
      },
      {
        name: 'Request More Information',
        category: 'general',
        subject: 'Quick follow-up on your application — {{jobTitle}}',
        body: `Dear {{candidateName}},

Thank you for applying for the {{jobTitle}} role at AuraHR. We've been reviewing your application and would love to learn a bit more about you.

Could you please send us an updated resume and any additional information about your most recent experience that's relevant to this role? You can simply reply to this email.

We look forward to hearing from you and appreciate your continued interest in joining AuraHR.

Warm regards,
The AuraHR Recruitment Team`,
      },
      {
        name: 'Not Moving Forward',
        category: 'rejection',
        subject: 'Update on your application — {{jobTitle}}',
        body: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at AuraHR and for the time you invested in your application.

After careful consideration, we've decided to move forward with other candidates whose experience more closely aligns with our current requirements. This was a difficult decision given the calibre of applications we received.

We truly appreciate your effort and encourage you to apply for future openings that match your skills and experience. We'll keep your profile on file for upcoming opportunities.

We wish you all the best in your job search and future endeavours.

Kind regards,
The AuraHR Recruitment Team`,
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
