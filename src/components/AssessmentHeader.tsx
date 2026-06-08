// src/components/AssessmentHeader.tsx
"use client";
import React from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface AssessmentHeaderProps {
  title: string;
  timeLeft: number; // seconds
  totalTime: number; // seconds
}

const radius = 30;
const circumference = 2 * Math.PI * radius;

export default function AssessmentHeader({ title, timeLeft, totalTime }: AssessmentHeaderProps) {
  const progress = timeLeft / totalTime;
  const offset = circumference * (1 - progress);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-cream/80 backdrop-blur-md border-b border-ink/10 glass-card">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <motion.div
        className="relative w-20 h-20"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <svg className="absolute inset-0" width={40} height={40} viewBox="0 0 80 80">
          <circle
            cx={40}
            cy={40}
            r={radius}
            stroke="var(--color-ink)"
            strokeWidth={6}
            fill="none"
            opacity={0.2}
          />
          <circle
            cx={40}
            cy={40}
            r={radius}
            stroke="var(--color-gold)"
            strokeWidth={6}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={timeLeft <= 60 ? "stroke-red-500" : "stroke-gold"}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-ink">
          <Clock size={16} className="mb-1" />
          <span className="font-mono text-sm font-medium">{timeStr}</span>
        </div>
      </motion.div>
    </header>
  );
}
