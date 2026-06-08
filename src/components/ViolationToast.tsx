// src/components/ViolationToast.tsx
"use client";
import React from "react";
import { ShieldAlert } from "lucide-react";

interface ViolationToastProps {
  count: number;
  flagged: boolean;
}

export default function ViolationToast({ count, flagged }: ViolationToastProps) {
  if (count === 0) return null;
  const bgClass = flagged ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-md text-sm font-bold ${bgClass}`}> 
        <ShieldAlert size={14} />
        <span>{count} Violation{count !== 1 ? "s" : ""}{flagged ? " — FLAGGED" : ""}</span>
      </div>
    </div>
  );
}
