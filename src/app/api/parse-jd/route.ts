import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Safe regex escape — handles all special chars including + . * ? [ ] ( ) ^ $ | */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchLibrary(line: string, library: string[]): string[] {
  return library.filter(s => {
    try {
      return new RegExp(`(?:^|[^\\w])${escapeRegex(s)}(?:[^\\w]|$)`, 'i').test(line);
    } catch {
      return line.toLowerCase().includes(s.toLowerCase());
    }
  });
}

// ─── Signal keywords ──────────────────────────────────────────────────────────

const MUST_SIGNALS = [
  'required', 'mandatory', 'must have', 'must-have', 'minimum', 'essential',
  'critical', 'necessary', 'expected', 'expertise in', 'strong knowledge of',
  'proficiency in', 'hands-on experience', 'solid understanding', 'deep knowledge',
  'proven experience', 'minimum of', 'at least',
];
const NICE_SIGNALS = [
  'preferred', 'plus', 'nice to have', 'nice-to-have', 'bonus', 'advantage',
  'desirable', 'optional', 'ideally', 'beneficial', 'good to have',
  'a plus', 'is a plus', 'would be', 'familiarity with', 'exposure to',
];

// ─── Technical skill library ──────────────────────────────────────────────────

const SKILL_LIBRARY: string[] = [
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind',
  'Node.js', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Go', 'Rust', 'Java', 'Kotlin',
  'Python', 'R', 'MATLAB', 'C++', 'C#', 'Swift', 'Flutter', 'PHP', 'Scala',
  'AWS', 'GCP', 'Azure', 'Firebase', 'Vercel', 'Heroku',
  'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Linux', 'Bash',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ', 'Cassandra', 'DynamoDB',
  'GraphQL', 'REST', 'gRPC', 'WebSockets', 'Microservices', 'Distributed Systems',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'NLP', 'LLMs',
  'MLOps', 'Kubeflow', 'Spark', 'Hadoop', 'Transformers', 'Computer Vision', 'OpenCV',
  'Figma', 'Sketch', 'Adobe XD', 'UX Research', 'Prototyping',
  'VLSI', 'SystemVerilog', 'Verilog', 'FPGA', 'Cadence', 'Synopsys', 'UVM', 'DFT', 'ASIC',
  'Embedded C', 'RTOS', 'STM32', 'Arduino', 'Embedded Systems', 'Digital Design', 'Analog Design',
  'Analog Layout', 'RTL', 'STA', 'Physical Design', 'Verification', 'ModelSim', 'Calibre', 'Spectre',
  'Fintech', 'Blockchain', 'Web3', 'Solidity',
  'HRMS', 'Compliance', 'Labour Law', 'Zoho People',
  'Git', 'Agile', 'Scrum', 'Jira', 'Confluence', 'GitHub',
  'System Design', 'Data Structures', 'Algorithms', 'OOP',
  'SQL', 'Tableau', 'Power BI', 'Excel VBA', 'Postman', 'Swagger', 'Datadog',
];

// ─── Soft skill library ───────────────────────────────────────────────────────

const SOFT_SKILL_LIBRARY: string[] = [
  'Leadership', 'Team Leadership', 'People Management', 'Mentoring', 'Coaching',
  'Communication', 'Verbal Communication', 'Written Communication', 'Presentation',
  'Collaboration', 'Teamwork', 'Problem Solving', 'Analytical Thinking', 'Critical Thinking',
  'Time Management', 'Ownership', 'Accountability', 'Adaptability', 'Growth Mindset',
  'Customer Focus', 'Stakeholder Management', 'Negotiation', 'Attention to Detail',
];

// ─── Section patterns ─────────────────────────────────────────────────────────

const REQUIREMENTS_SECTION = /\b(requirements?|qualifications?|what you.ll need|what we.re looking for|who you are|must have|key skills)\b/i;
const PREFERRED_SECTION    = /\b(preferred|nice[ -]to[ -]have|bonus|plus|optional|good[ -]to[ -]have|advantageous|additional)\b/i;

type Section = 'requirements' | 'preferred' | 'unknown';

export interface ParsedJDSchema {
  id: string;
  title: string;
  mustHave: string[];
  niceToHave: string[];
  softSkills: string[];
  expRequired: string | null;
  degreeRequired: string | null;
  parsedAt: string;
}

// ─── Pass 1: Entity-first classification ─────────────────────────────────────

function classifyJD(text: string): ParsedJDSchema {
  // Split on newlines, then also on inline bullet chars
  const rawLines = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const raw of rawLines) {
    const segments = raw.split(/[•·▪‣⁃]/);
    for (const seg of segments) {
      const t = seg.trim().replace(/^[-*>\u2022]\s+/, '').trim();
      if (t) lines.push(t);
    }
  }

  const mustSet    = new Set<string>();
  const niceSet    = new Set<string>();
  const softSet    = new Set<string>();
  const unclassSet = new Set<string>();

  let currentSection: Section = 'unknown';

  for (const line of lines) {
    if (!line) continue;

    // Section header detection (short lines only)
    if (line.length < 90) {
      if (REQUIREMENTS_SECTION.test(line)) { currentSection = 'requirements'; continue; }
      if (PREFERRED_SECTION.test(line))    { currentSection = 'preferred';    continue; }
    }

    const lower = line.toLowerCase();
    const hasMust = MUST_SIGNALS.some(k => lower.includes(k));
    const hasNice = NICE_SIGNALS.some(k => lower.includes(k));

    const techFound = matchLibrary(line, SKILL_LIBRARY);
    const softFound = matchLibrary(line, SOFT_SKILL_LIBRARY);

    softFound.forEach(s => softSet.add(s));

    if (!techFound.length) continue;

    for (const sk of techFound) {
      if (hasMust || currentSection === 'requirements') {
        mustSet.add(sk);
      } else if (hasNice || currentSection === 'preferred') {
        niceSet.add(sk);
      } else {
        unclassSet.add(sk);
      }
    }
  }

  // Unclassified → must-have by default
  for (const s of unclassSet) {
    if (!niceSet.has(s)) mustSet.add(s);
  }

  const expMatch    = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/i);
  const degreeMatch = text.match(/\b(B\.?Tech|M\.?Tech|MBA|Ph\.?D|B\.?E|M\.?Sc|BCA|MCA|B\.?Des)\b/i);
  const title       = lines.find(l => l.trim().length > 2 && l.trim().length < 100)?.trim() || 'Active JD';

  return {
    id: 'parsed_jd',
    title,
    mustHave:      [...mustSet],
    niceToHave:    [...niceSet].filter(s => !mustSet.has(s)),
    softSkills:    [...softSet],
    expRequired:   expMatch ? `${expMatch[1]}+ years experience required` : null,
    degreeRequired: degreeMatch?.[0]?.toUpperCase() || null,
    parsedAt: new Date().toISOString(),
  };
}

// ─── Pass 2: Cross-reference ─────────────────────────────────────────────────

export function crossReferenceSchema(
  candidateSkills: string[],
  schema: { mustHave: string[]; niceToHave: string[] }
): {
  must_haves_met: string[];
  must_haves_missing: string[];
  nice_to_haves_met: string[];
  overall_match_score: number;
  matchRank: string;
} {
  const lower = candidateSkills.map(s => s.toLowerCase());

  const must_haves_met = schema.mustHave.filter(m =>
    lower.some(s => s.includes(m.toLowerCase()) || m.toLowerCase().includes(s))
  );
  const must_haves_missing = schema.mustHave.filter(m => !must_haves_met.includes(m));
  const nice_to_haves_met  = schema.niceToHave.filter(m =>
    lower.some(s => s.includes(m.toLowerCase()) || m.toLowerCase().includes(s))
  );

  let score = Math.round(
    (must_haves_met.length / Math.max(schema.mustHave.length, 1)) * 70 +
    (nice_to_haves_met.length / Math.max(schema.niceToHave.length, 1)) * 30
  );
  if (must_haves_missing.length > 0 && schema.mustHave.length > 0) {
    score = Math.min(score, 50);
  }

  const matchRank = score >= 80 ? 'Strong' : score >= 50 ? 'Partial' : 'Weak';
  return { must_haves_met, must_haves_missing, nice_to_haves_met, overall_match_score: score, matchRank };
}

// ─── POST /api/parse-jd ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: 'Empty JD text' }, { status: 400 });

    // Pass 1 — classify
    const schema = classifyJD(text);

    // Persist to DB — strip softSkills (not in DBSchema type) before saving
    const db = await getDb();
    const dbSchema = {
      id: schema.id,
      title: schema.title,
      department: 'Active',
      salaryBudget: 0,
      active: true as const,
      mustHave: schema.mustHave,
      niceToHave: schema.niceToHave,
      createdAt: schema.parsedAt,
    };
    const activeIdx = db.jobDescriptions?.findIndex((j) => j.id === 'parsed_jd') ?? -1;
    if (activeIdx >= 0) {
      db.jobDescriptions[activeIdx] = dbSchema;
    } else {
      db.jobDescriptions = db.jobDescriptions || [];
      db.jobDescriptions.unshift(dbSchema);
    }
    await saveDb(db);

    // Pass 2 — cross-reference all candidates
    const scored = db.candidates.map((c) => {
      const xref = crossReferenceSchema(c.matchTags || [], schema);
      return { id: c.id, name: c.name, role: c.role, status: c.status, institute: c.institute, source: c.source, ...xref };
    }).sort((a, b) => b.overall_match_score - a.overall_match_score);

    // Gaps: must-haves not covered by ANY candidate
    const coveredByPool = new Set<string>(scored.flatMap(c => c.must_haves_met));
    const gaps = schema.mustHave.filter(m => !coveredByPool.has(m));

    // Live match count: candidates ≥ 60% on must-haves
    const liveMatchCount = scored.filter(c => c.overall_match_score >= 60).length;

    return NextResponse.json({
      // Structured schema
      job_title: schema.title,
      extracted_skills: {
        must_have:    schema.mustHave.length   ? schema.mustHave   : [],
        nice_to_have: schema.niceToHave,
        soft_skills:  schema.softSkills,
      },
      experience_required: schema.expRequired || null,
      // Legacy aliases
      mustHave:    schema.mustHave.length ? schema.mustHave : ['No must-haves detected — paste a more detailed JD'],
      niceToHave:  schema.niceToHave,
      softSkills:  schema.softSkills,
      gaps,
      expRequired: schema.expRequired,
      degreeRequired: schema.degreeRequired,
      recommendedTalent: scored.slice(0, 3),
      totalRanked: scored.length,
      liveMatchCount,
    });

  } catch (e: any) {
    console.error('[parse-jd]', e);
    return NextResponse.json({ error: `JD parse failed: ${e?.message}` }, { status: 500 });
  }
}
