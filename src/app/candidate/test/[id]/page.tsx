'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import AssessmentHeader from "../../../../components/AssessmentHeader";
import { motion } from 'framer-motion';
import ViolationToast from "../../../../components/ViolationToast";
import {
  CheckCircle, AlertTriangle, Loader2,
  VideoOff, Mic, MicOff, Monitor, MonitorOff,
  ShieldAlert, ShieldCheck, Camera, Clock
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { moodleCall } from '@/lib/moodle';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Tesseract from 'tesseract.js';
// face-landmarks-detection loaded dynamically to avoid Turbopack/mediapipe bundler issues

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type CheckStatus = 'idle' | 'checking' | 'ok' | 'fail';
interface CheckState { status: CheckStatus; error?: string; }

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function CandidateTestPage() {
  const params = useParams();
  const jobId = Number(params?.id);

  // ── Assessment data ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  // ── Test state ─────────────────────────────────────────────────────────────
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [forceFullscreen, setForceFullscreen] = useState(false);
  const [proctorAlert, setProctorAlert] = useState<string | null>(null);
  const proctorAlertRef = useRef<string | null>(null);
  const isEndingRef = useRef(false);

  useEffect(() => {
    proctorAlertRef.current = proctorAlert;
  }, [proctorAlert]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Set timer when assessment loads (moved below to unified restore effect)

  // Countdown
  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pre-test check state ───────────────────────────────────────────────────
  const [camCheck, setCamCheck] = useState<CheckState>({ status: 'idle' });
  const [micCheck, setMicCheck] = useState<CheckState>({ status: 'idle' });
  const [screenCheck, setScreenCheck] = useState<CheckState>({ status: 'idle' });

  // Camera preview modal
  const [camStream, setCamStream] = useState<MediaStream | null>(null);    // null once modal closed
  const camStreamRef = useRef<MediaStream | null>(null);                    // persists for live test
  const [showCamModal, setShowCamModal] = useState(false);
  const [camBrightness, setCamBrightness] = useState<number | null>(null); // null=checking, -1=no face, >0=face
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const brightCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mic check modal
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [micPass, setMicPass] = useState<boolean>(false);
  const micRafRef = useRef<number | null>(null);

  // ── Proctoring state (live) ────────────────────────────────────────────────
  const [violationCount, setViolationCount] = useState(0);
  const [flagged, setFlagged] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [aiDetectionStatus, setAiDetectionStatus] = useState<string>('AI loading...');
  const [debugErrors, setDebugErrors] = useState<string[]>([]);
  const sessionIdRef = useRef<number>(0);
  const lastFaceViolRef = useRef(0);
  const lastMultiFaceViolRef = useRef(0);
  const lastDeviceViolRef = useRef(0);
  const lastGazeViolRef = useRef(0);
  const lastMicViolRef = useRef(0);
  const lastLoudViolRef = useRef(0);
  const lastScreenViolRef = useRef(0);
  const faceGoneAtRef = useRef(0);
  const faceStatusRef = useRef('✅ Face OK');
  const gazeStatusRef = useRef('');
  const deviceStatusRef = useRef('');
  const faceLandmarksModelRef = useRef<any>(null); // face-landmarks-detection loaded dynamically
  const procMicStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // ── Load assessment from Moodle ───────────────────────────────────────────
  useEffect(() => {
    // Override console.error for debugging
    const originalError = console.error;
    console.error = (...args) => {
      setDebugErrors(prev => [...prev.slice(-4), args.map(a => String(a)).join(' ')]);
      originalError(...args);
    };

    if (!jobId) return;
    async function load() {
      try {
        const data = await moodleCall<any>('local_aurahr_academia_get_assessment', {
          assessmentid: 0, jobid: jobId,
        });
        if (data?.exists) {
          // If candidate is starting fresh in the DB (status is pending), clear local storage before setting assessment
          const isFreshStart = data.user_status === 'pending';
          if (isFreshStart && jobId) {
            localStorage.removeItem(`aurahr_test_state_${jobId}`);
          }

          setAssessment(data);
          if (Array.isArray(data.questions)) setQuestions(data.questions);

          // Check if candidate is already disqualified from Moodle database state on page load
          if (data.user_stage === 'rejected' || (data.user_malpractice || 0) >= 5) {
            setViolationCount(data.user_malpractice || 5);
            setFlagged(true);
            setDisqualified(true);
            
            // Clean up localStorage just in case
            if (jobId) {
              localStorage.removeItem(`aurahr_test_state_${jobId}`);
            }
          } else {
            // Restore actual database count
            setViolationCount(data.user_malpractice || 0);
            if ((data.user_malpractice || 0) > 0) {
              setFlagged(true);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  const handleDisqualification = useCallback(() => {
    setDisqualified(true);
    setStarted(false); // Stop countdown

    // Stop camera and mic streams
    if (camStream) camStream.getTracks().forEach(t => t.stop());
    if (camStreamRef.current) camStreamRef.current.getTracks().forEach(t => t.stop());
    if (procMicStreamRef.current) procMicStreamRef.current.getTracks().forEach(t => t.stop());

    // Clear local storage
    if (jobId) {
      localStorage.removeItem(`aurahr_test_state_${jobId}`);
    }
  }, [camStream, jobId]);

  // ── Log violation to Moodle ───────────────────────────────────────────────
  const logViolation = useCallback((type: string, details: string) => {
    moodleCall<any>('local_aurahr_academia_log_event', {
      assessmentid: assessment?.id ?? 0,
      jobid: jobId,
      event_type: type,
      details,
    }).then(res => {
      if (res && res.success) {
        setViolationCount(res.violation_count);
        if (res.flagged || res.violation_count >= 5) {
          setFlagged(true);
          handleDisqualification();
        }
      }
    }).catch(console.error);
  }, [assessment, jobId, handleDisqualification]);

  // ── Restore state and set timer when assessment loads ────────────────────
  useEffect(() => {
    if (assessment && jobId) {
      const storageKey = `aurahr_test_state_${jobId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (state.started && !state.completed) {
            // Calculate remaining time based on startTime
            const totalSecs = (assessment.duration_mins || 30) * 60;
            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            const remaining = totalSecs - elapsed;

            if (remaining <= 0) {
              handleSubmit();
              return;
            }

            setAnswers(state.answers || {});
            setCurrentQ(state.currentQ || 0);
            setTimeLeft(remaining);
            setTotalTime(totalSecs);

            // Add exactly 1 flag for re-entering
            const newViolationCount = (state.violationCount || 0) + 1;
            setViolationCount(newViolationCount);
            setFlagged(true);

            setProctorAlert('⚠️ VIOLATION: You re-entered the test after reloading or closing the page! This infraction has been logged.');
            logViolation('test_reentry', `Candidate re-entered the test (Previous violation count: ${state.violationCount || 0})`);

            // Save updated state immediately so we don't repeat the flag log on future ticks
            localStorage.setItem(storageKey, JSON.stringify({
              ...state,
              violationCount: newViolationCount,
              flagged: true,
            }));

            setStarted(true); // Triggers proctoring and countdown loops
            return;
          }
        } catch (e) {
          console.error('Failed to restore test state:', e);
        }
      }

      // Default fresh test: set normal timer duration
      const secs = (assessment.duration_mins || 30) * 60;
      setTimeLeft(secs);
      setTotalTime(secs);
    }
  }, [assessment, jobId]);

  // ── Save state to localStorage on state changes ────────────────────────────
  useEffect(() => {
    if (!started || completed || !jobId) return;
    const storageKey = `aurahr_test_state_${jobId}`;
    const saved = localStorage.getItem(storageKey);
    let startTime = Date.now();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        startTime = parsed.startTime || Date.now();
      } catch (e) {}
    }

    const stateToSave = {
      started: true,
      completed: false,
      startTime,
      currentQ,
      answers,
      violationCount,
      flagged,
    };
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
  }, [started, completed, currentQ, answers, violationCount, flagged, jobId]);

  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // ── Attach stream to preview modal video ─────────────────────────────────
  useEffect(() => {
    if (previewVideoRef.current && camStream) {
      previewVideoRef.current.srcObject = camStream;
      previewVideoRef.current.play().catch(console.error);
    }
  }, [camStream, showCamModal]);

  // ── Attach persistent stream to live test camera when test starts ─────────
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

  // ── Camera face analysis during pre-test check ────────────────────────────
  useEffect(() => {
    if (!camStream) {
      if (brightCheckRef.current) clearInterval(brightCheckRef.current);
      setCamBrightness(null);
      return;
    }

    let blazeModel: any = null;
    let isModelLoading = false;

    const loadModel = async () => {
      if (isModelLoading || blazeModel) return;
      isModelLoading = true;
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
        console.error('BlazeFace load error in check:', e);
        setCamBrightness(-1);
      }
      isModelLoading = false;
    };
    loadModel();

    brightCheckRef.current = setInterval(async () => {
      const vid = previewVideoRef.current;
      if (!vid || vid.readyState < 2 || vid.videoWidth === 0) {
        return; // Silently wait for video to be ready
      }
      if (!blazeModel) {
        return; // Silently wait for model to load
      }
      try {
        const faces = await blazeModel.estimateFaces(vid, false);
        if (faces.length === 0) {
          setCamBrightness(-1);
        } else if (faces.length > 1) {
          setCamBrightness(-2);
        } else {
          setCamBrightness(100);
        }
      } catch (e) {
        console.error('Face detection error in check:', e);
        setCamBrightness(-1);
      }
    }, 1000);

    return () => {
      if (brightCheckRef.current) clearInterval(brightCheckRef.current);
    };
  }, [camStream]);

  // ── Mic volume analysis ───────────────────────────────────────────────────
  useEffect(() => {
    if (!micStream) {
      if (micRafRef.current) cancelAnimationFrame(micRafRef.current);
      setMicVolume(0);
      setMicPass(false);
      return;
    }

    let audioContext: AudioContext | null = null;
    let lastSpokeTime = 0;

    const audioTrack = micStream.getAudioTracks()[0];
    const handleTrackEnd = () => { setMicPass(false); lastSpokeTime = 0; };

    try {
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(micStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicVolume(avg);
        if (avg > 15) {
          lastSpokeTime = Date.now();
          setMicPass(true);
        } else if (Date.now() - lastSpokeTime > 3000) {
          setMicPass(false);
        }
        micRafRef.current = requestAnimationFrame(loop);
      };
      micRafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.error('AudioContext error:', e);
    }

    if (audioTrack) {
      audioTrack.addEventListener('ended', handleTrackEnd);
      audioTrack.addEventListener('mute', handleTrackEnd);
    }

    return () => {
      if (micRafRef.current) cancelAnimationFrame(micRafRef.current);
      if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(console.error);
      if (audioTrack) {
        audioTrack.removeEventListener('ended', handleTrackEnd);
        audioTrack.removeEventListener('mute', handleTrackEnd);
      }
    };
  }, [micStream]);

  // ── Tab switch + fullscreen violation detection ────────────────────────────
  useEffect(() => {
    if (!started || completed) return;

    const onVisibility = () => {
      if (isEndingRef.current) return;
      if (document.hidden) {
        setViolationCount(v => v + 1);
        logViolation('tab_switch', 'Candidate switched to another tab or minimized window');
        setProctorAlert('⚠️ VIOLATION: You switched away from the test!\nPlease stay on this page.');
      }
    };

    const onFullscreen = () => {
      if (isEndingRef.current) return;
      if (!document.fullscreenElement) {
        setViolationCount(v => v + 1);
        logViolation('fullscreen_exit', 'Candidate exited full-screen mode');
        setForceFullscreen(true);
      } else {
        setForceFullscreen(false);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [started, completed, logViolation]);

  // ── Live test proctoring: camera track, mic, gaze ─────────────────────────
  useEffect(() => {
    if (!started || completed) return;
    let active = true;
    let audioCtx: AudioContext | null = null;
    let micRaf: number | null = null;
    let silenceStart = Date.now();

    const updateAiStatus = () => {
      const parts = [];
      if (faceStatusRef.current) parts.push(faceStatusRef.current);
      if (gazeStatusRef.current) parts.push(gazeStatusRef.current);
      if (deviceStatusRef.current) parts.push(deviceStatusRef.current);
      setAiDetectionStatus(parts.filter(Boolean).join(' | ') || 'Scanning...');
    };

    // Initialize all violation timers (0 for immediate flagging, Date.now() for delayed alerts)
    lastFaceViolRef.current = 0;
    lastMultiFaceViolRef.current = 0;
    lastDeviceViolRef.current = 0;
    lastGazeViolRef.current = Date.now();
    lastMicViolRef.current = 0;
    lastLoudViolRef.current = 0;
    lastScreenViolRef.current = 0;
    faceGoneAtRef.current = 0;

    faceStatusRef.current = '✅ Face OK';
    gazeStatusRef.current = '';
    deviceStatusRef.current = '';
    updateAiStatus();

    // 1. Camera track mute/ended detection
    const vid = camVideoRef.current;
    let videoTrack: MediaStreamTrack | null = null;
    if (vid && vid.srcObject) {
      const tracks = (vid.srcObject as MediaStream).getVideoTracks();
      if (tracks.length > 0) {
        videoTrack = tracks[0];
        videoTrack.onmute = () => {
          setViolationCount(v => v + 1);
          setFlagged(true);
          logViolation('camera_muted', 'Camera was muted from browser/OS settings');
          setProctorAlert('⚠️ VIOLATION: Your camera was turned off!\nPlease re-enable your camera to continue the test.');
        };
        videoTrack.onended = () => {
          setViolationCount(v => v + 1);
          setFlagged(true);
          logViolation('camera_disabled', 'Camera stream ended — access revoked');
          setProctorAlert('⚠️ VIOLATION: Camera access was revoked!\nThe test cannot continue without an active camera.');
        };
      }
    }

    // 2. Proctoring microphone stream (separate from pre-test check)
    const initProcMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        procMicStreamRef.current = stream;
        const audioTrack = stream.getAudioTracks()[0];

        audioTrack.onmute = () => {
          const now = Date.now();
          if (now - lastMicViolRef.current > 15000) {
            lastMicViolRef.current = now;
            setViolationCount(v => v + 1);
            setFlagged(true);
            logViolation('mic_muted', 'Microphone was muted during test');
            setProctorAlert('⚠️ VIOLATION: Your microphone was muted!\nPlease unmute your microphone immediately.');
          }
        };
        audioTrack.onended = () => {
          const now = Date.now();
          if (now - lastMicViolRef.current > 15000) {
            lastMicViolRef.current = now;
            setViolationCount(v => v + 1);
            setFlagged(true);
            logViolation('mic_disabled', 'Microphone access was revoked during test');
            setProctorAlert('⚠️ VIOLATION: Microphone access was revoked!\nPlease re-enable microphone access.');
          }
        };

        // Inject VAD (Voice Activity Detection) using locally hosted files to completely bypass CORS / CDN issues
        if (!(window as any).vad) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/vad/ort.js';
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
          });
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/vad/bundle.min.js';
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Initialize VAD model for detecting human speech
        const vadModule = (window as any).vad;

        // Configure ONNX runtime to fetch WebAssembly files from our local /vad/ folder
        if ((window as any).ort) {
          (window as any).ort.env.wasm.wasmPaths = '/vad/';
          (window as any).ort.env.wasm.numThreads = 1;
        }

        let vadInstance: any = null;
        try {
          vadInstance = await vadModule.MicVAD.new({
            stream: stream,
            model: 'v5',
            baseAssetPath: '/vad/',
            onnxWASMBasePath: '/vad/',
            onSpeechStart: () => {
              if (!active) return;
              if (proctorAlertRef.current !== null) return; // Skip if alert is already showing
              const now = Date.now();
              if (now - lastLoudViolRef.current > 20000) {
                lastLoudViolRef.current = now;
                setViolationCount(v => v + 1);
                setFlagged(true);
                logViolation('human_speech', 'Human speech detected by VAD model');
                setProctorAlert('⚠️ VIOLATION: Human speech detected!\nPlease remain silent and do not communicate during the test.');
              }
            }
          });
          vadInstance.start();
        } catch (e) {
          console.error('VAD Init Error:', e);
        }

        // Continuous audio volume monitoring (solely for OS-level mute / 0-volume detection)
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let silenceStart = 0;

        const checkVolume = () => {
          if (!active) return;
          if (proctorAlertRef.current !== null) {
            silenceStart = 0; // reset silence timer while alert is showing
            if (active) micRaf = requestAnimationFrame(checkVolume);
            return;
          }
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const avg = sum / bufferLength;

          if (avg === 0) {
            if (silenceStart === 0) silenceStart = Date.now();
            else if (Date.now() - silenceStart > 15000) { // 15s of absolute 0 volume
              setViolationCount(v => v + 1);
              setFlagged(true);
              logViolation('mic_silent', 'Microphone completely silent for over 15s — possible hardware mute');
              setProctorAlert('⚠️ VIOLATION: Microphone is completely silent!\nPlease ensure it is not hardware muted.');
              silenceStart = Date.now();
            }
          } else {
            silenceStart = 0;
          }
          if (active) micRaf = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (e) {
        console.error('Proctoring mic init error:', e);
      }
    };
    initProcMic();

    // 3. Gaze/Face tracking loop — using BlazeFace for much better reliability
    let blazeModel: any = null;
    faceStatusRef.current = 'Loading face model...';
    updateAiStatus();

    const loadGazeModel = async () => {
      try {
        await tf.ready();
        // Load blazeface from CDN to avoid bundler issues
        if (!(window as any).blazeface) {
          (window as any).tf = tf; // BlazeFace needs global tf.loadGraphModel
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface';
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        blazeModel = await (window as any).blazeface.load();
        faceStatusRef.current = 'Face model ready — scanning...';
        updateAiStatus();
        console.log('BlazeFace model loaded');
      } catch (e: any) {
        console.error('BlazeFace load error:', e);
        faceStatusRef.current = '⚠️ Face Model Error';
        updateAiStatus();
      }
    };
    loadGazeModel();

    const gazeLoop = async () => {
      if (!active) return;
      if (proctorAlertRef.current !== null) {
        if (active) setTimeout(gazeLoop, 500);
        return;
      }
      const vid = camVideoRef.current;

      if (!blazeModel || !vid || vid.readyState < 2 || vid.videoWidth === 0) {
        if (!blazeModel) {
          faceStatusRef.current = 'Loading face model...';
        } else {
          faceStatusRef.current = 'Waiting for camera...';
        }
        updateAiStatus();
        if (active) setTimeout(gazeLoop, 500);
        return;
      }

      try {
        const faces = (await blazeModel.estimateFaces(vid, false)) || [];
        const now = Date.now();

        if (faces.length === 0) {
          faceStatusRef.current = '⚠️ No face detected';
          gazeStatusRef.current = '';
          updateAiStatus();

          // Track when face FIRST disappeared
          if (faceGoneAtRef.current === 0) faceGoneAtRef.current = now;

          // Fire violation after 4 continuous seconds with no face
          if (now - faceGoneAtRef.current > 4000) {
            faceGoneAtRef.current = now; // reset so it repeats every 4s if still absent
            setViolationCount(v => v + 1);
            setFlagged(true);
            logViolation('no_face', 'No face detected in camera view');
            setProctorAlert('⚠️ VIOLATION: Face not detected!\nPlease ensure your face is fully visible in the camera.');
          }
        } else if (faces.length > 1) {
          faceGoneAtRef.current = 0; // face is present, reset absence timer
          faceStatusRef.current = `⚠️ ${faces.length} people detected!`;
          gazeStatusRef.current = '';
          updateAiStatus();

          // Multiple faces — fire immediately (cooldown 8s)
          if (now - lastMultiFaceViolRef.current > 8000) {
            lastMultiFaceViolRef.current = now;
            setViolationCount(v => v + 1);
            setFlagged(true);
            logViolation('multiple_faces', `${faces.length} faces detected in frame`);
            setProctorAlert(`⚠️ VIOLATION: ${faces.length} people detected!\nOnly the candidate is allowed in front of the camera.`);
          }
        } else {
          faceGoneAtRef.current = 0; // face is visible — reset absence timer
          faceStatusRef.current = '✅ Face OK';

          const face = faces[0];
          const landmarks = face.landmarks as number[][];
          // BlazeFace landmarks: 0:rightEye, 1:leftEye, 2:nose, 3:mouth, 4:rightEar, 5:leftEar
          if (landmarks && landmarks.length >= 3) {
            const rightEye = landmarks[0];
            const leftEye = landmarks[1];
            const nose = landmarks[2];

            // Compute head pose (looking left/right)
            const eyeDist = Math.abs(leftEye[0] - rightEye[0]) || 1;
            const noseRatio = (nose[0] - Math.min(leftEye[0], rightEye[0])) / eyeDist;

            // Looking away thresholds
            const lookingAway = noseRatio < 0.1 || noseRatio > 0.9;

            if (lookingAway) {
              gazeStatusRef.current = '⚠️ Looking away';
              if (now - lastGazeViolRef.current > 3000) {
                lastGazeViolRef.current = now;
                setViolationCount(v => v + 1);
                const dir = noseRatio < 0.1 ? 'right' : 'left';
                logViolation('head_turned', `Head turned ${dir} (ratio=${noseRatio.toFixed(2)})`);
                setProctorAlert(`⚠️ VIOLATION: Head turned away!\nPlease look at the screen.`);
              }
            } else {
              gazeStatusRef.current = '';
              lastGazeViolRef.current = now; // reset if looking forward
            }
          } else {
            gazeStatusRef.current = '';
          }
          updateAiStatus();
        }
      } catch (e) {
        console.error('Gaze detection error:', e);
      }

      if (active) setTimeout(gazeLoop, 500);
    };
    gazeLoop();

    // 4. Object detection (COCO-SSD) for faces and devices
    let cocoModel: cocoSsd.ObjectDetection | null = null;
    const loadObjModel = async () => {
      try {
        await tf.ready();
        cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      } catch (e) {
        console.error('Coco-SSD load error:', e);
      }
    };
    loadObjModel();

    const objLoop = async () => {
      if (!active) return;
      if (proctorAlertRef.current !== null) {
        if (active) setTimeout(objLoop, 1000);
        return;
      }
      const vid = camVideoRef.current;

      if (!vid || vid.readyState < 2 || vid.videoWidth === 0) {
        if (active) setTimeout(objLoop, 1000);
        return;
      }

      if (!cocoModel) {
        if (active) setTimeout(objLoop, 1000);
        return;
      }

      try {
        const predictions = await cocoModel.detect(vid);

        // Unauthorized device detection
        const device = predictions.find(p => p.class === 'cell phone' || p.class === 'laptop' || p.class === 'remote');
        
        const now = Date.now();
        if (device) {
          deviceStatusRef.current = `⚠️ Device: ${device.class}`;
          updateAiStatus();
          if (now - lastDeviceViolRef.current > 10000) {
            lastDeviceViolRef.current = now;
            setViolationCount(v => v + 1);
            setFlagged(true);
            logViolation('device_detected', `Unauthorized device detected: ${device.class}`);
            setProctorAlert(`⚠️ VIOLATION: Unauthorized device (${device.class}) detected!`);
          }
        } else {
          deviceStatusRef.current = '';
          updateAiStatus();
        }
      } catch (e) {
        console.error('Object detection error:', e);
      }

      if (active) setTimeout(objLoop, 3000);
    };
    setTimeout(objLoop, 5000); // warm-up

    // 5. OCR Screen Monitoring (Tesseract.js)
    let ocrActive = true;
    const screenOcrLoop = async () => {
      if (!active || !ocrActive || !screenStreamRef.current) return;
      if (proctorAlertRef.current !== null) {
        if (active && ocrActive) setTimeout(screenOcrLoop, 5000);
        return;
      }
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

          // Run OCR
          const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
          const lowerText = text.toLowerCase();

          const forbidden = ['anydesk', 'teamviewer', 'chatgpt', 'discord', 'skype', 'whatsapp', 'telegram'];
          const matched = forbidden.find(app => lowerText.includes(app));

          if (matched) {
            const now = Date.now();
            if (now - lastScreenViolRef.current > 20000) {
              lastScreenViolRef.current = now;
              setViolationCount(v => v + 1);
              setFlagged(true);
              logViolation('unauthorized_app', `Unauthorized app/text detected on screen: ${matched}`);
              setProctorAlert(`⚠️ VIOLATION: Unauthorized application detected on your screen: ${matched}!`);
            }
          }
        }

        video.pause();
        video.srcObject = null;
      } catch (e) {
        console.error('OCR error:', e);
      }

      if (active && ocrActive) setTimeout(screenOcrLoop, 15000); // Check every 15s (OCR is heavy)
    };
    setTimeout(screenOcrLoop, 10000);

    return () => {
      active = false;
      ocrActive = false;
      if (micRaf) cancelAnimationFrame(micRaf);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(console.error);
      if (procMicStreamRef.current) {
        procMicStreamRef.current.getTracks().forEach(t => t.stop());
        procMicStreamRef.current = null;
      }
      if (videoTrack) { videoTrack.onmute = null; videoTrack.onended = null; }
    };
  }, [started, completed, logViolation]);

  // ─────────────────────────────────────────────────────────────────────────
  // Pre-test hardware check functions
  // ─────────────────────────────────────────────────────────────────────────
  async function checkCamera() {
    setCamCheck({ status: 'checking' });
    try {
      // Stop any previous stream first
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach(t => t.stop());
        camStreamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      camStreamRef.current = stream;  // persist for live test
      setCamStream(stream);           // triggers preview modal to open
      setShowCamModal(true);
      setCamCheck({ status: 'idle' });
    } catch (err: any) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setCamCheck({
        status: 'fail',
        error: denied
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Camera not detected or is already in use by another application.',
      });
    }
  }

  function confirmCamera() {
    // Close the modal — DO NOT stop the stream. camStreamRef.current keeps it
    // alive for the live test proctoring.
    setShowCamModal(false);
    setCamStream(null);  // just hides the modal trigger; stream lives in camStreamRef
    setCamCheck({ status: 'ok' });
  }

  function rejectCamera() {
    // User says camera doesn't work — stop everything
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
    setCamStream(null);
    setShowCamModal(false);
    setCamCheck({
      status: 'fail',
      error: 'Camera check failed. Open your camera shutter, remove any cover, and try again.',
    });
  }

  async function checkMic() {
    setMicCheck({ status: 'checking' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      setMicCheck({ status: 'idle' });
    } catch (err: any) {
      setMicCheck({
        status: 'fail',
        error: err?.message?.includes('Permission')
          ? 'Microphone permission denied.'
          : 'Microphone not found or in use by another app.',
      });
    }
  }

  function confirmMic() {
    // Stop mic tracks and close modal — mic is only needed for the pre-test check
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      setMicStream(null);
    }
    setMicCheck({ status: 'ok' });
  }

  function rejectMic() {
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      setMicStream(null);
    }
    setMicCheck({
      status: 'fail',
      error: 'Microphone check failed. Please ensure your microphone is unmuted and working.',
    });
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
          error: `You selected a "${settings.displaySurface}". Please choose "Entire Screen" from the picker.`,
        });
        return;
      }

      // Store the stream for live OCR proctoring
      screenStreamRef.current = stream;

      // If the user manually stops sharing the screen from the browser UI
      track.onended = () => {
        if (!completed) {
          setViolationCount(v => v + 1);
          setFlagged(true);
          logViolation('screen_share_stopped', 'Candidate stopped sharing screen');
          setProctorAlert('⚠️ VIOLATION: Screen sharing was stopped!\nYou must share your entire screen during the test.');
        }
      };

      setScreenCheck({ status: 'ok' });
    } catch (err: any) {
      setScreenCheck({
        status: 'fail',
        error: 'Screen share was cancelled or denied. You must share your entire screen.',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Start assessment
  // ─────────────────────────────────────────────────────────────────────────
  async function handleStart() {
    try { await document.documentElement.requestFullscreen(); } catch { /* ignore */ }

    try {
      const res = await moodleCall<any>('local_aurahr_academia_log_event', {
        assessmentid: assessment?.id ?? 0,
        jobid: jobId,
        event_type: 'test_start',
        details: 'Candidate started proctored test',
      });
      if (res?.sessionid) sessionIdRef.current = res.sessionid;
    } catch (err) {
      console.error('Failed to log test start', err);
    }

    // Save initial state to local storage
    if (jobId) {
      const storageKey = `aurahr_test_state_${jobId}`;
      const stateToSave = {
        started: true,
        completed: false,
        startTime: Date.now(),
        currentQ: 0,
        answers: {},
        violationCount: 0,
        flagged: false,
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    }

    setStarted(true);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Submit assessment — AI evaluation then Moodle submit
  // ─────────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!assessment || isEndingRef.current) return;
    isEndingRef.current = true;
    setSubmitting(true);

    try {
      const formattedAnswers = questions.map((q, i) => ({
        question: q.text || q.question,
        candidateAnswer: answers[i] || 'No answer provided',
      }));

      let aiScore = 0;
      try {
        const aiRes = await fetch('/api/academia/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions, answers: formattedAnswers }),
        });
        if (aiRes.ok) {
          const json = await aiRes.json();
          aiScore = json.score ?? 0;
        }
      } catch (aiErr) {
        console.error('AI evaluation failed, defaulting score to 0:', aiErr);
      }

      await moodleCall<any>('local_aurahr_academia_submit_test', {
        candidateId: 0,
        jobId,
        score: aiScore,
      });

      if (document.fullscreenElement) await document.exitFullscreen();

      // Stop camera stream
      if (camStream) camStream.getTracks().forEach(t => t.stop());

      // Clear local storage
      if (jobId) {
        localStorage.removeItem(`aurahr_test_state_${jobId}`);
      }

      setFinalScore(aiScore);
      setCompleted(true);
    } catch (err: any) {
      console.error(err);
      alert('Error submitting test: ' + (err.message || String(err)));
      isEndingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render helper — CheckButton
  // ─────────────────────────────────────────────────────────────────────────
  function CheckButton({
    label, status, error, icon: Icon, iconFail: IconFail, onClick,
  }: {
    label: string; status: CheckStatus; error?: string;
    icon: any; iconFail: any; onClick: () => void;
  }) {
    const bg =
      status === 'ok' ? 'bg-emerald-50 border-emerald-300' :
        status === 'fail' ? 'bg-red-50 border-red-300' :
          status === 'checking' ? 'bg-amber-50 border-amber-300' :
            'bg-white border-ink/10 hover:bg-ink/5';
    const textColor =
      status === 'ok' ? 'text-emerald-700' :
        status === 'fail' ? 'text-red-600' :
          status === 'checking' ? 'text-amber-700' : 'text-ink/60';
    const IconComp = status === 'fail' ? IconFail : Icon;
    return (
      <button onClick={onClick} disabled={status === 'checking'}
        className={`p-5 rounded-2xl border flex flex-col items-center gap-2 transition-all w-full ${bg}`}
      >
        {status === 'checking'
          ? <Loader2 size={26} className="animate-spin text-amber-600" />
          : <IconComp size={26} className={textColor} />
        }
        <span className={`text-sm font-semibold text-center ${textColor}`}>
          {status === 'idle' ? label : ''}
          {status === 'checking' ? 'Checking…' : ''}
          {status === 'ok' ? label.replace('Check ', '') + ' ✓' : ''}
          {status === 'fail' ? 'Retry' : ''}
        </span>
        {error && status === 'fail' && (
          <p className="text-xs text-red-500 text-center leading-snug">{error}</p>
        )}
      </button>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // States: loading / completed / pre-test / active test
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex justify-center items-center h-[70vh]">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  if (disqualified) return (
    <div className="fixed inset-0 z-[10000] bg-red-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
      <div className="bg-white rounded-3xl p-10 max-w-lg shadow-2xl border-4 border-red-500 scale-in-center">
        <ShieldAlert size={80} className="text-red-500 mx-auto mb-6 animate-bounce" />
        <h2 className="text-3xl font-bold text-red-600 mb-4">Assessment Terminated</h2>
        <p className="text-ink text-lg font-semibold mb-8">
          You have been disqualified from this assessment due to repeated proctoring violations (5 or more infractions recorded).
        </p>
        <p className="text-ink/50 text-sm mb-8">
          This event has been logged and your application has been marked as rejected.
        </p>
        <button
          onClick={() => window.location.href = '/candidate'}
          className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-red-500/30"
        >
          Exit Assessment
        </button>
      </div>
    </div>
  );

  if (!assessment) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bento-card p-12 text-center max-w-lg">
        <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold text-ink mb-2">Assessment Unavailable</h1>
        <p className="text-ink/60 text-sm">No active assessment is scheduled for this job yet. Check back later.</p>
      </div>
    </div>
  );

  // Check schedule/live status before starting the test
  if (!started) {
    const now = Math.floor(Date.now() / 1000);
    const isScheduled = !!(assessment.start_time > 0 && ['scheduled', 'active', 'ended'].includes(assessment.status));
    const isLive = !!(isScheduled && now >= assessment.start_time && now <= assessment.end_time);

    if (!isScheduled) return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bento-card p-12 text-center max-w-lg">
          <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold text-ink mb-2">Assessment Not Scheduled</h1>
          <p className="text-ink/60 text-sm">The assessment has not been scheduled yet. Please check back later.</p>
          <button onClick={() => window.location.href = '/candidate'}
            className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );

    if (!isLive) {
      const startStr = new Date(assessment.start_time * 1000).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const endStr = new Date(assessment.end_time * 1000).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const hasEnded = now > assessment.end_time;

      return (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="bento-card p-12 text-center max-w-lg">
            <Clock size={48} className="text-amber-500 mx-auto mb-4" />
            <h1 className="font-serif text-2xl font-bold text-ink mb-2">
              {hasEnded ? 'Assessment Ended' : 'Assessment Not Live'}
            </h1>
            <p className="text-ink/60 text-sm mb-4">
              {hasEnded 
                ? 'This assessment has already ended.' 
                : 'This assessment is not live yet.'}
            </p>
            <div className="p-4 bg-ink/5 rounded-xl text-left text-xs space-y-2 mb-6 font-mono text-ink/75">
              <p>Scheduled Start: {startStr}</p>
              <p>Scheduled End: {endStr}</p>
              <p>Current Time: {new Date().toLocaleString('en-IN')}</p>
            </div>
            <button onClick={() => window.location.href = '/candidate'}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-sm"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  if (completed) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 max-w-lg w-full text-center rounded-3xl border shadow-sm"
        >
          {/* Icon */}
          <CheckCircle size={72} className="text-emerald-500 mx-auto mb-4" />

          <h1 className="font-serif text-2xl font-bold text-ink mb-1">Assessment Submitted!</h1>
          <p className="text-ink/50 text-sm mb-7">Your answers have been recorded and evaluated by AI.</p>

          {/* Score card */}
          <div className="mb-5 p-5 rounded-2xl border bg-ink/3 border-ink/8">
            <p className="text-xs font-bold uppercase tracking-wider text-ink/40 mb-1">Your AI Score</p>
            <p className="font-mono text-5xl font-bold text-ink">
              {finalScore !== null ? `${finalScore}%` : '—'}
            </p>
          </div>

          {/* Status — organizer decides who advances */}
          <div className="mb-5 p-4 rounded-2xl border bg-amber-50 border-amber-200 text-left">
            <p className="text-sm font-bold text-amber-700 mb-1">⏳ Awaiting Organizer Decision</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              The organizer will review all candidate scores and select the top performers for the interview round. You'll be notified of the outcome on your dashboard.
            </p>
          </div>

          {/* Violations */}
          {violationCount > 0 && (
            <div className="mb-5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-semibold flex items-center gap-2 justify-center">
              <ShieldAlert size={16} />
              {violationCount} proctoring violation{violationCount !== 1 ? 's' : ''} recorded
            </div>
          )}

          <button onClick={() => window.location.href = '/candidate/applications'}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
          >
            View My Applications
          </button>
        </motion.div>
      </div>
    );
  }


  // ─── Pre-test system check screen ──────────────────────────────────────────
  if (!started) {
    const allChecksPass =
      camCheck.status === 'ok' &&
      micCheck.status === 'ok' &&
      screenCheck.status === 'ok';

    return (
      <div className="max-w-3xl mx-auto pt-10 px-4">
        {/* Camera Preview Modal */}
        {showCamModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="font-serif text-lg font-bold text-ink mb-1 text-center">Camera Check</h3>
              <p className="text-sm text-ink/50 text-center mb-4">
                Make sure your face is clearly visible and well-lit.
              </p>

              {/* Live video */}
              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative mb-4">
                <video
                  autoPlay muted playsInline
                  ref={previewVideoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                </div>
              </div>

              {/* Face detection status */}
              {(() => {
                const bright = camBrightness !== null && camBrightness > 0;
                const checking = camBrightness === null;
                return (
                  <div className={`mb-5 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold
                    ${checking ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                      bright ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                        'bg-red-50 border border-red-200 text-red-700'}`}
                  >
                    {checking && <Loader2 size={16} className="animate-spin shrink-0" />}
                    {!checking && bright && <span className="text-lg">✅</span>}
                    {!checking && !bright && <span className="text-lg">🚫</span>}
                    <span>
                      {checking ? 'Analysing camera feed for face…' :
                        camBrightness === 100 ? 'Face detected! Camera is working correctly.' :
                          camBrightness === -2 ? 'Multiple people detected! Only you should be in frame.' :
                            'No face detected. Ensure your face is visible and well-lit.'}
                    </span>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button onClick={rejectCamera}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 border-ink/10 text-ink/60 hover:bg-ink/5 transition-colors"
                >
                  Cancel
                </button>
                <button onClick={confirmCamera}
                  disabled={!(camBrightness !== null && camBrightness > 0)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors shadow-sm
                    ${(camBrightness !== null && camBrightness > 0)
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-ink/10 text-ink/30 cursor-not-allowed'}`}
                >
                  {camBrightness === null ? 'Checking…' :
                    camBrightness === 100 ? 'Confirm Camera ✓' :
                      camBrightness === -2 ? 'Multiple Faces' :
                        'Face not detected'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Mic Preview Modal */}
        {micStream && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="font-serif text-lg font-bold text-ink mb-1 text-center">Microphone Check</h3>
              <p className="text-sm text-ink/50 text-center mb-6">
                Please say something out loud to test your microphone.
              </p>

              {/* Volume indicator */}
              <div className="bg-ink/5 rounded-full h-8 mb-6 overflow-hidden relative flex items-center px-2">
                <div
                  className={`absolute left-0 top-0 bottom-0 transition-all duration-75 ${micPass ? 'bg-emerald-400' : 'bg-blue-400'}`}
                  style={{ width: `${Math.min(100, micVolume * 2)}%` }}
                />
                <div className="z-10 w-full flex justify-between text-[10px] font-bold text-ink/40 uppercase">
                  <span>Quiet</span>
                  <span>Loud</span>
                </div>
              </div>

              {/* Status */}
              <div className={`mb-6 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold
                  ${micPass ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border border-amber-200 text-amber-700'}`}
              >
                {!micPass && <Loader2 size={16} className="animate-spin shrink-0" />}
                {micPass && <span className="text-lg">✅</span>}
                <span>{micPass ? 'Audio detected! Microphone is working.' : 'Listening for audio...'}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={rejectMic}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 border-ink/10 text-ink/60 hover:bg-ink/5 transition-colors"
                >
                  Cancel
                </button>
                <button onClick={confirmMic} disabled={!micPass}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors shadow-sm
                    ${micPass ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-ink/10 text-ink/30 cursor-not-allowed'}`}
                >
                  {micPass ? 'Confirm Mic ✓' : 'Speak to Continue'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* System Check Card */}
        <div className="bg-white rounded-3xl border p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-bold mb-2">System Check</h1>
          <p className="text-ink/60 mb-8">
            Verify your hardware before starting the proctored assessment.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <CheckButton
              label="Check Camera" status={camCheck.status} error={camCheck.error}
              icon={Camera} iconFail={VideoOff} onClick={checkCamera}
            />
            <CheckButton
              label="Check Mic" status={micCheck.status} error={micCheck.error}
              icon={Mic} iconFail={MicOff} onClick={checkMic}
            />
            <CheckButton
              label="Share Screen" status={screenCheck.status} error={screenCheck.error}
              icon={Monitor} iconFail={MonitorOff} onClick={checkScreen}
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!allChecksPass}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all
              ${allChecksPass
                ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                : 'bg-ink/5 text-ink/40 cursor-not-allowed'}`}
          >
            {allChecksPass ? 'Start Assessment' : 'Complete all checks to continue'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Active Test UI ─────────────────────────────────────────────────────────
  const q = questions[currentQ];
  const isLast = currentQ === questions.length - 1;
  const isMCQ = q?.options && q.options.length > 0;

  return (
    <div className="fixed inset-0 bg-cream z-50 overflow-y-auto flex flex-col">
      {/* Proctoring Violation Alert Modal */}
      {proctorAlert && (
        <div className="fixed inset-0 z-[1000] bg-red-900/40 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md shadow-2xl border-4 border-red-500 scale-in-center">
            <AlertTriangle size={64} className="text-red-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-red-600 mb-4">Proctoring Alert</h2>
            <p className="text-ink text-lg font-medium whitespace-pre-wrap mb-8">
              {proctorAlert.replace('⚠️ VIOLATION:', '').trim()}
            </p>
            <button
              onClick={() => setProctorAlert(null)}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-red-500/30"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Lock Overlay */}
      {forceFullscreen && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-white rounded-3xl p-10 max-w-lg shadow-2xl">
            <MonitorOff size={64} className="text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-ink mb-3">Full Screen Required</h2>
            <p className="text-ink/60 mb-8">
              You have exited full-screen mode, which is a proctoring violation.
              You must remain in full-screen to continue this assessment.
            </p>
            <button
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen();
                  setForceFullscreen(false);
                } catch (e) {
                  alert("Failed to enter full screen. Please check browser settings.");
                }
              }}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-colors"
            >
              Return to Full Screen
            </button>
          </div>
        </div>
      )}

      <AssessmentHeader title={assessment?.title || 'Technical Assessment'} timeLeft={timeLeft} totalTime={totalTime} />
      <ViolationToast count={violationCount} flagged={flagged} />

      <div className="flex-1 flex gap-6 max-w-5xl mx-auto w-full p-6 pt-4">
        {/* Left: question nav + camera */}
        <div className="w-56 shrink-0 space-y-4">
          {/* Violation badge */}
          {violationCount > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold
                ${flagged ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
            >
              <ShieldAlert size={14} />
              {violationCount} Violation{violationCount !== 1 ? 's' : ''}
            </div>
          )}

          {/* Question grid */}
          <div className="bento-card p-4">
            <p className="text-[10px] font-bold uppercase text-ink/40 mb-3">Questions</p>
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentQ(idx)}
                  className={`w-10 h-10 rounded-xl font-mono text-sm font-bold flex items-center justify-center transition-colors
                    ${currentQ === idx
                      ? 'bg-blue-500 text-white ring-2 ring-blue-500 ring-offset-2'
                      : answers[idx]
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-ink/5 text-ink/40 hover:bg-ink/10'}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Live camera feed */}
          <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative shadow-inner">
            <video ref={camVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-md text-[10px] text-white font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </div>
            <div className="absolute bottom-2 left-2 right-2 bg-black/70 px-2 py-1 rounded text-[9px] text-white font-mono">
              {aiDetectionStatus}
            </div>
            {debugErrors.length > 0 && (
              <div className="absolute top-10 left-2 right-2 bg-red-900/80 px-2 py-1 rounded text-[9px] text-white font-mono max-h-24 overflow-y-auto">
                {debugErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </div>
        </div>

        {/* Right: question + answer */}
        <div className="flex-1 flex flex-col">
          <div className="bento-card p-8 flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-ink/5 text-ink/50 rounded-lg text-xs font-bold font-mono">
                Q{currentQ + 1} / {questions.length}
              </span>
              <span className="text-sm text-ink/40 font-medium capitalize">
                {isMCQ ? 'Multiple Choice' : 'Descriptive'}
              </span>
            </div>

            <h2 className="text-xl font-medium text-ink mb-8 leading-relaxed">
              {q?.text || q?.question}
            </h2>

            <div className="space-y-3 flex-1">
              {isMCQ ? (
                q.options.map((opt: string, idx: number) => (
                  <button key={idx}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: opt }))}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all
                      ${answers[currentQ] === opt
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-ink/5 hover:border-ink/15 hover:bg-ink/5'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                          ${answers[currentQ] === opt ? 'border-blue-500' : 'border-ink/20'}`}
                      >
                        {answers[currentQ] === opt && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                      </div>
                      <span className={`text-base ${answers[currentQ] === opt ? 'text-blue-900 font-medium' : 'text-ink/80'}`}>
                        {opt}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <textarea
                  value={answers[currentQ] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [currentQ]: e.target.value }))}
                  placeholder="Type your answer here…"
                  className="w-full h-48 bg-white border border-ink/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-ink/10 flex items-center justify-between">
              <button
                onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                disabled={currentQ === 0}
                className="px-5 py-2.5 rounded-xl font-semibold text-ink/60 hover:bg-ink/5 hover:text-ink disabled:opacity-30 transition-colors"
              >
                Previous
              </button>

              {isLast ? (
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-8 py-2.5 bg-emerald-500 text-white rounded-xl font-bold shadow-md hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Submit Assessment
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-8 py-2.5 bg-ink text-cream rounded-xl font-semibold shadow-md hover:bg-ink/90 transition-colors"
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
