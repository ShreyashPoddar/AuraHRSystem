import { NextRequest, NextResponse } from 'next/server';
import { fetchCandidateResume } from '@/lib/kekaHire';

import { parseResumeWithOCRSpace } from '@/lib/ocr_service';
import { getStructuredAIResponse } from '@/lib/neev';

const MOODLE_URL  = process.env.MOODLE_URL  || 'http://localhost/moodle';
const ADMIN_TOKEN = process.env.MOODLE_ADMIN_TOKEN || '';

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch (e) {
    // fallback to query params if not JSON
  }

  const searchParams = request.nextUrl.searchParams;
  const candidateId = body.id || searchParams.get('id');
  const candidateEmail = body.email || searchParams.get('email') || '';
  const jobDescription = body.jobDescription || '';

  if (!candidateId) {
    return NextResponse.json(
      { success: false, error: 'Missing candidate id query parameter (e.g., ?id=123)' },
      { status: 400 }
    );
  }

  if (!ADMIN_TOKEN) {
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration: MOODLE_ADMIN_TOKEN is not set.' },
      { status: 500 }
    );
  }

  // ── Step 1: Fetch resume from Keka and convert to base64 ──────────────────
  let base64Data: string;
  let filename: string;
  try {
    const result = await fetchCandidateResume(candidateId);

    if (result && result.error) {
      return NextResponse.json({ success: false, ...result }, { status: 500 });
    }

    base64Data = result.base64Data;
    filename = result.filename || 'resume.pdf';
  } catch (error: any) {
    console.error('[Keka Resume Fetch Error]', error.message);
    return NextResponse.json(
      { success: false, error: `Failed to retrieve resume from Keka: ${error.message}` },
      { status: 500 }
    );
  }

  // ── Step 2: Forward base64 resume to Moodle JD Parser ────────────────────
  // Uses the same bracket-notation POST pattern as the Moodle proxy route to
  // avoid URLSearchParams percent-encoding '[' and ']', which Moodle rejects.
  try {
    const moodleEndpoint = `${MOODLE_URL}/webservice/rest/server.php`;

    const pairs: [string, string][] = [
      ['wstoken',           ADMIN_TOKEN],
      ['wsfunction',        'local_aurahr_jobs_upload_resume'],
      ['moodlewsrestformat','json'],
      ['filename',          filename],
      ['base64data',        base64Data],   // pure base64, no MIME prefix
    ];

    const body = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    console.log(`[Moodle Upload Resume] Calling local_aurahr_jobs_upload_resume for candidate ${candidateId}`);

    const moodleRes = await fetch(moodleEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const rawText = await moodleRes.text();
    console.log('[Moodle Upload Resume Raw Response]', rawText);

    let moodleResponse: any;
    try {
      moodleResponse = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Moodle returned a non-JSON response. Check Moodle logs.', raw: rawText.substring(0, 500) },
        { status: 500 }
      );
    }

    // Surface Moodle-level exceptions cleanly
    if (moodleResponse?.exception) {
      console.error('[Moodle Upload Resume Exception]', moodleResponse.message, moodleResponse.debuginfo ?? '');
      return NextResponse.json(
        { success: false, error: moodleResponse.message, debuginfo: moodleResponse.debuginfo },
        { status: 500 }
      );
    }

    // ── Step 3: Local AI Parsing ───────────────────────────────────────────────
    // Extract text from the PDF buffer
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const resumeText = await parseResumeWithOCRSpace(fileBuffer, filename);

    // Call Neev AI to score the resume against the provided Job Description
    const prompt = `Evaluate the following resume against this job description and output a match score out of 100.
Job Description:
${jobDescription}

Resume Text:
${resumeText}`;
    
    const systemPrompt = "You are an expert HR recruitment evaluator. Return a JSON object with 'score' (number) and 'feedback' (string).";
    const aiResult = await getStructuredAIResponse<{score: number, feedback: string}>(prompt, systemPrompt);
    
    // Default to the generated score or fallback to 0
    const calculatedScore = aiResult?.score || 0;

    return NextResponse.json({
      success: true,
      message: 'Candidate synced and parsed successfully',
      jdScore: calculatedScore,
      analysis: aiResult || { score: calculatedScore, feedback: "Fallback AI evaluation" },
    });

  } catch (error: any) {
    console.error('[Moodle Upload Resume Error]', error.message);
    return NextResponse.json(
      { success: false, error: `Failed to forward resume to Moodle: ${error.message}` },
      { status: 500 }
    );
  }
}
