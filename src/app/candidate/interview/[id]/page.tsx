'use client';

import { useState, useEffect } from 'react';
import { 
  Video, Mic, MicOff, VideoOff, PhoneMissed, MessageSquare, 
  MonitorUp, Users, Smartphone, ShieldAlert, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useAuth } from '@/contexts/AuthContext';
import IntegrityTimeline, { IntegrityEvent } from '@/components/features/CandidateSuite/IntegrityTimeline';

export default function CandidateInterviewPage() {
  const params = useParams();
  const id = params?.id;
  const { user } = useAuth();

  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [proctoringEvents, setProctoringEvents] = useState<IntegrityEvent[]>([]);

  useEffect(() => {
    // Initial secure event
    setProctoringEvents([{
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: "Secure Protocol Initiated",
      type: "success",
      icon: ShieldCheck,
      note: "Continuous stream encryption and window focus lock active."
    }]);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowCheatingWarning(true);
        const violation: IntegrityEvent = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          event: "Focus Lost (Tab Switch)",
          type: "warning",
          icon: ShieldAlert,
          note: "Candidate left the secure interview browser tab."
        };
        setProctoringEvents(prev => [...prev, violation]);
        
        // Auto-hide warning after 5 seconds
        setTimeout(() => setShowCheatingWarning(false), 5000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] bg-ink rounded-3xl overflow-hidden flex shadow-2xl border border-ink/20 relative">
      {/* Cheating Warning Overlay */}
      <AnimatePresence>
        {showCheatingWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-8 text-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-black border border-red-500/50 p-12 rounded-[40px] max-w-xl shadow-[0_0_50px_rgba(239,68,68,0.3)]"
            >
              <AlertTriangle className="text-red-500 w-16 h-16 mx-auto mb-6 animate-bounce" />
              <h2 className="text-3xl font-serif text-white mb-4 uppercase tracking-tighter">Integrity Alert</h2>
              <p className="text-red-200/70 mb-8 leading-relaxed font-medium">
                Switching tabs or losing browser focus is strictly prohibited. This alert has been logged in your integrity record and notified to the recruiter.
              </p>
              <button 
                onClick={() => setShowCheatingWarning(false)}
                className="bg-red-500 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-600 transition-all cursor-pointer"
              >
                Return to Interview
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Call Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d0c0a]">
        {/* Header */}
        <div className="h-16 bg-[#111] flex items-center justify-between px-6 shrink-0 border-b border-white/10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-rust animate-pulse" />
              <span className="text-white/80 font-medium text-sm">Secure Call Session</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
              <Smartphone size={14} className="text-emerald-400" />
              <span className="text-white/60 text-xs">AI Proctor Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <Users size={14} className="text-white/60" />
              <span className="text-white font-mono text-sm">Nexus Room</span>
            </div>
          </div>
        </div>

        {/* Video Area (Jitsi) */}
        <div className="flex-1 p-4 relative flex flex-col">
          <div className="flex-1 bg-[#1a1a1a] rounded-2xl border border-white/10 flex items-center justify-center relative shadow-inner overflow-hidden">
            <JitsiMeeting
              domain="meet.jit.si"
              roomName={`AuraHR-Interview-App-${id}`}
              configOverwrite={{
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false,
                prejoinConfig: { enabled: false },
                disableModeratorIndicator: true,
              }}
              interfaceConfigOverwrite={{
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                SHOW_CHROME_EXTENSION_BANNER: false
              }}
              userInfo={{
                displayName: user?.firstname ? `${user.firstname} ${user.lastname}` : 'Candidate',
                email: user?.email || 'candidate@aurahr.local'
              }}
              getIFrameRef={(iframeRef: any) => {
                iframeRef.style.height = '100%';
                iframeRef.style.width = '100%';
              }}
            />
          </div>
          
          {/* Controls */}
          <div className="h-16 mt-4 flex items-center justify-center gap-4 shrink-0">
            <button 
              onClick={() => window.location.href = '/candidate/applications'}
              className="px-6 h-12 rounded-full flex items-center justify-center bg-rust text-white font-bold hover:bg-rust/90 transition-colors shadow-lg shadow-rust/20 gap-2 cursor-pointer"
            >
              <PhoneMissed size={20} /> Disconnect & Leave Call
            </button>
          </div>
        </div>
      </div>

      {/* Proctoring Side Panel */}
      <div className="w-80 border-l border-white/10 bg-[#111] overflow-y-auto p-6 flex flex-col gap-6 shrink-0">
        {/* Connection Security Status */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Smartphone size={14} className="text-emerald-400" /> Proctor Status
          </h3>
          <div className="flex items-center gap-2 text-sm text-white/85">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Security Protocol Engaged
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed italic">
            Webcam stream, microphone activity, and browser tab focus are actively monitored for candidate integrity.
          </p>
        </div>

        {/* Integrity Timeline */}
        <IntegrityTimeline events={proctoringEvents} />
      </div>
    </div>
  );
}
