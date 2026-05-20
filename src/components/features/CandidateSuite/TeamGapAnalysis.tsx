"use client";

import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Target, AlertCircle } from "lucide-react";

const data = [
  { subject: "React/Next.js", A: 120, B: 110, fullMark: 150 },
  { subject: "AI/LLM", A: 98, B: 85, fullMark: 150 },
  { subject: "Cloud Inf", A: 86, B: 130, fullMark: 150 },
  { subject: "Python", A: 99, B: 90, fullMark: 150 },
  { subject: "UX Design", A: 85, B: 95, fullMark: 150 },
  { subject: "SQL/PG", A: 65, B: 120, fullMark: 150 },
];

export default function TeamGapAnalysis() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bento-card p-6 flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-sans font-semibold text-lg flex items-center gap-2 text-white">
          <Target className="w-5 h-5 text-emerald-400" /> 
          Team Gap Analysis
        </h3>
        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded tracking-wider border border-emerald-500/20">
          Critical Gaps
        </span>
      </div>

      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10 }} />
            <Radar
              name="Team"
              dataKey="A"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.4}
            />
            <Radar
              name="Required"
              dataKey="B"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.1}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-red-200">Critical Skill Deficiency</p>
          <p className="text-[10px] text-red-200/60 leading-tight mt-0.5">
            SQL/PG proficiency is 45% below organizational requirement. Prioritize candidates with robust DB experience.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
