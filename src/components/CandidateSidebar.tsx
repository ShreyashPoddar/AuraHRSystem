'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Home, Briefcase, FileText, User, HelpCircle, Settings,
  ChevronsLeft, ChevronsRight, Calendar, Shield,
} from 'lucide-react';

const menuItems = [
  { href: '/candidate',              label: 'Dashboard',       icon: Home },
  { href: '/candidate/posts',        label: 'Open Posts',       icon: Briefcase },
  { href: '/candidate/applications', label: 'My Applications',  icon: FileText },
  { href: '/candidate/scheduler',    label: 'Smart Scheduler',  icon: Calendar },
  { href: '/candidate/profile',      label: 'Profile',          icon: User },
  { href: '/candidate/help',         label: 'Help',             icon: HelpCircle },
  { href: '/candidate/settings',     label: 'Settings',         icon: Settings },
  { href: '/org',                    label: 'Recruiter View',    icon: Shield },
];

export function CandidateSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/candidate') return pathname === '/candidate';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`bg-[#1a1f2e] border-r border-white/5 hidden md:flex flex-col text-[#9ca3af] transition-all duration-300 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 shrink-0">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center space-x-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-blue-400 shrink-0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          className="text-[#9ca3af] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-auto"
        >
          {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-xl font-sans text-sm font-medium transition-all duration-200 group ${
                isCollapsed ? 'justify-center' : 'justify-start'
              } ${
                active
                  ? 'bg-blue-500/20 text-blue-300 font-semibold shadow-md'
                  : 'text-[#9ca3af] hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 transition-colors duration-200 ${
                  active ? 'text-blue-300' : 'text-[#9ca3af] group-hover:text-white'
                }`}
              />
              {!isCollapsed && <span className="ml-3">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className={`rounded-xl flex items-center transition-all ${
          isCollapsed ? 'justify-center p-2 bg-blue-500/10 text-blue-400' : 'px-4 py-3 bg-[#232938] text-white/60 space-x-3'
        }`}>
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
          {!isCollapsed && (
            <span className="font-sans text-[11px] font-semibold tracking-wider uppercase">Candidate Mode</span>
          )}
        </div>
      </div>
    </aside>
  );
}
