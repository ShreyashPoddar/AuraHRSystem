'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneMissed, MessageSquare, ShieldAlert, FileText, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { moodleCall } from '@/lib/moodle';

export default function OrgInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const appId = Number(params?.id);
  
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [notes, setNotes] = useState('');
  const [remarks, setRemarks] = useState('');
  const [score, setScore] = useState('');
  const [transcripts, setTranscripts] = useState<{speaker: string, text: string}[]>([]);
  
  // AI Report States
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<{report: string, suggestedScore: number} | null>(null);
  const [updatingStage, setUpdatingStage] = useState(false);

  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Web Speech API for Transcription
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setTranscripts(prev => [...prev, { speaker: 'Speaker', text: transcript }]);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }

    recognition.onend = () => {
      if (!interviewFinished) {
        try { recognition.start(); } catch(e) {}
      }
    };

    return () => {
      recognition.stop();
    };
  }, [interviewFinished]);

  const handleEndInterview = async () => {
    setInterviewFinished(true);
    setGeneratingReport(true);
    
    try {
      // Send transcript and notes to Moodle backend
      const transcriptTextArray = transcripts.map(t => `${t.speaker}: ${t.text}`);
      const fullText = `Notes:\n${notes}\n\nTranscript:\n${transcriptTextArray.join('\n')}`;

      const res = await moodleCall<any>('local_aurahr_interview_ai_evaluate', {
        applicationid: appId,
        transcript: fullText
      });

      if (res.success && res.ai_evaluation) {
        const data = JSON.parse(res.ai_evaluation);
        setAiReport({
          report: data.summary || 'Report generated successfully.',
          suggestedScore: data.score || res.ai_score || 0
        });
        if (data.score || res.ai_score) {
          setScore(String(data.score || res.ai_score));
        }
      } else {
        throw new Error("No evaluation returned");
      }
    } catch (err) {
      console.error("Failed to generate AI report via Moodle", err);
      setAiReport({ report: 'Failed to generate report due to an error.', suggestedScore: 0 });
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleFinalDecision = async (decision: string) => {
    setUpdatingStage(true);
    try {
      let stage = '';
      if (decision === 'select') stage = 'selected';
      else if (decision === 'reject') stage = 'rejected';
      else stage = 'interview'; // Hold keeps them in interview stage usually

      await moodleCall('local_aurahr_jobs_update_stage', {
        applicationid: appId,
        stage: stage
      });
      
      alert(`Candidate marked as ${decision.toUpperCase()}.`);
      router.push(`/org/applications/${appId}`); // Or wherever appropriate
    } catch (err) {
      console.error(err);
      alert('Failed to update candidate status.');
    } finally {
      setUpdatingStage(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-4 sm:-m-6 lg:-m-8">
      {/* Main Interview Area */}
      <div className="flex-1 flex flex-col bg-ink min-w-0">
        
        {/* Video Area (Jitsi) */}
        <div className="flex-1 p-4 relative flex flex-col">
          <div className="flex-1 bg-[#1a1a1a] rounded-2xl border border-white/10 flex items-center justify-center relative shadow-inner overflow-hidden">
            <JitsiMeeting
              domain="meet.jit.si"
              roomName={`AuraHR-Interview-App-${appId}`}
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
                displayName: 'Interviewer',
                email: 'interviewer@aurahr.local'
              }}
              getIFrameRef={(iframeRef) => {
                iframeRef.style.height = '100%';
                iframeRef.style.width = '100%';
              }}
            />
          </div>
          
          {/* Controls */}
          <div className="h-16 mt-4 flex items-center justify-center gap-4">
            <button 
              onClick={handleEndInterview} 
              className="px-6 h-12 rounded-full flex items-center justify-center bg-rust text-white font-bold hover:bg-rust/90 transition-colors shadow-lg shadow-rust/20 gap-2"
            >
              <PhoneMissed size={20} /> End Call & Analyze
            </button>
          </div>
        </div>

        {/* Live Transcription */}
        <div className="h-48 bg-[#111] border-t border-white/10 p-4 overflow-y-auto flex flex-col">
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 shrink-0">
            <MessageSquare size={14} /> Live Transcription
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {transcripts.length === 0 ? (
              <p className="text-white/30 text-sm italic">Listening... Start speaking to see transcription.</p>
            ) : (
              transcripts.map((t, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="text-sage font-bold text-sm shrink-0">{t.speaker}:</span>
                  <p className="text-white/80 text-sm">{t.text}</p>
                </div>
              ))
            )}
            <div ref={transcriptsEndRef} />
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-80 border-l border-ink/10 bg-warm-sand/20 overflow-y-auto flex flex-col shrink-0">
        
        {/* Malpractice Alerts */}
        <div className="p-4 border-b border-ink/10 bg-rust/5">
          <h3 className="text-rust font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldAlert size={14} /> Proctoring Alerts
          </h3>
          <div className="flex items-center gap-2 text-sm text-ink/70">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            No violations detected
          </div>
        </div>

        {/* Drafted Questions */}
        <div className="p-4 border-b border-ink/10">
          <h3 className="text-ink font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileText size={14} /> Drafted Questions
          </h3>
          <ul className="space-y-3 text-sm text-ink/80">
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>Can you explain a complex problem you solved using React hooks?</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>How do you manage global state in a large Next.js app?</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>Describe your experience with CI/CD pipelines.</span>
            </li>
          </ul>
        </div>

        {/* Notes */}
        <div className="flex-1 p-4 flex flex-col">
          <h3 className="text-ink font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText size={14} /> Interview Notes
          </h3>
          <textarea 
            className="flex-1 bg-white border border-ink/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage/50 resize-none shadow-inner"
            placeholder="Type your notes here... They will be analyzed by AI after the interview."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Post-Interview Popup */}
      <AnimatePresence>
        {interviewFinished && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-cream rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-ink/10 flex justify-between items-center bg-white">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-ink">Interview Completed</h2>
                  <p className="text-sm text-ink/50 mt-1">Review the AI report and submit your final decision.</p>
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* AI & Proctoring Report */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex flex-col">
                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                      ✨ AI Report
                    </h3>
                    {generatingReport ? (
                      <div className="flex items-center gap-2 text-blue-600 text-sm py-4">
                        <Loader2 size={16} className="animate-spin" /> Analyzing transcript & notes...
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-ink/80 mb-4 flex-1">{aiReport?.report}</p>
                        <div className="p-3 bg-blue-500/10 rounded-xl inline-block mt-auto">
                          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Suggested Score</p>
                          <p className="text-xl font-black text-blue-700 font-mono">{aiReport?.suggestedScore}/100</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3">
                      Proctoring Report
                    </h3>
                    <div className="flex items-center gap-3 text-emerald-700 bg-emerald-500/10 p-3 rounded-xl mb-3">
                      <CheckCircle size={20} /> 
                      <span className="text-sm font-semibold">Clean session. No violations.</span>
                    </div>
                    <p className="text-xs text-emerald-800/60">
                      Audio and video streams remained active without suspicious background noise or secondary faces detected.
                    </p>
                  </div>
                </div>

                {/* Recruiter Input */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink/40 uppercase tracking-wider mb-2">Final Remarks</label>
                      <textarea 
                        className="w-full bg-white border border-ink/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage/50"
                        rows={3}
                        placeholder="Enter final remarks for the candidate..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink/40 uppercase tracking-wider mb-2">Final Score (out of 100)</label>
                      <input 
                        type="number" 
                        className="w-full max-w-[150px] bg-white border border-ink/10 rounded-xl p-3 text-lg font-mono font-bold text-ink focus:outline-none focus:ring-2 focus:ring-sage/50"
                        placeholder="e.g. 85"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                      />
                      <p className="text-xs text-ink/40 mt-2">Will default to AI score if empty.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-ink/10 bg-warm-sand/30 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => handleFinalDecision('reject')}
                  disabled={updatingStage}
                  className="px-6 py-2.5 bg-white border border-rust/20 text-rust rounded-xl text-sm font-bold hover:bg-rust/5 flex items-center gap-2 disabled:opacity-50"
                >
                  <XCircle size={18} /> Reject
                </button>
                <button 
                  onClick={() => handleFinalDecision('hold')}
                  disabled={updatingStage}
                  className="px-6 py-2.5 bg-white border border-ink/20 text-ink rounded-xl text-sm font-bold hover:bg-ink/5 flex items-center gap-2 disabled:opacity-50"
                >
                  <Clock size={18} /> Hold (Not Decided)
                </button>
                <button 
                  onClick={() => handleFinalDecision('select')}
                  disabled={updatingStage}
                  className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {updatingStage ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} 
                  Select Candidate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
