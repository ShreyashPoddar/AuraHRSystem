"use client";

import { motion } from "framer-motion";
import { Eye, ShieldAlert, ScanLine, AlertTriangle, MessageSquare, BrainCircuit } from "lucide-react";
import { useState, useEffect } from "react";

export function LiveAIProctoringSection() {
  const [logs, setLogs] = useState([
    { time: "10:02:14", text: "Micro-expression detected: High Confidence", type: "info" },
    { time: "10:05:30", text: "Gaze deviation prolonged beyond 5s metric", type: "alert" }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() > 0.7) {
        setLogs(prev => [
          ...prev.slice(-4), 
          { 
            time: new Date().toLocaleTimeString('en-US', { hour12: false }), 
            text: Math.random() > 0.5 ? "Sentiment normalized: Focus restored" : "Audio anomaly: Key keyboard typing rate increased",
            type: Math.random() > 0.8 ? "alert" : "info"
          }
        ]);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="live-proctoring" className="w-full min-h-screen py-24 flex flex-col justify-center bg-ink text-warm-sand relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-widest text-ink bg-gold rounded-full shadow-[0_0_15px_rgba(200,168,75,0.4)] animate-pulse">
              Neev Cloud Powered
            </span>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-warm-sand mb-4">Interview Room</h2>
            <p className="text-lg text-warm-sand/60 max-w-2xl">
              Zero-latency environment tracking. Advanced biometric arrays process candidate sentiment and gaze telemetry directly in browser.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 border border-warm-sand/20 rounded-lg bg-black/50 backdrop-blur">
              <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
              <span className="font-mono text-sm">REC 00:42:18</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Main Video Area */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-2 relative rounded-3xl overflow-hidden bg-black border border-warm-sand/20 shadow-2xl flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-ink opacity-60" />
            <p className="z-20 text-warm-sand/30 font-mono text-xl">Simulated High-Definition Feed</p>
            
            {/* Overlay grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
            
            <motion.div 
              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_20px_#C8A84B] z-30 opacity-70"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />

            <motion.div 
              className="absolute top-1/4 left-1/4 w-[40%] h-[50%] border-2 border-sage border-dashed z-20"
              animate={{ x: [0, 15, -10, 0], y: [0, -10, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute -top-7 left-0 bg-sage text-white text-xs px-2 py-1 font-mono rounded-tl">Subject Tracking Valid</div>
              <div className="absolute bottom-2 right-2 flex gap-1">
                <span className="w-1 h-1 bg-sage rounded-full" />
                <span className="w-1 h-1 bg-sage rounded-full" />
                <span className="w-1 h-1 bg-sage rounded-full" />
              </div>
            </motion.div>
          </motion.div>

          {/* AI Live Insights Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            <div className="bg-warm-sand/5 border border-warm-sand/20 rounded-3xl p-6 flex-1 flex flex-col">
              <h3 className="text-xl font-bold flex items-center gap-2 mb-6 border-b border-warm-sand/10 pb-4">
                <BrainCircuit className="w-5 h-5 text-gold" /> AI Live Insights
              </h3>
              
              <div className="space-y-6 flex-1">
                <div>
                  <div className="flex justify-between text-sm mb-2 font-mono">
                    <span className="text-warm-sand/70">Cognitive Load</span>
                    <span className="text-rust">Elevated</span>
                  </div>
                  <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-rust" animate={{ width: ["60%", "75%", "65%"] }} transition={{ duration: 3, repeat: Infinity }} />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2 font-mono">
                    <span className="text-warm-sand/70">Engagement</span>
                    <span className="text-sage">Optimal</span>
                  </div>
                  <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-sage" animate={{ width: ["85%", "95%", "90%"] }} transition={{ duration: 2, repeat: Infinity }} />
                  </div>
                </div>
              </div>

              <div className="mt-auto border-t border-warm-sand/10 pt-4">
                <h4 className="text-xs uppercase tracking-widest text-warm-sand/50 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Event Log
                </h4>
                <div className="space-y-3 font-mono text-xs">
                  {logs.map((log, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-3 p-2 rounded bg-black/30 border-l-2 ${log.type === 'alert' ? 'border-rust text-rust' : 'border-gold text-warm-sand/80'}`}
                    >
                      <span className="opacity-50 shrink-0">{log.time}</span>
                      <span>{log.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
