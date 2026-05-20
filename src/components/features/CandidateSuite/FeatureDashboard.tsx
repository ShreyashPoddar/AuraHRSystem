"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Database, WifiOff, RefreshCcw } from "lucide-react";
import clsx from "clsx";

import FootprintMiner from "./FootprintMiner";
import SmartScheduler from "./SmartScheduler";
import FutureProofScore from "./FutureProofScore";
import SynergyGraph from "./SynergyGraph";
import ProctorView from "./ProctorView";
import SiteDiagnostics from "./SiteDiagnostics";
import RecruitmentPipeline from "./RecruitmentPipeline";
import TeamGapAnalysis from "./TeamGapAnalysis";

export default function FeatureDashboard() {
  const [connectBackend, setConnectBackend] = useState(false);

  return (
    <div className="py-8 px-2 relative w-full bg-transparent font-sans text-ink">
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-ink flex items-center gap-3 font-serif">
              <Sparkles className="text-gold w-8 h-8" />
              Recruitment Intelligence
            </h2>
            <p className="mt-4 text-ink/60 max-w-2xl text-lg">
              Monitor candidate pipelines, analyze team skill gaps, and verify interview integrity with real-time AI telemetry.
            </p>
          </div>

          {/* Connect Backend Toggle */}
          <div className="flex flex-col items-end">
            <button 
              onClick={() => setConnectBackend(!connectBackend)}
              className={clsx(
                "relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-offset-warm-sand ring-transparent",
                connectBackend ? "bg-sage" : "bg-ink/10"
              )}
            >
              <span className={clsx(
                "inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 shadow-sm",
                connectBackend ? "translate-x-9" : "translate-x-1"
              )} />
            </button>
            <div className="mt-3 flex items-center space-x-2 text-[10px] font-mono tracking-wider uppercase">
              {connectBackend ? (
                <>
                  <RefreshCcw className="w-3.5 h-3.5 text-sage animate-spin" />
                  <span className="text-sage">Production: Dedicated Tunnel</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-ink/40" />
                  <span className="text-ink/40">Demo Mode: Edge Cache</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min md:auto-rows-[400px]">
          
          {/* Main Pipeline - Largest Card */}
          <div className="lg:col-span-2 lg:row-span-2 bg-cream border border-ink/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <RecruitmentPipeline />
          </div>

          {/* Team Gap Analysis */}
          <div className="lg:col-span-1 lg:row-span-1 bg-white border border-ink/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <TeamGapAnalysis />
          </div>
          
          {/* Smart Scheduler */}
          <div className="lg:col-span-1 lg:row-span-1 bg-cream/50 border border-ink/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <SmartScheduler />
          </div>
          
          {/* Feature: Integrity Timeline (Proctoring) */}
          <div className="lg:col-span-2 lg:row-span-1 bg-ink text-warm-sand rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <ProctorView />
          </div>

          {/* Site Health & Diagnostics */}
          <div className="lg:col-span-1 lg:row-span-1 bg-warm-sand border border-ink/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <SiteDiagnostics />
          </div>
          
          {/* Skill Evolution & Trends */}
          <div className="lg:col-span-1 lg:row-span-1 bg-cream border border-ink/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <FutureProofScore />
          </div>

        </div>
      </div>
    </div>
  );
}
