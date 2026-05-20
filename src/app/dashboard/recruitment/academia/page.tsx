"use client";

import { useState, useEffect } from 'react';
import { 
  GraduationCap, FileText, CheckCircle, Clock, Zap, 
  ArrowRight, ShieldCheck, Trophy, Brain, Loader2,
  ChevronRight, Sparkles, Send, ShieldAlert, Monitor, Eye, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JitsiRoom from '@/components/features/Proctoring/JitsiRoom';
import IntegrityTimeline, { IntegrityEvent } from '@/components/features/CandidateSuite/IntegrityTimeline';

export default function AcademiaPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testView, setTestView] = useState(false);
  const [reportView, setReportView] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [currentQuestions, setCurrentQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [watchingCandidate, setWatchingCandidate] = useState<any>(null);
  const [proctoringEvents, setProctoringEvents] = useState<IntegrityEvent[]>([]);

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Monitor tab switches
  useEffect(() => {
    if (!testView) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const violation: IntegrityEvent = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          event: "Tab Switch Detected",
          type: "warning",
          icon: ShieldAlert,
          note: "Candidate left the assessment tab."
        };
        setProctoringEvents(prev => [...prev, violation]);
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
  }, [testView]);

  const fetchCandidates = async () => {
    const res = await fetch('/api/candidates');
    const d = await res.json();
    setCandidates(d.candidates || []);
  };

  const handleGenerate = async (c: any) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/recruitment/academia/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: c.id, role: c.role })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCandidate({ ...c, academicAssessment: { questions: data.questions } });
        setCurrentQuestions(data.questions);
        
        // Update local candidates list so the "View Live Stream" button appears immediately
        setCandidates(prev => prev.map(cand => 
          cand.id === c.id ? { ...cand, academicAssessment: { questions: data.questions } } : cand
        ));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCandidate) return;
    setIsSubmitting(true);
    try {
      const submissions = Object.entries(answers).map(([id, ans]) => ({ questionId: id, answer: ans }));
      const res = await fetch('/api/recruitment/academia/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          candidateId: selectedCandidate.id, 
          submissions,
          proctoringSignals: proctoringEvents 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Assessment Completed! Score: ${data.totalScore}`);
        setTestView(false);
        fetchCandidates();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0C0A] text-cream font-sans p-8">
      {/* Live Proctoring Modal */}
      <AnimatePresence>
        {watchingCandidate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#11100D] border border-white/20 p-8 rounded-[40px] w-full max-w-5xl h-[80vh] flex flex-col relative shadow-[0_0_100px_rgba(0,0,0,1)]"
            >
              <button 
                onClick={() => setWatchingCandidate(null)}
                className="absolute -top-4 -right-4 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-2xl hover:bg-red-600 transition-all z-[110]"
              >
                ×
              </button>
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-serif text-white tracking-tight">Live Assessment Feed: <span className="text-gold italic">{watchingCandidate.name}</span></h3>
                  <p className="text-xs font-mono text-white/40 tracking-widest uppercase mt-1">Security Status: <span className="text-green-500">ENCRYPTED</span> · Real-time Sync Active</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 px-5 py-2.5 rounded-2xl flex items-center gap-4">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  <span className="text-[11px] font-mono font-bold text-red-500 uppercase tracking-widest">Supervisor Mode</span>
                </div>
              </div>
              
              <div className="flex-1 rounded-[32px] overflow-hidden border border-white/10 bg-black shadow-inner">
                <JitsiRoom roomName={`ACADEMIA-${watchingCandidate.id}`} userName="AuraHR Recruiter" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-gold/70 uppercase mb-2 block">CANDIDATE SUITE · ACADEMIA ROUND</span>
          <h1 className="text-4xl font-serif text-white tracking-tight">Academic <span className="text-gold italic">Assessment</span></h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => window.open(`/applicant/academia/${selectedCandidate?.id || 'c24'}`, '_blank')}
            className="bg-gold/10 border border-gold/20 px-6 py-2.5 rounded-xl text-xs font-mono font-bold hover:bg-gold/20 transition-all uppercase tracking-widest text-gold text-[10px]"
          >
            Launch Applicant Demo
          </button>
          <button 
            onClick={() => window.history.back()}
            className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-xl text-xs font-mono font-bold hover:bg-white/10 transition-all uppercase tracking-widest text-white/60 text-[10px]"
          >
            Back to Recruitment
          </button>
        </div>
      </div>

      {!testView && !reportView ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-serif text-2xl text-white mb-6 flex items-center">
              <GraduationCap className="text-gold w-6 h-6 mr-3" />
              Candidate Pipeline
            </h3>
            {candidates.map((c) => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between hover:border-gold/30 transition-all group">
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center font-serif font-bold text-gold text-xl">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-serif text-lg text-white group-hover:text-gold transition-colors">{c.name}</h4>
                    <p className="text-xs text-white/40 font-mono italic">{c.role}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-[10px]">
                  {c.academicAssessment?.completedAt ? (
                    <button 
                      onClick={() => { setSelectedReport(c); setReportView(true); }}
                      className="bg-white/10 border border-white/20 text-white px-5 py-2 rounded-xl font-bold hover:bg-white/20 transition-all flex items-center uppercase tracking-widest"
                    >
                      <FileText className="w-4 h-4 mr-2" /> View Report
                    </button>
                  ) : c.academicAssessment ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setWatchingCandidate(c)}
                        className="bg-red-500/10 border border-red-500/30 text-red-500 px-5 py-2 rounded-xl font-bold hover:bg-red-500/20 transition-all flex items-center uppercase tracking-widest"
                      >
                        <Eye className="w-4 h-4 mr-2" /> View Live Stream
                      </button>
                      <button 
                        onClick={() => { setSelectedCandidate(c); setCurrentQuestions(c.academicAssessment.questions); setTestView(true); }}
                        className="bg-gold text-ink px-5 py-2 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center uppercase tracking-widest"
                      >
                        <Zap className="w-4 h-4 mr-2" /> Start Test
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleGenerate(c)}
                      disabled={isGenerating}
                      className="bg-white/5 border border-white/20 text-white/60 px-5 py-2 rounded-xl font-bold hover:border-gold/50 hover:text-gold transition-all uppercase tracking-widest"
                    >
                      {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : 'Generate Paper'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gold/5 border border-gold/10 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Brain className="w-32 h-32 text-gold" /></div>
              <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-widest mb-6">AuraHR Metrics</h4>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Comprehensive evaluation metrics are applied to every candidate. Academic results influence 25% of the final hiring decision.
              </p>
              <ul className="space-y-4 text-sm text-white/80">
                <li className="flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-gold" /> Proctored Integrity</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-gold" /> Fundamental Theory</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-gold" /> AI Peer Review</li>
              </ul>
            </div>
          </div>
        </div>
      ) : reportView ? (
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => setReportView(false)}
            className="mb-8 flex items-center gap-2 text-white/40 hover:text-gold transition-colors font-mono text-xs uppercase tracking-widest"
          >
            <ChevronRight className="rotate-180 w-4 h-4" /> Back to Pipeline
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-10">
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-10">
                <div className="flex justify-between items-start mb-10 pb-10 border-b border-white/5">
                  <div>
                    <h2 className="text-3xl font-serif text-white mb-2">{selectedReport?.name}</h2>
                    <p className="text-gold font-mono text-xs tracking-widest uppercase italic">{selectedReport?.role} Assessment Report</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-white/40 uppercase block mb-1">Final Score</span>
                    <span className="text-5xl font-serif text-gold">{selectedReport?.academiaScore || 0}</span>
                    <span className="text-xs font-mono text-white/20 ml-2">/ 100</span>
                  </div>
                </div>

                <div className="space-y-8">
                  {selectedReport?.academicAssessment?.submissions?.map((sub: any, i: number) => {
                    const q = selectedReport.academicAssessment.questions.find((quest: any) => quest.id === sub.questionId);
                    return (
                      <div key={sub.questionId} className="bg-white/5 border border-white/5 rounded-2xl p-8">
                        <div className="flex items-start gap-4 mb-4">
                          <span className="bg-white/10 text-white/60 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">{i+1}</span>
                          <h4 className="text-white font-medium">{q?.question}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-white/5">
                          <div>
                            <span className="text-[10px] font-mono text-white/30 uppercase block mb-2 tracking-widest">Candidate Answer</span>
                            <p className={`text-sm ${sub.isCorrect ? 'text-green-400' : 'text-red-400'}`}>{sub.answer}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-white/30 uppercase block mb-2 tracking-widest">Grading Logic</span>
                            <div className="flex items-center gap-2">
                              {sub.isCorrect ? <CheckCircle className="text-green-500 w-4 h-4" /> : <AlertTriangle className="text-red-500 w-4 h-4" />}
                              <span className="text-sm text-white/60">{sub.score} / 10 Points</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-widest mb-6">Integrity Audit</h4>
                <IntegrityTimeline events={selectedReport?.academicAssessment?.proctoringSignals || []} />
              </div>

              <div className="bg-gold/5 border border-gold/10 rounded-[32px] p-8">
                <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-widest mb-4">Hiring Recommendation</h4>
                <p className="text-white/60 text-sm mb-6 italic leading-relaxed">
                  "Candidate shows strong theoretical alignment. Proctoring signals indicate high focus during core technical sections."
                </p>
                <button className="w-full bg-gold text-ink py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gold/90 transition-all">
                  Move to Final Round
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-10 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-10 opacity-5"><FileText className="w-48 h-48 text-gold" /></div>
                
                <div className="mb-10 pb-10 border-b border-white/5 flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-serif text-white mb-2">{selectedCandidate?.name}</h2>
                    <p className="text-gold font-mono text-xs tracking-widest uppercase italic">{selectedCandidate?.role} Technical Assessment</p>
                  </div>
                  <div className="flex items-center gap-3 bg-red-950/20 border border-red-500/20 px-4 py-2 rounded-full">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest">Live Proctoring In Effect</span>
                  </div>
                </div>

                <div className="space-y-10">
                  {currentQuestions.map((q, i) => (
                    <div key={q.id} className="space-y-4 bg-white/5 p-8 rounded-2xl border border-white/5">
                      <div className="flex items-start gap-4">
                        <span className="bg-gold text-ink w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">{i+1}</span>
                        <h3 className="text-lg text-white/90 leading-relaxed font-medium">{q.question}</h3>
                      </div>

                      {q.type === 'mcq' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                          {q.options?.map((opt: string) => (
                            <button 
                              key={opt}
                              onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                              className={`p-4 rounded-xl border text-sm text-left transition-all ${answers[q.id] === opt ? 'bg-gold/20 border-gold text-gold shadow-[0_0_15px_rgba(200,168,75,0.2)]' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <textarea 
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          placeholder="Type your technical response here..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-gold/40 h-32 mt-4"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-12 flex justify-end gap-4">
                  <button 
                    onClick={() => setTestView(false)}
                    className="px-8 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white/70 transition-all font-bold text-[10px] uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || Object.keys(answers).length < currentQuestions.length}
                    className="bg-gold text-ink px-10 py-3 rounded-xl text-sm font-bold hover:bg-gold/90 transition-all flex items-center shadow-[0_0_30px_rgba(200,168,75,0.3)] disabled:opacity-40"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <><Send className="w-4 h-4 mr-2" /> Submit Paper</>}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Side Proctoring View */}
          <div className="lg:col-span-1 space-y-6">
            <div className="h-[280px]">
              <JitsiRoom roomName={`ACADEMIA-${selectedCandidate?.id}`} userName={selectedCandidate?.name || 'Applicant'} />
            </div>
            <IntegrityTimeline events={proctoringEvents} />
          </div>
        </div>
      )}
    </div>
  );
}
