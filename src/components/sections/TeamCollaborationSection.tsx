"use client";

import { motion } from "framer-motion";
import { Users, Crosshair, Target, CheckCircle2 } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function TeamCollaborationSection() {
  const data = [
    { subject: 'Frontend Arch', candidate: 95, gap: 70, fullMark: 100 },
    { subject: 'Backend Dist', candidate: 75, gap: 85, fullMark: 100 },
    { subject: 'DevOps / CI/CD', candidate: 85, gap: 90, fullMark: 100 },
    { subject: 'Design Systems', candidate: 88, gap: 60, fullMark: 100 },
    { subject: 'Leadership', candidate: 80, gap: 75, fullMark: 100 },
    { subject: 'Agile Comm', candidate: 92, gap: 85, fullMark: 100 },
  ];

  return (
    <section id="collaboration" className="w-full min-h-[90vh] py-24 flex items-center bg-warm-sand relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16 text-center max-w-3xl mx-auto"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-widest text-rust border border-rust/30 bg-rust/5 rounded-full animate-pulse">
            Neev Cloud Powered
          </span>
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-ink mb-6">Synergy Mapping</h2>
          <p className="text-lg text-ink/70">
            Precision overlap plotting. See exactly how a candidate’s vectors patch your existing squad’s technical voids.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 items-center">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="w-full lg:w-3/5 h-[500px] md:h-[600px] bg-cream rounded-3xl p-4 md:p-8 shadow-2xl border border-ink/5"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
                <PolarGrid stroke="#1C1A16" opacity={0.15} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#1C1A16', fontSize: 13, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip 
                  wrapperStyle={{ zIndex: 100 }}
                  contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '12px', border: '1px solid rgba(28, 26, 22, 0.1)', color: '#1C1A16', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }} 
                  itemStyle={{ fontWeight: 600, padding: '4px 0' }}
                />
                <Radar name="Candidate Competency" dataKey="candidate" stroke="#C8A84B" strokeWidth={3} fill="#C8A84B" fillOpacity={0.4} />
                <Radar name="Team Deficit Areas" dataKey="gap" stroke="#C4522A" strokeWidth={3} fill="#C4522A" fillOpacity={0.2} strokeDasharray="5 5" />
                <Legend wrapperStyle={{ fontSize: 14, paddingTop: '20px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-2/5 flex flex-col gap-6"
          >
            <div className="bg-cream rounded-3xl p-8 border border-ink/10 shadow-lg">
              <h3 className="text-2xl font-bold font-serif mb-6 flex items-center gap-3 border-b border-ink/10 pb-4">
                <Crosshair className="w-6 h-6 text-rust" /> Gap Analysis
              </h3>
              
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="p-2 bg-sage/10 text-sage rounded-full shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">Design Systems Void Filled</h4>
                    <p className="text-sm text-ink/70 mt-1">Candidate exceeds the team delta by +28 pts in Design System architecture. High immediate impact.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="p-2 bg-sage/10 text-sage rounded-full shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">Frontend Core Acceleration</h4>
                    <p className="text-sm text-ink/70 mt-1">Candidate scores 95 against a minor gap of 70, establishing them as a potential lead node in this cluster.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="p-2 bg-rust/10 text-rust rounded-full shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">DevOps Up-skilling Needed</h4>
                    <p className="text-sm text-ink/70 mt-1">Candidate operates 5 pts beneath team infrastructure deficit. Peer-pairing recommended.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-ink text-warm-sand flex items-center justify-between">
              <div>
                <p className="text-sm text-warm-sand/60">Overall Fit Quotient</p>
                <p className="text-3xl font-bold mt-1">91.4%</p>
              </div>
              <Users className="w-12 h-12 text-gold opacity-50" />
            </div>
          </motion.div>
          
        </div>
      </div>
      
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-[50%] h-[100%] rounded-full bg-gradient-to-tr from-gold/5 to-rust/5 blur-[120px] pointer-events-none" />
    </section>
  );
}
