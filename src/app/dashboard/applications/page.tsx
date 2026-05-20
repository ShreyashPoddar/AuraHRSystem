"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ChevronDown, Check, X, AlertTriangle, Star, 
  ExternalLink, Mail, Phone, Calendar, User, ArrowRight,
  TrendingUp, Award, Zap, ShieldAlert, Edit3, Trash2
} from "lucide-react";
import clsx from "clsx";
import RadarChart from "@/components/RadarChart";

interface Candidate {
  id: string;
  name: string;
  avatar: string;
  dateApplied: string;
  jdParserScore: number;
  academiaScore: number;
  interviewScore: number | null;
  stage: "Academia Round" | "Interview" | "Malpractice";
  malpractice: "Flag" | "Yes" | "No" | "Check";
  overallScore: number;
  age: number;
  gender: string;
  phone: string;
  role: string;
  education: string[];
  skills: {
    resume: number;
    github: number;
    leetcode: number;
    linkedin: number;
  };
  linkedinScores: {
    backend: number;
    leetcode: number;
    linkedin: number;
  };
  matchedSkills: string;
  radarData: {
    technical: number;
    culture: number;
    communication: number;
    leadership: number;
    adaptability: number;
  };
}

export default function ApplicationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("ScoreDesc");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // Seed candidates matching the image
  const [candidates, setCandidates] = useState<Candidate[]>([
    {
      id: "2041877380",
      name: "Akira Tanaka",
      avatar: "👩‍💼",
      dateApplied: "Jan 10, 2024",
      jdParserScore: 85,
      academiaScore: 92,
      interviewScore: null,
      stage: "Academia Round",
      malpractice: "Flag",
      overallScore: 88,
      age: 26,
      gender: "M",
      phone: "+103555-7988",
      role: "Senior Product Designer",
      education: ["Degree: Bachelor of Design", "Degree: University of Arts"],
      skills: { resume: 4, github: 3, leetcode: 3, linkedin: 4 },
      linkedinScores: { backend: 70, leetcode: 60, linkedin: 85 },
      matchedSkills: "JD Parser: JD Match, Figma details",
      radarData: { technical: 75, culture: 85, communication: 90, leadership: 70, adaptability: 80 }
    },
    {
      id: "2041877381",
      name: "Akira Nanaka",
      avatar: "🧑‍💻",
      dateApplied: "Jan 10, 2024",
      jdParserScore: 90,
      academiaScore: 90,
      interviewScore: null,
      stage: "Academia Round",
      malpractice: "Yes",
      overallScore: 90,
      age: 27,
      gender: "F",
      phone: "+103555-7989",
      role: "Senior Product Designer",
      education: ["Degree: Master of Human-Computer Interaction", "Degree: Global Tech School"],
      skills: { resume: 5, github: 4, leetcode: 4, linkedin: 5 },
      linkedinScores: { backend: 85, leetcode: 80, linkedin: 95 },
      matchedSkills: "JD Parser: UX/UI Specialist, Github Details",
      radarData: { technical: 90, culture: 80, communication: 85, leadership: 65, adaptability: 75 }
    },
    {
      id: "2041877382",
      name: "Emily Chen",
      avatar: "👩‍🔬",
      dateApplied: "Jan 10, 2024",
      jdParserScore: 82,
      academiaScore: 85,
      interviewScore: 70,
      stage: "Interview",
      malpractice: "No",
      overallScore: 70,
      age: 28,
      gender: "F",
      phone: "+103555-7990",
      role: "Senior Product Designer",
      education: [
        "Degree: Iliavaesment of Science",
        "Degree: Iniversity Abadation"
      ],
      skills: {
        resume: 4,
        github: 5,
        leetcode: 4,
        linkedin: 4
      },
      linkedinScores: {
        backend: 80,
        leetcode: 100,
        linkedin: 80
      },
      matchedSkills: "JD Parser: JD Match, GitHedin details",
      radarData: {
        technical: 85,
        culture: 78,
        communication: 90,
        leadership: 60,
        adaptability: 80
      }
    },
    {
      id: "2041877383",
      name: "Akira Nanaka",
      avatar: "🧔",
      dateApplied: "Jan 10, 2024",
      jdParserScore: 60,
      academiaScore: 75,
      interviewScore: null,
      stage: "Malpractice",
      malpractice: "Check",
      overallScore: 70,
      age: 29,
      gender: "M",
      phone: "+103555-7991",
      role: "Senior Product Designer",
      education: ["Degree: High School Diploma"],
      skills: { resume: 3, github: 2, leetcode: 2, linkedin: 3 },
      linkedinScores: { backend: 50, leetcode: 40, linkedin: 60 },
      matchedSkills: "JD Parser: Low keyword alignment",
      radarData: { technical: 50, culture: 70, communication: 75, leadership: 50, adaptability: 60 }
    },
    {
      id: "2041877384",
      name: "Akira Tanaka",
      avatar: "👩‍💼",
      dateApplied: "Jan 10, 2024",
      jdParserScore: 95,
      academiaScore: 90,
      interviewScore: null,
      stage: "Academia Round",
      malpractice: "No",
      overallScore: 90,
      age: 25,
      gender: "M",
      phone: "+103555-7992",
      role: "Senior Product Designer",
      education: ["Degree: Bachelor of Science in CS", "Degree: Top Tier Tech Academy"],
      skills: { resume: 5, github: 5, leetcode: 5, linkedin: 5 },
      linkedinScores: { backend: 95, leetcode: 95, linkedin: 90 },
      matchedSkills: "JD Parser: Perfect Keyword Alignment",
      radarData: { technical: 95, culture: 85, communication: 80, leadership: 75, adaptability: 90 }
    },
    {
      id: "2041877385",
      name: "Akira Nanaka",
      avatar: "👩‍🎨",
      dateApplied: "Jan 10, 2024",
      jdParserScore: 80,
      academiaScore: 80,
      interviewScore: null,
      stage: "Academia Round",
      malpractice: "Yes",
      overallScore: 80,
      age: 30,
      gender: "F",
      phone: "+103555-7993",
      role: "Senior Product Designer",
      education: ["Degree: Bachelor of Arts in Design", "Degree: Creative Design School"],
      skills: { resume: 4, github: 3, leetcode: 3, linkedin: 4 },
      linkedinScores: { backend: 70, leetcode: 70, linkedin: 85 },
      matchedSkills: "JD Parser: High visual alignment",
      radarData: { technical: 75, culture: 90, communication: 85, leadership: 80, adaptability: 80 }
    },
    {
      id: "2041877386",
      name: "Akira Tanaka",
      avatar: "🧑‍💻",
      dateApplied: "Jan 10, 2024",
      jdParserScore: 70,
      academiaScore: 70,
      interviewScore: null,
      stage: "Malpractice",
      malpractice: "Check",
      overallScore: 70,
      age: 24,
      gender: "M",
      phone: "+103555-7994",
      role: "Senior Product Designer",
      education: ["Degree: Self-Taught UX Certificate"],
      skills: { resume: 3, github: 3, leetcode: 2, linkedin: 3 },
      linkedinScores: { backend: 60, leetcode: 50, linkedin: 70 },
      matchedSkills: "JD Parser: Moderate keyword alignment",
      radarData: { technical: 65, culture: 75, communication: 70, leadership: 60, adaptability: 75 }
    },
    {
      id: "2041877387",
      name: "Akira Tanaka",
      avatar: "👩‍💻",
      dateApplied: "Jan 10, 2024",
      jdParserScore: 60,
      academiaScore: 60,
      interviewScore: null,
      stage: "Academia Round",
      malpractice: "No",
      overallScore: 60,
      age: 31,
      gender: "F",
      phone: "+103555-7995",
      role: "Senior Product Designer",
      education: ["Degree: Bachelor of Arts", "Degree: Local Art College"],
      skills: { resume: 3, github: 2, leetcode: 2, linkedin: 4 },
      linkedinScores: { backend: 55, leetcode: 40, linkedin: 75 },
      matchedSkills: "JD Parser: Low keyword alignment",
      radarData: { technical: 55, culture: 80, communication: 80, leadership: 65, adaptability: 70 }
    }
  ]);

  // Pre-select Emily Chen so the Candidate Details panel is open on load, just like the image!
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    candidates.find(c => c.name === "Emily Chen") || null
  );

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMoveStage = (candidateId: string, newStage: "Academia Round" | "Interview" | "Malpractice" | "Reject") => {
    if (newStage === "Reject") {
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      if (selectedCandidate?.id === candidateId) {
        setSelectedCandidate(null);
      }
      triggerToast(`Candidate rejected successfully.`);
    } else {
      setCandidates(prev => prev.map(c => {
        if (c.id === candidateId) {
          const updated = { ...c, stage: newStage };
          if (selectedCandidate?.id === candidateId) {
            setSelectedCandidate(updated);
          }
          return updated;
        }
        return c;
      }));
      triggerToast(`Candidate moved to ${newStage} stage.`);
    }
    setShowActionsDropdown(false);
  };

  // Filter and sort candidates
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.includes(searchQuery);
    const matchesStage = selectedStage === "All" || c.stage === selectedStage;
    const matchesStatus = selectedStatus === "All" || (
      selectedStatus === "Flagged" ? c.malpractice !== "No" : c.malpractice === "No"
    );
    return matchesSearch && matchesStage && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "ScoreDesc") return b.overallScore - a.overallScore;
    if (sortBy === "ScoreAsc") return a.overallScore - b.overallScore;
    if (sortBy === "NameAsc") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1d1b] p-6 relative font-sans">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-[#1c1d1b] text-[#faf9f6] px-6 py-3 rounded-2xl shadow-xl z-[999] flex items-center gap-2 font-medium border border-white/10 text-xs tracking-wide"
          >
            <Check size={16} className="text-[#a8c3a0]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header section matching image */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-serif text-[#1c1d1b]">
            Application Details: Senior Product Designer
          </h1>
          
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-4 text-xs font-semibold text-[#1c1d1b]/60">
            <div className="flex items-center space-x-1.5">
              <span>Job Title</span>
              <span className="text-[#1c1d1b] font-bold text-sm">Senior Product Designer</span>
              <Edit3 size={12} className="text-[#1c1d1b]/40 cursor-pointer hover:text-[#1c1d1b]" />
            </div>

            <div className="flex items-center space-x-1.5">
              <span>Date Created</span>
              <span className="text-[#1c1d1b] font-bold">Jan 10, 2024</span>
            </div>

            <div className="flex items-center space-x-2">
              <span>Status</span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
                Active
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span>Date Finished</span>
              <span className="text-[#1c1d1b] font-bold">TBD</span>
            </div>
          </div>
        </div>

        {/* Dynamic Filters/Stats Row */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-[#eef2ff] border border-[#c7d2fe]/40 rounded-xl px-4 py-2 text-xs font-bold text-[#4f46e5] flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer">
            <span>Total Applicants:</span>
            <span className="bg-[#4f46e5]/10 px-2 py-0.5 rounded-md">{candidates.length * 30 + 5}</span>
          </div>

          <div className="bg-[#fffbeb] border border-[#fde68a]/40 rounded-xl px-4 py-2 text-xs font-bold text-[#d97706] flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer">
            <span>Qualified Academia:</span>
            <span className="bg-[#d97706]/10 px-2 py-0.5 rounded-md">110</span>
          </div>

          <div className="bg-[#f0fdf4] border border-[#bbf7d0]/40 rounded-xl px-4 py-2 text-xs font-bold text-[#16a34a] flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer">
            <span>Qualified Interview:</span>
            <span className="bg-[#16a34a]/10 px-2 py-0.5 rounded-md">45</span>
          </div>

          <div className="bg-[#fef2f2] border border-[#fecaca]/40 rounded-xl px-4 py-2 text-xs font-bold text-[#dc2626] flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer">
            <span>Interviews Pending:</span>
            <span className="bg-[#dc2626]/10 px-2 py-0.5 rounded-md">12</span>
          </div>

          <div className="bg-[#f0fdfa] border border-[#ccfbf1]/40 rounded-xl px-4 py-2 text-xs font-bold text-[#0d9488] flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer">
            <span>Selected:</span>
            <span className="bg-[#0d9488]/10 px-2 py-0.5 rounded-md">5</span>
          </div>
        </div>

        {/* Main Workspace: Table + Overlapping Details Popup Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
          
          {/* LEFT HALF (Col-span 8 or full depending on popup): Applicant Table */}
          <div className={clsx(
            "transition-all duration-300",
            selectedCandidate ? "lg:col-span-8" : "lg:col-span-12"
          )}>
            <div className="bg-white rounded-3xl border border-[#1c1d1b]/5 shadow-sm p-6 space-y-6">
              
              {/* Table Toolbar controls */}
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-lg font-bold font-serif text-[#1c1d1b]">Ranked Applicant Table</h2>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search input */}
                  <div className="relative w-full md:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1c1d1b]/30" />
                    <input
                      type="text"
                      placeholder="Search name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[#faf9f6] text-xs font-medium rounded-xl border border-[#1c1d1b]/10 focus:outline-none focus:ring-1 focus:ring-[#a8c3a0] text-[#1c1d1b]"
                    />
                  </div>

                  {/* Stage filter dropdown */}
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="p-2 bg-[#faf9f6] text-xs font-bold rounded-xl border border-[#1c1d1b]/10 focus:outline-none text-[#1c1d1b] cursor-pointer"
                  >
                    <option value="All">Stage: All</option>
                    <option value="Academia Round">Academia Round</option>
                    <option value="Interview">Interview</option>
                    <option value="Malpractice">Malpractice</option>
                  </select>

                  {/* Malpractice filter dropdown */}
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="p-2 bg-[#faf9f6] text-xs font-bold rounded-xl border border-[#1c1d1b]/10 focus:outline-none text-[#1c1d1b] cursor-pointer"
                  >
                    <option value="All">Status: All</option>
                    <option value="Clean">No Flag</option>
                    <option value="Flagged">Flagged</option>
                  </select>

                  {/* Sorting dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="p-2 bg-[#faf9f6] text-xs font-bold rounded-xl border border-[#1c1d1b]/10 focus:outline-none text-[#1c1d1b] cursor-pointer"
                  >
                    <option value="ScoreDesc">Sort by: Score (High)</option>
                    <option value="ScoreAsc">Sort by: Score (Low)</option>
                    <option value="NameAsc">Sort by: Name A-Z</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#1c1d1b]/5 shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#faf9f6] border-b border-[#1c1d1b]/5 text-[11px] font-bold text-[#1c1d1b]/50 select-none">
                      <th className="p-3 text-center">S.No.</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Applicant ID</th>
                      <th className="p-3">Date Applied</th>
                      <th className="p-3 text-center">JD Parser Score</th>
                      <th className="p-3 text-center">Academia Round Score</th>
                      <th className="p-3 text-center">Interview Score</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3">Malpractice</th>
                      <th className="p-3">Overall Score (0-100)</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-[#1c1d1b]/5 text-xs">
                    {filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-[#1c1d1b]/40 font-semibold">
                          No applicants match your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCandidates.map((c, idx) => {
                        const isSelected = selectedCandidate?.id === c.id;
                        return (
                          <tr 
                            key={c.id} 
                            onClick={() => setSelectedCandidate(c)}
                            className={clsx(
                              "hover:bg-[#faf9f6] transition-colors cursor-pointer select-none",
                              isSelected && "bg-[#a8c3a0]/15 hover:bg-[#a8c3a0]/20 font-semibold"
                            )}
                          >
                            <td className="p-3 text-center font-bold text-[#1c1d1b]/40">{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg bg-[#faf9f6] p-1 rounded-full border border-[#1c1d1b]/5 shadow-3xs">{c.avatar}</span>
                                <div>
                                  <p className="font-bold text-[#1c1d1b] leading-tight">{c.name}</p>
                                  <p className="text-[10px] text-[#1c1d1b]/40">Designer</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-[10px] font-bold text-[#1c1d1b]/60">{c.id}</td>
                            <td className="p-3 font-medium text-[#1c1d1b]/50">{c.dateApplied}</td>
                            <td className="p-3 text-center font-bold text-[#1c1d1b]/80">{c.jdParserScore}</td>
                            <td className="p-3 text-center font-bold text-[#1c1d1b]/80">{c.academiaScore}</td>
                            <td className="p-3 text-center font-bold text-[#1c1d1b]/80">
                              {c.interviewScore !== null ? c.interviewScore : "--"}
                            </td>
                            <td className="p-3">
                              <span className={clsx(
                                "text-[9.5px] px-2.5 py-0.5 rounded-full font-bold",
                                c.stage === "Academia Round" && "bg-amber-50 text-amber-800 border border-amber-200/50",
                                c.stage === "Interview" && "bg-emerald-50 text-emerald-800 border border-emerald-200/50",
                                c.stage === "Malpractice" && "bg-rose-50 text-rose-800 border border-rose-200/50"
                              )}>
                                {c.stage}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                {c.malpractice === "No" ? (
                                  <span className="text-emerald-600 flex items-center gap-0.5 font-bold text-[10px]">
                                    <Check size={12} strokeWidth={3} /> No
                                  </span>
                                ) : c.malpractice === "Yes" ? (
                                  <span className="text-rose-600 flex items-center gap-0.5 font-bold text-[10px]">
                                    <AlertTriangle size={12} /> Yes
                                  </span>
                                ) : c.malpractice === "Flag" ? (
                                  <span className="text-rose-600 flex items-center gap-0.5 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded-md">
                                    🚩 Flag
                                  </span>
                                ) : (
                                  <span className="text-amber-600 flex items-center gap-0.5 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-md">
                                    ⚠️ Check
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-6">{c.overallScore}</span>
                                <div className="w-16 bg-[#faf9f6] rounded-full h-1.5 border border-[#1c1d1b]/5 overflow-hidden shrink-0">
                                  <div 
                                    className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${c.overallScore}%` }} 
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT HALF (Col-span 4): Overlay Details Popover (Slide in Animation) */}
          <AnimatePresence>
            {selectedCandidate && (
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.98 }}
                className="lg:col-span-4 bg-white rounded-3xl border border-[#1c1d1b]/10 shadow-xl p-5 space-y-5 relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedCandidate(null)}
                  type="button"
                  className="absolute top-4 right-4 text-[#1c1d1b]/30 hover:text-red-500 rounded p-1"
                >
                  <X size={16} />
                </button>

                {/* Popover Title */}
                <div>
                  <h3 className="text-base font-bold font-serif text-[#1c1d1b]">Candidate Details</h3>
                </div>

                {/* Header profile cards */}
                <div className="flex justify-between items-start pt-1">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-[#faf9f6] p-2.5 rounded-2xl border border-[#1c1d1b]/5 shadow-xs">
                      {selectedCandidate.avatar}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#1c1d1b] leading-tight">{selectedCandidate.name}</h4>
                      <p className="text-[10px] text-[#1c1d1b]/40 mt-0.5">Applicant ID: {selectedCandidate.id}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1 text-[9px] font-semibold text-[#1c1d1b]/50">
                        <span>Age: {selectedCandidate.age}</span>
                        <span>•</span>
                        <span>Gender: {selectedCandidate.gender}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                      type="button"
                      className="px-3 py-1.5 bg-[#faf9f6] text-[10px] font-bold rounded-lg border border-[#1c1d1b]/10 flex items-center gap-1 text-[#1c1d1b] hover:bg-neutral-50"
                    >
                      Actions <ChevronDown size={12} />
                    </button>

                    <AnimatePresence>
                      {showActionsDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute right-0 mt-1 bg-white border border-[#1c1d1b]/10 rounded-xl shadow-lg z-50 py-1 w-32 text-[10px] font-bold"
                        >
                          <button
                            type="button"
                            onClick={() => handleMoveStage(selectedCandidate.id, "Interview")}
                            className="w-full text-left px-3 py-2 hover:bg-[#faf9f6] text-emerald-800"
                          >
                            Move to Interview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStage(selectedCandidate.id, "Academia Round")}
                            className="w-full text-left px-3 py-2 hover:bg-[#faf9f6] text-amber-800"
                          >
                            Move to Academia
                          </button>
                          <hr className="border-neutral-100" />
                          <button
                            type="button"
                            onClick={() => handleMoveStage(selectedCandidate.id, "Reject")}
                            className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
                          >
                            Reject
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <hr className="border-[#1c1d1b]/5" />

                {/* Grid info details columns */}
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  
                  {/* Education Details */}
                  <div className="space-y-1">
                    <p className="font-bold text-[#1c1d1b]/40 uppercase tracking-wider text-[9px]">Education Details</p>
                    {selectedCandidate.education.map((edu, i) => (
                      <p key={i} className="font-semibold text-[#1c1d1b]/80 leading-snug">{edu}</p>
                    ))}
                  </div>

                  {/* Matched Skills */}
                  <div className="space-y-1">
                    <p className="font-bold text-[#1c1d1b]/40 uppercase tracking-wider text-[9px]">Matched Skills</p>
                    <p className="font-semibold text-[#1c1d1b]/80 leading-snug">{selectedCandidate.matchedSkills}</p>
                  </div>

                  {/* Skills (Stars) */}
                  <div className="space-y-1">
                    <p className="font-bold text-[#1c1d1b]/40 uppercase tracking-wider text-[9px]">Skills Rating</p>
                    <div className="space-y-1 font-semibold text-[#1c1d1b]/70">
                      {Object.entries(selectedCandidate.skills).map(([skill, val]) => (
                        <div key={skill} className="flex justify-between items-center pr-2 capitalize">
                          <span>{skill}:</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, starIdx) => (
                              <Star 
                                key={starIdx} 
                                size={10} 
                                className={clsx(
                                  starIdx < val ? "text-amber-500 fill-amber-500" : "text-[#1c1d1b]/15"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LinkedIn scores progress bars */}
                  <div className="space-y-1">
                    <p className="font-bold text-[#1c1d1b]/40 uppercase tracking-wider text-[9px]">LinkedIn Scores</p>
                    <div className="space-y-1.5 font-semibold text-[#1c1d1b]/70 pt-0.5">
                      {Object.entries(selectedCandidate.linkedinScores).map(([scoreName, val]) => (
                        <div key={scoreName} className="space-y-0.5 capitalize">
                          <div className="flex justify-between text-[10px]">
                            <span>{scoreName}:</span>
                            <span>{val}%</span>
                          </div>
                          <div className="w-full bg-[#faf9f6] h-1 rounded-full border border-[#1c1d1b]/5 overflow-hidden">
                            <div className="bg-[#7ca982] h-full" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Test Scores */}
                  <div className="space-y-1">
                    <p className="font-bold text-[#1c1d1b]/40 uppercase tracking-wider text-[9px]">Test Scores</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-[#1c1d1b]/70 pt-0.5">
                      <div className="bg-[#faf9f6] p-1.5 rounded-lg border border-[#1c1d1b]/5 text-center">
                        <span className="block text-[8px] uppercase tracking-wider text-[#1c1d1b]/40">Academia</span>
                        <span className="text-[#1c1d1b]/80">{selectedCandidate.academiaScore}</span>
                      </div>
                      <div className="bg-[#faf9f6] p-1.5 rounded-lg border border-[#1c1d1b]/5 text-center">
                        <span className="block text-[8px] uppercase tracking-wider text-[#1c1d1b]/40">Interview</span>
                        <span className="text-[#1c1d1b]/80">
                          {selectedCandidate.interviewScore !== null ? selectedCandidate.interviewScore : "--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Malpractice & Stage badges */}
                  <div className="space-y-1.5">
                    <p className="font-bold text-[#1c1d1b]/40 uppercase tracking-wider text-[9px]">Malpractice & Stage</p>
                    <div className="flex gap-1.5">
                      {selectedCandidate.malpractice !== "No" && (
                        <span className="bg-[#b05a5a]/10 text-[#b05a5a] text-[9.5px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                          ⚠️ Warning
                        </span>
                      )}
                      <span className="bg-[#7ca982]/20 text-[#2a593e] text-[9.5px] px-2.5 py-0.5 rounded-md font-bold capitalize">
                        {selectedCandidate.stage}
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-[#1c1d1b]/5" />

                {/* Radar Chart section */}
                <div className="space-y-3">
                  <p className="font-bold text-[#1c1d1b]/40 uppercase tracking-wider text-[9px]">Skill Matrix Radar</p>
                  
                  <div className="flex gap-4 items-center">
                    <div className="w-36 h-36 shrink-0 bg-[#faf9f6] p-1 rounded-2xl border border-[#1c1d1b]/5">
                      <RadarChart data={selectedCandidate.radarData} />
                    </div>
                    
                    {/* Overall Score Details block */}
                    <div className="flex-1 space-y-2 bg-[#faf9f6] p-3 rounded-2xl border border-[#1c1d1b]/5">
                      <p className="font-serif font-black text-xl text-[#2a593e] leading-none">
                        {selectedCandidate.overallScore}
                      </p>
                      <p className="text-[10px] font-bold text-[#1c1d1b]/40 uppercase tracking-wider">Overall Score</p>
                      <hr className="border-[#1c1d1b]/5" />
                      <div className="text-[9.5px] font-semibold text-[#1c1d1b]/60 space-y-0.5">
                        <p>Overall Rating: {selectedCandidate.overallScore >= 80 ? "Excellent" : "Qualified"}</p>
                        <p>Malpractices: {selectedCandidate.malpractice === "No" ? "Clean" : "Flagged (Grade F)"}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
