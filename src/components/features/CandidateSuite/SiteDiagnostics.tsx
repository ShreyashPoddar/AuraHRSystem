"use client";

import React, { useState, useEffect } from "react";
import { Activity, Server, Clock, Database, Globe } from "lucide-react";

export default function SiteDiagnostics() {
  const [latency, setLatency] = useState(42);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency((prev) => Math.floor(Math.random() * 20) + 30); // Random latency between 30-50ms
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 text-slate-200 h-full flex flex-col relative overflow-hidden">
      
      <div className="flex items-center space-x-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
          <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-wide">System Health</h3>
          <p className="text-xs text-slate-400">Vercel Edge Network</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 relative z-10">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl -mr-6 -mt-6" />
          <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1 uppercase font-mono tracking-wider">
            <Clock className="w-3 h-3" />
            <span>Latency</span>
          </div>
          <div className="flex items-end">
            <span className="text-2xl font-semibold text-slate-200">{latency}</span>
            <span className="text-xs text-slate-500 ml-1 mb-1">ms</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl -mr-6 -mt-6" />
          <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1 uppercase font-mono tracking-wider">
            <Activity className="w-3 h-3" />
            <span>Uptime</span>
          </div>
          <div className="flex items-end">
            <span className="text-2xl font-semibold text-slate-200">99.9</span>
            <span className="text-xs text-slate-500 ml-1 mb-1">%</span>
          </div>
        </div>

        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-slate-300">Global CDN routing</span>
          </div>
          <div className="flex items-center space-x-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded-md">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
