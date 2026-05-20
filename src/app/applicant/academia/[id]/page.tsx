"use client";

import { useState, useEffect, use } from 'react';
import { 
  GraduationCap, FileText, CheckCircle, Clock, Zap, 
  ArrowRight, ShieldCheck, Trophy, Brain, Loader2,
  ChevronRight, Sparkles, Send, ShieldAlert, Monitor, Eye,
  AlertTriangle, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JitsiRoom from '@/components/features/Proctoring/JitsiRoom';
import IntegrityTimeline, { IntegrityEvent } from '@/components/features/CandidateSuite/IntegrityTimeline';

export default function ApplicantAcademiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [candidate, setCandidate] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [proctoringEvents, setProctoringEvents] = useState<IntegrityEvent[]>([]);

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowCheatingWarning(true);
        const violation: IntegrityEvent = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          event: "Tab Switch Detected",
          type: "warning",
          icon: ShieldAlert,
          note: "Candidate left the assessment tab."
        };
        setProctoringEvents(prev => [...prev, violation]);
        
        // Auto-hide warning after 5 seconds
        setTimeout(() => setShowCheatingWarning(false), 5000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Initial success event
    setProctoringEvents([{
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: "Environment Secured",
      type: "success",
      icon: ShieldCheck,
      note: "Proctoring & Eye-tracking active."
    }]);

    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const fetchCandidate = async () => {
    const res = await fetch('/api/candidates');
    const data = await res.json();
    const c = data.candidates?.find((cand: any) => cand.id === id);
    if (c) {
      setCandidate(c);
      setQuestions(c.academicAssessment?.questions || []);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submissions = Object.entries(answers).map(([qid, ans]) => ({ questionId: qid, answer: ans }));
      const res = await fetch('/api/recruitment/academia/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          candidateId: id, 
          submissions,
          proctoringSignals: proctoringEvents 
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCompleted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#0D0C0A] flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gold/5 blur-[120px] -z-10 rounded-full scale-150" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-[#11100D] border border-gold/20 p-16 rounded-[60px] text-center max-w-xl shadow-[0_0_100px_rgba(200,168,75,0.1)] relative"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
            className="w-32 h-32 bg-gold text-ink rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(200,168,75,0.4)]"
          >
            <CheckCircle className="w-16 h-16" strokeWidth={3} />
          </motion.div>
          
          <h2 className="text-5xl font-serif text-white mb-6 tracking-tight">Paper Submitted!</h2>
          <p className="text-white/50 text-xl font-sans mb-12 leading-relaxed">
            Great job, <span className="text-gold font-bold">{candidate?.name || "Applicant"}</span>! Your technical assessment has been securely recorded and transmitted to the recruiter.
          </p>
          
          <div className="flex gap-4">
            <button 
              onClick={() => window.close()}
              className="flex-1 bg-white/5 border border-white/10 text-white/40 py-5 rounded-2xl font-mono text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all font-bold"
            >
              Close Window
            </button>
            <button 
              onClick={() => window.location.href = "/"}
              className="flex-1 bg-gold text-ink py-5 rounded-2xl font-mono text-xs uppercase tracking-[0.2em] hover:bg-gold/90 transition-all font-bold shadow-lg"
            >
              Return Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0C0A] text-cream font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gold/5 blur-[150px] -z-10 rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gold/5 blur-[120px] -z-10 rounded-full -translate-x-1/2 translate-y-1/2" />

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
              className="bg-ink border border-red-500/50 p-12 rounded-[40px] max-w-xl shadow-[0_0_50px_rgba(239,68,68,0.3)]"
            >
              <AlertTriangle className="text-red-500 w-16 h-16 mx-auto mb-6 animate-bounce" />
              <h2 className="text-3xl font-serif text-white mb-4 uppercase tracking-tighter">Integrity Violation Detected</h2>
              <p className="text-red-200/70 mb-8 leading-relaxed font-medium">
                Switching tabs or losing window focus is strictly prohibited during the assessment. This event has been logged and sent to the recruiter's dashboard.
              </p>
              <button 
                onClick={() => setShowCheatingWarning(false)}
                className="bg-red-500 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
              >
                Return to Assessment
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto p-8 lg:p-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Lock className="text-gold w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-[0.3em] text-gold uppercase mb-1 block">AuraHR · SECURED ASSESSMENT</span>
              <h1 className="text-4xl font-serif text-white tracking-tight">Technical <span className="text-gold italic">Assessment</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono font-bold text-white/60 tracking-widest uppercase">Live Connection Established</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Questions Area */}
          <div className="lg:col-span-3 space-y-8">
            {questions.map((q, i) => (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-[32px] p-10 hover:border-gold/30 transition-all group"
              >
                <div className="flex items-start gap-6 mb-8">
                  <span className="bg-gold text-ink w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-[0_0_20px_rgba(200,168,75,0.3)]">
                    {i+1}
                  </span>
                  <h3 className="text-xl text-white/90 leading-relaxed font-serif pt-1">{q.question}</h3>
                </div>

                {q.type === 'mcq' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options?.map((opt: string) => (
                      <button 
                        key={opt}
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={`p-5 rounded-2xl border text-sm text-left transition-all duration-300 ${answers[q.id] === opt ? 'bg-gold/20 border-gold text-gold shadow-[0_0_25px_rgba(200,168,75,0.15)] scale-[1.02]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30 hover:bg-white/10'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea 
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Provide your detailed technical explanation..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-gold/40 h-40 transition-all font-mono"
                  />
                )}
              </motion.div>
            ))}

            <div className="pt-8 flex justify-end">
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || Object.keys(answers).length < questions.length}
                className="bg-gold text-ink px-16 py-5 rounded-2xl text-sm font-bold hover:bg-gold/90 transition-all flex items-center shadow-[0_0_50px_rgba(200,168,75,0.3)] disabled:opacity-30 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mr-3" /> : (
                  <>
                    <Send className="w-5 h-5 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                    Submit Final Assessment
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Proctoring & Info Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            <div className="sticky top-12 space-y-8">
              {/* Jitsi Feed */}
              <div className="h-[280px] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl relative group">
                <JitsiRoom roomName={`ACADEMIA-${id}`} userName={candidate?.name || 'Applicant'} />
                <div className="absolute top-4 left-4 bg-red-500 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest text-[9px]">Recording Live</span>
                </div>
              </div>

              {/* Integrity Status */}
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-widest mb-6 flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4" /> Integrity Matrix
                </h4>
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/40 italic">Camera Status</span>
                    <span className="text-green-500 font-bold">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/40 italic">Screen Tracking</span>
                    <span className="text-green-500 font-bold">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/40 italic">Tab Lock Status</span>
                    <span className={proctoringEvents.some(e => e.type === 'warning') ? 'text-red-400 font-bold underline' : 'text-green-500 font-bold'}>
                      {proctoringEvents.some(e => e.type === 'warning') ? 'VIOLATED' : 'SECURE'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-8 pt-8 border-t border-white/5">
                  <p className="text-[11px] text-white/30 leading-relaxed italic">
                    By participating, you agree to continuous proctoring including tab-activity tracking and video monitoring.
                  </p>
                </div>
              </div>

              <IntegrityTimeline events={proctoringEvents} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
