'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Home, FileText, Briefcase, Calendar, HelpCircle, Settings,
  ChevronsLeft, ChevronsRight, User,
} from 'lucide-react';

const menuItems = [
  { href: '/org',              label: 'Overview',          icon: Home },
  { href: '/org/applications', label: 'All Applications',  icon: FileText },
  { href: '/org/vacancies',    label: 'Current Vacancies', icon: Briefcase },
  { href: '/org/scheduler',    label: 'Smart Scheduler',   icon: Calendar },
  { href: '/org/help',         label: 'Help',              icon: HelpCircle },
  { href: '/org/settings',     label: 'Settings',          icon: Settings },
  { href: '/candidate',        label: 'Candidate View',    icon: User },
];

export function OrgSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/org') return pathname === '/org';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`bg-[#1c1d1b] border-r border-white/5 hidden md:flex flex-col text-[#9ca3af] transition-all duration-300 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
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
                  ? 'bg-[#a8c3a0] text-[#1c2e1c] font-semibold shadow-md'
                  : 'text-[#9ca3af] hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 transition-colors duration-200 ${
                  active ? 'text-[#1c2e1c]' : 'text-[#9ca3af] group-hover:text-white'
                }`}
              />
              {!isCollapsed && <span className="ml-3">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div
          className={`rounded-xl flex items-center transition-all ${
            isCollapsed
              ? 'justify-center p-2 bg-emerald-500/10 text-[#7ca982]'
              : 'px-4 py-3 bg-[#2d2e2d] text-white/60 space-x-3'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!isCollapsed && (
            <span className="font-sans text-[11px] font-semibold tracking-wider uppercase">
              Organization Mode
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
