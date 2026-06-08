'use client';

import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Bell, User, LogOut, CheckCircle, Clock, FileText } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { moodleCall } from '@/lib/moodle';

interface TopNavBarProps {
  title?: string;
  showBack?: boolean;
}

export function TopNavBar({ title = 'AuraHR', showBack = true }: TopNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const noBackPages = [
    '/org',
    '/org/applications',
    '/org/vacancies',
    '/org/scheduler',
    '/org/help',
    '/org/settings',
    '/candidate',
    '/candidate/applications',
    '/candidate/posts',
    '/candidate/scheduler',
    '/candidate/profile',
    '/candidate/help',
    '/candidate/settings',
  ];

  const shouldShowBack = showBack && pathname && !noBackPages.includes(pathname);

  const getDynamicTitle = () => {
    if (!pathname) return title;
    if (pathname.startsWith('/org/vacancies/create')) return 'Create Vacancy';
    if (pathname.match(/^\/org\/vacancies\/\d+$/)) return 'Vacancy Details';
    if (pathname.match(/^\/org\/applications\/\d+$/)) return 'Application Profile';
    if (pathname.match(/^\/org\/interview\/\d+$/)) return 'Interview Console';
    if (pathname.startsWith('/org/applications')) return 'All Applications';
    if (pathname.startsWith('/org/vacancies')) return 'Vacancies';
    if (pathname.startsWith('/org/scheduler')) return 'Smart Scheduler';
    if (pathname.startsWith('/org/settings')) return 'Settings';
    if (pathname.startsWith('/org/help')) return 'Help & Support';
    if (pathname.startsWith('/org')) return 'Overview';
    
    if (pathname.startsWith('/candidate/applications')) return 'My Applications';
    if (pathname.startsWith('/candidate/posts')) return 'Job Openings';
    if (pathname.startsWith('/candidate/scheduler')) return 'My Schedule';
    if (pathname.startsWith('/candidate/profile')) return 'My Profile';
    if (pathname.startsWith('/candidate/settings')) return 'Settings';
    if (pathname.startsWith('/candidate/help')) return 'Help & Support';
    if (pathname.match(/^\/candidate\/interview\/\d+$/)) return 'Interview Lobby';
    if (pathname.startsWith('/candidate')) return 'Overview';
    
    return title;
  };

  const displayTitle = getDynamicTitle();

  // Close dropdowns on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (notifOpen && notifications.length === 0) {
      const fetchNotifs = async () => {
        setLoadingNotifs(true);
        try {
          const res = await moodleCall<any[]>('local_aurahr_jobs_get_notifications', {});
          if (Array.isArray(res)) {
            setNotifications(res);
          } else {
            console.error('Invalid notifications format:', res);
            setNotifications([]);
          }
        } catch (e) {
          console.error('Failed to fetch notifications', e);
          setNotifications([]);
        } finally {
          setLoadingNotifs(false);
        }
      };
      fetchNotifs();
    }
  }, [notifOpen]);

  const unreadCount = notifications.length; // all are unread for now

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-ink/8 bg-cream/70 backdrop-blur-xl sticky top-0 z-40 shrink-0">
      {/* Left side: Back + Title */}
      <div className="flex items-center space-x-3">
        {shouldShowBack && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-ink/5 text-ink/50 hover:text-ink transition-colors"
          >
            <ChevronLeft size={20} />
          </motion.button>
        )}
        <h1 className="font-serif text-lg font-semibold text-ink tracking-tight">{displayTitle}</h1>
      </div>

      {/* Right side: Notifications + Profile */}
      <div className="flex items-center space-x-2">
        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setNotifOpen(!notifOpen)}
            className={`relative p-2.5 rounded-xl hover:bg-ink/5 transition-colors ${notifOpen ? 'bg-ink/5 text-ink' : 'text-ink/50 hover:text-ink'}`}
          >
            <Bell size={20} />
            {/* Notification badge */}
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rust rounded-full border-2 border-cream" />}
          </motion.button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 bg-cream rounded-2xl border border-ink/10 shadow-xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-ink/8 flex justify-between items-center bg-warm-sand/50">
                  <h3 className="text-sm font-bold text-ink">Upcoming Actions</h3>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-rust bg-rust/10 px-2 py-0.5 rounded-full">{unreadCount} Pending</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {loadingNotifs ? (
                    <div className="p-8 text-center text-ink/40 text-sm font-semibold">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-ink/40 text-sm font-semibold">No pending actions!</div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-4 border-b border-ink/5 hover:bg-ink/5 transition-colors cursor-pointer flex gap-3">
                        <div className={`shrink-0 p-2 text-${notif.color} bg-${notif.color}/10 rounded-xl h-fit`}>
                          {notif.type === 'action' ? <Clock size={16} /> :
                           notif.type === 'success' ? <CheckCircle size={16} /> : <FileText size={16} />}
                        </div>
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-semibold text-ink">{notif.title}</p>
                          </div>
                          <p className="text-xs text-ink/60 mb-2">{notif.message}</p>
                          <span className={`text-xs font-mono font-semibold text-${notif.color} bg-${notif.color}/10 px-2 py-0.5 rounded text-nowrap w-fit`}>
                            {new Date(notif.timestamp * 1000).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-ink/8 text-center bg-warm-sand/50">
                  <button 
                    onClick={() => setNotifications([])}
                    className="text-xs font-semibold text-sage hover:text-sage/80 transition-colors w-full p-2"
                  >
                    Mark all as done
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile dropdown */}
        <div ref={dropdownRef} className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-ink/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage to-gold flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {user?.firstname?.[0] ?? 'U'}
            </div>
            {user && (
              <span className="hidden lg:block text-sm font-medium text-ink/70">
                {user.firstname} {user.lastname}
              </span>
            )}
          </motion.button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-cream rounded-2xl border border-ink/10 shadow-xl overflow-hidden z-50"
              >
                {user && (
                  <div className="px-4 py-3 border-b border-ink/8">
                    <p className="text-sm font-semibold text-ink">{user.firstname} {user.lastname}</p>
                    <p className="text-xs text-ink/50 truncate">{user.email}</p>
                  </div>
                )}
                <div className="p-1.5">
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/org/settings'); }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-sm text-ink/70 hover:bg-ink/5 hover:text-ink transition-colors"
                  >
                    <User size={16} />
                    <span>Profile & Settings</span>
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); logout(); }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-sm text-rust/80 hover:bg-rust/5 hover:text-rust transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
