"use client";

import { motion } from "framer-motion";
import { Code, Users, CheckCircle, Code2, Database, ShieldCheck, Clock } from "lucide-react";

export function DigitalFootprintSection() {
  const platforms = [
    { name: "GitHub", icon: <Code className="w-6 h-6" />, category: "Version Control & OSS", score: 95, verified: true, lastScanned: "2 mins ago", color: "text-ink bg-warm-sand" },
    { name: "LeetCode", icon: <Code2 className="w-6 h-6" />, category: "Algorithm Formulation", score: 88, verified: true, lastScanned: "4 mins ago", color: "text-rust bg-rust/10" },
    { name: "LinkedIn", icon: <Users className="w-6 h-6" />, category: "Professional Network", score: 99, verified: true, lastScanned: "1 min ago", color: "text-[#0A66C2] bg-[#0A66C2]/10" },
    { name: "Kaggle", icon: <Database className="w-6 h-6" />, category: "Data Science", score: 40, verified: false, lastScanned: "15 mins ago", color: "text-[#20BEFF] bg-[#20BEFF]/10" },
    { name: "GeeksforGeeks", icon: <Code2 className="w-6 h-6" />, category: "Data Structures", score: 85, verified: true, lastScanned: "10 mins ago", color: "text-sage bg-sage/10" },
  ];

  return (
    <section id="digital-footprint" className="w-full min-h-screen py-24 flex items-center bg-cream relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16 max-w-2xl"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-widest text-sage border border-sage/30 bg-sage/5 rounded-full animate-pulse">
            Neev Cloud Powered
          </span>
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-ink mb-6">Verification Hub</h2>
          <p className="text-lg text-ink/70">
            A comprehensive, multi-platform aggregation mapping candidate digital velocity, authority, and veracity in real-time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6">
          {platforms.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
              className="group flex flex-col md:flex-row items-start md:items-center justify-between p-6 md:p-8 rounded-2xl bg-warm-sand border border-ink/10 hover:border-ink/20 shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="flex items-center gap-6 mb-6 md:mb-0">
                <div className={`p-4 rounded-xl ${p.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  {p.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-ink flex items-center gap-3">
                    {p.name} 
                    {p.verified && <CheckCircle className="w-5 h-5 text-sage" />}
                  </h3>
                  <p className="text-sm text-ink/60 font-medium">{p.category}</p>
                </div>
              </div>

              <div className="w-full md:w-1/2 flex flex-col gap-3">
                <div className="flex justify-between items-end">
                  <span className="text-4xl font-mono font-bold text-ink tracking-tighter">
                    {p.score}<span className="text-lg text-ink/40">/100</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-ink/50 font-mono">
                    <Clock className="w-3 h-3" /> {p.lastScanned}
                  </span>
                </div>
                <div className="w-full h-3 bg-ink/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${p.score}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.2 + (i * 0.1), ease: "easeOut" }}
                    className={`h-full ${p.score >= 80 ? 'bg-sage' : p.score >= 50 ? 'bg-gold' : 'bg-rust'}`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Decorative large icon background */}
      <ShieldCheck className="absolute -right-64 top-1/2 -translate-y-1/2 w-[800px] h-[800px] text-ink/5 pointer-events-none" />
    </section>
  );
}
