"use client";

import React from "react";
import { motion } from "framer-motion";
import { Network, Users } from "lucide-react";

export default function SynergyGraph() {
  const nodes = [
    { id: 'candidate', x: 50, y: 50, label: 'Candidate', type: 'center', color: '#6366f1' },
    { id: 'n1', x: 20, y: 20, label: 'Lead Frontend', type: 'team', match: '92%', stat: 'Communication' },
    { id: 'n2', x: 80, y: 20, label: 'Senior Backend', type: 'team', match: '88%', stat: 'Code Review' },
    { id: 'n3', x: 20, y: 80, label: 'Product Designer', type: 'team', match: '95%', stat: 'UX Synergy' },
    { id: 'n4', x: 80, y: 80, label: 'DevOps Engineer', type: 'team', match: '15%', stat: 'Tech Overlap' },
  ];

  return (
    <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 text-slate-200 h-full flex flex-col relative overflow-hidden group">
      
      <div className="flex items-center space-x-3 mb-4 relative z-10">
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
          <Network className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-wide">Synergy Graph</h3>
          <p className="text-xs text-slate-400">Team Culture fit & Skill overlap</p>
        </div>
      </div>

      <div className="flex-1 w-full relative z-10 min-h-[220px]">
        {/* SVG lines */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {nodes.filter(n => n.type === 'team').map((node, i) => (
            <g key={`line-${i}`}>
              {/* Line */}
              <motion.line
                x1="50%" y1="50%"
                x2={`${node.x}%`} y2={`${node.y}%`}
                stroke={parseInt(node.match || '0') > 50 ? "#4f46e5" : "#64748b"}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 1, delay: i * 0.2 }}
              />
              
              {/* Text background and label */}
              <rect 
                x={`${(50 + node.x) / 2}%`} 
                y={`${(50 + node.y) / 2}%`} 
                width="110" height="20" 
                fill="#0f172a" 
                rx="4"
                transform="translate(-55, -10)"
                stroke="#1e293b"
              />
              <text 
                x={`${(50 + node.x) / 2}%`} 
                y={`${(50 + node.y) / 2}%`} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fill={parseInt(node.match || '0') > 50 ? "#818cf8" : "#94a3b8"}
                fontSize="10"
                className="font-mono tracking-wider"
              >
                {node.stat}: {node.match}
              </text>
            </g>
          ))}
        </svg>

        {/* Nodes (HTML Overlay) */}
        {nodes.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: i * 0.1 + 0.5 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className={`flex flex-col items-center justify-center ${node.type === 'center' ? 'w-16 h-16 bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'w-10 h-10 bg-slate-800 border border-slate-700'} rounded-full cursor-pointer hover:scale-110 transition-transform`}>
              {node.type === 'center' ? (
                <Users className="w-6 h-6 text-white" />
              ) : (
                <span className="text-xs font-medium text-slate-300">{node.label.split(' ')[0][0]}{node.label.split(' ')[1][0]}</span>
              )}
            </div>
            {node.type !== 'center' && (
              <p className="text-[10px] text-slate-400 mt-1 font-medium whitespace-nowrap text-center bg-slate-900/80 px-1 py-0.5 rounded">
                {node.label}
              </p>
            )}
            {node.type === 'center' && (
               <p className="text-xs text-white font-medium mt-2 whitespace-nowrap">Candidate</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
