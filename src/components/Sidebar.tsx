"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { 
  Home, CreditCard, ShieldCheck, Users, Settings, 
  Eye, Calendar, ChevronDown, LayoutGrid, Building2,
  ChevronsLeft, ChevronsRight, FileText
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (href: string) => pathname === href;

  const menuItems = [
    { href: "/dashboard", label: "Overview", icon: Home },
    {
      label: "Recruitments",
      icon: Users,
      badge: "4",
      isDropdown: true,
      children: [
        { href: "/dashboard/recruitment", label: "Dashboard", badge: "NEW", icon: LayoutGrid },
        { href: "/dashboard/proctoring", label: "Interview Room", badge: "NEW", icon: Eye },
        { href: "/dashboard/applications", label: "Applications", icon: FileText }
      ]
    },
    { href: "/dashboard/scheduling/manage", label: "Smart Scheduler", icon: Calendar },
    { href: "/dashboard/employees", label: "Employer", icon: Building2 },
    { href: "/dashboard/payroll", label: "Payroll", icon: CreditCard },
    { href: "/dashboard/compliance", label: "Compliance", icon: ShieldCheck },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside 
      className={`bg-[#1c1d1b] border-r border-white/5 hidden md:flex flex-col text-[#9ca3af] transition-all duration-300 shrink-0 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header / Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 shrink-0">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center space-x-2"
            >
              {/* Custom SVG Leaf / AuraHR Icon */}
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                className="w-6 h-6 text-[#7ca982] shrink-0"
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" className="opacity-20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" className="opacity-20" />
              </svg>
              <span className="font-sans text-xl font-bold text-white tracking-tight">AuraHR</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#9ca3af] hover:text-white p-1 rounded hover:bg-white/5 transition-colors ml-auto"
        >
          {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>
      
      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item, idx) => {
          if (item.isDropdown) {
            return (
              <div key={idx} className="space-y-1 py-1">
                <button 
                  onClick={() => !isCollapsed && setIsRecruitmentOpen(!isRecruitmentOpen)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl font-sans text-sm font-medium transition-all group ${
                    isCollapsed ? "justify-center" : "justify-between"
                  } hover:bg-white/5 hover:text-white`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5 text-[#9ca3af] group-hover:text-white transition-colors shrink-0" />
                    {!isCollapsed && <span className="text-[#9ca3af] group-hover:text-white">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="flex items-center space-x-2">
                      {item.badge && (
                        <span className="bg-[#2d2e2d] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                          {item.badge}
                        </span>
                      )}
                      <motion.div
                        animate={{ rotate: isRecruitmentOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="opacity-50"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </div>
                  )}
                </button>

                {/* Submenu with custom lines */}
                <AnimatePresence>
                  {isRecruitmentOpen && !isCollapsed && item.children && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden relative pl-9 mt-1 space-y-1"
                    >
                      {/* Vertical line connector */}
                      <div className="absolute left-[25px] top-0 bottom-4 w-[1px] bg-white/10" />

                      {item.children.map((child, cIdx) => {
                        const childActive = isActive(child.href);
                        return (
                          <div key={cIdx} className="relative flex items-center group">
                            {/* Horizontal line connector */}
                            <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/10" />
                            
                            <Link 
                              href={child.href}
                              className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg font-sans text-sm font-medium transition-all ${
                                childActive 
                                  ? "bg-white/10 text-white" 
                                  : "text-[#9ca3af] hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <child.icon className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span>{child.label}</span>
                              </div>
                              {child.badge && (
                                <span className="bg-[#7ca982]/20 text-[#a8c3a0] text-[10px] px-1.5 py-0.5 rounded-md font-semibold tracking-wider">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          const active = isActive(item.href || "");
          return (
            <Link 
              key={idx}
              href={item.href || "#"} 
              className={`flex items-center px-3 py-2.5 rounded-xl font-sans text-sm font-medium transition-all group ${
                isCollapsed ? "justify-center" : "justify-between"
              } ${
                active 
                  ? "bg-[#a8c3a0] text-[#1c2e1c] font-semibold shadow-md" 
                  : "text-[#9ca3af] hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon 
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    active ? "text-[#1c2e1c]" : "text-[#9ca3af] group-hover:text-white"
                  }`} 
                />
                {!isCollapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* Sidebar Footer */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className={`rounded-xl flex items-center transition-all ${
          isCollapsed ? "justify-center p-2 bg-emerald-500/10 text-[#7ca982]" : "px-4 py-3 bg-[#2d2e2d] text-white/60 space-x-3"
        }`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!isCollapsed && <span className="font-sans text-[11px] font-semibold tracking-wider uppercase">Systems Operational</span>}
        </div>
      </div>
    </aside>
  );
}
