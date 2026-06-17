'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Clock, AlertTriangle, CheckCircle, XCircle,
  Loader2, Briefcase, ChevronRight, Check, Play, Video
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

interface Application {
  id: number;
  userid: number;
  jobid: number;
  job_title: string;
  job_department: string;
  stage: string;
  jd_score?: number | null;
  academia_score?: number | null;
  interview_score?: number | null;
  overall_score?: number | null;
  malpractice: number;
  timecreated: number;
  job_is_finalized?: number;
  assessment_id?: number;
  assessment_title?: string;
  assessment_start_time?: number;
  assessment_end_time?: number;
  assessment_status?: string;
}

const stageConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  applied:   { label: 'Applied',          icon: <Clock size={14} />,        color: 'bg-blue-500/15 text-blue-700 border-blue-200' },
  screened:  { label: 'Under Review',     icon: <FileText size={14} />,     color: 'bg-amber-500/15 text-amber-700 border-amber-200' },
  academia:  { label: 'Assessment',       icon: <FileText size={14} />,     color: 'bg-purple-500/15 text-purple-700 border-purple-200' },
  interview: { label: 'Interview',        icon: <Briefcase size={14} />,   color: 'bg-gold/15 text-gold border-gold/30' },
  offer:     { label: 'Offer',            icon: <CheckCircle size={14} />, color: 'bg-sage/15 text-sage border-sage/30' },
  selected:  { label: 'Selected',         icon: <CheckCircle size={14} />, color: 'bg-emerald-500/15 text-emerald-700 border-emerald-200' },
  rejected:  { label: 'Rejected',         icon: <XCircle size={14} />,     color: 'bg-rust/15 text-rust border-rust/30' },
};

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'jd' | 'academia' | 'interview' | 'result'>('jd');

  // Job, Assessment, and Interview details for the selected application
  const [job, setJob] = useState<any | null>(null);
  const [assessment, setAssessment] = useState<any | null>(null);
  const [interview, setInterview] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await moodleCall<{ applications: Application[] }>(
          'local_aurahr_jobs_list_applications',
          { jobid: 0 }
        );
        const apps = res.applications || [];
        setApplications(apps);
        if (apps.length > 0) {
          // Smart default: prioritize apps with live/scheduled assessments
          const now = Math.floor(Date.now() / 1000);
          const liveApp = apps.find(a =>
            a.stage === 'academia' &&
            a.assessment_id && a.assessment_id > 0 &&
            a.assessment_start_time && a.assessment_end_time &&
            now >= a.assessment_start_time && now <= a.assessment_end_time &&
            ['scheduled', 'active'].includes(a.assessment_status || '')
          );
          const scheduledApp = apps.find(a =>
            a.stage === 'academia' &&
            a.assessment_id && a.assessment_id > 0 &&
            a.assessment_start_time && a.assessment_start_time > 0 &&
            ['scheduled', 'active'].includes(a.assessment_status || '')
          );
          const bestApp = liveApp || scheduledApp || apps[0];
          setSelectedAppId(bestApp.id);
          // Auto-switch to academia tab if a live/scheduled test is selected
          if (liveApp || scheduledApp) {
            setActiveTab('academia');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedApp = applications.find(a => a.id === selectedAppId);

  useEffect(() => {
    async function loadDetails(app: Application) {
      setDetailsLoading(true);
      try {
        const [jobData, assessData, interviewRes] = await Promise.all([
          moodleCall<any>('local_aurahr_jobs_get_job', { jobid: app.jobid }),
          moodleCall<any>('local_aurahr_academia_get_assessment', { assessmentid: 0, jobid: app.jobid }),
          moodleCall<{ interviews: any[] }>('local_aurahr_interview_list', { jobid: app.jobid, candidateid: app.userid })
        ]);
        setJob(jobData);
        setAssessment(assessData.exists ? assessData : null);
        if (interviewRes.interviews && interviewRes.interviews.length > 0) {
          setInterview(interviewRes.interviews[0]);
        } else {
          setInterview(null);
        }
      } catch (err) {
        console.error('Failed to load application details:', err);
      } finally {
        setDetailsLoading(false);
      }
    }

    if (selectedApp) {
      loadDetails(selectedApp);
    } else {
      setJob(null);
      setAssessment(null);
      setInterview(null);
    }
  }, [selectedAppId, selectedApp]);

  function formatDate(ts: number) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatTimestamp(ts: number) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-4 sm:-m-6 lg:-m-8">
      {/* Side Panel */}
      <div className="w-80 border-r border-ink/10 bg-warm-sand/20 overflow-y-auto flex flex-col shrink-0">
        <div className="p-5 border-b border-ink/10">
          <h2 className="font-serif text-xl font-bold text-ink">My Applications</h2>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {applications.length === 0 ? (
            <p className="text-ink/40 text-sm text-center py-8">No applications found.</p>
          ) : (
            applications.map(app => {
              const isActive = app.id === selectedAppId;
              const isFinalized = !!app.job_is_finalized;
              const displayStage = isFinalized ? app.stage : (app.stage === 'applied' ? 'applied' : 'screened');
              const stage = stageConfig[displayStage] || { label: displayStage, icon: <Clock size={14} />, color: 'bg-ink/5 text-ink/50' };
              const now = Math.floor(Date.now() / 1000);
              const hasLiveTest = !!(app.assessment_id && app.assessment_id > 0 &&
                app.assessment_start_time && app.assessment_end_time &&
                now >= app.assessment_start_time && now <= app.assessment_end_time &&
                ['scheduled', 'active'].includes(app.assessment_status || ''));
              const hasScheduledTest = !!(app.assessment_id && app.assessment_id > 0 &&
                app.assessment_start_time && app.assessment_start_time > 0 &&
                ['scheduled', 'active'].includes(app.assessment_status || '') &&
                app.stage === 'academia');
              
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    isActive ? 'bg-white shadow-md border-transparent ring-1 ring-blue-500/20' : 'hover:bg-white/50 border border-transparent hover:border-ink/5'
                  } ${hasLiveTest && !isActive ? 'ring-1 ring-emerald-400/40 bg-emerald-50/30' : ''}`}
                >
                  <h3 className={`font-sans text-sm font-semibold truncate ${isActive ? 'text-blue-600' : 'text-ink'}`}>
                    {app.job_title}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${stage.color}`}>
                      {stage.icon} {stage.label}
                    </span>
                    <span className="text-[10px] text-ink/40 font-mono">{formatDate(app.timecreated)}</span>
                  </div>
                  {hasLiveTest && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      TEST LIVE NOW
                    </div>
                  )}
                  {!hasLiveTest && hasScheduledTest && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-md">
                      <Play size={10} />
                      Test Scheduled
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-cream/30 min-w-0">
        {selectedApp ? (
          (detailsLoading || !job) ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-ink/10 bg-white">
                <h1 className="font-serif text-2xl font-bold text-ink mb-1">{selectedApp.job_title}</h1>
                <p className="text-sm text-ink/50">{selectedApp.job_department} · Applied on {formatDate(selectedApp.timecreated)}</p>
              </div>

              {/* Top Navigation */}
              <div className="px-6 md:px-8 border-b border-ink/10 flex gap-6 bg-white shrink-0 overflow-x-auto">
                {[
                  { id: 'jd', label: 'JD Parser' },
                  { id: 'academia', label: 'Academia Round' },
                  { id: 'interview', label: 'Interview Panel' },
                  { id: 'result', label: 'Result' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-ink/50 hover:text-ink/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-3xl"
                  >
                    {activeTab === 'jd' && (
                      <div className="space-y-6">
                        <div className="bento-card p-6">
                          <h3 className="font-serif text-lg font-semibold text-ink mb-4">JD Parser Match</h3>
                          <div className="flex items-center gap-6 mb-6">
                            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center rounded-full border-4 border-blue-500 text-2xl font-serif font-bold text-blue-600">
                              {selectedApp.jd_score !== null && selectedApp.jd_score !== undefined ? `${selectedApp.jd_score.toFixed(1)}%` : '—'}
                            </div>
                            <div>
                              {!job?.jd_analysis?.is_finalized ? (
                                <>
                                  <p className="text-sm text-ink/60">Your profile match calculation is complete. Screening results are pending finalization by the recruiter.</p>
                                  <p className="text-sm font-semibold text-amber-600 mt-1 flex items-center gap-1">
                                    <Clock size={16} /> Decision Pending
                                  </p>
                                </>
                              ) : (
                                ['screened', 'academia', 'interview', 'offer', 'selected'].includes(selectedApp.stage) ? (
                                  <>
                                    <p className="text-sm text-ink/60">Your resume matched highly with the core requirements.</p>
                                    <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                                      <Check size={16} /> Shortlisted for next round
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm text-ink/60">Thank you for applying. Unfortunately, your profile did not match the cutoff for this position.</p>
                                    <p className="text-sm font-semibold text-rust mt-1 flex items-center gap-1">
                                      <XCircle size={16} /> Not Shortlisted
                                    </p>
                                  </>
                                )
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                              <p className="text-xs text-ink/40 font-semibold uppercase mb-2">Must Have Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {job?.jd_analysis?.must_have ? (
                                  JSON.parse(job.jd_analysis.must_have).map((skill: string, i: number) => (
                                    <span key={i} className="text-xs px-2 py-1 bg-white rounded-md shadow-sm text-ink">{skill}</span>
                                  ))
                                ) : (
                                  <span className="text-xs text-ink/40 italic">None</span>
                                )}
                              </div>
                            </div>
                            <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                              <p className="text-xs text-ink/40 font-semibold uppercase mb-2">Good to Have Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {job?.jd_analysis?.good_to_have ? (
                                  JSON.parse(job.jd_analysis.good_to_have).map((skill: string, i: number) => (
                                    <span key={i} className="text-xs px-2 py-1 bg-white rounded-md shadow-sm text-ink">{skill}</span>
                                  ))
                                ) : (
                                  <span className="text-xs text-ink/40 italic">None</span>
                                )}
                              </div>
                            </div>
                            <div className="p-4 bg-gold/5 rounded-xl border border-gold/10">
                              <p className="text-xs text-ink/40 font-semibold uppercase mb-2">Future Proof Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {job?.jd_analysis?.future_proof ? (
                                  JSON.parse(job.jd_analysis.future_proof).map((skill: string, i: number) => (
                                    <span key={i} className="text-xs px-2 py-1 bg-white rounded-md shadow-sm text-ink">{skill}</span>
                                  ))
                                ) : (
                                  <span className="text-xs text-ink/40 italic">None</span>
                                )}
                              </div>
                            </div>
                            <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                              <p className="text-xs text-ink/40 font-semibold uppercase mb-2">Team Gap Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {job?.jd_analysis?.team_gap ? (
                                  <span className="text-xs text-ink/50 italic">Feature coming soon</span>
                                ) : (
                                  <span className="text-xs text-ink/40 italic">None</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'academia' && (() => {
                      const isJdFinal = !!job?.jd_analysis?.is_finalized;
                      const isScreenedOrBeyond = ['screened', 'academia', 'interview', 'offer', 'selected', 'rejected'].includes(selectedApp.stage);
                      const now = Math.floor(Date.now() / 1000);
                      const isScheduled = !!(assessment && assessment.start_time > 0 && ['scheduled', 'active', 'ended'].includes(assessment.status));
                      const isTestLive = !!(isScheduled && now >= assessment.start_time && now <= assessment.end_time);
                      const hasScore = selectedApp.academia_score !== null && selectedApp.academia_score !== undefined;

                      // Stage-based result (organizer selects top N — no fixed pass mark)
                      const selectedForInterview = ['interview', 'offer', 'selected'].includes(selectedApp.stage);
                      const rejectedAfterAcademia = selectedApp.stage === 'rejected' && hasScore;
                      const waitingForResult = hasScore && selectedApp.stage === 'academia';

                      // Show result view whenever candidate has completed the test
                      if (hasScore || selectedForInterview) {
                        return (
                          <div className="bento-card p-6">
                            <h3 className="font-serif text-lg font-semibold text-ink mb-4">Academia Round</h3>
                            <div className="space-y-4">
                              {/* Assessment info banner */}
                              {assessment && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-ink">{assessment.title || 'Technical Assessment'}</p>
                                    {assessment.start_time > 0 && (
                                      <p className="text-xs text-ink/50 mt-1">
                                        Held: <span className="font-medium text-ink">{formatTimestamp(assessment.start_time)}</span>
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                    <CheckCircle size={14} /> Submitted
                                  </span>
                                </div>
                              )}

                              {/* Score display */}
                              {hasScore && (
                                <div className="p-4 bg-ink/3 border border-ink/8 rounded-xl flex items-center gap-6">
                                  <div>
                                    <p className="text-xs text-ink/50 mb-0.5">Your AI Score</p>
                                    <p className="font-mono text-3xl font-bold text-ink">{selectedApp.academia_score}%</p>
                                  </div>
                                  <p className="text-xs text-ink/40 leading-relaxed">
                                    The organizer reviews all candidate scores and selects the top performers for the interview round.
                                  </p>
                                </div>
                              )}

                              {/* Result status — driven by organizer action (stage) */}
                              {selectedForInterview ? (
                                <div className="p-5 rounded-2xl border bg-emerald-50 border-emerald-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-bold text-emerald-700">✅ Selected for Interview Round</p>
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">Advancing</span>
                                  </div>
                                  <p className="text-xs text-emerald-600">
                                    🎉 Congratulations! The organizer has selected you as one of the top candidates. You have been advanced to the Interview Round.
                                  </p>
                                </div>
                              ) : rejectedAfterAcademia ? (
                                <div className="p-5 rounded-2xl border bg-red-50 border-red-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-bold text-red-700">❌ Not Selected</p>
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">Closed</span>
                                  </div>
                                  <p className="text-xs text-red-600">
                                    Thank you for attempting the assessment. Unfortunately, you were not among the top candidates selected for the interview round.
                                  </p>
                                </div>
                              ) : waitingForResult ? (
                                <div className="p-5 rounded-2xl border bg-amber-50 border-amber-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-bold text-amber-700">⏳ Awaiting Results</p>
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
                                  </div>
                                  <p className="text-xs text-amber-600">
                                    Your submission is under review. The organizer will finalize the top candidates and you'll be notified of the outcome.
                                  </p>
                                </div>
                              ) : (
                                // selectedForInterview=true but no score — advanced without score (edge case)
                                <div className="p-5 rounded-2xl border bg-emerald-50 border-emerald-200">
                                  <p className="text-sm font-bold text-emerald-700">✅ Advanced to Interview Round</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="bento-card p-6">
                          <h3 className="font-serif text-lg font-semibold text-ink mb-4">Academia Round</h3>
                          {!isJdFinal ? (
                            <div className="py-6">
                              <p className="text-ink/50 text-sm">Screening process is in progress. Results will be posted here once finalized.</p>
                            </div>
                          ) : !isScreenedOrBeyond ? (
                            <p className="text-ink/50 text-sm">You did not qualify for this round.</p>
                          ) : !isScheduled ? (
                            <p className="text-ink/50 text-sm">The assessment has not been scheduled yet. Please check back later.</p>
                          ) : (
                            <div className="space-y-4">
                              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-ink">{assessment.title || 'Technical Assessment'}</p>
                                  <p className="text-xs text-ink/50 mt-1">
                                    Scheduled: <span className="font-medium text-ink">{formatTimestamp(assessment.start_time)}</span> – <span className="font-medium text-ink">{formatTimestamp(assessment.end_time)}</span>
                                  </p>
                                </div>
                                {isTestLive ? (
                                  <Link
                                    href={`/candidate/test/${selectedApp.jobid}`}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md hover:bg-blue-600 transition-colors"
                                  >
                                    <Play size={14} /> START TEST
                                  </Link>
                                ) : (
                                  <button
                                    disabled
                                    className="flex items-center gap-2 px-4 py-2 bg-ink/10 text-ink/40 text-xs font-bold rounded-lg cursor-not-allowed"
                                  >
                                    <Play size={14} /> {now > assessment.end_time ? 'TEST ENDED' : 'NOT LIVE YET'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {activeTab === 'interview' && (() => {

                      const isJdFinal = !!job?.jd_analysis?.is_finalized;
                      const isInterviewQual = ['interview', 'offer', 'selected'].includes(selectedApp.stage);
                      return (
                        <div className="bento-card p-6">
                          <h3 className="font-serif text-lg font-semibold text-ink mb-4">Interview Panel</h3>
                          {!isJdFinal ? (
                            <div className="py-6">
                              <p className="text-ink/50 text-sm">Screening process is in progress. Results will be posted here once finalized.</p>
                            </div>
                          ) : !isInterviewQual ? (
                            <p className="text-ink/50 text-sm">
                              {['applied', 'rejected'].includes(selectedApp.stage)
                                ? "You did not qualify for this round."
                                : "The Interview Round will be scheduled once you qualify from the Academia Round."}
                            </p>
                          ) : !interview ? (
                            <p className="text-ink/50 text-sm">The interview has not been scheduled yet. Please check back later.</p>
                          ) : (
                            <div className="space-y-4">
                              <div className="p-4 bg-gold/5 border border-gold/20 rounded-xl flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-ink">Final Interview</p>
                                  <p className="text-xs text-ink/50 mt-1">Scheduled on: <span className="font-medium text-ink">{formatTimestamp(interview.scheduled_at)}</span></p>
                                </div>
                                {(() => {
                                  const isLive = currentTime >= interview.scheduled_at && currentTime <= (interview.scheduled_at + interview.duration_mins * 60);
                                  return isLive ? (
                                    <Link 
                                      href={`/candidate/interview/${selectedApp.id}`} 
                                      className="flex items-center gap-2 px-4 py-2 bg-gold text-white text-xs font-bold rounded-lg shadow-md hover:bg-gold/90 transition-colors"
                                    >
                                      <Video size={14} /> JOIN NOW
                                    </Link>
                                  ) : (
                                    <button 
                                      disabled
                                      className="flex items-center gap-2 px-4 py-2 bg-ink/10 text-ink/40 text-xs font-bold rounded-lg cursor-not-allowed border border-ink/10"
                                    >
                                      <Video size={14} /> JOIN NOW (Not Live)
                                    </button>
                                  );
                                })()}
                              </div>
                              {(selectedApp.interview_score !== null && selectedApp.interview_score !== undefined) && (
                                <div className="mt-4 p-4 border border-ink/10 rounded-xl">
                                  <p className="text-sm text-ink/60">Score: <span className="font-bold text-ink">{selectedApp.interview_score}%</span></p>
                                  <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1"><Check size={16} /> Cleared</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {activeTab === 'result' && (
                      <div className="bento-card p-6 text-center">
                        {selectedApp.stage === 'selected' ? (
                          <div className="py-8">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle size={32} />
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-ink mb-2">Congratulations!</h3>
                            <p className="text-sm text-ink/60">You have been selected for this position. The HR team will contact you shortly.</p>
                          </div>
                        ) : selectedApp.stage === 'rejected' ? (
                          <div className="py-8">
                            <div className="w-16 h-16 bg-rust/10 text-rust rounded-full flex items-center justify-center mx-auto mb-4">
                              <XCircle size={32} />
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-ink mb-2">Not Selected</h3>
                            <p className="text-sm text-ink/60">Unfortunately, we will not be moving forward with your application at this time.</p>
                          </div>
                        ) : (
                          <div className="py-8">
                            <div className="w-16 h-16 bg-ink/5 text-ink/40 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Clock size={32} />
                            </div>
                            <h3 className="font-serif text-xl font-bold text-ink mb-2">Decision Pending</h3>
                            <p className="text-sm text-ink/60">Your application is still in progress. Check back later.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Briefcase size={48} className="text-ink/10 mx-auto mb-4" />
              <p className="text-ink/30 text-sm">Select an application from the left panel to view details.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
