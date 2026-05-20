"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function MarketTrendEvolution({ role }: { role?: string }) {
  const isFrontend = role?.toLowerCase().includes('front') || role?.toLowerCase().includes('react');
  const isData = role?.toLowerCase().includes('data') || role?.toLowerCase().includes('python');

  const data = isFrontend ? [
    { name: 'React', candidate: 92, demand2026: 95 },
    { name: 'TypeScript', candidate: 88, demand2026: 98 },
    { name: 'Next.js', candidate: 85, demand2026: 92 },
    { name: 'Tailwind', candidate: 95, demand2026: 85 },
    { name: 'Web3', candidate: 40, demand2026: 80 }
  ] : isData ? [
    { name: 'Python', candidate: 95, demand2026: 98 },
    { name: 'PyTorch', candidate: 80, demand2026: 95 },
    { name: 'SQL', candidate: 90, demand2026: 85 },
    { name: 'Pandas', candidate: 85, demand2026: 80 },
    { name: 'MLOps', candidate: 50, demand2026: 90 }
  ] : [
    { name: 'Node.js', candidate: 85, demand2026: 90 },
    { name: 'Go', candidate: 60, demand2026: 95 },
    { name: 'Docker', candidate: 75, demand2026: 88 },
    { name: 'AWS', candidate: 80, demand2026: 92 },
    { name: 'Kubernetes', candidate: 55, demand2026: 96 }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bento-card p-6 flex flex-col h-full bg-warm-sand border border-ink/10"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-sans font-semibold text-lg flex items-center gap-2 text-ink">
            <TrendingUp className="w-5 h-5 text-rust" /> 
            Market Trend Evolution
          </h3>
          <p className="text-xs text-ink/60 mt-1">Candidate Stack vs 2026 Industry Demand</p>
        </div>
        <span className="text-[10px] uppercase font-bold text-gold bg-gold/10 px-2 py-1 rounded border border-gold/20 tracking-wider">
          Neev Cloud Powered
        </span>
      </div>

      <div className="flex-1 w-full min-h-[250px] -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1A16" opacity={0.1} />
            <XAxis dataKey="name" tick={{ fill: '#1C1A16', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#1C1A16', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip 
              cursor={{ fill: 'rgba(28, 26, 22, 0.05)' }} 
              contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '8px', border: '1px solid rgba(28, 26, 22, 0.1)', color: '#1C1A16' }} 
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
            <Bar dataKey="candidate" name="Candidate Proficiency" fill="#C8A84B" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="demand2026" name="2026 Market Demand" fill="#5A7A5C" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
