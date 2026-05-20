import { NextResponse } from 'next/server';
import { getDb, saveDb, AcademicQuestion } from '@/lib/db';
import { getStructuredAIResponse } from '@/lib/neev';

export async function POST(req: Request) {
  try {
    const { candidateId, role } = await req.json();
    const db = await getDb();
    const candidate = db.candidates.find(c => c.id === candidateId);

    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

    const prompt = `
      You are an expert technical examiner for a **${role}** position.
      Generate 10 academic/technical questions for a written test.
      - 5 Multiple Choice Questions (MCQs) with 4 options and 1 correct answer.
      - 5 Short Answer Questions.
      
      Return a JSON array of objects with:
      id, question, type ('mcq' | 'text'), options (string[] for mcq), correctAnswer (string).
    `;

    const questions = await getStructuredAIResponse<AcademicQuestion[]>(prompt, 
      "You are a strict technical professor. Return perfect JSON array."
    ) || [];

    candidate.academicAssessment = {
      id: `acad_${Date.now()}`,
      questions,
      submissions: [],
      totalScore: 0
    };

    await saveDb(db);
    return NextResponse.json({ success: true, questions });

  } catch (error: any) {
    console.error("Academia Generate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
