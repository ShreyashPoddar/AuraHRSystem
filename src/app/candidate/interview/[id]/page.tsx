'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, AlertTriangle, Loader2, Video, VideoOff, 
  Mic, MicOff, Monitor, MonitorOff, ShieldAlert, ShieldCheck, 
  Camera, Clock, PhoneMissed
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';
import { JitsiMeeting } from '@jitsi/react-sdk';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Tesseract from 'tesseract.js';

type CheckStatus = 'idle' | 'checking' | 'ok' | 'fail';
interface CheckState { status: CheckStatus; error?: string; }

const MemoizedJitsiMeeting = memo(function MemoizedJitsiMeeting({
  roomName,
  displayName,
  jwt,
}: {
  roomName: string;
  displayName: string;
  jwt?: string;
}) {
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
        // Start muted to avoid device acquisition blocking page load.
        // Candidate can unmute once ready in the room.
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        disableModeratorIndicator: false,
        prejoinPageEnabled: false,
      }}
      interfaceConfigOverwrite={{
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        SHOW_CHROME_EXTENSION_BANNER: false
      }}
      userInfo={{
        displayName: displayName,
        email: 'candidate@aurahr.local'
      }}
      getIFrameRef={(iframeRef) => {
        iframeRef.style.height = '100%';
        iframeRef.style.width = '100%';
      }}
    />
  );
});

export default function CandidateInterviewPage() {
  const params = useParams();
  const appId = Number(params?.id);

  // --- Moodle Details ---
  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<any>(null);

  // --- Interview States ---
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [forceFullscreen, setForceFullscreen] = useState(false);
  const [proctorAlert, setProctorAlert] = useState<string | null>(null);
  
  // --- Proctor States ---
  const [criticalCount, setCriticalCount] = useState(0);
  const [disqualified, setDisqualified] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('System status: Active');
  
  // Ref tracking for loops and streams
  const activeRef = useRef(true);
  const camStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  
  // Tracking infraction cooldown timestamps
  const lastFaceViolRef = useRef(0);
  const lastMultiFaceViolRef = useRef(0);
  const lastDeviceViolRef = useRef(0);
  const lastGazeViolRef = useRef(0);
  const lastScreenViolRef = useRef(0);
  const faceGoneAtRef = useRef(0);

  // Dynamic status text refs
  const faceStatusRef = useRef('✅ Gaze Scanner Ready');
  const gazeStatusRef = useRef('');
  const deviceStatusRef = useRef('');

  // --- Pre-Interview Hardware Checks ---
  const [camCheck, setCamCheck] = useState<CheckState>({ status: 'idle' });
  const [micCheck, setMicCheck] = useState<CheckState>({ status: 'idle' });
  const [screenCheck, setScreenCheck] = useState<CheckState>({ status: 'idle' });

  // Camera preview states
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [showCamModal, setShowCamModal] = useState(false);
  const [faceCheckBrightness, setFaceCheckBrightness] = useState<number | null>(null);
  const brightCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // JaaS JWT token for the candidate (non-moderator guest)
  const [jwtToken, setJwtToken] = useState<string | undefined>(undefined);
  const [jwtLoaded, setJwtLoaded] = useState(false);

  // --- Load interview state from Moodle on Mount ---
  useEffect(() => {
    if (!appId) return;
    async function load() {
      try {
        const data = await moodleCall<any>('local_aurahr_interview_get_details', { applicationid: appId });
        if (data) {
          setInterview(data);

          // Get existing proctoring report events count
          try {
            const report = await moodleCall<any>('local_aurahr_proctor_get_report', {
              sessiontype: 'interview',
              sessionid: data.id
            });

            if (report) {
              setCriticalCount(report.critical_count || 0);
              if (data.status === 'completed') {
                setCompleted(true);
              }
            }
          } catch (proctorErr) {
            console.error('Failed to load proctor report:', proctorErr);
          }
        }
      } catch (err) {
        console.error('Failed to load interview metadata:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      activeRef.current = false;
      stopAllStreams();
    };
  }, [appId]);

  // Fetch a guest (non-moderator) JWT for the candidate after interview metadata loads
  useEffect(() => {
    if (!interview?.jitsi_room) return;
    async function fetchCandidateToken() {
      try {
        const candidateName = encodeURIComponent(interview.candidate_name || 'Candidate');
        const room = encodeURIComponent(interview.jitsi_room);
        const res = await fetch(
          `/api/jitsi-token?room=${room}&isModerator=false&name=${candidateName}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.token) setJwtToken(data.token);
        }
      } catch (e) {
        console.warn('JaaS token fetch failed, using meet.jit.si fallback:', e);
      } finally {
        setJwtLoaded(true);
      }
    }
    fetchCandidateToken();
  }, [interview?.jitsi_room]);

  // Clean up streams
  const stopAllStreams = () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (camStream) {
      camStream.getTracks().forEach(t => t.stop());
    }
  };

  const handleDisqualification = useCallback(() => {
    setDisqualified(true);
    setStarted(false);
    stopAllStreams();
  }, [camStream]);

  // --- Log violation event to Moodle ---
  const logViolation = useCallback((type: string, details: string) => {
    if (!interview?.id) return;
    moodleCall<any>('local_aurahr_proctor_log_event', {
      sessiontype: 'interview',
      sessionid: interview.id,
      event_type: type,
      severity: 'critical',
      details,
    }).then(res => {
      if (res && res.logged) {
        setCriticalCount(prev => prev + 1);
      }
    }).catch(console.error);
  }, [interview, handleDisqualification]);

  // --- Attach stream to modal video preview ---
  useEffect(() => {
    if (previewVideoRef.current && camStream) {
      previewVideoRef.current.srcObject = camStream;
      previewVideoRef.current.play().catch(console.error);
    }
  }, [camStream, showCamModal]);

  // --- Attach webcam stream to background feed in interview room ---
  useEffect(() => {
    if (!started) return;
    const stream = camStreamRef.current;
    if (!stream) return;
    const vid = camVideoRef.current;
    if (vid) {
      vid.srcObject = stream;
      vid.play().catch(console.error);
    }
  }, [started]);

  // --- Dynamic BlazeFace checker inside camera modal ---
  useEffect(() => {
    if (!camStream) {
      if (brightCheckIntervalRef.current) clearInterval(brightCheckIntervalRef.current);
      setFaceCheckBrightness(null);
      return;
    }

    let blazeModel: any = null;
    let loadingModel = false;

    const loadModel = async () => {
      if (loadingModel || blazeModel) return;
      loadingModel = true;
      try {
        await tf.ready();
        if (!(window as any).blazeface) {
          (window as any).tf = tf;
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface';
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        blazeModel = await (window as any).blazeface.load();
      } catch (e) {
        console.error('BlazeFace check initialization failure:', e);
        setFaceCheckBrightness(-1);
      }
      loadingModel = false;
    };
    loadModel();

    brightCheckIntervalRef.current = setInterval(async () => {
      const vid = previewVideoRef.current;
      if (!vid || vid.readyState < 2 || vid.videoWidth === 0 || !blazeModel) return;
      try {
        const faces = await blazeModel.estimateFaces(vid, false);
        if (faces.length === 0) {
          setFaceCheckBrightness(-1);
        } else if (faces.length > 1) {
          setFaceCheckBrightness(-2);
        } else {
          setFaceCheckBrightness(100);
        }
      } catch (e) {
        console.error(e);
        setFaceCheckBrightness(-1);
      }
    }, 1000);

    return () => {
      if (brightCheckIntervalRef.current) clearInterval(brightCheckIntervalRef.current);
    };
  }, [camStream]);

  // --- Hardware Check Functions ---
  async function checkCamera() {
    setCamCheck({ status: 'checking' });
    try {
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach(t => t.stop());
        camStreamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      camStreamRef.current = stream;
      setCamStream(stream);
      setShowCamModal(true);
      setCamCheck({ status: 'idle' });
    } catch (err: any) {
      setCamCheck({
        status: 'fail',
        error: 'Camera permissions were denied or no device is connected.',
      });
    }
  }

  function confirmCamera() {
    setShowCamModal(false);
    setCamStream(null);
    setCamCheck({ status: 'ok' });
  }

  function rejectCamera() {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
    setCamStream(null);
    setShowCamModal(false);
    setCamCheck({
      status: 'fail',
      error: 'Camera validation was cancelled. Please align your webcam.',
    });
  }

  async function checkMic() {
    setMicCheck({ status: 'checking' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicCheck({ status: 'ok' });
    } catch (err) {
      setMicCheck({ status: 'fail', error: 'Microphone permissions denied.' });
    }
  }

  async function checkScreen() {
    setScreenCheck({ status: 'checking' });
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: 'monitor', cursor: 'always' },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings() as any;

      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setScreenCheck({
          status: 'fail',
          error: 'You must share your "Entire Screen" for security verification.',
        });
        return;
      }

      screenStreamRef.current = stream;

      track.onended = () => {
        if (activeRef.current && !completed) {
          logViolation('screen_share_stopped', 'Screen sharing was stopped manually by candidate.');
          setProctorAlert('⚠️ VIOLATION: Screen sharing was stopped! You must share your entire screen.');
        }
      };

      setScreenCheck({ status: 'ok' });
    } catch (err) {
      setScreenCheck({ status: 'fail', error: 'Screen sharing permission denied.' });
    }
  }

  // --- Fullscreen & Tab Switching Listeners ---
  useEffect(() => {
    if (!started || completed) return;

    const handleVisibility = () => {
      if (document.hidden) {
        logViolation('tab_switch', 'Candidate switched to another browser tab.');
        setProctorAlert('⚠️ VIOLATION: Tab switch detected! Stay on the interview tab.');
      }
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        logViolation('fullscreen_exit', 'Candidate exited fullscreen mode.');
        setForceFullscreen(true);
      } else {
        setForceFullscreen(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [started, completed, logViolation]);

  // --- Live Proctoring Active Detection Loops ---
  useEffect(() => {
    if (!started || completed) return;
    let procActive = true;
    let blazeModel: any = null;
    let cocoModel: cocoSsd.ObjectDetection | null = null;
    let ocrActive = true;

    const updateStatusMessage = () => {
      const msgs = [];
      if (faceStatusRef.current) msgs.push(faceStatusRef.current);
      if (gazeStatusRef.current) msgs.push(gazeStatusRef.current);
      if (deviceStatusRef.current) msgs.push(deviceStatusRef.current);
      setDetectionStatus(msgs.join(' | ') || 'System status: Active');
    };

    // Reset loop reference trackers
    lastFaceViolRef.current = 0;
    lastMultiFaceViolRef.current = 0;
    lastDeviceViolRef.current = 0;
    lastGazeViolRef.current = Date.now();
    lastScreenViolRef.current = 0;
    faceGoneAtRef.current = 0;

    faceStatusRef.current = '✅ Gaze Scanner Active';
    gazeStatusRef.current = '';
    deviceStatusRef.current = '';
    updateStatusMessage();

    // 1. Camera track mute handler
    const vid = camVideoRef.current;
    let videoTrack: MediaStreamTrack | null = null;
    if (vid?.srcObject) {
      const tracks = (vid.srcObject as MediaStream).getVideoTracks();
      if (tracks.length > 0) {
        videoTrack = tracks[0];
        videoTrack.onmute = () => {
          logViolation('camera_muted', 'Camera feed was muted at hardware/browser level.');
          setProctorAlert('⚠️ VIOLATION: Camera muted! Ensure your feed is live.');
        };
        videoTrack.onended = () => {
          logViolation('camera_disabled', 'Webcam feed was disconnected.');
          setProctorAlert('⚠️ VIOLATION: Webcam feed stopped!');
        };
      }
    }

    // 2. BlazeFace Loop
    const loadAndRunBlaze = async () => {
      try {
        await tf.ready();
        if (!(window as any).blazeface) {
          (window as any).tf = tf;
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface';
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        blazeModel = await (window as any).blazeface.load();
        faceStatusRef.current = '✅ Face & Gaze check running';
        updateStatusMessage();
      } catch (e) {
        console.error(e);
      }
    };
    loadAndRunBlaze();

    const runBlazeGazeLoop = async () => {
      if (!procActive) return;
      const targetVid = camVideoRef.current;
      if (!blazeModel || !targetVid || targetVid.readyState < 2 || targetVid.videoWidth === 0) {
        if (procActive) setTimeout(runBlazeGazeLoop, 1000);
        return;
      }

      try {
        const faces = await blazeModel.estimateFaces(targetVid, false);
        const now = Date.now();

        if (faces.length === 0) {
          faceStatusRef.current = '⚠️ Face absent';
          gazeStatusRef.current = '';
          updateStatusMessage();

          if (faceGoneAtRef.current === 0) faceGoneAtRef.current = now;

          if (now - faceGoneAtRef.current > 4000) {
            faceGoneAtRef.current = now;
            logViolation('no_face', 'No candidate face detected in webcam feed.');
            setProctorAlert('⚠️ VIOLATION: No face detected! Keep your face visible.');
          }
        } else if (faces.length > 1) {
          faceGoneAtRef.current = 0;
          faceStatusRef.current = `⚠️ Multiple people (${faces.length})`;
          gazeStatusRef.current = '';
          updateStatusMessage();

          if (now - lastMultiFaceViolRef.current > 8000) {
            lastMultiFaceViolRef.current = now;
            logViolation('multiple_faces', `Detected ${faces.length} people in camera feed.`);
            setProctorAlert('⚠️ VIOLATION: Multiple faces detected!');
          }
        } else {
          faceGoneAtRef.current = 0;
          faceStatusRef.current = '✅ Gaze Scanner Active';

          const landmarks = faces[0].landmarks as number[][];
          if (landmarks && landmarks.length >= 3) {
            const rightEye = landmarks[0];
            const leftEye = landmarks[1];
            const nose = landmarks[2];

            const eyeDist = Math.abs(leftEye[0] - rightEye[0]) || 1;
            const noseRatio = (nose[0] - Math.min(leftEye[0], rightEye[0])) / eyeDist;

            const isLookingAway = noseRatio < 0.15 || noseRatio > 0.85;
            if (isLookingAway) {
              gazeStatusRef.current = '⚠️ Gaze diverted';
              if (now - lastGazeViolRef.current > 4000) {
                lastGazeViolRef.current = now;
                logViolation('head_turned', 'Candidate is looking away from the screen.');
                setProctorAlert('⚠️ VIOLATION: Look at the screen.');
              }
            } else {
              gazeStatusRef.current = '';
              lastGazeViolRef.current = now;
            }
          }
          updateStatusMessage();
        }
      } catch (e) {
        console.error(e);
      }

      if (procActive) setTimeout(runBlazeGazeLoop, 800);
    };
    setTimeout(runBlazeGazeLoop, 2000);

    // 3. COCO-SSD Loop
    const loadAndRunCoco = async () => {
      try {
        await tf.ready();
        cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      } catch (e) {
        console.error(e);
      }
    };
    loadAndRunCoco();

    const runCocoLoop = async () => {
      if (!procActive) return;
      const targetVid = camVideoRef.current;
      if (!cocoModel || !targetVid || targetVid.readyState < 2 || targetVid.videoWidth === 0) {
        if (procActive) setTimeout(runCocoLoop, 1500);
        return;
      }

      try {
        const predictions = await cocoModel.detect(targetVid);
        const prohibited = predictions.find(p => p.class === 'cell phone' || p.class === 'laptop' || p.class === 'remote');
        if (prohibited) {
          deviceStatusRef.current = `⚠️ Device: ${prohibited.class}`;
          updateStatusMessage();

          const now = Date.now();
          if (now - lastDeviceViolRef.current > 10000) {
            lastDeviceViolRef.current = now;
            logViolation('device_detected', `Candidate has a ${prohibited.class} nearby.`);
            setProctorAlert(`⚠️ VIOLATION: Unauthorized device (${prohibited.class}) detected!`);
          }
        } else {
          deviceStatusRef.current = '';
          updateStatusMessage();
        }
      } catch (e) {
        console.error(e);
      }

      if (procActive) setTimeout(runCocoLoop, 3000);
    };
    setTimeout(runCocoLoop, 4000);

    // 4. Screen OCR loop (Tesseract.js)
    const runOcrLoop = async () => {
      if (!procActive || !ocrActive || !screenStreamRef.current) return;
      const stream = screenStreamRef.current;
      try {
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
          const lower = text.toLowerCase();

          const forbiddenApps = ['anydesk', 'teamviewer', 'chatgpt', 'discord', 'skype', 'whatsapp', 'telegram'];
          const matched = forbiddenApps.find(app => lower.includes(app));

          if (matched) {
            const now = Date.now();
            if (now - lastScreenViolRef.current > 20000) {
              lastScreenViolRef.current = now;
              logViolation('unauthorized_app', `Screen share OCR matched forbidden text: "${matched}"`);
              setProctorAlert(`⚠️ VIOLATION: Unauthorized application (${matched}) detected on screen!`);
            }
          }
        }
        video.pause();
        video.srcObject = null;
      } catch (e) {
        console.error('OCR check failure:', e);
      }

      if (procActive && ocrActive) setTimeout(runOcrLoop, 15000);
    };
    setTimeout(runOcrLoop, 8000);

    return () => {
      procActive = false;
      ocrActive = false;
      if (videoTrack) {
        videoTrack.onmute = null;
        videoTrack.onended = null;
      }
    };
  }, [started, completed, logViolation]);

  // --- Start Interview ---
  async function handleStartInterview() {
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {}
    setStarted(true);
  }

  // --- Finish / Leave Interview ---
  const handleFinishInterview = async () => {
    stopAllStreams();
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {}
    }
    setCompleted(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="animate-spin text-sage" size={32} />
      </div>
    );
  }

  if (disqualified) {
    return (
      <div className="fixed inset-0 z-[10000] bg-red-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl p-10 max-w-lg shadow-2xl border-4 border-red-500 scale-in-center">
          <ShieldAlert size={80} className="text-red-500 mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl font-bold text-red-600 mb-4">Interview Terminated</h2>
          <p className="text-ink text-lg font-semibold mb-8">
            You have been disqualified from this interview due to repeated proctoring violations (5 or more infractions recorded).
          </p>
          <p className="text-ink/50 text-sm mb-8">
            This event has been logged and your application has been rejected.
          </p>
          <button
            onClick={() => window.location.href = '/candidate/applications'}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-red-500/30"
          >
            Exit Room
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bento-card p-12 text-center max-w-lg">
          <CheckCircle size={56} className="text-emerald-500 mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold text-ink mb-2">Interview Completed</h1>
          <p className="text-ink/60 text-sm">Thank you for attending the interview! Your results are being processed.</p>
          <button
            onClick={() => window.location.href = '/candidate/applications'}
            className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-sm"
          >
            Return to Applications
          </button>
        </div>
      </div>
    );
  }

  // Pre-interview check dashboard
  if (!started) {
    const isChecksOk = camCheck.status === 'ok' && micCheck.status === 'ok' && screenCheck.status === 'ok';

    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <div className="bento-card p-8 space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold text-ink">Interview Room Setup</h1>
            <p className="text-xs text-ink/40 mt-1">Please complete the hardware checks before entering the Jitsi Meet call.</p>
          </div>

          {/* Guidelines */}
          <div className="p-4 bg-ink/5 rounded-2xl text-xs text-ink/60 space-y-2">
            <p className="font-semibold text-ink flex items-center gap-1.5"><ShieldCheck size={14} className="text-sage" /> System Requirements:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Stay in Fullscreen mode throughout the meeting.</li>
              <li>Camera feed and Screen share must remain active.</li>
              <li>Forbidden software (gaze cheats, screen projection) is prohibited.</li>
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <CheckButton 
              label="Webcam Test" 
              status={camCheck.status} 
              error={camCheck.error} 
              icon={Camera} 
              iconFail={AlertTriangle} 
              onClick={checkCamera} 
            />
            <CheckButton 
              label="Mic Check" 
              status={micCheck.status} 
              error={micCheck.error} 
              icon={Mic} 
              iconFail={AlertTriangle} 
              onClick={checkMic} 
            />
            <CheckButton 
              label="Screen Share" 
              status={screenCheck.status} 
              error={screenCheck.error} 
              icon={Monitor} 
              iconFail={AlertTriangle} 
              onClick={checkScreen} 
            />
          </div>

          <button
            onClick={handleStartInterview}
            disabled={!isChecksOk}
            className="w-full py-4 rounded-xl font-bold text-sm bg-sage text-white hover:bg-sage-dark shadow disabled:opacity-50 transition-colors"
          >
            JOIN INTERVIEW ROOM
          </button>
        </div>

        {/* Camera Preview Modal */}
        <AnimatePresence>
          {showCamModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-cream rounded-3xl p-6 max-w-sm w-full border border-ink/10 shadow-2xl">
                <h3 className="font-serif text-lg font-bold text-ink mb-2">Align Your Camera</h3>
                <p className="text-xs text-ink/50 mb-4">Position your face inside the webcam scanner bounds.</p>
                
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative border border-ink/10 mb-4">
                  <video ref={previewVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  <div className="absolute inset-0 border-2 border-dashed border-sage/50 rounded-2xl pointer-events-none m-4" />
                </div>

                <div className="flex items-center gap-2 mb-6">
                  {faceCheckBrightness === null ? (
                    <div className="flex items-center gap-1.5 text-xs text-ink/40"><Loader2 className="animate-spin" size={12} /> Detecting face...</div>
                  ) : faceCheckBrightness === -1 ? (
                    <div className="flex items-center gap-1.5 text-xs text-rust font-bold"><AlertTriangle size={12} /> Face absent. Adjust lighting or angle.</div>
                  ) : faceCheckBrightness === -2 ? (
                    <div className="flex items-center gap-1.5 text-xs text-rust font-bold"><AlertTriangle size={12} /> Multiple faces! Ensure you are alone.</div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold"><CheckCircle size={12} /> Face aligned properly.</div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={rejectCamera} className="flex-1 py-2.5 rounded-lg border border-ink/15 text-xs font-semibold hover:bg-ink/5 transition-all text-ink/60">Cancel</button>
                  <button onClick={confirmCamera} disabled={faceCheckBrightness !== 100} className="flex-1 py-2.5 rounded-lg bg-sage text-white text-xs font-bold hover:bg-sage-dark shadow disabled:opacity-50 transition-all">Confirm</button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Live Jitsi call and proctor page
  return (
    <div className="h-[calc(100vh-8rem)] bg-ink rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-ink/20 relative">
      
      {/* Header */}
      <div className="h-16 bg-[#1a1a1a] flex items-center justify-between px-6 shrink-0 border-b border-white/10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-rust animate-pulse" />
            <span className="text-white/80 font-medium text-sm">Security Proctoring Active</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-white/60 font-mono text-[10px] tracking-wide uppercase">{detectionStatus}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-white/40">Violation points:</span>
          <span className={`font-mono font-bold px-2 py-0.5 rounded ${criticalCount > 0 ? 'bg-rust/20 text-rust' : 'bg-emerald-500/20 text-emerald-400'}`}>{criticalCount} / 5</span>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 relative flex">
        {/* Hidden/Background video element for feed checks */}
        <video ref={camVideoRef} className="hidden" autoPlay playsInline muted />

        {/* Jitsi Meeting Frame Container */}
        <div className="flex-1 bg-[#151515] relative p-4 flex items-center justify-center">
          <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 relative flex items-center justify-center">
            {!jwtLoaded ? (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="animate-spin text-sage" size={20} /> Loading Interview Room...
              </div>
            ) : (
              <MemoizedJitsiMeeting
                roomName={interview?.jitsi_room || `AuraHR-Interview-App-${appId}`}
                displayName={interview?.candidate_name || 'Candidate'}
                jwt={jwtToken}
              />
            )}
          </div>
        </div>

        {/* Proctoring Warning Side Card */}
        <div className="w-64 border-l border-white/10 bg-[#161616] p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-rust">
              <ShieldAlert size={18} />
              <h3 className="font-bold text-xs uppercase tracking-wider">Proctor Alerts</h3>
            </div>
            
            {proctorAlert ? (
              <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-rust text-xs leading-normal animate-pulse">
                {proctorAlert}
              </div>
            ) : (
              <p className="text-white/40 text-xs italic">Scanner checking. No active warnings.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] text-white/30 leading-snug">
              Fullscreen check, cell phone scans, multiple faces detection, and screen sharing OCR are active.
            </p>
          </div>
        </div>
      </div>

      {/* Controls / Footer */}
      <div className="h-20 bg-[#121212] flex items-center justify-between px-8 shrink-0 border-t border-white/10">
        <div className="text-white/40 text-xs font-mono font-medium">
          Interview session synced with Moodle backend
        </div>
        <button 
          onClick={handleFinishInterview} 
          className="h-12 px-6 rounded-xl flex items-center justify-center bg-rust hover:bg-rust-dark text-white font-bold text-sm shadow-md transition-colors gap-2"
        >
          <PhoneMissed size={16} /> LEAVE MEETING ROOM
        </button>
      </div>

      {/* Fullscreen Enforcer Screen Overlay */}
      {forceFullscreen && (
        <div className="fixed inset-0 z-[20000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <div className="bg-white rounded-3xl p-8 max-w-sm shadow-2xl border border-rust">
            <ShieldAlert size={60} className="text-rust mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-bold text-ink mb-2">Fullscreen Mode Required</h3>
            <p className="text-xs text-ink/50 mb-6">You must remain in fullscreen mode. Click below to restore fullscreen.</p>
            <button
              onClick={() => {
                document.documentElement.requestFullscreen().then(() => setForceFullscreen(false)).catch(console.error);
              }}
              className="w-full py-3 bg-sage hover:bg-sage-dark text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
            >
              Restore Fullscreen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- CheckButton Helper ---
function CheckButton({
  label, status, error, icon: Icon, iconFail: IconFail, onClick,
}: {
  label: string; status: CheckStatus; error?: string;
  icon: any; iconFail: any; onClick: () => void;
}) {
  const isChecking = status === 'checking';
  const isOk = status === 'ok';
  const isFail = status === 'fail';

  const bg =
    isOk ? 'bg-emerald-50 border-emerald-300' :
    isFail ? 'bg-red-50 border-red-300' :
    isChecking ? 'bg-amber-50 border-amber-300' :
    'bg-white border-ink/10 hover:bg-ink/5';

  const textColor =
    isOk ? 'text-emerald-700' :
    isFail ? 'text-red-600' :
    isChecking ? 'text-amber-700' : 'text-ink/60';

  const IconComp = isFail ? IconFail : Icon;

  return (
    <button onClick={onClick} disabled={isChecking}
      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all w-full ${bg}`}
    >
      {isChecking ? (
        <Loader2 size={24} className="animate-spin text-amber-600" />
      ) : (
        <IconComp size={24} className={textColor} />
      )}
      <span className={`text-xs font-semibold text-center ${textColor}`}>
        {status === 'idle' ? label : ''}
        {isChecking ? 'Checking…' : ''}
        {isOk ? label.replace('Check ', '') + ' ✓' : ''}
        {isFail ? 'Retry' : ''}
      </span>
      {error && isFail && (
        <p className="text-[10px] text-red-500 text-center leading-snug">{error}</p>
      )}
    </button>
  );
}
