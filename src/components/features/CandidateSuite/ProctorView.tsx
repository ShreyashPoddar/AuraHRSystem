"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Eye, AlertTriangle, MonitorPlay } from "lucide-react";

export default function ProctorView() {
  const [micLevel, setMicLevel] = useState(40);
  const [tabAlerts, setTabAlerts] = useState(0);

  useEffect(() => {
    const micInterval = setInterval(() => {
      setMicLevel(Math.floor(Math.random() * 40) + 30); // Random mic level between 30 and 70
    }, 500);

    const alertInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        setTabAlerts((prev) => prev + 1);
      }
    }, 5000);

    return () => {
      clearInterval(micInterval);
      clearInterval(alertInterval);
    };
  }, []);

  return (
    <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 text-slate-200 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center text-sm font-medium tracking-wide">
          <MonitorPlay className="w-5 h-5 text-indigo-400 mr-2" />
          Live AI Proctoring
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-red-400 font-mono tracking-widest uppercase">Recording</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 mt-2 z-10 relative">
        {/* Video simulation area */}
        <div className="relative flex-1 bg-black/60 border border-slate-700/50 rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
          
          <Eye className="w-12 h-12 text-slate-600 opacity-50 z-10" />
          
          {/* Face Mesh SVG Overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <g stroke="#6366f1" strokeWidth="0.5" fill="none">
              <path d="M 30,50 Q 50,20 70,50 Q 50,80 30,50" strokeDasharray="2,2" />
              <circle cx="40" cy="45" r="3" />
              <circle cx="60" cy="45" r="3" />
              <path d="M 45,60 Q 50,65 55,60" />
              <path d="M 50,30 L 50,55" strokeDasharray="1,2" />
            </g>
          </svg>

          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-800 text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
            Gaze: Aligned
          </div>
        </div>

        {/* Sidebars */}
        <div className="flex flex-row lg:flex-col gap-3 lg:w-40 min-w-[140px]">
          {/* Mic Sensitivity */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center text-xs text-slate-400 font-medium mb-2 uppercase tracking-wide">
              <Mic className="w-3 h-3 mr-1" /> Audio
            </div>
            
            <div className="flex items-end space-x-1 h-12">
              {[...Array(6)].map((_, i) => {
                const height = i === 1 || i === 4 ? micLevel : i === 2 || i === 3 ? micLevel * 1.5 : micLevel * 0.7;
                return (
                  <motion.div
                    key={i}
                    className="w-full bg-indigo-500 rounded-t-sm"
                    animate={{ height: `${Math.min(height, 100)}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                );
              })}
            </div>
          </div>

          {/* Tab Alerts */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden group">
            {tabAlerts > 0 && <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />}
            
            <div className="flex items-center text-xs text-slate-400 font-medium mb-2 uppercase tracking-wide">
              <AlertTriangle className={`w-3 h-3 mr-1 ${tabAlerts > 0 ? 'text-red-400' : 'text-slate-500'}`} />
              Tab Switch
            </div>
            
            <div className="flex items-end justify-between">
              <span className={`text-3xl font-bold ${tabAlerts > 0 ? "text-red-400" : "text-emerald-500"}`}>
                {tabAlerts}
              </span>
              <span className="text-[10px] text-slate-500 font-mono uppercase">Alerts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
