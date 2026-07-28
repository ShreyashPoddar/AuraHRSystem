/**
 * /api/candidates/manual-upload
 *
 * Admin-only route that accepts a resume file upload, runs OCR + AI scoring,
 * and ingests the candidate into Moodle + Prisma via the shared ingest pipeline.
 *
 * Mirrors the exact same resume-storage step used in /api/keka/fetch-resume.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationSession } from '@/lib/auth-server';
import { parseResumeWithOCRSpace } from '@/lib/ocr_service';
import { getStructuredAIResponse } from '@/lib/neev';
import { ingestCandidate } from '@/lib/ingest-candidate';

export const dynamic = 'force-dynamic';

const MOODLE_URL   = process.env.MOODLE_URL   || 'http://localhost/moodle';
const ADMIN_TOKEN  = process.env.MOODLE_ADMIN_TOKEN || '';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const session = await requireOrganizationSession(request);
  if (session instanceof NextResponse) return session;

  try {
    // ── Parse multipart form data ──────────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid multipart/form-data payload.' },
        { status: 400 }
      );
    }

    const file           = formData.get('file') as File | null;
    const firstname      = (formData.get('firstname') as string | null)?.trim();
    const lastname       = (formData.get('lastname')  as string | null)?.trim();
    const email          = (formData.get('email')     as string | null)?.trim();
    const jobIdRaw       = formData.get('jobId');
    const jobDescription = (formData.get('jobDescription') as string | null) || '';

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!file || !firstname || !lastname || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, firstname, lastname, email.' },
        { status: 400 }
      );
    }

    const jobId = jobIdRaw ? Number(jobIdRaw) : NaN;
    if (!Number.isInteger(jobId) || jobId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing jobId. Must be a positive integer.' },
        { status: 400 }
      );
    }

    // ── Convert uploaded file to Buffer ────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    const filename    = file.name || 'resume.pdf';

    // ── Step 1: OCR — extract text from the resume ─────────────────────────────
    let resumeText = '';
    try {
      resumeText = await parseResumeWithOCRSpace(buffer, filename);
    } catch (ocrErr: any) {
      console.error('[ManualUpload] OCR failed:', ocrErr.message);
      resumeText = ''; // fall through — AI will score 0 gracefully
    }

    // ── Step 2: AI scoring — exact same prompt as fetch-resume/route.ts ────────
    let calculatedScore = 0;
    let analysis: { score: number; feedback: string } = {
      score: 0,
      feedback: 'Failed to parse resume or evaluate candidate.',
    };

    try {
      const systemPrompt = `You are an expert, highly objective HR recruitment evaluator. Your job is to calculate a strict match score (0-100) between a candidate's resume and a job description. \n\nYou MUST return ONLY a valid JSON object with the following structure: { "score": number, "feedback": "string" }.`;

      const prompt = `Evaluate the resume against the job description using this strict rubric:
1. Core Skills (40 points): Does the candidate have the exact technical skills and tools listed? Subtract points for missing mandatory skills.
2. Experience & Seniority (30 points): Does the candidate's years of experience and scope of past roles align with the job's level?
3. Education & Certifications (15 points): Do they hold the required degrees or certifications?
4. Domain Relevance (15 points): Is their past industry experience relevant to this specific role?

Calculate the sum and return it as the 'score'. Keep 'feedback' under 3 sentences, explaining the biggest gaps.

Job Description:
${jobDescription}

Resume Text:
${resumeText}`;

      console.log('--- [ManualUpload] AI INPUT VALIDATION ---');
      console.log('Resume Text Length:', resumeText?.length || 0);
      console.log('Job Description Length:', jobDescription?.length || 0);

      const aiResult = await getStructuredAIResponse<{ score: number; feedback: string }>(prompt, systemPrompt);
      if (aiResult && typeof aiResult.score === 'number') {
        calculatedScore = aiResult.score;
        analysis        = aiResult;
      }
    } catch (aiErr: any) {
      console.error('[ManualUpload] AI scoring failed:', aiErr.message);
      // Graceful fallback — ingest still proceeds with score 0
    }

    // ── Step 3: Ingest candidate into Moodle + Prisma ─────────────────────────
    const kekaUuid = crypto.randomUUID(); // unique synthetic UUID — no real Keka ID
    const ingestResult = await ingestCandidate({
      kekaUuid,
      name:    `${firstname} ${lastname}`,
      email,
      jdScore: calculatedScore,
      jobId,
    });

    // ── Handle non-created statuses ────────────────────────────────────────────
    if (ingestResult.status === 'already_exists') {
      return NextResponse.json(
        { success: false, error: 'A candidate with this email already exists.' },
        { status: 409 }
      );
    }

    if (ingestResult.status === 'invalid_input') {
      console.error('[ManualUpload] ingestCandidate returned invalid_input:', ingestResult.error);
      return NextResponse.json(
        { success: false, error: `Validation failed: ${ingestResult.error}` },
        { status: 400 }
      );
    }

    if (ingestResult.status === 'moodle_failed') {
      console.error('[ManualUpload] ingestCandidate moodle_failed:', ingestResult.error);
      return NextResponse.json(
        { success: false, error: `Moodle account creation failed: ${ingestResult.error}` },
        { status: 502 }
      );
    }

    if (ingestResult.status === 'partial_failure') {
      console.error('[ManualUpload] ingestCandidate partial_failure:', ingestResult.error);
      return NextResponse.json(
        { success: false, error: `Candidate partially created (Moodle OK, Prisma failed): ${ingestResult.error}` },
        { status: 207 }
      );
    }

    // ── Step 4: Store resume in Moodle (same bracket-notation POST as fetch-resume) ──
    // Only when ingest returned 'created' (we have a valid moodleId).
    const moodleId = ingestResult.moodleId;
    const base64Data = buffer.toString('base64');

    try {
      const moodleEndpoint = `${MOODLE_URL}/webservice/rest/server.php`;

      const pairs: [string, string][] = [
        ['wstoken',            ADMIN_TOKEN],
        ['wsfunction',         'local_aurahr_jobs_upload_resume'],
        ['moodlewsrestformat', 'json'],
        ['userid',             String(moodleId)],
        ['filename',           filename],
        ['base64data',         base64Data],
      ];

      const bodyStr = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

      console.log(`[ManualUpload] Storing resume in Moodle for moodleId=${moodleId}`);

      const moodleRes  = await fetch(moodleEndpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    bodyStr,
      });

      const rawText = await moodleRes.text();
      console.log('[ManualUpload] Moodle upload_resume response:', rawText);

      let moodleResponse: any;
      try {
        moodleResponse = JSON.parse(rawText);
      } catch {
        // Non-JSON response — log but don't fail the whole request
        console.warn('[ManualUpload] Moodle returned non-JSON for resume upload:', rawText.substring(0, 300));
      }

      if (moodleResponse?.exception) {
        console.error('[ManualUpload] Moodle resume upload exception:', moodleResponse.message, moodleResponse.debuginfo ?? '');
        // Log but don't fail — candidate is already ingested
      }
    } catch (storeErr: any) {
      // Non-fatal: candidate is created; just log the resume storage failure
      console.error('[ManualUpload] Failed to store resume in Moodle:', storeErr.message);
    }

    // ── Success ────────────────────────────────────────────────────────────────
    return NextResponse.json({
      success:      true,
      jdScore:      calculatedScore,
      analysis,
      ingestResult,
    });
  } catch (err: any) {
    console.error('[ManualUpload] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
