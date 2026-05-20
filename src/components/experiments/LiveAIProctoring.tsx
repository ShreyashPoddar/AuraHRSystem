"use client";

import { motion } from "framer-motion";
import { Eye, ShieldAlert, ScanLine } from "lucide-react";
import { useState, useEffect } from "react";

export function LiveAIProctoring() {
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setScanning(s => !s), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bento-card p-6 flex flex-col h-full bg-ink text-warm-sand border border-ink overflow-hidden relative"
    >
      <div className="flex justify-between items-center mb-4 z-10 relative">
        <h3 className="font-sans font-semibold text-lg flex items-center gap-2 text-warm-sand">
          <Eye className="w-5 h-5 text-gold" /> 
          Live AI Proctoring
        </h3>
        <span className="text-[10px] uppercase font-bold text-ink bg-gold px-2 py-1 rounded tracking-wider shadow-[0_0_10px_rgba(200,168,75,0.5)]">
          Neev Cloud Powered
        </span>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden bg-black/50 border border-warm-sand/20 min-h-[200px] flex items-center justify-center z-10">
        {/* Placeholder for webcam */}
        <div className="absolute inset-0 bg-ink opacity-80" />
        <p className="z-20 text-warm-sand/40 font-mono text-sm">Simulated Webcam Feed</p>
        
        {/* Animated Scan Line */}
        <motion.div 
          className="absolute inset-x-0 h-1 bg-gold shadow-[0_0_15px_#C8A84B] z-30"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* SVG Overlay: Eye Tracking Box */}
        <motion.div 
          className="absolute top-1/3 left-1/3 w-1/3 h-1/4 border-2 border-sage border-dashed z-20"
          animate={{ 
            x: [0, 10, -5, 0],
            y: [0, -5, 5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute -top-6 left-0 bg-sage text-white text-[10px] px-1">Tracking: Stable</div>
        </motion.div>

        {/* Corner Brackets */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-warm-sand/50 z-20" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-warm-sand/50 z-20" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-warm-sand/50 z-20" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-warm-sand/50 z-20" />
      </div>

      <div className="mt-4 flex gap-4 text-xs font-mono z-10 relative">
        <div className="flex items-center gap-2">
          <motion.div 
            className="w-2 h-2 rounded-full bg-sage"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-warm-sand/80">Eye-Tracking: Active</span>
        </div>
        <div className="flex items-center gap-2">
          <ScanLine className="w-3 h-3 text-gold" />
          <span className="text-warm-sand/80">Env Scan: {scanning ? "Analyzing..." : "Clear"}</span>
        </div>
      </div>
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gold/10 blur-[50px] pointer-events-none" />
    </motion.div>
  );
}
