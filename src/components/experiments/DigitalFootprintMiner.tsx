"use client";

import { motion } from "framer-motion";
import { Code, Users, CheckCircle, Code2, Database } from "lucide-react";

export function DigitalFootprintMiner({ candidateName, role }: { candidateName?: string, role?: string }) {
  // Simple deterministic seed based on name length
  const seed = (candidateName?.length || 10) % 20;
  
  const footprints = [
    { source: "GitHub", icon: <Code className="w-4 h-4" />, score: 85 + seed, verified: true, color: "bg-ink", textColor: "text-warm-sand" },
    { source: "LeetCode", icon: <Code2 className="w-4 h-4" />, score: 70 + (seed * 1.5), verified: true, color: "bg-rust/20", textColor: "text-rust" },
    { source: "LinkedIn", icon: <Users className="w-4 h-4" />, score: 90 + (seed / 2), verified: true, color: "bg-[#0A66C2]/20", textColor: "text-[#0A66C2]" },
    { source: "Kaggle", icon: <Database className="w-4 h-4" />, score: 30 + seed, verified: seed > 10, color: "bg-[#20BEFF]/20", textColor: "text-[#20BEFF]" },
    { source: "StackOverflow", icon: <Code2 className="w-4 h-4" />, score: 65 + seed, verified: true, color: "bg-sage/20", textColor: "text-sage" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bento-card p-6 flex flex-col h-full bg-cream border border-ink/10"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-sans font-semibold text-lg text-ink">
            Digital Footprint
          </h3>
          <p className="text-xs text-ink/60 mt-1">Cross-platform profile aggregation</p>
        </div>
        <span className="text-[10px] uppercase font-bold text-sage bg-sage/10 px-2 py-1 rounded border border-sage/20 tracking-wider">
          Neev Cloud Powered
        </span>
      </div>

      <div className="space-y-4 flex-1">
        {footprints.map((item, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${item.color} ${item.textColor}`}>
                  {item.icon}
                </div>
                <span className="font-medium text-ink/80">{item.source}</span>
                {item.verified && <CheckCircle className="w-3 h-3 text-sage" />}
              </div>
              <span className="font-mono text-xs font-bold text-ink">{item.score}/100</span>
            </div>
            <div className="w-full bg-ink/5 h-2 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${item.score > 80 ? 'bg-sage' : item.score > 50 ? 'bg-gold' : 'bg-rust'}`}
                initial={{ width: 0 }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 1, delay: i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
