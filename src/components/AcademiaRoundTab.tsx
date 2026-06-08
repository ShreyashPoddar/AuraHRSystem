'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Settings, Play, Square, Loader2, Sparkles, Calendar, CheckCircle, X } from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

interface AcademiaRoundTabProps {
  jobId: number;
  aiPassCount?: number | null;
}

interface Question {
  text: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: string;
}

interface Assessment {
  exists: boolean;
  id: number;
  title: string;
  num_questions: number;
  pass_percentage?: number;
  questions?: Question[];
  status: string;
  start_time?: number;
  end_time?: number;
  duration_mins?: number;
  candidates?: any[];
}

export default function AcademiaRoundTab({ jobId }: AcademiaRoundTabProps) {
  const [passCount, setPassCount] = useState<number | ''>(10);
  const [questionCount, setQuestionCount] = useState<number | ''>(20);
  const [durationMins, setDurationMins] = useState<number | ''>(60);
  const [description, setDescription] = useState('Loading job details...');
  const [generating, setGenerating] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [testLive, setTestLive] = useState(false);
  const [aiPassCount, setAiPassCount] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  // Scheduling State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [isRegeneratingMode, setIsRegeneratingMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (assessment && assessment.start_time && assessment.end_time) {
      const now = Math.floor(Date.now() / 1000);
      const isLive = now >= assessment.start_time && now <= assessment.end_time && assessment.status !== 'completed';
      setTestLive(isLive);
    } else {
      setTestLive(false);
    }
  }, [assessment, currentTime]);

  const handleStartTest = async () => {
    if (!assessment) return;
    try {
      const nowTs = Math.floor(Date.now() / 1000);
      const duration = assessment.duration_mins || 60;
      const endTs = nowTs + duration * 60;

      await moodleCall<any>('local_aurahr_academia_schedule_test', {
        assessmentid: assessment.id,
        start_time: nowTs,
        end_time: endTs
      });

      const assessData = await moodleCall<Assessment>('local_aurahr_academia_get_assessment', { assessmentid: assessment.id, jobid: jobId });
      setAssessment(assessData);
      setTestLive(true);
    } catch (err) {
      console.error('Failed to start test immediately:', err);
      alert('Failed to start the test immediately.');
    }
  };

  const handleEndTest = async () => {
    if (!assessment) return;
    const confirmEnd = window.confirm("Are you sure you want to end the test early? Candidates will no longer be able to start or continue the test.");
    if (!confirmEnd) return;

    try {
      const nowTs = Math.floor(Date.now() / 1000);
      await moodleCall<any>('local_aurahr_academia_schedule_test', {
        assessmentid: assessment.id,
        start_time: assessment.start_time || nowTs - 3600,
        end_time: nowTs
      });

      const assessData = await moodleCall<Assessment>('local_aurahr_academia_get_assessment', { assessmentid: assessment.id, jobid: jobId });
      setAssessment(assessData);
      setTestLive(false);
    } catch (err) {
      console.error('Failed to end test early:', err);
      alert('Failed to end the test early.');
    }
  };

  const toLocalISOString = (ts: number) => {
    const date = new Date(ts * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleOpenReschedule = () => {
    if (assessment?.start_time && assessment?.end_time) {
      setStartDate(toLocalISOString(assessment.start_time));
      setEndDate(toLocalISOString(assessment.end_time));
    } else {
      setStartDate('');
      setEndDate('');
    }
    setShowScheduleModal(true);
  };


  useEffect(() => {
    async function load() {
      try {
        const jobData = await moodleCall<any>('local_aurahr_jobs_get_job', { jobid: jobId });
        if (jobData.jd_analysis) {
          const mustHave = JSON.parse(jobData.jd_analysis.must_have || '[]');
          const goodToHave = JSON.parse(jobData.jd_analysis.good_to_have || '[]');
          const suggestedPassCount = Math.max(1, Math.ceil(jobData.jd_analysis.pass_count / 2));
          setAiPassCount(suggestedPassCount);
          setPassCount(suggestedPassCount);
          setDescription(`Automatically generated based on JD Analysis: Focus on ${[...mustHave, ...goodToHave].join(', ')}.`);
        } else {
          setDescription(`Job: ${jobData.title}. Description: ${jobData.description.replace(/(<([^>]+)>)/gi, "").substring(0, 100)}...`);
        }

        const assessData = await moodleCall<Assessment>('local_aurahr_academia_get_assessment', { assessmentid: 0, jobid: jobId });
        if (assessData.exists) {
          setAssessment(assessData);
          setQuestionCount(assessData.num_questions);
          if (assessData.duration_mins) {
            setDurationMins(assessData.duration_mins);
          }
          // Retroactively sync academia scores into the applications table
          // for completed assessments (fixes the missing score bug).
          if (assessData.status === 'completed' && assessData.id) {
            try {
              await moodleCall<any>('local_aurahr_academia_get_results', { assessmentid: assessData.id });
            } catch (_) {
              // Non-fatal – scores will still show on next refresh if sync fails
            }
          }
        }
      } catch (err) {
        console.error('Failed to load academia config:', err);
      }
    }
    load();
  }, [jobId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const createRes = await moodleCall<any>('local_aurahr_academia_create_assessment', {
        jobid: jobId,
        title: `Technical Test - Job ${jobId}`,
        num_questions: Number(questionCount) || 20,
        duration_mins: Number(durationMins) || 60,
        pass_percentage: 60.0,
        ai_topic: description
      });

      await moodleCall<any>('local_aurahr_academia_generate_questions', {
        assessmentid: createRes.id
      });

      const assessData = await moodleCall<Assessment>('local_aurahr_academia_get_assessment', { assessmentid: createRes.id, jobid: jobId });
      setAssessment(assessData);
      setIsRegeneratingMode(false);
    } catch (err) {
      console.error('Failed to generate paper:', err);
      alert('Failed to generate test. Ensure Moodle backend is running and AI API key is valid.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSchedule = async () => {
    if (!assessment || !startDate || !endDate) return;
    setScheduling(true);
    try {
      const startTs = Math.floor(new Date(startDate).getTime() / 1000);
      const endTs = Math.floor(new Date(endDate).getTime() / 1000);

      await moodleCall<any>('local_aurahr_academia_schedule_test', {
        assessmentid: assessment.id,
        start_time: startTs,
        end_time: endTs
      });

      const assessData = await moodleCall<Assessment>('local_aurahr_academia_get_assessment', { assessmentid: assessment.id, jobid: jobId });
      setAssessment(assessData);
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Failed to schedule test:', err);
      alert('Failed to schedule the test.');
    } finally {
      setScheduling(false);
    }
  };

  const handleFinalize = async () => {
    if (!assessment || !passCount) return;
    const confirmFinalize = window.confirm(
      `Are you sure you want to finalize the assessment round? This will promote the top ${passCount} candidate(s) to the interview stage and reject the remaining candidates. This action cannot be undone.`
    );
    if (!confirmFinalize) return;

    setFinalizing(true);
    try {
      await moodleCall<any>('local_aurahr_academia_finalize_assessment', {
        jobid: jobId,
        pass_count: Number(passCount),
      });
      
      const assessData = await moodleCall<Assessment>('local_aurahr_academia_get_assessment', {
        assessmentid: assessment.id,
        jobid: jobId,
      });
      setAssessment(assessData);
      alert('Assessment round successfully finalized! Qualified candidates moved to Interview stage.');
      window.location.reload();
    } catch (err) {
      console.error('Failed to finalize assessment:', err);
      alert('Failed to finalize assessment. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  const isGenerated = !!(assessment && assessment.questions && assessment.questions.length > 0);
  const isScheduled = !!(assessment && assessment.start_time && assessment.start_time > 0);
  const isFinalized = assessment?.status === 'completed';
  const showConfig = (!isGenerated || isRegeneratingMode) && !isFinalized;

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'Pending';
    return new Date(ts * 1000).toLocaleString();
  };

  const isAssessmentOver = !!(assessment && assessment.end_time && currentTime >= assessment.end_time);

  return (
    <div className="space-y-6 max-w-4xl relative">
      {isScheduled && (
        <div className={`bento-card p-6 border-2 ${isFinalized ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gold/30 bg-gold/5'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className={`font-serif text-lg font-semibold flex items-center gap-2 ${isFinalized ? 'text-emerald-700' : 'text-ink'}`}>
                {isFinalized ? <CheckCircle className="text-emerald-600 animate-pulse" size={20} /> : <Settings className="text-gold" size={20} />}
                {isFinalized ? 'Academia Round Finalized' : 'Finalize Academia Round'}
              </h3>
              <p className="text-xs text-ink/60 mt-1">
                {isFinalized
                  ? 'This round has been finalized. Qualified candidates have been promoted to the Interview stage and others have been rejected.'
                  : !isAssessmentOver 
                    ? 'The assessment is not over yet. You can finalize once the scheduled end time has passed.'
                    : 'Review and verify the test results below. Finalizing will promote the top candidate(s) to the Interview stage.'}
              </p>
            </div>
            {!isFinalized && (
              <button
                onClick={handleFinalize}
                disabled={finalizing || !isAssessmentOver}
                className="flex items-center gap-2 px-6 py-3 bg-gold text-white font-bold text-sm rounded-xl shadow-md hover:bg-gold/90 transition-all disabled:opacity-50 shrink-0"
              >
                {finalizing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {finalizing ? 'Finalizing...' : 'FINALIZE ASSESSMENT'}
              </button>
            )}
          </div>
        </div>
      )}
      {showConfig && (
        <div className="bento-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
              <Settings size={18} className="text-sage" />
              Test Configuration
            </h3>
            {isGenerated && (
              <button 
                onClick={() => setIsRegeneratingMode(false)}
                className="text-xs font-semibold text-ink/40 hover:text-ink/70"
              >
                Cancel Editing
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Candidates to Pass</span>
                {aiPassCount && (
                  <span className="text-[9px] uppercase tracking-wider font-bold text-sage bg-sage/10 px-1.5 py-0.5 rounded">
                    AI Suggested: {aiPassCount}
                  </span>
                )}
              </label>
              <input
                type="number"
                value={passCount}
                disabled={isFinalized}
                onChange={(e) => setPassCount(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-2 text-sm text-ink focus:outline-none focus:border-sage/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2">
                Number of Questions
              </label>
              <input
                type="number"
                value={questionCount}
                disabled={isFinalized}
                onChange={(e) => setQuestionCount(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-2 text-sm text-ink focus:outline-none focus:border-sage/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2">
                Test Duration (Minutes)
              </label>
              <input
                type="number"
                value={durationMins}
                disabled={isFinalized}
                onChange={(e) => setDurationMins(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-2 text-sm text-ink focus:outline-none focus:border-sage/50 disabled:opacity-50"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2">
                Paper Description (Prompt)
              </label>
              <textarea
                rows={3}
                value={description}
                disabled={isFinalized}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-sage/50 resize-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors ${
                generating ? 'bg-sage/50 text-white cursor-not-allowed' : 'bg-sage text-white hover:bg-sage/90'
              }`}
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {generating ? 'Drafting Questions via AI...' : (isRegeneratingMode ? 'Regenerate Paper' : 'Generate Paper')}
            </button>
          </div>
        </div>
      )}

      {isGenerated && !isRegeneratingMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card p-6 border-sage/30 bg-sage/5 relative"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold text-sage flex items-center gap-2">
              <BookOpen size={18} />
              Generated Question Bank
            </h3>
            <div className="flex items-center gap-3">
              {!isFinalized && (
                <button
                  onClick={() => setIsRegeneratingMode(true)}
                  className="text-xs font-semibold text-sage/70 hover:text-sage flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-sage/20 shadow-sm transition-colors"
                >
                  <Settings size={12} />
                  Regenerate / Edit Prompt
                </button>
              )}
              <span className="text-xs font-bold bg-sage/20 text-sage px-3 py-1 rounded-full">
                {assessment.questions?.length} Questions
              </span>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {assessment.questions?.map((q, i) => (
              <div key={i} className="bg-white border border-ink/5 p-4 rounded-lg text-sm text-ink/80 flex gap-3">
                <span className="font-mono text-ink/30 font-bold">{i + 1}.</span>
                <div>
                  <p className="font-medium mb-3 text-ink">{q.text}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className={`px-3 py-2 rounded-lg border text-xs ${optIdx === q.correct ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold' : 'border-ink/10 bg-warm-sand/20'}`}>
                        {String.fromCharCode(65 + optIdx)}. {opt}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      q.difficulty === 'hard' ? 'text-rust bg-rust/10' :
                      q.difficulty === 'medium' ? 'text-amber-600 bg-amber-50' :
                      'text-emerald-600 bg-emerald-50'
                    }`}>
                      {q.difficulty}
                    </span>
                    <span className="text-xs text-ink/50 italic">Explanation: {q.explanation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-sage/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!isScheduled ? (
                <button 
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setShowScheduleModal(true);
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-ink bg-white border border-ink/10 px-4 py-2 rounded-xl hover:bg-ink/5 transition-colors"
                >
                  <Calendar size={16} className="text-sage" />
                  Schedule Test
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-sage bg-sage/10 border border-sage/20 px-4 py-2 rounded-xl">
                    <CheckCircle size={16} />
                    Test Scheduled
                  </div>
                  {!isFinalized && (
                    <button 
                      onClick={handleOpenReschedule}
                      className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-white border border-ink/10 px-3 py-1.5 rounded-xl hover:bg-ink/5 transition-colors shadow-sm"
                    >
                      <Calendar size={13} className="text-sage" />
                      Reschedule
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-ink/60">Starts: {formatTimestamp(assessment.start_time)}</span>
                {isScheduled && <span className="text-xs text-ink/40">Ends: {formatTimestamp(assessment.end_time)}</span>}
              </div>
            </div>

            <div className="flex gap-3">
              {!isFinalized && (
                !testLive ? (
                  <button 
                    onClick={handleStartTest}
                    disabled={!isScheduled || currentTime > (assessment?.end_time || 0)}
                    className={`flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl shadow-sm transition-colors ${
                      (!isScheduled || currentTime > (assessment?.end_time || 0)) 
                        ? 'bg-ink/20 cursor-not-allowed text-ink/40' 
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                    title={
                      !isScheduled 
                        ? 'Please schedule the test first' 
                        : (currentTime > (assessment?.end_time || 0)) 
                          ? 'Test has already ended' 
                          : 'Start the live assessment test immediately'
                    }
                  >
                    <Play size={16} />
                    START TEST
                  </button>
                ) : (
                  <button 
                    onClick={handleEndTest}
                    className="flex items-center gap-2 text-sm font-bold text-white bg-rust px-5 py-2.5 rounded-xl hover:bg-rust-dark transition-colors shadow-sm"
                  >
                    <Square size={16} />
                    END TEST
                  </button>
                )
              )}
            </div>
          </div>
          
          {testLive && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-sage/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold uppercase tracking-wider">Live Now</span>
                </div>
                <div className="text-sm font-semibold text-ink/60">
                  Applicants Finished: <span className="text-ink font-mono font-bold">{assessment.candidates?.filter(c => c.status === 'completed').length || 0}</span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Schedule Test Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/20 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-cream rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-ink/10"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-serif text-xl font-bold text-ink">Schedule Test</h3>
                <button onClick={() => setShowScheduleModal(false)} className="text-ink/30 hover:text-ink/60">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-2 text-sm text-ink focus:outline-none focus:border-sage/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-2 text-sm text-ink focus:outline-none focus:border-sage/50"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm border border-ink/10 hover:bg-ink/5 transition-colors text-ink/60"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSchedule}
                  disabled={!startDate || !endDate || scheduling}
                  className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-xl font-semibold text-sm shadow transition-colors ${
                    (!startDate || !endDate || scheduling) ? 'bg-sage/50 text-white cursor-not-allowed' : 'bg-sage text-white hover:bg-sage/90'
                  }`}
                >
                  {scheduling ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
