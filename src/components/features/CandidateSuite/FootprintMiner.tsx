"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Code, Users, Code2, CheckCircle2, ShieldCheck } from "lucide-react";

export default function FootprintMiner({ links = [] }: { links?: string[] }) {
  const [progress, setProgress] = useState(0);
  const [isScraping, setIsScraping] = useState(true);

  useEffect(() => {
    if (progress < 100) {
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 100));
      }, 100); // 100ms * 20 = 2 seconds
      return () => clearInterval(interval);
    } else {
      setIsScraping(false);
    }
  }, [progress]);

  return (
    <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 text-slate-200 h-full flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-center space-x-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-wide">Footprint Miner</h3>
          <p className="text-xs text-slate-400">OSINT Data Aggregator</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-6 relative z-10">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className={isScraping ? "text-amber-500 animate-pulse" : "text-emerald-500"}>
              {isScraping ? "Status: Scraping..." : "Verification Complete"}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-emerald-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            className={`flex items-center space-x-2 p-3 rounded-xl border ${
              isScraping ? "bg-slate-900 border-slate-800 opacity-50" : "bg-slate-900 border-emerald-500/30"
            } transition-colors`}
          >
            <Code className="w-5 h-5 text-slate-300" />
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">GitHub</p>
              {!isScraping && <p className="text-[10px] text-emerald-500">Verified</p>}
            </div>
            {!isScraping && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            className={`flex items-center space-x-2 p-3 rounded-xl border ${
              isScraping ? "bg-slate-900 border-slate-800 opacity-50" : "bg-slate-900 border-emerald-500/30"
            } transition-colors`}
          >
            <Users className="w-5 h-5 text-blue-400" />
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">LinkedIn</p>
              {!isScraping && <p className="text-[10px] text-emerald-500">Verified</p>}
            </div>
            {!isScraping && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            className={`flex items-center space-x-2 p-3 rounded-xl border ${
              isScraping ? "bg-slate-900 border-slate-800 opacity-50" : "bg-slate-900 border-emerald-500/30"
            } transition-colors`}
          >
            <Code2 className="w-5 h-5 text-orange-400" />
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">LeetCode</p>
              {!isScraping && <p className="text-[10px] text-emerald-500">Verified</p>}
            </div>
            {!isScraping && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          </motion.button>
        </div>
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
    </div>
  );
}
