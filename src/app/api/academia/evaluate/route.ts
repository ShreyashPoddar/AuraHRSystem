import { NextResponse } from 'next/server';
import { getStructuredAIResponse } from '@/lib/neev';

interface EvaluateResponse {
  score: number;
  feedback: string;
}

export async function POST(request: Request) {
  try {
    const { questions, answers } = await request.json();

    if (!questions || !answers) {
      return NextResponse.json({ error: 'Questions and answers are required' }, { status: 400 });
    }

    // Programmatic MCQ Grading
    let totalMcq = 0;
    let correctMcq = 0;
    let hasDescriptive = false;
    const descriptiveIndices: number[] = [];

    questions.forEach((q: any, i: number) => {
      const isMcq = Array.isArray(q.options) && q.options.length > 0 && q.correct !== undefined && q.correct !== null;
      if (isMcq) {
        totalMcq++;
        const correctIndex = q.correct;
        const correctText = q.options[correctIndex] || '';
        const candidateAnswer = answers[i]?.candidateAnswer || '';
        if (candidateAnswer.trim().toLowerCase() === correctText.trim().toLowerCase()) {
          correctMcq++;
        }
      } else {
        hasDescriptive = true;
        descriptiveIndices.push(i);
      }
    });

    const mcqScore = totalMcq > 0 ? (correctMcq / totalMcq) * 100 : 0;

    // If there are only MCQ questions, return score immediately without calling LLM
    if (!hasDescriptive) {
      const finalScore = Math.round(mcqScore);
      return NextResponse.json({
        success: true,
        score: finalScore,
        feedback: `All questions were multiple choice. The candidate answered ${correctMcq} out of ${totalMcq} questions correctly.`
      });
    }

    // Prepare Prompt for descriptive questions evaluation
    const prompt = `
Please evaluate a candidate's answers to a technical assessment.

Questions:
${JSON.stringify(questions, null, 2)}

Candidate Answers:
${JSON.stringify(answers, null, 2)}

Calculate an overall score from 0 to 100 based on the correctness and quality of their answers.
For multiple-choice questions, grade them strictly against the correct answer (provided index 'correct' inside each question).
For descriptive/text questions, evaluate them fairly based on technical accuracy and completeness.

Return a JSON object strictly following this structure:
{
  "score": 85,
  "feedback": "The candidate did well on X but struggled with Y."
}
`;

    const systemPrompt = "You are an expert technical assessor and AI evaluator. Return ONLY valid JSON.";
    
    let parsedData: EvaluateResponse | null = null;
    try {
      parsedData = await getStructuredAIResponse<EvaluateResponse>(prompt, systemPrompt);
    } catch (aiError) {
      console.error('LLM evaluation failed, using fallback calculations:', aiError);
    }

    if (parsedData && parsedData.score !== undefined) {
      return NextResponse.json({ 
        success: true, 
        score: parsedData.score,
        feedback: parsedData.feedback
      });
    }

    // Fallback scoring logic for descriptive + MCQ mix when LLM fails
    let descriptiveScoreTotal = 0;
    let descriptiveCount = 0;
    descriptiveIndices.forEach(idx => {
      descriptiveCount++;
      const ans = answers[idx]?.candidateAnswer;
      if (ans && ans !== 'No answer provided' && ans.trim().length > 10) {
        descriptiveScoreTotal += 70; // Assign a reasonable 70% for answered descriptive items
      }
    });
    const descriptiveAvg = descriptiveCount > 0 ? (descriptiveScoreTotal / descriptiveCount) : 0;
    const mcqWeight = totalMcq / questions.length;
    const descWeight = 1 - mcqWeight;
    const finalFallbackScore = Math.round((mcqScore * mcqWeight) + (descriptiveAvg * descWeight));

    return NextResponse.json({
      success: true,
      score: finalFallbackScore,
      feedback: `Fallback Evaluation: MCQs graded programmatically (${correctMcq}/${totalMcq} correct). Descriptive questions estimated due to temporary service unavailability.`
    });

  } catch (error: any) {
    console.error('Failed to evaluate assessment:', error);
    return NextResponse.json({ error: error.message || 'Failed to evaluate assessment' }, { status: 500 });
  }
}
