"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Loader2, Sparkles } from "lucide-react";
import clsx from "clsx";

export default function SmartScheduler() {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const slots = [
    { id: 1, date: "Oct 12", time: "10:00 AM", match: "98%" },
    { id: 2, date: "Oct 12", time: "02:00 PM", match: "85%" },
    { id: 3, date: "Oct 13", time: "11:30 AM", match: "92%" },
    { id: 4, date: "Oct 14", time: "09:00 AM", match: "75%" },
  ];

  const handleBooking = (id: number) => {
    setSelectedSlot(id);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 text-slate-200 h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -ml-10 -mt-10 pointer-events-none" />

      <div className="flex items-center space-x-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-wide">AI Scheduler</h3>
          <p className="text-xs text-slate-400">Timezone & Habit Optimized</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 relative z-10">
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.id;
          return (
            <motion.button
              key={slot.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleBooking(slot.id)}
              disabled={isLoading && !isSelected}
              className={clsx(
                "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                isSelected
                  ? "bg-indigo-500/20 border-indigo-500"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700",
                isLoading && !isSelected && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{slot.date}</p>
                  <p className="text-xs text-slate-400">{slot.time}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] text-indigo-300">{slot.match} Fit</span>
                </div>
                
                {isSelected && isLoading ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : (
                  <div className={clsx("w-5 h-5 rounded-full border flex items-center justify-center transition-colors", isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-600")}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
