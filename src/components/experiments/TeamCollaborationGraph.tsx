"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function TeamCollaborationGraph({ scores }: { scores?: any }) {
  const data = [
    { subject: 'Technical', A: scores?.technical || 60, B: 70, fullMark: 100 },
    { subject: 'Culture', A: scores?.culture || 50, B: 80, fullMark: 100 },
    { subject: 'Communication', A: scores?.communication || 70, B: 60, fullMark: 100 },
    { subject: 'Leadership', A: scores?.leadership || 40, B: 75, fullMark: 100 },
    { subject: 'Adaptability', A: scores?.adaptability || 65, B: 85, fullMark: 100 },
    { subject: 'Problem Solving', A: (scores?.technical || 60) + 10, B: 80, fullMark: 100 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bento-card p-6 flex flex-col h-full bg-cream border border-ink/10"
    >
      <div className="flex justify-between items-center mb-6 z-10">
        <div>
          <h3 className="font-sans font-semibold text-lg flex items-center gap-2 text-ink">
            <Users className="w-5 h-5 text-sage" /> 
            Team Collaboration Graph
          </h3>
          <p className="text-xs text-ink/60 mt-1">Candidate Profile (Gold) vs Team Gap (Rust)</p>
        </div>
        <span className="text-[10px] uppercase font-bold text-rust bg-rust/10 px-2 py-1 rounded border border-rust/20 tracking-wider">
          Neev Cloud Powered
        </span>
      </div>

      <div className="flex-1 w-full min-h-[300px] z-10">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#1C1A16" opacity={0.1} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#1C1A16', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip 
              wrapperStyle={{ zIndex: 100 }}
              contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '8px', border: '1px solid rgba(28, 26, 22, 0.1)', color: '#1C1A16' }} 
            />
            <Radar name="Candidate Fit" dataKey="A" stroke="#C8A84B" fill="#C8A84B" fillOpacity={0.5} />
            <Radar name="Team Skill Gap" dataKey="B" stroke="#C4522A" fill="#C4522A" fillOpacity={0.3} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-gradient-to-tr from-gold/5 to-rust/5 blur-3xl pointer-events-none" />
    </motion.div>
  );
}
