"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Zap, Sparkles, Users } from "lucide-react";

interface BoxProps {
  title: string;
  icon: React.ElementType;
  items: string[];
  color: string;
  bg: string;
}

const Box = ({ title, icon: Icon, items, color, bg }: BoxProps) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={`p-5 rounded-2xl border transition-all ${bg} border-slate-800 hover:border-indigo-500/30 group`}
  >
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <h4 className="font-bold text-slate-200 text-sm">{title}</h4>
    </div>
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span 
          key={i} 
          className="text-[10px] font-medium bg-slate-900/80 text-slate-400 px-2 py-1 rounded-md border border-slate-800 group-hover:border-slate-700 transition-colors"
        >
          {item}
        </span>
      ))}
    </div>
  </motion.div>
);

export default function JDAnalysisFourBox() {
  const data = [
    {
      title: "Must-Have Skills",
      icon: ShieldCheck,
      items: ["Next.js 14+", "TypeScript", "PostgreSQL", "Tailwind CSS"],
      color: "text-emerald-400",
      bg: "bg-emerald-500/5"
    },
    {
      title: "Good-to-Have Skills",
      icon: Zap,
      items: ["Docker", "GraphQL", "Redis", "AWS Lambda"],
      color: "text-blue-400",
      bg: "bg-blue-500/5"
    },
    {
      title: "Future-Proof Skills",
      icon: Sparkles,
      items: ["Neev Cloud AI", "LLM Fine-tuning", "Vector DBs"],
      color: "text-indigo-400",
      bg: "bg-indigo-500/5"
    },
    {
      title: "Team Gap Skills",
      icon: Users,
      items: ["DevSecOps", "Performance Audit", "Web3 Hooks"],
      color: "text-amber-400",
      bg: "bg-amber-500/5"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((box, i) => (
        <Box key={i} {...box} />
      ))}
    </div>
  );
}
