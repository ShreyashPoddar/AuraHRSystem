"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, MoreVertical, Star, Clock, CheckCircle2 } from "lucide-react";

const STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired"];

const INITIAL_CANDIDATES = [
  { id: "1", name: "Amit Sharma", role: "Sr. Frontend Eng", score: 92, stage: "Interview", color: "indigo" },
  { id: "2", name: "Priya Patel", role: "Product Manager", score: 88, stage: "Screening", color: "emerald" },
  { id: "3", name: "Rahul Verma", role: "Backend Architect", score: 95, stage: "Applied", color: "blue" },
  { id: "4", name: "Ananya Iyer", role: "UI Designer", score: 84, stage: "Offer", color: "amber" },
  { id: "5", name: "Vikram Singh", role: "DevOps Specialist", score: 90, stage: "Hired", color: "teal" },
];

export default function RecruitmentPipeline() {
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);

  const getCandidatesByStage = (stage: string) => 
    candidates.filter(c => c.stage === stage);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Recruitment Pipeline
        </h3>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase rounded-full border border-indigo-500/30">
            Active: {candidates.length}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-[1000px]">
          {STAGES.map((stage) => (
            <div key={stage} className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {stage}
                </span>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">
                  {getCandidatesByStage(stage).length}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-3 p-2 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                <AnimatePresence>
                  {getCandidatesByStage(stage).map((candidate) => (
                    <motion.div
                      key={candidate.id}
                      layoutId={candidate.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-indigo-500/50 transition-all cursor-move shadow-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <User className="w-4 h-4" />
                        </div>
                        <button className="text-slate-600 hover:text-slate-400">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <h4 className="font-semibold text-slate-200 text-sm truncate">
                        {candidate.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 mb-3">{candidate.role}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {candidate.score}
                          </span>
                        </div>
                        {candidate.stage === "Hired" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
