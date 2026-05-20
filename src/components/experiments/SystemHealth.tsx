"use client";

import { motion } from "framer-motion";
import { Activity, Server, Zap, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

export function SystemHealth() {
  const [latency, setLatency] = useState(24);
  const [cpuUsage, setCpuUsage] = useState(42);
  const [memoryUsage, setMemoryUsage] = useState(68);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => prev + (Math.random() > 0.5 ? 2 : -2));
      setCpuUsage(prev => Math.min(100, Math.max(0, prev + (Math.random() * 10 - 5))));
      setMemoryUsage(prev => Math.min(100, Math.max(0, prev + (Math.random() * 4 - 2))));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bento-card p-6 flex flex-col justify-between h-full bg-cream border border-ink/10 relative overflow-hidden"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-sans font-semibold text-lg flex items-center gap-2 text-ink">
          <Activity className="w-5 h-5 text-rust" /> 
          System Health
        </h3>
        <span className="text-[10px] uppercase font-bold text-sage bg-sage/10 px-2 py-1 rounded border border-sage/20 tracking-wider">
          Neev Cloud Powered
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Latency Gauge */}
        <div className="bg-warm-sand p-4 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm text-ink/70">
            <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-gold" /> Latency</span>
          </div>
          <div className="text-3xl font-mono font-bold text-ink">
            {latency}<span className="text-sm text-ink/50">ms</span>
          </div>
          <div className="w-full bg-ink/10 h-1 mt-1 rounded-full overflow-hidden">
            <motion.div 
              className="bg-gold h-full"
              initial={{ width: 0 }}
              animate={{ width: `${(latency / 100) * 100}%` }}
              transition={{ type: "spring" }}
            />
          </div>
        </div>

        {/* Server Uptime */}
        <div className="bg-warm-sand p-4 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm text-ink/70">
            <span className="flex items-center gap-1"><Server className="w-4 h-4 text-sage" /> Uptime</span>
          </div>
          <div className="text-3xl font-mono font-bold text-ink">
            99.99<span className="text-sm text-ink/50">%</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-sage mt-1">
            <ShieldCheck className="w-3 h-3" /> All systems operational
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {/* CPU */}
        <div>
          <div className="flex justify-between text-xs mb-1 text-ink/70">
            <span>CPU Allocation</span>
            <span>{cpuUsage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-ink/10 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-rust h-full"
              animate={{ width: `${cpuUsage}%` }}
              transition={{ ease: "easeInOut", duration: 0.5 }}
            />
          </div>
        </div>
        {/* Memory */}
        <div>
          <div className="flex justify-between text-xs mb-1 text-ink/70">
            <span>Memory Usage</span>
            <span>{memoryUsage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-ink/10 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-sage h-full"
              animate={{ width: `${memoryUsage}%` }}
              transition={{ ease: "easeInOut", duration: 0.5 }}
            />
          </div>
        </div>
      </div>
      
      {/* Decorative pulse */}
      <motion.div 
        className="absolute -bottom-6 -right-6 w-24 h-24 bg-sage/10 rounded-full blur-2xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ repeat: Infinity, duration: 4 }}
      />
    </motion.div>
  );
}
