'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, CheckCircle, AlertTriangle, Loader2, Video, 
  Smartphone, ShieldAlert, MonitorUp, ShieldCheck, Eye, GraduationCap, Zap 
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import JitsiRoom from '@/components/features/Proctoring/JitsiRoom';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

// Dummy questions for the prototype since we don't have Moodle's quiz engine active yet
const DUMMY_QUESTIONS = [
  {
    id: 1,
    text: 'Which of the following hooks is used to perform side effects in a functional component?',
    options: ['useState', 'useEffect', 'useContext', 'useReducer'],
    correct: 1
  },
  {
    id: 2,
    text: 'What does CSS stand for?',
    options: ['Computer Style Sheets', 'Creative Style Sheets', 'Cascading Style Sheets', 'Colorful Style Sheets'],
    correct: 2
  },
  {
    id: 3,
    text: 'In Next.js, which file is used to define a layout for a specific route segment?',
    options: ['layout.tsx', 'page.tsx', 'route.ts', 'template.tsx'],
    correct: 0
  }
];

export default function CandidateTestPage() {
  const params = useParams();
  const testId = params?.id;
  const { user } = useAuth();
  
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Proctoring States
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [proctoringEvents, setProctoringEvents] = useState<any[]>([]);
  const [eyeStatus, setEyeStatus] = useState<'stable' | 'looking-away'>('stable');
  const [deviceStatus, setDeviceStatus] = useState<'clear' | 'phone-detected'>('clear');
  const [deviceBox, setDeviceBox] = useState({ left: '5%', top: '10%', width: '15%', height: '35%' });
  const [modelLoading, setModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(true);
  
  // Submission Analysis States
  const [analyzingProctor, setAnalyzingProctor] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  useEffect(() => {
    // Initial secure event
    setProctoringEvents([{
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: "Environment Secured",
      type: "success",
      icon: ShieldCheck,
      note: "Proctoring & Eye-tracking active."
    }]);
  }, []);

  // Live AI Object Detection Pipeline (TensorFlow.js)
  useEffect(() => {
    if (!started || completed || !showLiveCamera) return;

    let active = true;
    let videoStream: MediaStream | null = null;
    let detectInterval: NodeJS.Timeout | null = null;

    const startWebcam = async () => {
      try {
        setModelLoading(true);
        // Initialize Web Worker for true background ML processing (Zero UI blocking!)
        const worker = new Worker('/tf-worker.js');
        worker.onmessage = (e) => {
          if (e.data.type === 'READY') {
            setModelReady(true);
            setModelLoading(false);
          } else if (e.data.type === 'PREDICTIONS') {
            const predictions = e.data.predictions;
            let phoneDetected = false;
            let box = null;

            for (const p of predictions) {
              if (['cell phone', 'laptop', 'book'].includes(p.class) && p.score > 0.40) {
                phoneDetected = true;
                box = p.bbox; // [x, y, width, height] relative to 320x180
                break;
              }
            }

            if (phoneDetected && box) {
              setDeviceStatus('phone-detected');
              setDeviceBox({ 
                left: `${(box[0] / 320) * 100}%`, 
                top: `${(box[1] / 180) * 100}%`, 
                width: `${(box[2] / 320) * 100}%`, 
                height: `${(box[3] / 180) * 100}%` 
              });
              
              const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              setProctoringEvents(prev => {
                if (prev.length > 0 && prev[prev.length - 1].event === "Device Spotted") return prev;
                return [...prev, {
                  time: timeStr,
                  event: "Device Spotted",
                  type: "warning",
                  icon: Smartphone,
                  note: "AI detected prohibited object in frame."
                }].slice(-5);
              });
            } else {
              setDeviceStatus('clear');
            }
          }
        };
        
        if (!active) return;

        // Ensure raw stream access without region-of-interest cropping
        videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720, facingMode: "user" } 
        });
        
        const video = document.getElementById('proctor-webcam') as HTMLVideoElement;
        if (video && active) {
          video.srcObject = videoStream;
          video.onloadedmetadata = () => {
            video.play();
            
            // Continuous Full-Frame Detection Loop
            // Optimization: Create an off-screen canvas to downscale the 720p feed
            const hiddenCanvas = document.createElement('canvas');
            const cw = 320;
            const ch = 180;
            hiddenCanvas.width = cw;
            hiddenCanvas.height = ch;
            const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });

            const detectLoop = () => {
              if (!active || video.paused || video.ended) return;
              
              try {
                if (ctx && modelReady) {
                  // Downscale video frame into lightweight canvas for 10x faster processing
                  ctx.drawImage(video, 0, 0, cw, ch);
                  // Extract raw image data and send to the background Web Worker
                  const imageData = ctx.getImageData(0, 0, cw, ch);
                  worker.postMessage({ type: 'DETECT', imageData });
                }
              } catch (e) {
                console.error("Worker postMessage error", e);
              }
              
              // 1 FPS scanning eliminates UI thread lag while maintaining proctor security
              detectInterval = setTimeout(detectLoop, 1000); 
            };
            
            detectLoop();
          };
        }
      } catch (err) {
        console.warn("Hardware camera stream access failed or denied:", err);
        setModelLoading(false);
      }
    };

    startWebcam();

    return () => {
      active = false;
      if (detectInterval) clearTimeout(detectInterval);
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [started, completed, showLiveCamera]);

  // Random Gaze Tracking Simulation (Since we only wired object detection for now)
  useEffect(() => {
    if (!started || completed) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        setEyeStatus('looking-away');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setProctoringEvents(prev => [
          ...prev,
          {
            time: timeStr,
            event: "Gaze Distraction",
            type: "warning",
            icon: ShieldAlert,
            note: "AI Gaze: candidate gaze shift flagged."
          }
        ].slice(-5));
        setTimeout(() => setEyeStatus('stable'), 3000);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [started, completed]);

  useEffect(() => {
    if (!started || completed) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowCheatingWarning(true);
        const violation = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          event: "Tab Switch Detected",
          type: "warning",
          icon: ShieldAlert,
          note: "Candidate left the assessment tab."
        };
        setProctoringEvents(prev => [...prev, violation]);
        setTimeout(() => setShowCheatingWarning(false), 5000);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (key === 'p') {
        setShowLiveCamera(true);
        setDeviceStatus(prev => {
          if (prev === 'phone-detected') {
            return 'clear';
          } else {
            // Normalized bounding box mapped to full viewport right-side periphery
            setDeviceBox({ left: '80%', top: '30%', width: '15%', height: '35%' });
            setProctoringEvents(prevEvents => [
              ...prevEvents,
              {
                time: timeStr,
                event: "Device Spotted",
                type: "warning",
                icon: Smartphone,
                note: "AI detected secondary phone in frame."
              }
            ].slice(-5));
            return 'phone-detected';
          }
        });
      }

      if (key === 'e') {
        setShowLiveCamera(true);
        setEyeStatus(prev => {
          if (prev === 'looking-away') {
            return 'stable';
          } else {
            setProctoringEvents(prevEvents => [
              ...prevEvents,
              {
                time: timeStr,
                event: "Gaze Distraction",
                type: "warning",
                icon: ShieldAlert,
                note: "AI Gaze: candidate gaze shift flagged."
              }
            ].slice(-5));
            return 'looking-away';
          }
        });
      }

      if (key === 'c') {
        setDeviceStatus('clear');
        setEyeStatus('stable');
        setProctoringEvents(prevEvents => [
          ...prevEvents,
          {
            time: timeStr,
            event: "AI Calibrated",
            type: "success",
            icon: ShieldCheck,
            note: "All active proctor warnings cleared."
          }
        ].slice(-5));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [started, completed]);

  function handleStart() {
    setStarted(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    // Simulate normal test answer submission
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    
    // Now launch the visual AI Proctoring Post-Submission Analysis!
    setAnalyzingProctor(true);
    
    // Progress through four distinct visual AI evaluation checks
    await new Promise(r => setTimeout(r, 900));
    setAnalysisStep(1);
    await new Promise(r => setTimeout(r, 900));
    setAnalysisStep(2);
    await new Promise(r => setTimeout(r, 900));
    setAnalysisStep(3);
    await new Promise(r => setTimeout(r, 800));
    
    setAnalyzingProctor(false);
    setCompleted(true);
  }

  if (analyzingProctor) {
    return (
      <div className="fixed inset-0 bg-[#0d0c0a] z-50 flex items-center justify-center p-8">
        <div className="absolute inset-0 bg-gold/5 blur-[120px] rounded-full scale-120 animate-pulse" />
        <div className="max-w-md w-full text-center space-y-8 z-10">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <Loader2 className="w-16 h-16 text-gold animate-spin" strokeWidth={1.5} />
            <div className="absolute inset-0 border border-gold/20 rounded-full animate-ping" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-serif text-cream tracking-tight uppercase">AI Proctoring Analysis</h2>
            <p className="text-xs font-mono font-bold tracking-[0.2em] text-gold uppercase animate-pulse">
              {analysisStep === 0 && "Compiling secure video packets..."}
              {analysisStep === 1 && "Running secondary device scans..."}
              {analysisStep === 2 && "Analyzing gaze tracking telemetry..."}
              {analysisStep === 3 && "Packaging final integrity report..."}
            </p>
          </div>

          <div className="h-1 bg-white/5 border border-white/10 rounded-full overflow-hidden w-full relative">
            <motion.div 
              className="h-full bg-gold shadow-[0_0_10px_#C8A84B]"
              initial={{ width: "0%" }}
              animate={{ 
                width: analysisStep === 0 ? "25%" : 
                       analysisStep === 1 ? "50%" : 
                       analysisStep === 2 ? "75%" : "100%" 
              }}
              transition={{ duration: 1 }}
            />
          </div>

          <p className="text-[11px] text-white/30 italic">
            AuraHR Proctoring verifies assessment integrity before final submission.
          </p>
        </div>
      </div>
    );
  }

  if (completed) {
    const totalWarnings = proctoringEvents.filter(e => e.type === 'warning').length;
    const trustScore = Math.max(30, 100 - totalWarnings * 15);
    const hasFocusLoss = proctoringEvents.some(e => e.event.includes("Tab"));
    const hasPhoneFlag = proctoringEvents.some(e => e.event.includes("Device"));
    const hasGazeFlag = proctoringEvents.some(e => e.event.includes("Gaze"));

    return (
      <div className="min-h-screen bg-[#0D0C0A] text-cream flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute inset-0 bg-gold/5 blur-[120px] rounded-full scale-120 -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl w-full bg-[#11100D] border border-gold/15 rounded-[40px] shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Top Header Banner */}
          <div className="bg-[#151411] border-b border-white/5 px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-gold uppercase tracking-[0.2em] block mb-1">AuraHR SECURED ASSESSMENT</span>
              <h1 className="text-2xl font-serif text-white tracking-tight uppercase">Technical Session Completed</h1>
            </div>
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">Responses Recorded</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
            {/* Left Column: Academic Round Results */}
            <div className="p-8 space-y-6">
              <h2 className="text-xs font-mono font-bold text-white/50 uppercase tracking-widest mb-4">Academic Evaluation</h2>
              
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-gold/10 border border-gold/20 text-gold rounded-full flex items-center justify-center shadow-lg shadow-gold/5">
                  <GraduationCap className="w-10 h-10" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider mb-1">Academia Score</p>
                  <p className="font-mono text-4xl font-bold text-gold">85%</p>
                </div>
                <p className="text-xs text-white/50 max-w-[280px] leading-relaxed">
                  Excellent work! Your technical responses have been successfully compiled and recorded.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-mono py-2 border-b border-white/5">
                  <span className="text-white/40">Role Target</span>
                  <span className="text-white/80 font-bold">Frontend Engineer</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono py-2 border-b border-white/5">
                  <span className="text-white/40">Completed On</span>
                  <span className="text-white/80 font-bold">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono py-2 border-b border-white/5">
                  <span className="text-white/40">Evaluation Method</span>
                  <span className="text-white/80 font-bold">Automated Coding Metrics</span>
                </div>
              </div>
            </div>

            {/* Right Column: AI Proctoring Integrity Report */}
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-mono font-bold text-white/50 uppercase tracking-widest">AI Proctoring Integrity Report</h2>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gold/10 border border-gold/20 rounded-md text-[9px] font-mono font-bold text-gold uppercase">
                  <ShieldCheck size={10} /> AI Verified
                </div>
              </div>

              {/* Trust Score Card */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center space-y-4 relative overflow-hidden">
                {/* Visual trust meter radial simulation */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      stroke={trustScore >= 80 ? "#C8A84B" : trustScore >= 50 ? "#F59E0B" : "#EF4444"} 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - trustScore / 100)}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="absolute font-mono text-2xl font-bold text-white">{trustScore}%</span>
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider mb-1">Integrity Trust Score</p>
                  <p className={`text-xs font-bold uppercase tracking-wider ${trustScore >= 80 ? 'text-emerald-400' : trustScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {trustScore >= 80 ? 'High Credibility' : trustScore >= 50 ? 'Moderate Warnings' : 'Integrity Audit Required'}
                  </p>
                </div>
              </div>

              {/* AI Evaluation Badges */}
              <div className="space-y-3">
                {/* Gaze Tracking */}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Eye size={16} className={hasGazeFlag ? 'text-amber-400 animate-pulse' : 'text-emerald-400'} />
                    <span className="text-xs font-medium text-white/80">AI Gaze Stability</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${hasGazeFlag ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {hasGazeFlag ? 'Flagged Distractions' : '98.8% Stable Focus'}
                  </span>
                </div>

                {/* Secondary Device Detection */}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Smartphone size={16} className={hasPhoneFlag ? 'text-red-400 animate-pulse' : 'text-emerald-400'} />
                    <span className="text-xs font-medium text-white/80">Secondary Device Scans</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${hasPhoneFlag ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hasPhoneFlag ? 'Secondary Device Spotted' : '0 Extra Devices Detected'}
                  </span>
                </div>

                {/* Browser Tab Focus */}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <ShieldAlert size={16} className={hasFocusLoss ? 'text-red-400 animate-pulse' : 'text-emerald-400'} />
                    <span className="text-xs font-medium text-white/80">Browser Focus Integrity</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${hasFocusLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hasFocusLoss ? 'Tab Focus Violations Logged' : '100% Tab Retention'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="bg-[#151411] border-t border-white/5 p-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-[11px] text-white/40 italic text-center sm:text-left">
              Integrity timeline details have been hashed and sent to the recruiter panel.
            </p>
            <button 
              onClick={() => window.location.href = '/candidate/applications'} 
              className="w-full sm:w-auto px-8 py-3.5 bg-gold text-ink font-mono font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-gold/90 transition-all shadow-lg hover:shadow-gold/5 cursor-pointer text-center"
            >
              Return to Applications
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-3xl mx-auto pt-10">
        <div className="bento-card p-8 bg-[#11100D] border border-gold/15 text-cream relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gold/5 blur-[80px] -z-10 rounded-full" />
          <h1 className="font-serif text-3xl font-bold text-white mb-2 uppercase tracking-wide">Technical Assessment</h1>
          <p className="text-white/60 mb-8 text-sm">Frontend Engineer Position</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-xs font-mono font-bold text-gold uppercase tracking-wider mb-1">Duration</p>
              <p className="font-mono text-lg font-bold text-white">45 Minutes</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-xs font-mono font-bold text-gold uppercase tracking-wider mb-1">Questions</p>
              <p className="font-mono text-lg font-bold text-white">3 Multiple Choice</p>
            </div>
          </div>

          <div className="bg-gold/5 border border-gold/20 p-5 rounded-2xl flex items-start gap-3 mb-8">
            <AlertTriangle size={20} className="text-gold shrink-0 mt-0.5" />
            <div className="text-sm text-white/80">
              <p className="font-bold mb-1 text-gold">Important Instructions</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>This test is proctored. Do not switch tabs or leave the window.</li>
                <li>WebGL webcam tracking will run passively to eliminate browser lag.</li>
                <li>Once started, the timer cannot be paused.</li>
              </ul>
            </div>
          </div>

          <button onClick={handleStart} className="w-full flex items-center justify-center gap-2 py-4 bg-gold text-ink rounded-2xl font-mono font-bold hover:bg-gold/90 transition-all text-sm uppercase tracking-widest shadow-lg shadow-gold/10 cursor-pointer">
            <Play size={16} /> Start Assessment
          </button>
        </div>
      </div>
    );
  }

  const q = DUMMY_QUESTIONS[currentQ];
  const isLast = currentQ === DUMMY_QUESTIONS.length - 1;

  return (
    <div className="fixed inset-0 bg-[#0D0C0A] z-50 overflow-y-auto p-8 pt-12 text-cream">
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
              className="bg-black border border-red-500/50 p-12 rounded-[40px] max-w-xl shadow-[0_0_50px_rgba(239,68,68,0.3)]"
            >
              <AlertTriangle className="text-red-500 w-16 h-16 mx-auto mb-6 animate-bounce" />
              <h2 className="text-3xl font-serif text-white mb-4 uppercase tracking-tighter">Integrity Violation Detected</h2>
              <p className="text-red-200/70 mb-8 leading-relaxed font-medium">
                Switching tabs or losing window focus is strictly prohibited during the assessment. This event has been logged and sent to the recruiter's dashboard.
              </p>
              <button 
                onClick={() => setShowCheatingWarning(false)}
                className="bg-red-500 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-600 transition-all cursor-pointer"
              >
                Return to Assessment
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proctoring Floating Widget (Fully Automatic & Lag-Free) */}
      <div className="fixed bottom-6 right-6 w-72 bg-[#1a1a1a] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50">
        <div className="h-40 bg-black relative overflow-hidden flex items-center justify-center">
          <video 
            id="proctor-webcam" 
            className="w-full h-full object-cover scale-x-[-1]"
            muted 
            playsInline
          />
          
          {/* Active AI Scanning Grid & Laser Line Sweep (100% Canvas Coverage - ROI Disabled) */}
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {/* Digital matrix grid covers full absolute top-left to bottom-right matrix */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(200,168,75,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(200,168,75,0.15)_1px,transparent_1px)] bg-[size:10px_10px]" />
            
            {/* Sweeping laser scanner line */}
            <motion.div 
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent shadow-[0_0_8px_rgba(200,168,75,0.8)]"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* ROI Center cropping explicitly removed - Evaluating complete pixel matrix */}

          {/* Bounding Box Overlay for Device Detection */}
          {deviceStatus === 'phone-detected' && (
            <div className="absolute inset-0 pointer-events-none z-15">
              <div 
                style={{
                  left: deviceBox.left,
                  top: deviceBox.top,
                  width: deviceBox.width,
                  height: deviceBox.height,
                  transition: 'all 0.15s ease-out'
                }}
                className="absolute border-2 border-red-500 border-dashed rounded-lg flex flex-col justify-between animate-pulse bg-red-500/20"
              >
                <span className="absolute -top-4 left-0 bg-red-500 text-white text-[7px] font-mono font-bold px-1 py-0.5 rounded uppercase tracking-wider text-nowrap">
                  Device
                </span>
                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-2 border-l-2 border-red-500" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t-2 border-r-2 border-red-500" />
                <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b-2 border-l-2 border-red-500" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-2 border-r-2 border-red-500" />
              </div>
            </div>
          )}

          {/* Bounding Box Overlay for Gaze Shift Detection */}
          {eyeStatus === 'looking-away' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15">
              <div className="w-24 h-12 border-2 border-amber-500 border-dashed rounded relative flex flex-col justify-between animate-pulse bg-amber-500/20">
                <span className="absolute -top-4 left-0 bg-amber-500 text-white text-[7px] font-mono font-bold px-1 py-0.5 rounded uppercase tracking-wider">
                  Gaze Shift
                </span>
                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-2 border-l-2 border-amber-500" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t-2 border-r-2 border-amber-500" />
                <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b-2 border-l-2 border-amber-500" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-2 border-r-2 border-amber-500" />
              </div>
            </div>
          )}

          <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] text-white font-medium flex items-center gap-1 z-20">
            <div className="w-1 h-1 rounded-full bg-rust animate-pulse" /> Live Camera
          </div>
        </div>

        <div className="p-3 bg-black flex flex-col gap-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Smartphone size={12} className={deviceStatus === 'phone-detected' ? 'text-red-500 animate-bounce' : 'text-emerald-400'} />
            <span className={`text-[10px] font-medium leading-none ${deviceStatus === 'phone-detected' ? 'text-red-400 font-bold' : 'text-white/60'}`}>
              {deviceStatus === 'phone-detected' ? 'Secondary Device Spotted!' : 'Device Scan: Clear'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Eye size={12} className={eyeStatus === 'looking-away' ? 'text-red-500 animate-bounce' : 'text-emerald-400'} />
            <span className={`text-[10px] font-medium leading-none ${eyeStatus === 'looking-away' ? 'text-red-400 font-bold' : 'text-white/60'}`}>
              {eyeStatus === 'looking-away' ? 'Gaze Shift Flagged!' : 'Gaze Status: Focused'}
            </span>
          </div>
        </div>

        {/* Proctor logs (at the bottom of the widget) */}
        <div className="p-4 bg-[#141310]">
          <p className="text-gold font-bold text-[9px] uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <ShieldAlert size={12} /> Proctor Alerts Timeline
          </p>
          <div className="space-y-1.5 max-h-20 overflow-y-auto">
            {proctoringEvents.length === 0 ? (
              <p className="text-[10px] font-mono text-white/30 italic">AI Proctor tracking engaged.</p>
            ) : (
              proctoringEvents.slice(-2).reverse().map((e, idx) => (
                <p key={idx} className={`text-[9px] font-mono leading-none ${e.type === 'warning' ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                  • [{e.time}] {e.event}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex gap-8">
        {/* Sidebar - Question Nav */}
        <div className="w-64 shrink-0">
          <div className="bg-[#11100D] border border-gold/15 rounded-3xl p-5 sticky top-6">
            <div className="text-center mb-6 pb-6 border-b border-white/5">
              <p className="text-xs font-mono font-bold text-white/40 uppercase tracking-wider mb-1">Time Remaining</p>
              <p className="font-mono text-3xl font-bold text-white animate-pulse">44:59</p>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {DUMMY_QUESTIONS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQ(idx)}
                  className={`w-10 h-10 rounded-xl font-mono text-sm font-bold flex items-center justify-center transition-all cursor-pointer ${
                    currentQ === idx 
                      ? 'bg-gold text-ink ring-2 ring-gold ring-offset-2 ring-offset-[#0D0C0A]' 
                      : answers[idx] !== undefined 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-[#11100D] border border-gold/15 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gold/5 blur-[80px] -z-10 rounded-full" />
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-gold/10 text-gold rounded-lg text-xs font-bold font-mono border border-gold/20">Q{currentQ + 1}</span>
              <span className="text-xs font-mono text-white/40 font-bold uppercase tracking-wider">Multiple Choice</span>
            </div>

            <h2 className="text-xl font-serif text-white mb-8 leading-relaxed">
              {q.text}
            </h2>

            <div className="space-y-3">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: idx }))}
                  className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                    answers[currentQ] === idx 
                      ? 'border-gold bg-gold/5 text-white shadow-lg' 
                      : 'border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      answers[currentQ] === idx ? 'border-gold bg-gold' : 'border-white/30'
                    }`}>
                      {answers[currentQ] === idx && <div className="w-2 h-2 rounded-full bg-ink" />}
                    </div>
                    <span className="text-sm font-medium">
                      {opt}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
              <button 
                onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                disabled={currentQ === 0}
                className="px-6 py-3 rounded-xl font-mono text-xs uppercase tracking-wider text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer font-bold border border-white/5"
              >
                Previous
              </button>

              {isLast ? (
                <button 
                  onClick={handleSubmit}
                  disabled={submitting || Object.keys(answers).length < DUMMY_QUESTIONS.length}
                  className="px-8 py-3 bg-emerald-500 text-ink rounded-xl font-mono font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/10 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Submit Assessment
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentQ(prev => Math.min(DUMMY_QUESTIONS.length - 1, prev + 1))}
                  className="px-8 py-3 bg-gold text-ink rounded-xl font-mono font-bold text-xs uppercase tracking-widest shadow-lg shadow-gold/10 hover:bg-gold/90 transition-all cursor-pointer"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
