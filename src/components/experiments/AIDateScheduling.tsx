"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle2, Sparkles } from "lucide-react";

export function AIDateScheduling() {
  const dates = [
    { day: "Thu", date: "26", active: false, optimized: false },
    { day: "Fri", date: "27", active: true, optimized: true },
    { day: "Sat", date: "28", active: false, optimized: false },
    { day: "Sun", date: "29", active: false, optimized: false },
    { day: "Mon", date: "30", active: false, optimized: true },
  ];

  const slots = [
    { time: "09:00 AM", match: 80 },
    { time: "11:30 AM", match: 98, selected: true },
    { time: "02:00 PM", match: 75 },
    { time: "04:15 PM", match: 90 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bento-card p-6 flex flex-col bg-cream h-full border border-ink/10"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-sans font-semibold text-lg flex items-center gap-2 text-ink">
            <Calendar className="w-5 h-5 text-rust" /> 
            Smart Scheduler
          </h3>
          <p className="text-xs text-ink/60 mt-1">AI-Optimized interview coordination</p>
        </div>
        <span className="text-[10px] uppercase font-bold text-rust bg-rust/10 px-2 py-1 rounded border border-rust/20 tracking-wider">
          Neev Cloud Powered
        </span>
      </div>

      <div className="flex justify-between gap-2 mb-6">
        {dates.map((d, i) => (
          <div 
            key={i} 
            className={`flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer transition-all ${
              d.active 
                ? "bg-ink text-warm-sand border-ink shadow-lg" 
                : "bg-warm-sand/50 text-ink/70 border-transparent hover:border-ink/20"
            } ${d.optimized && !d.active ? "border-gold/30 bg-gold/5" : ""}`}
          >
            <span className="text-xs">{d.day}</span>
            <span className="text-lg font-bold">{d.date}</span>
            {d.optimized && (
              <span className="mt-1">
                <Sparkles className={`w-3 h-3 ${d.active ? "text-gold" : "text-rust"}`} />
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-6 flex-1">
        <h4 className="text-xs font-semibold text-ink/50 uppercase tracking-widest flex items-center gap-2">
          Neev-Optimized Slots
        </h4>
        {slots.map((s, i) => (
          <motion.div 
            key={i}
            whileHover={{ scale: 1.02 }}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
              s.selected 
                ? "border-sage bg-sage/10 text-sage" 
                : "border-ink/10 bg-warm-sand text-ink hover:border-ink/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-sm">{s.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">{s.match}% Fit</span>
              {s.selected && <CheckCircle2 className="w-4 h-4" />}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button 
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-rust text-white py-3 rounded-xl font-semibold shadow-lg shadow-rust/20 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        One-Tap Schedule
      </motion.button>
    </motion.div>
  );
}
