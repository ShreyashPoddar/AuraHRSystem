"use client";

import React, { useState, useEffect, useRef } from "react";
import { animate, timeline } from "motion";
import { Sparkles, Activity, Cpu, Zap, RotateCcw, AlertTriangle, Play, Pause } from "lucide-react";
import clsx from "clsx";

export default function MotionPerformanceShowcase() {
  const [isBlocking, setIsBlocking] = useState(false);
  const [particleCount, setParticleCount] = useState(40);
  const [fps, setFps] = useState(120);
  const [animationEngine, setAnimationEngine] = useState<"waapi" | "js">("waapi");
  const [springConfig, setSpringConfig] = useState({ stiffness: 100, damping: 10, mass: 1 });
  
  const blockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const particlesContainerRef = useRef<HTMLDivElement>(null);
  const springCardRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  // High-performance WAAPI loop for floating nodes
  useEffect(() => {
    if (!particlesContainerRef.current) return;
    
    // Clear previous elements
    particlesContainerRef.current.innerHTML = "";
    const container = particlesContainerRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;
    
    const controls: any[] = [];
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "absolute rounded-full pointer-events-none transition-shadow";
      
      // Randomize styles
      const size = Math.random() * 12 + 6;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * (width - 20)}px`;
      particle.style.top = `${Math.random() * (height - 20)}px`;
      
      // Gold and warm rust theme colors
      const colors = ["rgba(200, 168, 75, 0.4)", "rgba(232, 125, 101, 0.4)", "rgba(107, 138, 122, 0.4)", "rgba(26, 24, 20, 0.2)"];
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.border = "1px solid rgba(255, 255, 255, 0.2)";
      
      container.appendChild(particle);
      
      // Animate using WAAPI (Native Web Animations API via Motion)
      if (animationEngine === "waapi") {
        const control = animate(
          particle,
          {
            x: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, 0],
            y: [0, (Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150, 0],
            scale: [1, Math.random() * 1.5 + 0.5, Math.random() * 1.5 + 0.5, 1],
            opacity: [0.3, 0.9, 0.5, 0.3],
          },
          {
            duration: Math.random() * 6 + 4,
            repeat: Infinity,
            direction: "alternate",
            easing: "ease-in-out",
          }
        );
        controls.push(control);
      } else {
        // JS manual update simulation for comparison
        let startTime = Date.now();
        const duration = (Math.random() * 6 + 4) * 1000;
        const dx = (Math.random() - 0.5) * 200;
        const dy = (Math.random() - 0.5) * 150;
        
        let reqId: number;
        
        const tick = () => {
          const elapsed = (Date.now() - startTime) % duration;
          const progress = elapsed / duration;
          const factor = Math.sin(progress * Math.PI * 2);
          
          particle.style.transform = `translate(${dx * factor}px, ${dy * factor}px) scale(${1 + factor * 0.3})`;
          particle.style.opacity = `${0.3 + (factor + 1) * 0.3}`;
          
          reqId = requestAnimationFrame(tick);
        };
        
        reqId = requestAnimationFrame(tick);
        controls.push({ stop: () => cancelAnimationFrame(reqId) });
      }
    }
    
    return () => {
      controls.forEach(c => c.stop());
    };
  }, [particleCount, animationEngine]);
  
  // Spring controller trigger using native spring values
  const triggerSpringAnimation = () => {
    if (!springCardRef.current) return;
    
    animate(
      springCardRef.current,
      {
        rotate: [0, -10, 10, -5, 5, 0],
        scale: [1, 1.08, 0.95, 1.02, 1],
        y: [0, -20, 5, -2, 0]
      },
      {
        type: "spring",
        stiffness: springConfig.stiffness,
        damping: springConfig.damping,
        mass: springConfig.mass,
      }
    );
  };

  // Block the main thread for 1.5 seconds synchronously to demonstrate compositor performance
  const simulateMainThreadBlock = () => {
    setIsBlocking(true);
    setFps(10); // Simulated drop during block
    
    // We defer the heavy block using setTimeout to allow UI state to update first
    blockTimerRef.current = setTimeout(() => {
      const start = Date.now();
      // Synchronous blocking loop (1.5 seconds)
      while (Date.now() - start < 1500) {
        // Blocks the main thread completely
      }
      
      setIsBlocking(false);
      setFps(120);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    };
  }, []);

  return (
    <div className="bento-card p-6 flex flex-col relative overflow-hidden group lg:col-span-2 bg-[#171512] text-[#FAF7F2] border border-gold/15 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute -right-20 -top-20 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-rust/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Neev Powered Label */}
      <div className="absolute top-4 right-4 flex items-center bg-gold/15 border border-gold/30 text-gold text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full z-20">
        <Zap className="w-3 h-3 mr-1 text-gold fill-gold/20 animate-pulse" />
        WAAPI GPU Engine
      </div>
      
      {/* Title Bar */}
      <div className="flex items-center space-x-3 mb-4 z-10">
        <div className="bg-gold/20 w-10 h-10 rounded-full flex items-center justify-center border border-gold/30 shadow-[0_0_10px_rgba(200,168,75,0.2)]">
          <Activity className="text-gold w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="font-serif text-xl text-cream tracking-wide">Motion Performance Showcase</h3>
          <p className="text-[11px] text-[#FAF7F2]/50 font-mono tracking-wider uppercase">Native Browser Compositor</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 z-10">
        
        {/* Particle Canvas Panel */}
        <div className="md:col-span-7 flex flex-col bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden p-3 min-h-[220px]">
          <div className="absolute inset-0 z-0 opacity-80" ref={particlesContainerRef} />
          
          {/* Performance Statistics HUD Overlay */}
          <div className="mt-auto z-10 bg-black/75 backdrop-blur-md border border-white/10 rounded-xl p-3 flex justify-between items-center shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-cream/40 font-mono">Framerate</span>
                <span className={clsx(
                  "font-mono text-xl font-bold transition-colors",
                  fps > 60 ? "text-green-400" : "text-rust animate-pulse"
                )}>
                  {isBlocking && animationEngine === "js" ? "0" : fps} <span className="text-xs font-normal opacity-70">FPS</span>
                </span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-cream/40 font-mono">Engine</span>
                <span className="font-mono text-xs text-gold uppercase tracking-widest font-semibold">
                  {animationEngine === "waapi" ? "WAAPI (GPU)" : "React JS (CPU)"}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setAnimationEngine(p => p === "waapi" ? "js" : "waapi")}
              className="px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-lg bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold transition-all"
            >
              Toggle Engine
            </button>
          </div>
        </div>

        {/* Control and Tester Panel */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-3">
          
          {/* Main Thread Blocker Simulator */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 flex flex-col justify-between space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-cream text-xs font-semibold">Performance Tester</span>
                <p className="text-[10px] text-[#FAF7F2]/60 mt-0.5 leading-relaxed">
                  WAAPI runs on the GPU compositor thread, making it immune to heavy JavaScript load!
                </p>
              </div>
              <Cpu className={clsx("w-4 h-4 text-gold", isBlocking && "animate-spin")} />
            </div>

            <button
              onClick={simulateMainThreadBlock}
              disabled={isBlocking}
              className={clsx(
                "w-full py-2 rounded-xl text-xs font-semibold tracking-wider transition-all border flex items-center justify-center space-x-2 shadow-inner",
                isBlocking
                  ? "bg-rust/20 border-rust/40 text-rust cursor-not-allowed"
                  : "bg-rust hover:bg-rust-light border-rust/30 text-white font-medium hover:scale-[1.02]"
              )}
            >
              <AlertTriangle className="w-4 h-4 animate-bounce" />
              <span>{isBlocking ? "Blocking Main Thread..." : "Block Main Thread (1.5s)"}</span>
            </button>
          </div>

          {/* Spring Configurator & Interactive Test Component */}
          <div 
            ref={springCardRef}
            onClick={triggerSpringAnimation}
            className="bg-gold/10 hover:bg-gold/15 rounded-2xl p-3 border border-gold/20 flex flex-col justify-between cursor-pointer transition-all shadow-md group/card select-none"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-gold text-xs font-bold uppercase tracking-wider">WAAPI Spring Engine</span>
                <p className="text-[10px] text-cream/70 mt-0.5 font-sans leading-tight">
                  Click card to trigger spring anim
                </p>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-gold group-hover/card:scale-125 transition-transform" />
            </div>
            
            <div className="flex items-center space-x-2 mt-2 bg-black/35 rounded-xl px-2.5 py-1.5 border border-white/5">
              <div className="flex flex-col flex-1">
                <span className="text-[8px] uppercase tracking-wider text-cream/40 font-mono">Stiffness</span>
                <input
                  type="range"
                  min="10"
                  max="400"
                  value={springConfig.stiffness}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setSpringConfig(p => ({ ...p, stiffness: Number(e.target.value) }))}
                  className="w-full accent-gold h-1 mt-1 bg-white/20 rounded"
                />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-[8px] uppercase tracking-wider text-cream/40 font-mono">Damping</span>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={springConfig.damping}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setSpringConfig(p => ({ ...p, damping: Number(e.target.value) }))}
                  className="w-full accent-gold h-1 mt-1 bg-white/20 rounded"
                />
              </div>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
