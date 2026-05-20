import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'dev-db.json');

export type TaxRegime = 'old' | 'new';

export type Employee = {
  id: string; name: string; email: string; role: string; location: string;
  salary: number; avatarUrl?: string; pan?: string; aadhar?: string;
  uan?: string; taxRegime?: TaxRegime; state?: string;
};

export type Activity = { id: string; employeeId: string; action: string; status: 'Done' | 'Pending' | 'Alert'; time: string };

export type CandidateScore = {
  technical: number; culture: number; communication: number; leadership: number; adaptability: number;
};

export type AcademicQuestion = {
  id: string; question: string; type: 'mcq' | 'text'; options?: string[]; correctAnswer: string;
};

export type AcademicSubmission = {
  questionId: string; answer: string; isCorrect?: boolean; score?: number;
};

export type AcademicAssessment = {
  id: string; questions: AcademicQuestion[]; submissions: AcademicSubmission[];
  totalScore: number; completedAt?: string;
};

export type Candidate = {
  id: string; name: string; role: string;
  status: 'Applied' | 'Screened' | 'Interview' | 'Offer' | 'Rejected';
  score: CandidateScore; matchPercent: number; matchTags: string[];
  phone?: string; education?: string; institute?: string;
  aiInterviewScore?: number; academiaScore?: number; salaryExpectation?: number;
  source?: string; gender?: string;
  interviewLogs?: InterviewLog[];
  assessments?: CandidateAssessment[];
  academicAssessment?: AcademicAssessment;
  recruiterRating?: number;
  recruiterFeedback?: string;
  aiSummary?: string;
};

export type JobDescription = {
  id: string; title: string; department: string; salaryBudget: number;
  mustHave: string[]; niceToHave: string[]; createdAt: string; active: boolean;
};

export type CandidateAssessment = {
  id: string; candidateId: string; question: string; answer: string;
  sentiment: 'positive' | 'neutral' | 'negative'; technicalScore: number; timestamp: string;
};

export type InterviewLog = {
  id: string; candidateId: string; scheduledAt: string; istTime: string;
  method: 'video' | 'phone' | 'in-person'; status: 'scheduled' | 'completed' | 'cancelled';
  notificationSent: boolean;
};

export type PayrollRecord = {
  id: string; employeeId: string; month: string;
  basic: number; hra: number; specialAllowance: number;
  gross: number; epf: number; pt: number; tds: number; net: number;
};

export type TaxDeclaration = {
  id: string; employeeId: string; section80C: number; section80D: number; hraRent: number;
};

export type Settings = {
  gstin: string; tan: string; companyName: string; defaultState: string;
};

type DBSchema = {
  employees: Employee[]; activities: Activity[]; candidates: Candidate[];
  jobDescriptions: JobDescription[]; payroll: PayrollRecord[];
  taxDeclarations: TaxDeclaration[]; settings: Settings;
};

const defaultData: DBSchema = {
  employees: [], activities: [], candidates: [], jobDescriptions: [],
  payroll: [], taxDeclarations: [],
  settings: { gstin: '', tan: '', companyName: 'NexusHR Global', defaultState: 'Maharashtra' }
};

export async function getDb(): Promise<DBSchema> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.candidates) parsed.candidates = [];
    if (!parsed.payroll) parsed.payroll = [];
    if (!parsed.taxDeclarations) parsed.taxDeclarations = [];
    if (!parsed.settings) parsed.settings = defaultData.settings;
    if (!parsed.jobDescriptions) parsed.jobDescriptions = [];
    return parsed;
  } catch {
    return defaultData;
  }
}

export async function saveDb(data: DBSchema) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}
