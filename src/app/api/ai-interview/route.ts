import { NextResponse } from 'next/server';
import { getStructuredAIResponse } from '@/lib/neev';

export async function POST(req: Request) {
  try {
    const { role, answer, proctoringSignals } = await req.json();

    const proctoringNote = proctoringSignals?.length > 0 
      ? `[PROCTORING ALERT: Candidate switched tabs ${proctoringSignals.length} times]` 
      : "";

    const prompt = `
      You are an expert AI Interviewer for a **${role}** position.
      Candidate Answer: "${answer}"
      ${proctoringNote}

      Evaluate the answer and provide:
      1. Technical Accuracy (0-100)
      2. Communication Clarity (0-100)
      3. Cultural Fit (0-100)
      4. JD Relevance (0-100)
      5. Next Question: A deep-dive follow-up question.
      6. Sentiment: positive/neutral/negative.
      7. Reasoning: Brief notes for each metric.
    `;

    interface InterviewResponse {
      matrix: {
        technicalAccuracy: number;
        communicationClarity: number;
        culturalFit: number;
        jdRelevance: number;
        overall: number;
        sentiment: string;
        nextQuestion: string;
        reasoning: Record<string, string>;
      };
    }

    const evaluation = await getStructuredAIResponse<InterviewResponse>(prompt, 
      "You are a critical but fair technical interviewer. Return JSON."
    );

    return NextResponse.json(evaluation);

  } catch (error: any) {
    console.error("AI Interview Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
