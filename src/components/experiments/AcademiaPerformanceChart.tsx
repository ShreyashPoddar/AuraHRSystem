"use client";

import { motion } from "framer-motion";
import { GraduationCap, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AcademiaPerformanceChart({ candidates }: { candidates: any[] }) {
  const data = candidates
    .filter(c => c.academiaScore !== undefined)
    .map(c => ({
      name: c.name.split(' ')[0],
      score: c.academiaScore,
      aiScore: c.aiInterviewScore || 0
    }));

  const mockData = [
    { name: 'Rahul', score: 85, aiScore: 78 },
    { name: 'Priya', score: 92, aiScore: 88 },
    { name: 'Amit', score: 78, aiScore: 82 },
    { name: 'Sneha', score: 88, aiScore: 90 },
    { name: 'Arjun', score: 95, aiScore: 92 },
  ];

  const chartData = data.length > 0 ? data : mockData;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bento-card p-6 flex flex-col h-full bg-cream border border-ink/10"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-sans font-semibold text-lg flex items-center gap-2 text-ink">
            <GraduationCap className="w-5 h-5 text-gold" /> 
            Academia vs AI correlation
          </h3>
          <p className="text-xs text-ink/60 mt-1">Theoretical Knowledge (Gold) vs Practical AI Score (Rust)</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[200px] -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C8A84B" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#C8A84B" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C4522A" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#C4522A" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1A16" opacity={0.05} />
            <XAxis dataKey="name" tick={{ fill: '#1C1A16', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#1C1A16', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '8px', border: '1px solid rgba(28, 26, 22, 0.1)', color: '#1C1A16', fontSize: '11px' }} 
            />
            <Area type="monotone" dataKey="score" stroke="#C8A84B" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} name="Academia" />
            <Area type="monotone" dataKey="aiScore" stroke="#C4522A" fillOpacity={1} fill="url(#colorAi)" strokeWidth={2} name="AI Interview" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
