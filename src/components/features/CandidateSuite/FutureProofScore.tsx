"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Sparkles, TrendingUp } from "lucide-react";

const marketData = [
  { subject: "React/Next.js", current: 85, future: 90 },
  { subject: "GraphQL", current: 60, future: 75 },
  { subject: "AI/LLMs", current: 85, future: 95 },
  { subject: "Rust", current: 40, future: 80 },
  { subject: "Cloud Native", current: 75, future: 85 },
  { subject: "Web3", current: 50, future: 60 },
];

export default function FutureProofScore() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Calculate overlap percentage for display
  const averageCurrent = marketData.reduce((acc, curr) => acc + curr.current, 0) / marketData.length;
  const averageFuture = marketData.reduce((acc, curr) => acc + curr.future, 0) / marketData.length;
  const overlapPercentage = Math.round((averageCurrent / averageFuture) * 100);

  return (
    <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 text-slate-200 h-full flex flex-col relative overflow-hidden group">
      
      <div className="flex items-start justify-between mb-4 z-10 relative">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-wide">Future-Proof Score</h3>
            <p className="text-xs text-slate-400">Current vs 2027 Industry Demand</p>
          </div>
        </div>
        
        {overlapPercentage > 80 && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] uppercase font-bold px-2 py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Unique Applicant
          </motion.div>
        )}
      </div>

      <div className="flex-1 w-full min-h-[220px] relative z-10 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={marketData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar 
              name="Current Skills" 
              dataKey="current" 
              stroke="#6366f1" 
              fill="#6366f1" 
              fillOpacity={0.4} 
            />
            <Radar 
              name="2027 Demand" 
              dataKey="future" 
              stroke="#f59e0b" 
              fill="transparent" 
              strokeDasharray="4 4" 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
              itemStyle={{ fontSize: '12px' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-center space-x-4 mt-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 z-10 relative">
        <div className="flex items-center"><div className="w-3 h-3 bg-indigo-500/40 border border-indigo-500 rounded-full mr-2" /> Current Skills</div>
        <div className="flex items-center"><div className="w-3 h-3 border border-amber-500 border-dashed rounded-full mr-2" /> 2027 Demand</div>
      </div>

      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />
    </div>
  );
}
