'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneMissed, MessageSquare, ShieldAlert, FileText, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { moodleCall } from '@/lib/moodle';

const MemoizedJitsiMeeting = memo(function MemoizedJitsiMeeting({
  roomName,
  displayName,
  jwt,
}: {
  roomName: string;
  displayName: string;
  jwt?: string;
}) {
  // When a JaaS token is present use 8x8.vc (JaaS) as the server.
  // Otherwise fall back to the public meet.jit.si server.
  const domain = jwt ? '8x8.vc' : 'meet.jit.si';

  // Extract prefixed room name from JWT App ID (sub claim) if using JaaS (8x8.vc)
  let finalRoomName = roomName;
  if (jwt) {
    try {
      const parts = jwt.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const appId = payload.sub;
        if (appId && !roomName.startsWith(`${appId}/`)) {
          finalRoomName = `${appId}/${roomName}`;
        }
      }
    } catch (e) {
      console.error('Failed to parse JaaS App ID from JWT:', e);
    }
  }

  return (
    <JitsiMeeting
      domain={domain}
      roomName={finalRoomName}
      jwt={jwt}
      configOverwrite={{
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        disableModeratorIndicator: false, // Show moderator crown on host
        prejoinPageEnabled: false,
      }}
      interfaceConfigOverwrite={{
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        SHOW_CHROME_EXTENSION_BANNER: false
      }}
      userInfo={{
        displayName: displayName,
        email: 'interviewer@aurahr.local'
      }}
      getIFrameRef={(iframeRef) => {
        iframeRef.style.height = '100%';
        iframeRef.style.width = '100%';
      }}
    />
  );
});

export default function OrgInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const appId = Number(params?.id);
  
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [notes, setNotes] = useState('');
  const [remarks, setRemarks] = useState('');
  const [score, setScore] = useState('');
  const [transcripts, setTranscripts] = useState<{speaker: string, text: string}[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [transcriptionMode, setTranscriptionMode] = useState<'browser' | 'cloud'>('browser');
  const [jobId, setJobId] = useState<number | null>(null);

  // Pre-request microphone permission on mount to pre-authorize the origin without locking the device
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop tracks to release the hardware mic device for Jitsi/SpeechRecognition
        stream.getTracks().forEach(track => track.stop());
        console.log("Microphone permission pre-authorized and device released.");
      } catch (err) {
        console.warn("Failed to pre-request microphone permission on mount:", err);
      }
    }
    initMic();
  }, []);
  
  // AI Report States
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<{report: string, suggestedScore: number} | null>(null);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Dynamic Moodle Data States
  const [interviewId, setInterviewId] = useState<number | null>(null);
  const [jitsiRoom, setJitsiRoom] = useState<string>('');
  const [candidateName, setCandidateName] = useState<string>('Candidate');
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [proctorEvents, setProctorEvents] = useState<any[]>([]);
  const [criticalCount, setCriticalCount] = useState<number>(0);

  // JaaS JWT token for the interviewer (moderator)
  const [jwtToken, setJwtToken] = useState<string | undefined>(undefined);
  const [jwtLoaded, setJwtLoaded] = useState(false);

  // Load Interview Details on Mount
  useEffect(() => {
    if (!appId) return;
    async function loadDetails() {
      try {
        const details = await moodleCall<any>('local_aurahr_interview_get_details', { applicationid: appId });
        if (details?.found === false) {
          setNotFound(details.error || 'No interview found for this application.');
          return;
        }
        if (details) {
          setInterviewId(details.id);
          setJitsiRoom(details.jitsi_room || `AuraHR-Interview-App-${appId}`);
          setCandidateName(details.candidate_name || 'Candidate');
        }

        // Fetch application details to get the job ID for redirection
        try {
          const appDetails = await moodleCall<any>('local_aurahr_jobs_get_application', { applicationid: appId });
          if (appDetails && appDetails.jobid) {
            setJobId(appDetails.jobid);
          }
        } catch (appErr) {
          console.error("Failed to load application details for job ID:", appErr);
        }
      } catch (err) {
        console.error("Failed to load interview details", err);
        setNotFound('Failed to load interview details. Please try again.');
      } finally {
        setLoadingDetails(false);
      }
    }
    loadDetails();
  }, [appId]);

  // Fetch moderator JWT token from /api/jitsi-token once the room name is resolved.
  // If JAAS_APP_ID is not configured, the API returns an error and we stay on meet.jit.si.
  useEffect(() => {
    if (!jitsiRoom) return;
    if (jitsiRoom.includes('/')) {
      setJwtLoaded(true);
      return;
    }
    async function fetchToken() {
      try {
        const res = await fetch(
          `/api/jitsi-token?room=${encodeURIComponent(jitsiRoom)}&isModerator=true&name=Interviewer`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            setJwtToken(data.token);
            // JaaS uses appId/roomName format — update so the MemoizedJitsiMeeting gets the right room
            if (data.room) setJitsiRoom(data.room);
          }
        }
        // Silently ignore errors — falls back to plain meet.jit.si without JWT
      } catch (e) {
        console.warn('JaaS token fetch failed, falling back to meet.jit.si:', e);
      } finally {
        setJwtLoaded(true);
      }
    }
    fetchToken();
  }, [jitsiRoom]);

  // Poll Proctoring Report — only update state if data has actually changed
  const prevCriticalCountRef = useRef<number>(0);
  const prevEventCountRef = useRef<number>(0);
  useEffect(() => {
    if (!interviewId) return;
    async function pollReport() {
      try {
        const report = await moodleCall<any>('local_aurahr_proctor_get_report', {
          sessiontype: 'interview',
          sessionid: interviewId
        });
        if (report) {
          const newCount = report.critical_count || 0;
          const newEventLen = (report.events || []).length;
          // Only trigger re-render if something actually changed
          if (newEventLen !== prevEventCountRef.current) {
            prevEventCountRef.current = newEventLen;
            setProctorEvents(report.events || []);
          }
          if (newCount !== prevCriticalCountRef.current) {
            prevCriticalCountRef.current = newCount;
            setCriticalCount(newCount);
          }
        }
      } catch (err) {
        console.error("Failed to poll proctor report", err);
      }
    }
    pollReport(); // run once immediately
    const interval = setInterval(pollReport, 8000); // slow down to every 8s
    return () => clearInterval(interval);
  }, [interviewId]);

  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Reset error and transcription mode when toggling transcribing
  useEffect(() => {
    if (!transcribing) {
      setTranscriptionMode('browser');
      setTranscriptionError(null);
    } else {
      setTranscriptionError(null);
    }
  }, [transcribing]);

  // Web Speech API for Transcription
  useEffect(() => {
    if (typeof window === 'undefined' || !transcribing || transcriptionMode !== 'browser') return;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Enable interim results to force speech event triggers with echo-cancelling mic filters
    recognition.lang = 'en-US';

    let shouldRestart = true;
    let restartTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastFinalizedIndex = -1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal && i > lastFinalizedIndex) {
          finalTranscript += event.results[i][0].transcript;
          lastFinalizedIndex = i;
        }
      }
      if (finalTranscript.trim()) {
        setTranscripts(prev => [...prev, { speaker: 'Speaker', text: finalTranscript.trim() }]);
      }
    };

    recognition.onstart = () => {
      setTranscriptionError(null);
      lastFinalizedIndex = -1;
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Recognition Error:", event.error);
      let errorMsg = '';
      if (event.error === 'not-allowed') {
        errorMsg = 'Microphone permission blocked. Please click the camera/microphone icon in your browser address bar and allow access for this site.';
        shouldRestart = false;
      } else if (event.error === 'service-not-allowed') {
        errorMsg = 'Speech service not allowed by browser/OS.';
        shouldRestart = false;
      } else if (event.error === 'language-not-supported') {
        errorMsg = 'English (en-US) language recognition not supported in this browser.';
        shouldRestart = false;
      } else if (event.error === 'audio-capture') {
        errorMsg = 'No microphone detected or microphone device is busy.';
      } else if (event.error === 'network') {
        console.log("Switching to cloud transcription mode due to local network error/block.");
        setTranscriptionMode('cloud');
        shouldRestart = false;
        return;
      } else {
        errorMsg = `Speech recognition error: ${event.error}`;
      }
      setTranscriptionError(errorMsg);
    };

    recognition.onend = () => {
      if (!interviewFinished && shouldRestart) {
        restartTimeout = setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Failed to restart speech recognition:", e);
          }
        }, 2000);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      setTranscriptionError(`Failed to start: ${e instanceof Error ? e.message : String(e)}`);
    }

    return () => {
      shouldRestart = false;
      if (restartTimeout) clearTimeout(restartTimeout);
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [transcribing, interviewFinished, transcriptionMode]);

  // Web Cloud Speech Recording fallback
  useEffect(() => {
    if (typeof window === 'undefined' || !transcribing || transcriptionMode !== 'cloud') return;

    let mediaRecorder: MediaRecorder | null = null;
    let isRecordingActive = true;
    let activeStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyserInterval: ReturnType<typeof setInterval> | null = null;

    async function recordCycle() {
      if (!isRecordingActive) return;

      try {
        if (!activeStream) {
          activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // Setup AudioContext once
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContext = new AudioContextClass();
          source = audioContext.createMediaStreamSource(activeStream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
        }

        // Resume context if suspended (browser security autoplays)
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        // Use 128kbps high quality bitrate
        const options = { 
          mimeType: 'audio/webm',
          audioBitsPerSecond: 128000
        };
        mediaRecorder = new MediaRecorder(activeStream, options);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          if (chunks.length > 0) {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob, 'chunk.webm');

            try {
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
              });
              if (res.ok) {
                const data = await res.json();
                if (data.text && data.text.trim()) {
                  setTranscripts(prev => [...prev, { speaker: 'Speaker', text: data.text.trim() }]);
                }
              } else if (res.status === 501 || res.status === 500) {
                const data = await res.json();
                setTranscriptionError(data.error || 'Cloud transcription keys not configured.');
              }
            } catch (err) {
              console.warn('Failed to upload audio chunk:', err);
            }
          }

          // Trigger next cycle
          if (isRecordingActive) {
            recordCycle();
          }
        };

        mediaRecorder.start();

        const startTime = Date.now();
        let silenceStartTime: number | null = null;
        const VOLUME_THRESHOLD = 8; // silence threshold
        const SILENCE_DURATION = 800; // 800ms of silence
        const MIN_DURATION = 2000; // Minimum 2 seconds of audio context
        const MAX_DURATION = 8000; // Force slice at 8 seconds to prevent lag growth

        if (analyserInterval) clearInterval(analyserInterval);
        
        if (analyser) {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          analyserInterval = setInterval(() => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive' || !analyser) return;

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const averageVolume = sum / bufferLength;
            const elapsed = Date.now() - startTime;

            // Check for silence
            if (averageVolume < VOLUME_THRESHOLD) {
              if (silenceStartTime === null) {
                silenceStartTime = Date.now();
              }
            } else {
              silenceStartTime = null; // reset if user speaks
            }

            const silentMs = silenceStartTime ? Date.now() - silenceStartTime : 0;

            const shouldStop = 
              (elapsed >= MIN_DURATION && silentMs >= SILENCE_DURATION) || 
              (elapsed >= MAX_DURATION);

            if (shouldStop) {
              if (analyserInterval) clearInterval(analyserInterval);
              try {
                mediaRecorder.stop();
              } catch (e) {
                console.warn("Failed to stop media recorder:", e);
              }
            }
          }, 200);
        } else {
          // Fallback if analyser is somehow not initialized
          analyserInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= 5000) { // default 5 seconds slice
              if (analyserInterval) clearInterval(analyserInterval);
              try {
                mediaRecorder?.stop();
              } catch (e) {}
            }
          }, 500);
        }

      } catch (err: any) {
        console.warn('Failed to start media recorder for cloud fallback:', err);
        setTranscriptionError(`Failed to record: ${err.message}`);
        if (isRecordingActive) {
          setTimeout(recordCycle, 4000);
        }
      }
    }

    recordCycle();

    return () => {
      isRecordingActive = false;
      if (analyserInterval) clearInterval(analyserInterval);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (e) {}
      }
      if (activeStream) {
        try {
          activeStream.getTracks().forEach(track => track.stop());
        } catch (e) {}
      }
      if (source) {
        try {
          source.disconnect();
        } catch (e) {}
      }
      if (audioContext) {
        try {
          audioContext.close();
        } catch (e) {}
      }
    };
  }, [transcribing, transcriptionMode]);

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
      // 1. Submit the score and notes/remarks if we have the interview ID
      const finalScore = score ? parseFloat(score) : (aiReport?.suggestedScore || 0);
      if (interviewId) {
        try {
          await moodleCall('local_aurahr_interview_submit_score', {
            interviewid: interviewId,
            interviewer_score: finalScore,
            interviewer_notes: remarks || '',
          });
        } catch (submitErr) {
          console.error("Failed to submit score/feedback:", submitErr);
          alert(`Failed to save interview score/feedback: ${submitErr instanceof Error ? submitErr.message : String(submitErr)}`);
          setUpdatingStage(false);
          return;
        }
      }

      // 2. Update pipeline stage
      let stage = '';
      if (decision === 'select') stage = 'selected';
      else if (decision === 'reject') stage = 'rejected';
      else stage = 'interview';

      await moodleCall('local_aurahr_jobs_update_stage', {
        applicationid: appId,
        stage: stage
      });
      
      if (jobId) {
        router.push(`/org/applications/${jobId}`);
      } else {
        router.push('/org/applications');
      }
    } catch (err) {
      console.error(err);
      alert(`An error occurred: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdatingStage(false);
    }
  };

  // Not found state — show friendly error instead of crashing
  if (!loadingDetails && notFound) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="font-serif text-2xl font-bold text-ink mb-2">No Interview Scheduled</h2>
          <p className="text-ink/60 text-sm mb-6">{notFound}</p>
          <button onClick={() => router.back()} className="px-6 py-2.5 bg-sage text-white rounded-xl text-sm font-bold hover:bg-sage/90 transition-colors">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-4 sm:-m-6 lg:-m-8">
      {/* Main Interview Area */}
      <div className="flex-1 flex flex-col bg-ink min-w-0">
        
        {/* Video Area (Jitsi) */}
        <div className="flex-1 p-4 relative flex flex-col">
          <div className="flex-1 bg-[#1a1a1a] rounded-2xl border border-white/10 flex items-center justify-center relative shadow-inner overflow-hidden">
            {loadingDetails || !jwtLoaded ? (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="animate-spin text-sage" size={20} /> Loading Interview Room...
              </div>
            ) : (
              <MemoizedJitsiMeeting
                roomName={jitsiRoom || `AuraHR-Interview-App-${appId}`}
                displayName="Interviewer"
                jwt={jwtToken}
              />
            )}
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
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={14} /> Live Transcription
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={transcriptionMode}
                onChange={(e) => {
                  setTranscriptionMode(e.target.value as 'browser' | 'cloud');
                  setTranscriptionError(null);
                }}
                className="bg-white/5 border border-white/10 text-white/70 text-[10px] rounded-full px-2.5 py-1 uppercase tracking-wider font-bold cursor-pointer hover:bg-white/10 focus:outline-none transition-all outline-none"
              >
                <option value="browser" className="bg-[#111] text-white">Browser Engine</option>
                <option value="cloud" className="bg-[#111] text-white">Cloud Engine</option>
              </select>
              <button
                onClick={() => setTranscribing(!transcribing)}
                className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${
                  transcribing 
                    ? 'bg-sage/10 text-sage border-sage/30 animate-pulse' 
                    : 'bg-white/5 text-white/55 border-white/10 hover:bg-white/10'
                }`}
              >
                {transcribing ? '● Transcribing' : 'Start Transcription'}
              </button>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {transcriptionError && (
              <p className="text-rust text-xs font-semibold bg-rust/10 p-3 rounded-xl border border-rust/20 mb-3 leading-relaxed">
                ⚠️ {transcriptionError}
              </p>
            )}
            {!transcribing ? (
              <p className="text-white/30 text-sm italic text-center py-4">Transcription is stopped. Click &quot;Start Transcription&quot; to begin.</p>
            ) : transcripts.length === 0 && !transcriptionError ? (
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
        <div className={`p-4 border-b border-ink/10 ${criticalCount > 0 ? 'bg-rust/10' : 'bg-emerald-500/5'}`}>
          <h3 className={`font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 ${criticalCount > 0 ? 'text-rust' : 'text-emerald-700'}`}>
            <ShieldAlert size={14} /> Proctoring Alerts
          </h3>
          {criticalCount === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-850 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Candidate environment secure
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-rust font-bold">
                <div className="w-2.5 h-2.5 rounded-full bg-rust animate-pulse" />
                {criticalCount} Infraction(s) Detected
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {proctorEvents.slice(-3).reverse().map((ev: any) => (
                  <div key={ev.id} className="text-xs bg-white/50 border border-ink/5 p-2 rounded-lg text-ink/80 leading-normal">
                    <span className="font-semibold text-rust block uppercase tracking-wider text-[9px] mb-0.5">{ev.event_type}</span>
                    {ev.details}
                  </div>
                ))}
              </div>
              {criticalCount >= 5 && (
                <div className="p-2.5 bg-rust text-white rounded-xl text-center text-xs font-bold uppercase tracking-wider animate-pulse">
                  Disqualification Cutoff Reached
                </div>
              )}
            </div>
          )}
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
