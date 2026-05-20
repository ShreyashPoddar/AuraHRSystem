"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Monitor, Eye, Clock } from "lucide-react";

export type IntegrityEvent = {
  time: string;
  event: string;
  type: 'success' | 'warning' | 'info';
  icon: any;
  note?: string;
};

export default function IntegrityTimeline({ events = [] }: { events?: IntegrityEvent[] }) {
  const displayEvents = events && events.length > 0 ? events : [
    { time: "System", event: "Awaiting Session Start…", type: "info" as const, icon: Clock },
  ];

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-6">
      <h3 className="text-xl font-serif text-white mb-6 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-gold" />
        Integrity Timeline
      </h3>

      <div className="space-y-6 relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />

        {displayEvents.map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-4 relative"
          >
            <div className={`mt-1.5 w-6 h-6 rounded-full flex items-center justify-center z-10 border ${
              item.type === 'warning' ? 'bg-red-900/20 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 
              item.type === 'success' ? 'bg-sage/20 border-sage text-sage' :
              'bg-white/10 border-white/20 text-white/40'
            }`}>
              {item.icon ? <item.icon className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-white/80">{item.event}</span>
                <span className="text-[10px] font-mono text-white/30 uppercase">{item.time}</span>
              </div>
              {item.note && (
                <p className="text-[10px] text-white/40 mt-1 italic font-mono">{item.note}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
