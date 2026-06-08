"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  GitBranch,
  Code2,
  Trophy,
  Briefcase,
  MonitorPlay,
  Calendar,
  Activity,
  Server,
  Network,
  Cpu,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Eye,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Video
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import MotionPerformanceShowcase from "@/components/experiments/MotionPerformanceShowcase";

// --- Mock Data ---

const footprintData = [
  { platform: "GitHub", icon: GitBranch, score: "98/100", verified: true, detail: "1.2k Contributions" },
  { platform: "LeetCode", icon: Code2, score: "Top 2%", verified: true, detail: "450+ Solved" },
  { platform: "Kaggle", icon: Trophy, score: "Expert", verified: true, detail: "3 Medals" },
  { platform: "LinkedIn", icon: Briefcase, score: "All-Star", verified: true, detail: "500+ Connections" },
  { platform: "GeeksforGeeks", icon: BrainCircuit, score: "2400", verified: true, detail: "Institute Rank 1" },
];

const scheduleSlots = [
  { day: "Mon", date: "12", isOptimized: false, available: true },
  { day: "Tue", date: "13", isOptimized: true, available: true },
  { day: "Wed", date: "14", isOptimized: false, available: false },
  { day: "Thu", date: "15", isOptimized: true, available: true },
  { day: "Fri", date: "16", isOptimized: false, available: true },
];

const marketTrendData = [
  { year: "2023", candidate: 40, market: 35 },
  { year: "2024", candidate: 55, market: 48 },
  { year: "2025", candidate: 75, market: 65 },
  { year: "2026", candidate: 92, market: 85 },
];

const teamCollabData = [
  { skill: "Frontend", candidate: 90, teamAvg: 75 },
  { skill: "Backend", candidate: 65, teamAvg: 85 },
  { skill: "DevOps", candidate: 40, teamAvg: 80 },
  { skill: "AI/ML", candidate: 85, teamAvg: 45 },
  { skill: "System Design", candidate: 75, teamAvg: 70 },
];

// --- Sub-components ---

const NeevLabel = () => (
  <div className="absolute top-4 right-4 flex items-center bg-gold/10 border border-gold/20 text-gold text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full z-10">
    <Sparkles className="w-3 h-3 mr-1" />
    Neev Cloud Powered
  </div>
);

// Feature 1: Digital Footprint Miner
const DigitalFootprint = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.1 }}
    className="bento-card p-8 flex flex-col relative overflow-hidden group bg-cream shadow-sm"
  >
    <NeevLabel />
    <div className="bg-sage/10 w-12 h-12 rounded-full flex items-center justify-center mb-6">
      <ShieldCheck className="text-sage w-6 h-6" />
    </div>
    <h3 className="font-serif text-2xl mb-2 text-ink">Digital Footprint Miner</h3>
    <p className="font-sans text-ink/60 text-sm mb-6">Real-time candidate authenticity validation</p>
    
    <div className="space-y-3 mt-auto">
      {footprintData.map((item, i) => (
        <div key={i} className="flex justify-between items-center bg-white/60 p-3 rounded-xl border border-ink/5 hover:border-ink/20 transition-colors">
          <div className="flex items-center space-x-3">
            <item.icon className="w-5 h-5 text-ink/70" />
            <span className="font-medium text-ink text-sm">{item.platform}</span>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 justify-end">
              <span className="font-bold text-ink">{item.score}</span>
              {item.verified && <CheckCircle2 className="w-3.5 h-3.5 text-sage" />}
            </div>
            <div className="text-xs text-ink/50">{item.detail}</div>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

// Feature 2: Live AI Proctoring
const AIProctoring = () => {
  const [isMonitoring, setIsMonitoring] = useState(true);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bento-card p-6 flex flex-col relative overflow-hidden group lg:col-span-2 bg-[#1C1A16] text-[#FAF7F2] border-none"
    >
      <NeevLabel />
      <div className="flex items-center justify-between mb-4 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-rust/20 w-10 h-10 rounded-full flex items-center justify-center">
            <MonitorPlay className="text-rust w-5 h-5" />
          </div>
          <h3 className="font-serif text-2xl text-cream">Live AI Proctoring</h3>
        </div>
        <button 
          onClick={() => setIsMonitoring(!isMonitoring)}
          className={clsx(
            "text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center",
            isMonitoring ? "bg-rust/20 text-rust border border-rust/30" : "bg-ink/50 text-cream border border-ink/30"
          )}
        >
          {isMonitoring ? "Monitoring Active" : "Monitoring Paused"}
          <span className={clsx("ml-2 w-2 h-2 rounded-full", isMonitoring ? "bg-rust animate-pulse" : "bg-ink/50")} />
        </button>
      </div>

      <div className="flex-1 relative rounded-2xl overflow-hidden bg-black/50 border border-white/5 flex items-center justify-center min-h-[300px]">
        {/* Mock Video Container */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-ink/40 via-black to-black"></div>
        
        {/* AI Tracking Overlays */}
        <AnimatePresence>
          {isMonitoring && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border border-rust/40 rounded-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] w-24 h-12 border border-blue-400/30 rounded-full" />
              
              {/* Overlay lines matching typical AI vision mockups */}
              <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#E87D65" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#E87D65" strokeWidth="0.5" strokeDasharray="4 4" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="z-10 text-center">
          <Eye className={clsx("w-12 h-12 mx-auto mb-2 opacity-50", isMonitoring ? "text-rust" : "text-cream")} />
          <p className="font-mono text-sm text-cream/70 tracking-widest uppercase">
            {isMonitoring ? "Analyzing Environment..." : "Camera Off"}
          </p>
          {isMonitoring && (
            <div className="mt-4 flex space-x-2 justify-center">
              <span className="bg-black/80 border border-white/10 px-2 py-1 rounded text-[10px] text-green-400 font-mono">Gaze: Aligned</span>
              <span className="bg-black/80 border border-white/10 px-2 py-1 rounded text-[10px] text-green-400 font-mono">Audio: Clear</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Feature 3: AI Date Scheduling
const SchedulingCalendar = () => {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bento-card p-8 flex flex-col relative overflow-hidden group bg-cream/80"
    >
      <NeevLabel />
      <div className="bg-indigo-600/10 w-12 h-12 rounded-full flex items-center justify-center mb-6">
        <Calendar className="text-indigo-600 w-6 h-6" />
      </div>
      <h3 className="font-serif text-2xl mb-2 text-ink">AI Date Scheduling</h3>
      <p className="font-sans text-ink/60 text-sm mb-6">Auto-negotiated cross-timezone slots</p>
      
      <div className="grid grid-cols-5 gap-2 mb-6">
        {scheduleSlots.map((slot, i) => (
          <button
            key={i}
            disabled={!slot.available}
            onClick={() => setSelectedSlot(slot.date)}
            className={clsx(
              "flex flex-col items-center p-3 rounded-2xl transition-all relative border",
              !slot.available && "opacity-40 cursor-not-allowed bg-ink/5 border-transparent",
              slot.available && selectedSlot === slot.date && "bg-ink text-cream border-ink scale-105 shadow-md",
              slot.available && selectedSlot !== slot.date && "bg-white hover:border-ink/30 border-ink/10",
              slot.isOptimized && "ring-1 ring-gold ring-offset-1 ring-offset-cream/80"
            )}
          >
            {slot.isOptimized && (
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-gold hidden sm:block" />
            )}
            <span className="text-xs uppercase font-medium opacity-70 mb-1">{slot.day}</span>
            <span className={clsx("text-xl font-serif font-medium", selectedSlot === slot.date ? "text-cream" : "text-ink")}>{slot.date}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto bg-gold/10 p-4 rounded-xl border border-gold/20 flex items-start space-x-3">
        <BrainCircuit className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-ink">Neev Recommendation</p>
          <p className="text-xs text-ink/70 mt-1">
            Thursday scheduling yields a 34% higher candidate acceptance rate based on historical data.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// Feature 4: Market Trend Evolution
const MarketTrends = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.4 }}
    className="bento-card p-8 flex flex-col relative overflow-hidden lg:col-span-2 group bg-white shadow-sm"
  >
    <NeevLabel />
    <h3 className="font-serif text-2xl mb-2 text-ink">Market Trend Evolution</h3>
    <p className="font-sans text-ink/60 text-sm mb-6">Candidate trajectory vs 2026 Industry Demand</p>
    
    <div className="h-[250px] w-full mt-auto">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={marketTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} dx={-10} />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            itemStyle={{ fontSize: '14px', fontWeight: 500 }}
          />
          <Line type="monotone" dataKey="candidate" name="Candidate Skill Index" stroke="#1A1814" strokeWidth={3} dot={{ r: 4, fill: '#1A1814', strokeWidth: 0 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="market" name="Industry Demand" stroke="#C8A84B" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#C8A84B', strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

// Feature 5: Team Collaboration Graph
const TeamRadar = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.5 }}
    className="bento-card p-8 flex flex-col relative overflow-hidden group bg-cream"
  >
    <NeevLabel />
    <h3 className="font-serif text-2xl mb-2 text-ink">Team Collaboration Grid</h3>
    <p className="font-sans text-ink/60 text-sm mb-2">Skill gap analysis overlay</p>
    
    <div className="h-[250px] w-full mt-auto -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={teamCollabData}>
          <PolarGrid stroke="#E5E5E5" />
          <PolarAngleAxis dataKey="skill" tick={{ fill: '#4A4A4A', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Candidate" dataKey="candidate" stroke="#1A1814" fill="#1A1814" fillOpacity={0.2} />
          <Radar name="Team Avg" dataKey="teamAvg" stroke="#C8A84B" fill="#transparent" strokeDasharray="3 3" />
          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
    <div className="flex justify-center space-x-4 mt-2 text-xs font-medium text-ink/70">
      <div className="flex items-center"><div className="w-3 h-3 bg-ink/20 border border-ink rounded-full mr-2" /> Candidate</div>
      <div className="flex items-center"><div className="w-3 h-3 border border-gold border-dashed rounded-full mr-2" /> Team Basis</div>
    </div>
  </motion.div>
);

// Feature 6: Website Test
const SystemHealthMonitor = () => {
  const [latency, setLatency] = useState(42);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => Math.max(20, Math.min(120, prev + (Math.random() * 20 - 10))));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bento-card p-8 flex flex-col relative overflow-hidden group bg-[#1C1A16] text-cream border-none shadow-[0_0_20px_rgba(200,168,75,0.05)]"
    >
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-sage/20 rounded-full blur-3xl opacity-50" />
      <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-gold/20 rounded-full blur-3xl opacity-50" />
      
      <NeevLabel />
      <div className="flex items-center space-x-3 mb-6">
        <Activity className="text-sage w-6 h-6 animate-pulse" />
        <h3 className="font-serif text-2xl">System Health</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4 flex-1">
        <div className="bg-white/5 rounded-2xl p-4 flex flex-col justify-center border border-white/5">
          <span className="text-cream/50 text-sm mb-1 font-mono uppercase tracking-wider">Latency</span>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-serif font-medium">{latency.toFixed(0)}</span>
            <span className="text-cream/50 mb-1">ms</span>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-2xl p-4 flex flex-col justify-center border border-white/5">
          <span className="text-cream/50 text-sm mb-1 font-mono uppercase tracking-wider">Uptime</span>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-serif font-medium">99.9</span>
            <span className="text-cream/50 mb-1">%</span>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 col-span-2 flex items-center justify-between border border-white/5">
           <div className="flex items-center space-x-3 text-sm text-cream/80">
             <Server className="w-4 h-4 text-gold" />
             <span>Edge Nodes Active</span>
           </div>
           <span className="font-mono text-sage">Operational</span>
        </div>
      </div>
    </motion.div>
  );
};

export default function ExperimentDashboard() {
  return (
    <div className="min-h-[100dvh] bg-warm-sand selection:bg-gold/30 pt-24 pb-12 px-4 sm:px-6">
      
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rust/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Link href="/" className="inline-flex items-center space-x-2 text-ink/60 hover:text-ink transition-colors mb-4 text-sm font-medium">
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>Back to aurhr</span>
            </Link>
            <h1 className="font-serif text-4xl md:text-5xl font-medium text-ink flex items-center gap-3">
              <Sparkles className="text-gold w-8 h-8" />
              Experiment <span className="italic text-ink/50">Lab</span>
            </h1>
            <p className="mt-4 text-lg text-ink/70 font-sans max-w-2xl">
              Preview the bleeding edge of global recruitment workflows. All experimental modules below are driven by our internal <span className="font-medium text-ink">Neev Cloud</span> inference engines.
            </p>
          </div>
          
          <div className="flex items-center space-x-2 bg-cream border border-ink/10 px-4 py-2 rounded-full shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sage"></span>
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-ink/70">Live Environment</span>
          </div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[380px]">
          <DigitalFootprint />
          <AIProctoring />
          <TeamRadar />
          <MarketTrends />
          <SchedulingCalendar />
          <SystemHealthMonitor />
          <MotionPerformanceShowcase />
        </div>
        
      </div>
    </div>
  );
}
