"use client";

import { motion } from "framer-motion";
import { Activity, Server, Zap, ShieldCheck, HardDrive, Network, Lock, Fingerprint } from "lucide-react";
import { useState, useEffect } from "react";

export function SystemHealthSection() {
  const [metrics, setMetrics] = useState({ latency: 24, cpu: 42, memory: 68, activeNodes: 1420, bandwidth: 8.4 });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        latency: Math.max(10, Math.min(60, metrics.latency + (Math.random() > 0.5 ? 2 : -2))),
        cpu: Math.min(100, Math.max(0, metrics.cpu + (Math.random() * 10 - 5))),
        memory: Math.min(100, Math.max(0, metrics.memory + (Math.random() * 4 - 2))),
        activeNodes: Math.max(1400, Math.min(1450, metrics.activeNodes + (Math.random() > 0.5 ? 1 : -1))),
        bandwidth: Math.max(7, Math.min(10, metrics.bandwidth + (Math.random() * 0.4 - 0.2))),
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [metrics]);

  return (
    <section id="system-health" className="w-full min-h-screen py-24 flex items-center bg-ink text-warm-sand relative overflow-hidden">
      
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,240,232,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,232,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-12 text-center"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-widest text-ink bg-warm-sand rounded-full">
            Neev Cloud Powered
          </span>
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-warm-sand mb-4">Core Telemetry</h2>
          <p className="text-lg text-warm-sand/50 max-w-2xl mx-auto">
            Live operational data from the decentralized intelligence grid managing candidate verification protocols.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-black/60 backdrop-blur-md rounded-3xl p-8 border border-warm-sand/10 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-warm-sand/60 font-mono text-sm uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-gold" /> Global Latency
              </span>
            </div>
            <p className="text-6xl font-mono font-bold text-warm-sand mb-2">
              {metrics.latency}<span className="text-2xl text-warm-sand/40">ms</span>
            </p>
            <div className="w-full bg-warm-sand/5 h-1.5 rounded-full overflow-hidden mt-4">
              <motion.div className="bg-gold h-full" animate={{ width: `${(metrics.latency / 100) * 100}%` }} transition={{ type: "spring" }} />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-black/60 backdrop-blur-md rounded-3xl p-8 border border-warm-sand/10 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-warm-sand/60 font-mono text-sm uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-sage" /> Node Grid
              </span>
            </div>
            <p className="text-6xl font-mono font-bold text-warm-sand mb-2">
              {metrics.activeNodes}
            </p>
            <p className="text-sm font-medium text-sage flex items-center gap-2 mt-4">
              <ShieldCheck className="w-4 h-4" /> Fully Operational
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-black/60 backdrop-blur-md rounded-3xl p-8 border border-warm-sand/10 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-warm-sand/60 font-mono text-sm uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-rust" /> CPU Allocation
              </span>
            </div>
            <p className="text-6xl font-mono font-bold text-warm-sand mb-2">
              {metrics.cpu.toFixed(1)}<span className="text-2xl text-warm-sand/40">%</span>
            </p>
            <div className="w-full bg-warm-sand/5 h-1.5 rounded-full overflow-hidden mt-4">
              <motion.div className="bg-rust h-full" animate={{ width: `${metrics.cpu}%` }} transition={{ ease: "easeInOut", duration: 0.5 }} />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-black/60 backdrop-blur-md rounded-3xl p-8 border border-warm-sand/10 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-warm-sand/60 font-mono text-sm uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#20BEFF]" /> Memory Usage
              </span>
            </div>
            <p className="text-6xl font-mono font-bold text-warm-sand mb-2">
              {metrics.memory.toFixed(1)}<span className="text-2xl text-warm-sand/40">%</span>
            </p>
            <div className="w-full bg-warm-sand/5 h-1.5 rounded-full overflow-hidden mt-4">
              <motion.div className="bg-[#20BEFF] h-full" animate={{ width: `${metrics.memory}%` }} transition={{ ease: "easeInOut", duration: 0.5 }} />
            </div>
          </motion.div>

        </div>

        {/* Security & Firewall visualizer */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-black/60 backdrop-blur-md rounded-3xl p-8 border border-warm-sand/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-sage/10 border border-sage/30 flex items-center justify-center animate-pulse">
              <Lock className="w-10 h-10 text-sage" />
            </div>
            <div>
              <h3 className="text-2xl font-bold font-serif mb-1">Zero-Trust Firewall Active</h3>
              <p className="text-warm-sand/50 font-mono text-sm text-balance">All biometric and API transmission layers are end-to-end encrypted under Neev Security Protocols.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-warm-sand/60 font-mono text-sm">
            <div className="flex flex-col items-center">
              <Fingerprint className="w-8 h-8 mb-2 opacity-50 text-gold" />
              <span>Identity</span>
            </div>
            <div className="h-px w-12 bg-warm-sand/20" />
            <div className="flex flex-col items-center">
              <Network className="w-8 h-8 mb-2 opacity-50 text-[#20BEFF]" />
              <span>Network</span>
            </div>
            <div className="h-px w-12 bg-warm-sand/20" />
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-8 h-8 mb-2 text-sage" />
              <span className="text-sage">Secure</span>
            </div>
          </div>
        </motion.div>
      </div>

    </section>
  );
}
