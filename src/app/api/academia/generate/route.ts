import { NextResponse } from 'next/server';
import { getStructuredAIResponse } from '@/lib/neev';

interface Question {
  id: string;
  type: 'mcq' | 'text';
  question: string;
  options?: string[];
  correctAnswer?: string;
}

interface AssessmentResponse {
  questions: Question[];
}

export async function POST(request: Request) {
  try {
    const { role, skills } = await request.json();
    
    const prompt = `
Please generate a 5-question technical assessment for a candidate applying for the role of "${role || 'Software Engineer'}".
The candidate has the following skills: ${skills || 'General programming'}.

Generate exactly 3 Multiple Choice Questions (mcq) and 2 Descriptive (text) questions that test these specific skills.
Format your response exactly as the requested JSON object.

Required JSON Structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B"
    },
    {
      "id": "q4",
      "type": "text",
      "question": "A descriptive technical question requiring a short written answer"
    }
  ]
}
`;

    const systemPrompt = "You are an expert technical interviewer and AI assessor. Return ONLY valid JSON containing the array of questions.";
    
    const parsedData = await getStructuredAIResponse<AssessmentResponse>(prompt, systemPrompt);

    if (!parsedData || !parsedData.questions) {
      throw new Error('LLM returned empty or invalid response');
    }

    return NextResponse.json({ 
      success: true, 
      questions: parsedData.questions
    });
    
  } catch (error: any) {
    console.error('Failed to generate academia assessment:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate assessment' }, { status: 500 });
  }
}
