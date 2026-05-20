import { NextResponse } from 'next/server';
import { getStructuredAIResponse } from '@/lib/neev';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { jdText, department } = await req.json();

    // 1. Get Existing Team Skills for Gap Analysis
    const teamMembers = await prisma.employee.findMany({
      where: { department: department || undefined },
      select: { skills: true, role: true }
    });

    const teamContext = JSON.stringify(teamMembers);

    // 2. LLM 4-Box Analysis
    const prompt = `
      Analyze this Job Description and the current Team Context.
      JD: "${jdText}"
      Team Context: ${teamContext}

      Provide a 4-box analysis:
      1. Must-Have: Mandatory technical skills.
      2. Good-to-Have: Supportive skills/experience.
      3. Future-Proof: Emerging skills (AI, cloud-native, etc.) that would make this hire strategic for 2025.
      4. Team-Gap: Skills that are MISSING or weak in the current team but needed for this role.
    `;

    interface JDAnalysis {
      role: string;
      mustHave: string[];
      goodToHave: string[];
      futureProof: string[];
      teamGap: string[];
      summary: string;
    }

    const analysis = await getStructuredAIResponse<JDAnalysis>(prompt, 
      "You are a technical hiring strategist. Return JSON with the 4-box breakdown."
    );

    if (!analysis) throw new Error("JD Analysis failed.");

    // 3. Save JD to DB for later matching
    const savedJD = await prisma.jobDescription.create({
      data: {
        role: analysis.role,
        description: jdText,
        mustHave: analysis.mustHave,
        goodToHave: analysis.goodToHave,
        futureProof: analysis.futureProof,
        teamGap: analysis.teamGap
      }
    });

    return NextResponse.json({ ...analysis, id: savedJD.id });

  } catch (error: any) {
    console.error("JD Parser Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
