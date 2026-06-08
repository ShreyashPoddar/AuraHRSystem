import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { getStructuredAIResponse } from '@/lib/neev';

interface RawParsedData {
  bio: string;
  technical_skills: string[];
  non_technical_skills: string[];
  experience: { role: string; company: string; achievements: string[] }[];
  education: { degree: string; institution: string; year: string }[];
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No resume file uploaded' }, { status: 400 });
    }

    // Convert the File object to a Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the PDF text
    let resumeText = '';
    try {
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();
      resumeText = pdfData.text;
      await parser.destroy();
    } catch (err) {
      console.error('Failed to parse PDF text:', err);
      return NextResponse.json({ error: 'Failed to extract text from the provided PDF.' }, { status: 400 });
    }

    // Prepare the prompt for the LLM
    const prompt = `
Please extract all information from the resume and format it strictly as a JSON object matching this schema.

Required JSON Structure:
{
  "bio": "A professional 2-3 sentence summary of the candidate's background",
  "technical_skills": ["Skill 1", "Skill 2"],
  "non_technical_skills": ["Skill 1", "Skill 2"],
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/School",
      "year": "Graduation Year"
    }
  ]
}

Resume Text:
"""
${resumeText.substring(0, 8000)}
"""
`;

    const systemPrompt = "You are an expert recruitment AI. Extract the exact required information from resumes into structured JSON.";
    
    const parsedData = await getStructuredAIResponse<RawParsedData>(prompt, systemPrompt);

    if (!parsedData) {
      throw new Error('LLM returned empty or invalid response');
    }

    // Assemble the Markdown summary safely on the server side
    let resume_summary = `### Professional Bio\n${parsedData.bio || 'Not provided'}\n\n`;
    
    resume_summary += `### Skills\n`;
    if (parsedData.technical_skills && parsedData.technical_skills.length > 0) {
      resume_summary += `**Technical:** ${parsedData.technical_skills.join(', ')}\n`;
    }
    if (parsedData.non_technical_skills && parsedData.non_technical_skills.length > 0) {
      resume_summary += `**Non-Technical:** ${parsedData.non_technical_skills.join(', ')}\n`;
    }
    resume_summary += `\n`;

    resume_summary += `### Experience & Projects\n`;
    if (parsedData.experience && parsedData.experience.length > 0) {
      parsedData.experience.forEach(exp => {
        resume_summary += `- **${exp.role || 'Role'}** at *${exp.company || 'Company'}*\n`;
        if (exp.achievements) {
          exp.achievements.forEach(ach => {
            resume_summary += `  - ${ach}\n`;
          });
        }
      });
    } else {
      resume_summary += `No experience listed.\n`;
    }
    resume_summary += `\n`;

    resume_summary += `### Education\n`;
    if (parsedData.education && parsedData.education.length > 0) {
      parsedData.education.forEach(edu => {
        resume_summary += `- **${edu.degree || 'Degree'}** | ${edu.institution || 'Institution'} (${edu.year || 'Year'})\n`;
      });
    } else {
      resume_summary += `No education listed.\n`;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Resume parsed successfully via AI',
      parsed: { resume_summary }
    });
    
  } catch (error: any) {
    console.error('Failed to parse resume:', error);
    return NextResponse.json({ error: error.message || 'Failed to process the resume' }, { status: 500 });
  }
}
