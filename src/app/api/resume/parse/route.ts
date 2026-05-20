import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { crossReferenceSchema } from '@/app/api/parse-jd/route';
import { parseResumeWithOCRSpace } from '@/lib/ocr_service';


// ─── Section header detection patterns ───────────────────────────────────────
const SECTION_MAP: Record<string, RegExp> = {
  contact: /^(contact|personal|profile|about)\b/i,
  education: /^(education|academic|qualification|studies)\b/i,
  experience: /^(experience|employment|work|career|professional|history|positions?)\b/i,
  skills: /^(skills?|technical|technologies|tools?|competencies|expertise|stack)\b/i,
  projects: /^(projects?|portfolio|work samples?)\b/i,
};

// Expanded skill library
const SKILL_LIBRARY = [
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'TypeScript', 'JavaScript', 'HTML', 'CSS',
  'Node.js', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Go', 'Rust', 'Java', 'Kotlin',
  'Python', 'R', 'MATLAB', 'C++', 'C#', 'Swift', 'Flutter', 'PHP',
  'AWS', 'GCP', 'Azure', 'Firebase', 'Vercel', 'Heroku',
  'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD', 'Jenkins', 'GitHub Actions',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ',
  'GraphQL', 'REST', 'gRPC', 'WebSockets',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'NLP', 'LLMs', 'MLOps',
  'Figma', 'Sketch', 'Adobe XD', 'UX Research', 'Prototyping',
  'VLSI', 'SystemVerilog', 'Verilog', 'FPGA', 'Cadence', 'Synopsys', 'UVM', 'DFT', 'ASIC',
  'Embedded C', 'RTOS', 'STM32', 'Arduino',
  'Git', 'Agile', 'Scrum', 'Jira', 'Confluence',
];

// ─── Layout-aware section block splitter ─────────────────────────────────────
function extractSectionBlocks(text: string): Record<string, string> {
  const lines = text.split(/\r?\n/);
  const blocks: Record<string, string> = {
    contact: '', education: '', experience: '', skills: '', projects: '', other: ''
  };
  let current = 'other';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Detect section headers: short lines (<= 55 chars) that match a section keyword
    if (line.length <= 55) {
      let matched = false;
      for (const [section, re] of Object.entries(SECTION_MAP)) {
        if (re.test(line)) { current = section; matched = true; break; }
      }
      if (matched) continue;
    }
    blocks[current] += (blocks[current] ? '\n' : '') + line;
  }
  return blocks;
}

// ─── Contextual skill extraction (tagged by where they appear) ────────────────
function extractSkillsContextual(blocks: Record<string, string>): {
  allSkills: string[];
  workSkills: string[];  // found in experience/projects = stronger signal
  declaredSkills: string[]; // found in skills section
} {
  const buildSkillSet = (text: string) =>
    SKILL_LIBRARY.filter(s =>
      new RegExp(`\\b${s.replace(/[.+#]/g, c => `\\${c}`)}\\b`, 'i').test(text)
    );

  const declaredSkills = buildSkillSet(blocks.skills);
  const workSkills = buildSkillSet(blocks.experience + '\n' + blocks.projects);
  const allSkills = [...new Set([...declaredSkills, ...workSkills])];
  return { allSkills, workSkills, declaredSkills };
}

// ─── Profile strength (0-100) with strict breakdown ──────────────────────────
function calcProfileStrength(data: {
  name: string | null; email: string | null; phone: string | null;
  totalExpYears: number | null; allSkills: string[]; workSkills: string[];
  degree: string | null; institute: string | null;
}): { score: number; breakdown: Record<string, number>; tier: string } {
  const b = {
    identity: data.name && data.name !== 'Resume Upload' ? 10 : 0,
    contact: (data.email ? 15 : 0) + (data.phone ? 10 : 0),
    experience: data.totalExpYears != null ? Math.min(25, data.totalExpYears * 3) : 5,
    skills: Math.min(25, data.allSkills.length * 3),
    workProven: Math.min(10, data.workSkills.length * 2), // extra weight for work-context skills
    education: data.degree ? 5 : 0,
  };
  const score = Math.min(100, Object.values(b).reduce((a, x) => a + x, 0));
  const tier = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Incomplete';
  return { score, breakdown: b, tier };
}


// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    let text = '';
    let filename = 'Resume';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      filename = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      text = await parseResumeWithOCRSpace(buffer, filename);
    } else {
      const body = await req.json();
      text = body.text;
      filename = body.filename || 'Resume';
    }

    if (!text || text.trim().length < 5) {
      return NextResponse.json({ error: 'No readable content provided.', status: 'failed' }, { status: 400 });
    }

    // Stage 1: Layout Intelligence
    const blocks = extractSectionBlocks(text);

    // Stage 2: Recursive Entity Extraction
    const emailMatch = Object.values(blocks).join(' ').match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    const phoneMatch = Object.values(blocks).join(' ').match(/(?:\+91[-\s]?)?[6-9]\d{9}/);
    const expMatch = (blocks.experience + ' ' + blocks.other + ' ' + text)
      .match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)/i);

    const nameFromFile = filename
      ?.replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase()) || null;

    const degreeMatch = (blocks.education + ' ' + text).match(
      /\b(B\.?Tech|M\.?Tech|B\.?E|MBA|BCA|MCA|Ph\.?D|B\.?Sc|M\.?Sc|B\.?Des)\b/i
    );
    const instituteMatch = (blocks.education + ' ' + text).match(
      /(?:IIT\s*\w*|NIT\s*\w*|IISc|BITS\s*Pilani|NID|XLRI|VIT|Manipal|Amity|Delhi University|Anna University)[^\n,]*/i
    );

    const { allSkills, workSkills, declaredSkills } = extractSkillsContextual(blocks);
    const totalExpYears = expMatch ? parseInt(expMatch[1]) : null;

    const education = {
      degree: degreeMatch?.[0] || null,
      institute: instituteMatch?.[0]?.trim() || null,
      tier: instituteMatch?.[0]?.match(/IIT|IISc|BITS\s*Pilani|NID|XLRI/i)
        ? 'Tier 1 (Premium)' : instituteMatch?.[0]?.match(/NIT|VIT|Manipal|Amity/i)
          ? 'Tier 2 (Reputed)' : education_tier_fallback(blocks.education)
    };

    function education_tier_fallback(eduText: string): string {
      if (!eduText) return 'Tier 3 / Not Detected';
      if (/iit|iim|iis[ce]|xlri|nid/i.test(eduText)) return 'Tier 1 (Premium)';
      if (/nit|bits|vit|symbiosis|srm/i.test(eduText)) return 'Tier 2 (Reputed)';
      return 'Tier 3 / University';
    }

    const incompleteFields: string[] = [];
    if (!emailMatch?.[0]) incompleteFields.push('email');
    if (!phoneMatch?.[0]) incompleteFields.push('phone');
    if (totalExpYears === null) incompleteFields.push('experience (inferred)');
    if (!education.degree) incompleteFields.push('degree');
    if (allSkills.length === 0) incompleteFields.push('skills');

    const extractedData = {
      name: nameFromFile || 'Resume Upload',
      email: emailMatch?.[0] || null,
      phone: phoneMatch?.[0] ? `+91-${phoneMatch[0].replace(/^\+91[-\s]?/, '')}` : null,
      totalExpYears,
      allSkills,
      workSkills,
      declaredSkills,
      skillsList: allSkills, // alias for forward compat
      education,
      incompleteFields,
      sectionBlocksFound: Object.entries(blocks).filter(([, v]) => v.length > 10).map(([k]) => k),
    };

    // Stage 3: Profile Strength Score
    const profileStrength = calcProfileStrength({
      name: extractedData.name, email: extractedData.email, phone: extractedData.phone,
      totalExpYears, allSkills, workSkills, degree: education.degree, institute: education.institute
    });

    // Stage 4: Cross-match against active JD (two-pass)
    const db = await getDb();
    const activeJD = db.jobDescriptions?.find((j: any) => j.mustHave?.length > 0) || db.jobDescriptions?.[0];
    const jdXref = activeJD
      ? crossReferenceSchema(allSkills, { mustHave: activeJD.mustHave || [], niceToHave: activeJD.niceToHave || [] })
      : null;

    // Stage 5: Auto-ingest with match rank
    const isDupe = !!(extractedData.email && db.candidates.some((c: any) => c.email === extractedData.email));
    let savedCandidate: any = null;

    if (!isDupe) {
      const matchPercent = jdXref?.overall_match_score ?? profileStrength.score;
      savedCandidate = {
        id: `pdf_${Date.now()}`,
        name: extractedData.name,
        email: extractedData.email || '',
        role: education.degree ? `${education.degree} Applicant` : 'Applicant',
        status: 'Applied',
        matchPercent,
        matchTags: allSkills.slice(0, 6),
        phone: extractedData.phone || '',
        education: education.degree || '',
        institute: education.institute || '',
        aiInterviewScore: undefined,
        salaryExpectation: null,
        source: 'PDF_Upload',
        gender: 'Other',
        score: { technical: 70, culture: 70, communication: 70, leadership: 65, adaptability: 70 },
        interviewLogs: [], assessments: [],
        totalExpYears,
        profileStrength: profileStrength.score,
        jdMatchRank: jdXref?.matchRank || 'Unranked',
        matchedMust: jdXref?.must_haves_met || [],
        missingMust: jdXref?.must_haves_missing || [],
        stageHistory: [{ from: null, to: 'Applied', timestamp: new Date().toISOString() }]
      };
      db.candidates.push(savedCandidate);
      await saveDb(db);
    }

    const confidence = Math.round(Math.max(0, ((5 - incompleteFields.length) / 5) * 100));

    return NextResponse.json({
      success: true,
      extracted: extractedData,
      profileStrength,
      jdMatch: jdXref ? {
        matchPercent: jdXref.overall_match_score,
        matchRank: jdXref.matchRank,
        must_haves_met: jdXref.must_haves_met,
        must_haves_missing: jdXref.must_haves_missing,
        nice_to_haves_met: jdXref.nice_to_haves_met,
        missingMust: jdXref.must_haves_missing, // alias
        matchedMust: jdXref.must_haves_met,     // alias
      } : null,
      activeJD: activeJD ? { title: activeJD.title, mustHave: activeJD.mustHave, niceToHave: activeJD.niceToHave } : null,
      confidence,
      autoSaved: !isDupe,
      savedCandidate,
      duplicate: isDupe,
    });

  } catch (e: any) {
    return NextResponse.json({ error: `Extraction failed: ${e?.message || 'unknown'}` }, { status: 500 });
  }
}
