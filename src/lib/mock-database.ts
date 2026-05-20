export const mockCandidates = [
  {
    id: "cand_1",
    name: "Aman Gupta",
    role: "Senior Frontend Engineer",
    experience: 5,
    matchScore: 92,
    skills: ["React", "TypeScript", "Next.js", "Framer Motion", "Tailwind CSS"],
    footprint: {
      github: { verified: true, score: 95 },
      leetcode: { verified: true, score: 88 },
      kaggle: { verified: false, score: 40 },
      linkedin: { verified: true, score: 99 },
      gfg: { verified: true, score: 85 }
    }
  },
  {
    id: "cand_2",
    name: "Priya Sharma",
    role: "Full Stack Developer",
    experience: 3,
    matchScore: 85,
    skills: ["Node.js", "React", "MongoDB", "Express", "Docker"],
    footprint: {
      github: { verified: true, score: 82 },
      leetcode: { verified: true, score: 75 },
      kaggle: { verified: false, score: 20 },
      linkedin: { verified: true, score: 90 },
      gfg: { verified: true, score: 60 }
    }
  }
];

export const mockJobs = [
  {
    id: "job_1",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote (India)",
    type: "Full-Time",
    openings: 2,
    requiredSkills: ["React", "TypeScript", "Tailwind CSS", "Next.js"]
  },
  {
    id: "job_2",
    title: "AI Engineer",
    department: "Research",
    location: "Bangalore, India",
    type: "Full-Time",
    openings: 1,
    requiredSkills: ["Python", "PyTorch", "LLMs", "RAG"]
  }
];

export const mockInterviews = [
  {
    id: "int_1",
    candidateId: "cand_1",
    jobId: "job_1",
    status: "Scheduled",
    date: "2026-03-27T10:00:00Z",
    interviewer: "Rahul TechLead"
  },
  {
    id: "int_2",
    candidateId: "cand_2",
    jobId: "job_2",
    status: "Completed",
    date: "2026-03-20T14:30:00Z",
    interviewer: "Neha AILead"
  }
];

export const mockSystemHealth = {
  latency: 24, // ms
  uptime: "99.99%",
  activeNodes: 142,
  status: "Operational"
};

export const getCandidateById = (id: string) => mockCandidates.find(c => c.id === id);
export const getJobById = (id: string) => mockJobs.find(j => j.id === j.id);
