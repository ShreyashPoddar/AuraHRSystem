"use client";

import { motion } from "framer-motion";
import { TrendingUp, Activity, BarChart2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function MarketTrendSection() {
  const data = [
    { year: '2022', candidate: 30, market: 45 },
    { year: '2023', candidate: 55, market: 58 },
    { year: '2024', candidate: 75, market: 70 },
    { year: '2025', candidate: 88, market: 85 },
    { year: '2026', candidate: 98, market: 92 },
  ];

  return (
    <section id="market-trends" className="w-full min-h-[90vh] py-24 flex items-center bg-cream relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16 max-w-2xl"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-widest text-gold border border-gold/30 bg-gold/5 rounded-full animate-pulse">
            Neev Cloud Powered
          </span>
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-ink mb-6">Market Trajectory</h2>
          <p className="text-lg text-ink/70">
            Predictive modeling of the candidate's technological stack evolution compared against the 2026 global market curve.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="w-full bg-warm-sand rounded-3xl p-6 md:p-12 shadow-2xl border border-ink/5 flex flex-col items-start gap-12"
        >
          <div className="flex flex-wrap gap-8 w-full">
            <div className="flex-1 bg-cream rounded-2xl p-6 border border-ink/5">
              <h4 className="text-ink/60 font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sage" /> Candidate Alpha
              </h4>
              <p className="text-4xl font-serif text-ink mb-1">+68%</p>
              <p className="text-sm text-sage font-medium">Outpacing market standard</p>
            </div>
            <div className="flex-1 bg-cream rounded-2xl p-6 border border-ink/5">
              <h4 className="text-ink/60 font-semibold mb-2 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-gold" /> 2026 Prediction
              </h4>
              <p className="text-4xl font-serif text-ink mb-1">98/100</p>
              <p className="text-sm text-gold font-medium">Expert Tier Designation</p>
            </div>
            <div className="flex-1 bg-cream rounded-2xl p-6 border border-ink/5">
              <h4 className="text-ink/60 font-semibold mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rust" /> Velocity Curve
              </h4>
              <p className="text-4xl font-serif text-ink mb-1">Hyper</p>
              <p className="text-sm text-rust font-medium">Rapid skill acquisition</p>
            </div>
          </div>

          <div className="w-full h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCandidate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A7A5C" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#5A7A5C" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8A84B" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#C8A84B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1A16" opacity={0.1} />
                <XAxis dataKey="year" tick={{ fill: '#1C1A16', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#1C1A16', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '12px', border: '1px solid rgba(28, 26, 22, 0.1)', color: '#1C1A16', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} 
                  itemStyle={{ fontWeight: 600, padding: '4px 0' }}
                />
                <Legend wrapperStyle={{ fontSize: 14, paddingTop: '20px' }} />
                <Area type="monotone" dataKey="market" name="Market Demand Curve" stroke="#C8A84B" strokeWidth={3} fillOpacity={1} fill="url(#colorMarket)" />
                <Area type="monotone" dataKey="candidate" name="Candidate Mastery" stroke="#5A7A5C" strokeWidth={3} fillOpacity={1} fill="url(#colorCandidate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
      
      {/* Decorative gradient overlay */}
      <div className="absolute bottom-0 left-0 w-[40%] h-[60%] rounded-full bg-gradient-to-tr from-sage/10 to-transparent blur-[120px] pointer-events-none" />
    </section>
  );
}
