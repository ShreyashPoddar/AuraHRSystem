"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, Sparkles, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { useState } from "react";

export function AIDateSchedulingSection() {
  const [selectedDate, setSelectedDate] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState(1);

  const dates = [
    { day: "Tue", date: "24", optimized: false },
    { day: "Wed", date: "25", optimized: false },
    { day: "Thu", date: "26", optimized: true },
    { day: "Fri", date: "27", optimized: true },
    { day: "Sat", date: "28", optimized: false },
    { day: "Sun", date: "29", optimized: false },
    { day: "Mon", date: "30", optimized: true },
  ];

  const slots = [
    { time: "09:00 AM", duration: "45 Min", interviewer: "Arjun TechLead", match: 82, type: "Standard" },
    { time: "11:30 AM", duration: "60 Min", interviewer: "Neha Director", match: 98, type: "Neev Optimized" },
    { time: "02:00 PM", duration: "45 Min", interviewer: "Vikram Backend", match: 75, type: "Standard" },
    { time: "04:15 PM", duration: "60 Min", interviewer: "Priya Staff Eng", match: 91, type: "High Synergy" },
  ];

  return (
    <section id="ai-scheduling" className="w-full min-h-screen py-24 flex items-center bg-warm-sand relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div className="max-w-xl">
            <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-widest text-ink bg-ink/5 border border-ink/10 rounded-full animate-pulse">
              Neev Cloud Powered
            </span>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-ink mb-6">Smart Scheduler</h2>
            <p className="text-lg text-ink/70">
              Eliminate calendar tetris. The AI cross-references panel availability with candidate peak cognitive windows to propose high-conversion timeslots.
            </p>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="bg-ink text-warm-sand px-8 py-5 rounded-2xl font-bold text-xl shadow-2xl flex items-center gap-4 transition-all hover:bg-black group"
          >
            <Sparkles className="w-6 h-6 text-gold group-hover:rotate-12 transition-transform" />
            One-Tap AutoSchedule
          </motion.button>
        </motion.div>

        <div className="bg-cream border border-ink/10 rounded-3xl p-6 md:p-12 shadow-xl flex flex-col lg:flex-row gap-12">
          
          {/* Calendar Picker */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-serif font-bold text-ink flex items-center gap-3">
                <Calendar className="w-6 h-6 text-rust" /> 
                Select Date
              </h3>
              <div className="flex gap-2">
                <button className="p-2 rounded-full bg-warm-sand border border-ink/10 hover:bg-ink/5"><ChevronLeft className="w-5 h-5" /></button>
                <button className="p-2 rounded-full bg-warm-sand border border-ink/10 hover:bg-ink/5"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4">
              {dates.map((d, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedDate(i)}
                  className={`flex flex-col items-center justify-center py-6 px-2 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedDate === i 
                      ? "bg-ink text-warm-sand border-ink shadow-lg scale-105" 
                      : "bg-warm-sand text-ink/80 border-transparent hover:border-ink/10"
                  } ${d.optimized && selectedDate !== i ? "border-gold/30 bg-gold/5" : ""}`}
                >
                  <span className="text-sm font-medium mb-2">{d.day}</span>
                  <span className="text-3xl font-serif font-bold">{d.date}</span>
                  <div className="mt-3 h-4">
                    {d.optimized && (
                      <Sparkles className={`w-4 h-4 ${selectedDate === i ? "text-gold" : "text-rust"} animate-pulse`} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Slots Picker */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-[450px]"
          >
            <h3 className="text-2xl font-serif font-bold text-ink mb-8 flex items-center gap-3">
              <Clock className="w-6 h-6 text-sage" /> 
              Recommended Slots
            </h3>
            
            <div className="space-y-4">
              {slots.map((s, i) => (
                <motion.div 
                  key={i}
                  onClick={() => setSelectedSlot(i)}
                  whileHover={{ scale: 1.02 }}
                  className={`flex items-stretch justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedSlot === i 
                      ? "border-sage bg-sage/5" 
                      : "border-ink/10 bg-warm-sand hover:border-ink/30"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-2xl font-mono font-bold text-ink">{s.time}</span>
                    <span className="text-sm font-medium text-ink/60">Duration: {s.duration}</span>
                    <span className="text-xs text-ink/50 bg-ink/5 px-2 py-1 rounded inline-block w-max mt-1">
                      Panel: {s.interviewer}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end justify-between">
                    {selectedSlot === i ? (
                      <CheckCircle2 className="w-6 h-6 text-sage" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-ink/20" />
                    )}
                    
                    <div className="text-right">
                      <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${
                        s.match > 90 ? "text-gold" : "text-rust"
                      }`}>
                        {s.type}
                      </span>
                      <span className="text-sm font-bold text-ink">{s.match}% Fit</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
