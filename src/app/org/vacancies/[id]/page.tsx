'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Users, Calendar, Loader2, Sparkles, ChevronRight,
  BarChart3, CheckCircle, XCircle, AlertTriangle, BookOpen, Clock, Upload, X
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';
import AcademiaRoundTab from '@/components/AcademiaRoundTab';
import InterviewPanelTab from '@/components/InterviewPanelTab';
import ResultsTab from '@/components/ResultsTab';
import RankedApplicationsTable from '@/components/RankedApplicationsTable';
import ExpandableJD from '@/components/ExpandableJD';

interface Job {
  id: string | number;
  title: string;
  description: string;
  department: string;
  status: string;
  vacancies: number;
  deadline: number;
  maxlimit: number;
  application_count: number;
  timecreated: number;
  stage_counts: Array<{ stage: string; count: number }>;
  jd_analysis?: {
    must_have: string;
    good_to_have: string;
    future_proof: string;
    team_gap: string;
    pass_count: number;
    is_finalized?: boolean;
  } | null;
}

const stageIcons: Record<string, React.ReactNode> = {
  applied: <FileText size={14} />,
  screened: <CheckCircle size={14} />,
  academia: <BarChart3 size={14} />,
  interview: <Users size={14} />,
  offer: <Sparkles size={14} />,
  selected: <CheckCircle size={14} />,
  rejected: <XCircle size={14} />,
};

const stageColors: Record<string, string> = {
  applied: 'text-blue-600 bg-blue-50',
  screened: 'text-amber-600 bg-amber-50',
  academia: 'text-purple-600 bg-purple-50',
  interview: 'text-gold bg-gold/10',
  offer: 'text-sage bg-sage/10',
  selected: 'text-emerald-600 bg-emerald-50',
  rejected: 'text-rust bg-rust/10',
};

type TabType = 'jd' | 'academia' | 'interviews' | 'results';

export default function VacancyDetailPage() {
  const params = useParams();
  const rawId = String(params?.id);
  const isKekaJob = rawId.includes('-');
  const jobId: string | number = isKekaJob ? rawId : Number(rawId);

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('jd');
  const [passCount, setPassCount] = useState<number | ''>('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [archivingJob, setArchivingJob] = useState(false);

  // ── Manual Resume Upload modal state ─────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ firstname: '', lastname: '', email: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadJob = useCallback(async () => {
    if (!rawId) return;
    setLoading(true);

    try {
      if (isKekaJob) {
        // Keka Pipeline
        const kekaRes = await fetch('/api/keka/sync-jobs');
        const kekaData = await kekaRes.json();
        const kekaJob = kekaData.jobs?.find((j: any) => String(j.id) === rawId);
        
        if (kekaJob) {
          const jdText = kekaJob.description || kekaJob.jobDescription || kekaJob.requirements || kekaJob.profile || "No description provided in Keka.";
          setJob({
            id: kekaJob.id,
            title: kekaJob.title || kekaJob.jobTitle || 'Untitled',
            description: jdText,
            department: kekaJob.department || kekaJob.departmentName || '',
            status: 'active',
            vacancies: 1,
            deadline: 0,
            maxlimit: 100,
            application_count: kekaJob.candidateCount ?? 0,
            timecreated: 0,
            stage_counts: [],
          });
        } else {
          setJob(null);
        }

        // Fetch candidates for Keka Pipeline
        const candidatesRes = await fetch(`/api/keka/sync-candidates?jobId=${rawId}`);
        const candidatesData = await candidatesRes.json();
        
        if (candidatesData.success && Array.isArray(candidatesData.candidates)) {
          const mapped = candidatesData.candidates.map((c: any, idx: number) => ({
            rank: idx + 1,
            id: c.id,
            userid: 0,
            jobid: jobId,
            firstname: c.firstName || c.firstname || (c.name || '').split(' ')[0] || 'Unknown',
            lastname: c.lastName || c.lastname || (c.name || '').split(' ').slice(1).join(' ') || '',
            email: c.email || c.emailAddress || '',
            stage: 'Imported',
            jd_score: null,
            academia_score: null,
            interview_score: null,
            overall_score: null,
            malpractice: 0,
            recruiter_rating: 0,
            timecreated: c.appliedDate ? Math.floor(new Date(c.appliedDate).getTime() / 1000) : 0,
            timemodified: 0,
          }));
          setApplications(mapped);
          setJob(prev => prev ? { ...prev, application_count: mapped.length } : prev);
        } else {
          setApplications([]);
        }
      } else {
        // Moodle Pipeline
        const res: any = await moodleCall<Job>('local_aurahr_jobs_get_job', { jobid: jobId });
        if (res.error || res.exception || res.errorcode || !res.id) {
          throw new Error('Moodle returned an internal error or no job found');
        }
        setJob(res);
      }
    } catch (err) {
      console.error('Data fetch failed:', err);
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [rawId, isKekaJob, jobId]);

  useEffect(() => { loadJob(); }, [loadJob]);

  useEffect(() => {
    if (job?.jd_analysis?.pass_count) {
      setPassCount(job.jd_analysis.pass_count);
    }
  }, [job]);

  async function runJDParser() {
    if (isKekaJob) {
      try {
        setParsing(true);
        const unparsedCandidates = applications.filter(app => app.stage === 'Imported' || app.jd_score === null);
        
        if (unparsedCandidates.length === 0) {
            alert("All candidates have already been parsed.");
            return;
        }

        // Process in chunks of 5 to parallelize but respect limits
        const CHUNK_SIZE = 5;
        for (let i = 0; i < unparsedCandidates.length; i += CHUNK_SIZE) {
            const chunk = unparsedCandidates.slice(i, i + CHUNK_SIZE);
            
            await Promise.all(chunk.map(async (candidate) => {
                try {
                    const data = await fetch(`/api/keka/fetch-resume`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: candidate.id,
                            email: candidate.email,
                            jobDescription: job?.description || "No job description"
                        })
                    }).then(res => res.json());

                    if (data.success && data.jdScore !== undefined) {
                        setApplications(prev => prev.map(app => 
                            app.id === candidate.id 
                            ? { ...app, jd_score: data.jdScore, overall_score: data.jdScore, stage: 'Parsed' } 
                            : app
                        ));
                    }
                } catch (err) {
                    console.error(`Failed to parse candidate ${candidate.id}`, err);
                }
            }));
            
            // Brief pause between chunks to avoid flooding Keka API
            if (i + CHUNK_SIZE < unparsedCandidates.length) {
                await new Promise(res => setTimeout(res, 500));
            }
        }

        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error("Bulk parsing failed", error);
        alert("An error occurred during bulk parsing.");
      } finally {
        setParsing(false);
      }
      return;
    }

    setParsing(true);
    try {
      await moodleCall('local_aurahr_jdparser_parse', { jobid: jobId });
      await moodleCall('local_aurahr_jdparser_match_candidates', { jobid: jobId });
    } catch (err) {
      console.error('JD Parse failed:', err);
    } finally {
      await loadJob();
      setRefreshTrigger(prev => prev + 1);
      setParsing(false);
    }
  }

  async function saveDescription() {
    if (!descInput.trim()) return;
    setSavingDesc(true);
    try {
      await moodleCall('local_aurahr_jobs_update_job', { jobid: jobId, description: descInput });
      await loadJob();
      setEditingDesc(false);
    } catch (err) {
      console.error('Failed to update description', err);
    } finally {
      setSavingDesc(false);
    }
  }

  async function archiveJob() {
    if (!confirm('Are you sure you want to archive this job?')) return;
    setArchivingJob(true);
    try {
      await moodleCall('local_aurahr_jobs_update_job', { jobid: jobId, status: 'archived' });
      await loadJob();
    } catch (err) {
      console.error('Failed to archive job', err);
      alert('Failed to archive job.');
    } finally {
      setArchivingJob(false);
    }
  }

  function formatDate(ts: number) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-sage" />
      </div>
    );
  }

  if (!job) {
    return <div className="text-center text-ink/40 py-20">Job not found.</div>;
  }

  const hasAnalysis = !!job.jd_analysis;
  
  // Calculate breakdown stats dynamically from local state
  const appliedCount = applications.length;
  const academiaQualified = applications.filter(app => app.stage === 'Screening Cleared' || app.stage === 'Shortlisted' || app.stage === 'Assessment Invited' || app.stage === 'Assessment In Progress' || app.stage === 'Assessment Completed' || app.stage === 'Interview Scheduled' || app.stage === 'Interview Cleared' || app.stage === 'Hired / Offer stage' || app.stage === 'Selected').length;
  const interviewQualified = applications.filter(app => app.stage === 'Interview Scheduled' || app.stage === 'Interview Cleared' || app.stage === 'Hired / Offer stage' || app.stage === 'Selected').length;
  const interviewsPending = applications.filter(app => app.stage === 'Interview Scheduled').length;
  const selectedCount = applications.filter(app => app.stage === 'Hired / Offer stage' || app.stage === 'Selected').length;
  const isJdAnalyzed = job.jd_analysis || applications.some(app => app.jd_score !== undefined && app.jd_score > 0);

  return (
    <div className="space-y-6 flex-1 w-full">
      {/* Header */}
      <div className="bento-card p-6 border-l-4 border-sage">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-bold text-ink break-words">{job.title}</h1>
            <p className="text-sm text-ink/40 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{job.department || 'General'}</span>
              <span>· Created: <span className="text-ink/70 font-medium">{formatDate(job.timecreated)}</span></span>
              <span>· Date Finished: <span className="text-ink/70 font-medium">{formatDate(job.deadline)}</span></span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl capitalize shrink-0 ${
              job.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink/5 text-ink/50'
            }`}>
              {job.status}
            </span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4 border-y border-ink/5">
          <div>
            <p className="text-[10px] text-ink/40 uppercase tracking-wider font-semibold">Total Applied</p>
            <p className="text-xl font-bold text-ink font-mono mt-1">{appliedCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-ink/40 uppercase tracking-wider font-semibold">Qualified (Academia)</p>
            <p className="text-xl font-bold text-sage font-mono mt-1">{academiaQualified}</p>
          </div>
          <div>
            <p className="text-[10px] text-ink/40 uppercase tracking-wider font-semibold">Qualified (Interview)</p>
            <p className="text-xl font-bold text-gold font-mono mt-1">{interviewQualified}</p>
          </div>
          <div>
            <p className="text-[10px] text-ink/40 uppercase tracking-wider font-semibold">Interviews Pending</p>
            <p className="text-xl font-bold text-rust font-mono mt-1">{interviewsPending}</p>
          </div>
          <div>
            <p className="text-[10px] text-ink/40 uppercase tracking-wider font-semibold">Selected</p>
            <p className="text-xl font-bold text-emerald-600 font-mono mt-1">{selectedCount}</p>
          </div>
        </div>

        {/* Description Section */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-ink/40 uppercase tracking-wider">Job Description</h3>
            <div className="flex items-center gap-4">
              {job.status !== 'archived' && (
                <button 
                  onClick={archiveJob}
                  disabled={archivingJob}
                  className="text-xs font-bold px-3 py-1 rounded-lg bg-rust/10 text-rust hover:bg-rust/20 transition-colors"
                >
                  {archivingJob ? 'Archiving...' : 'Archive Job'}
                </button>
              )}
              {!job.jd_analysis?.is_finalized && (
                !editingDesc ? (
                  <button onClick={() => { setDescInput(job.description); setEditingDesc(true); }} className="text-xs font-bold text-sage hover:underline">
                    Edit Description
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingDesc(false)} className="text-xs font-bold text-ink/40 hover:underline">Cancel</button>
                    <button onClick={saveDescription} disabled={savingDesc} className="text-xs font-bold text-sage hover:underline">
                      {savingDesc ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
          
          {editingDesc ? (
            <textarea
              className="w-full h-32 p-3 bg-cream border border-ink/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-sage"
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
            />
          ) : (
            <ExpandableJD content={job.description} />
          )}
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/10">
        <TabButton active={activeTab === 'jd'} onClick={() => setActiveTab('jd')} icon={<FileText size={14} />} label="JD Parser" />
        <TabButton active={activeTab === 'academia'} onClick={() => setActiveTab('academia')} icon={<BookOpen size={14} />} label="Academia Round" />
        <TabButton active={activeTab === 'interviews'} onClick={() => setActiveTab('interviews')} icon={<Users size={14} />} label="Interview Panel" />
        <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<BarChart3 size={14} />} label="Results" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'jd' && (
            <div className="space-y-6">
              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 w-full">
                <QuickStat icon={<Users size={16} />} label="Applications" value={job.application_count} />
                <QuickStat icon={<Calendar size={16} />} label="Deadline" value={formatDate(job.deadline)} />
                <QuickStat icon={<FileText size={16} />} label="Max Limit" value={job.maxlimit} />
                <QuickStat icon={<Sparkles size={16} />} label="JD Analyzed" value={isJdAnalyzed ? 'Yes' : 'No'} />
              </div>

              {/* JD Parser Configuration */}
              <div className="bento-card p-6 min-w-0">
                <h4 className="text-sm font-semibold text-ink mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span>Configuration</span>
                  {hasAnalysis && job.jd_analysis ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {job.jd_analysis.is_finalized && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          ✅ Finalized
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider font-bold text-sage bg-sage/10 px-2 py-1 rounded">
                        AI Suggested: {job.jd_analysis.pass_count}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-ink/40 bg-ink/5 px-2 py-1 rounded">
                        Run JD Parser for AI Suggestion
                      </span>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl bg-ink/5 text-ink/60 hover:bg-ink/10 hover:text-ink transition-colors"
                      >
                        <Upload size={13} />
                        Upload Resume Manually
                      </button>
                    </div>
                  )}
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2">
                      {isKekaJob ? 'Score Threshold to pass JD Parser (0-100)' : 'No. of applicants to pass JD Parser'}
                    </label>
                    <input
                      type="number"
                      value={passCount}
                      onChange={(e) => setPassCount(e.target.value ? Number(e.target.value) : '')}
                      placeholder={hasAnalysis && job.jd_analysis ? String(job.jd_analysis.pass_count) : "Enter a target pass count"}
                      disabled={!!job.jd_analysis?.is_finalized}
                      className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-2 text-sm text-ink focus:outline-none focus:border-sage/50 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button 
                      disabled={!!job.jd_analysis?.is_finalized}
                      className="bg-sage text-white text-sm font-bold py-2.5 px-6 rounded-xl hover:bg-sage/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
                        const isKekaJob = typeof jobId === 'string' && String(jobId).includes('-');
                        if (isKekaJob) {
                          if (!passCount) return;

                          setApplications(prev => prev.map(app => {
                            if (app.jd_score === undefined || app.jd_score === null) return app;
                            return {
                              ...app,
                              stage: app.jd_score >= passCount ? 'Shortlisted' : 'Rejected',
                            };
                          }));

                          // Build the ingestion set: shortlisted, scored, not yet ingested.
                          const toIngest = applications
                            .filter(c =>
                              typeof c.jd_score === 'number' &&
                              c.jd_score >= passCount &&
                              !c.moodleId
                            )
                            .map(c => ({
                              // Only send a real Keka UUID — never send a cuid as a fallback.
                              kekaUuid: (typeof c.kekaUuid === 'string' && c.kekaUuid.trim() !== '')
                                ? c.kekaUuid.trim()
                                : null,
                              name:     c.name,
                              email:    c.email,
                              jdScore:  c.jd_score as number,
                              jobId:    typeof jobId === 'number' && Number.isInteger(jobId) && jobId > 0
                                ? jobId
                                : undefined,
                            }));

                          if (toIngest.length > 0) {
                            fetch('/api/keka/ingest-batch', {
                              method:      'POST',
                              credentials: 'include',
                              headers:     { 'Content-Type': 'application/json' },
                              body:        JSON.stringify({ candidates: toIngest }),
                            })
                              .then(res => res.json())
                              .then(data => {
                                if (!data.success || !Array.isArray(data.results)) return;
                                setApplications(prev => prev.map(c => {
                                  const match = (data.results as Array<{ email: string; status: string; moodleId?: number; candidateId?: string }>)
                                    .find(r => r.email === c.email && r.moodleId);
                                  if (!match) return c;
                                  return { ...c, moodleId: match.moodleId, candidateId: match.candidateId };
                                }));
                              })
                              .catch(e => console.error('[Ingest Batch] Network error:', e));
                          }

                          alert(`Configuration saved! ${toIngest.length} candidate(s) queued for ingestion.`);
                          return;
                        }

                        if (!passCount) return;
                        try {
                          await moodleCall('local_aurahr_jdparser_update_config', { jobid: jobId, pass_count: passCount });
                          await loadJob();
                          alert(`Configuration saved! ${passCount} applicants will pass the JD Parser.`);
                        } catch (err) {
                          console.error('Failed to update config', err);
                          alert('Failed to save configuration.');
                        }
                      }}
                    >
                      <CheckCircle size={16} />
                      Save Config
                    </button>
                    <button 
                      disabled={!hasAnalysis || !!job.jd_analysis?.is_finalized}
                      className="bg-purple-600 text-white text-sm font-bold py-2.5 px-6 rounded-xl hover:bg-purple-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
                        const isKekaJob = typeof jobId === 'string' && String(jobId).includes('-');
                        if (isKekaJob) {
                          if (!passCount) {
                            alert("Please specify a pass count first and save configuration.");
                            return;
                          }
                          if (confirm(`Are you sure you want to finalize the JD Round and pass the top ${passCount} candidates to the Academia Round?`)) {
                            alert(`JD Round Finalized for Keka job! Top ${passCount} candidates moved to Academia round.`);
                          }
                          return;
                        }

                        if (!passCount) {
                          alert("Please specify a pass count first and save configuration.");
                          return;
                        }
                        if (confirm(`Are you sure you want to finalize the JD Round and pass the top ${passCount} candidates to the Academia Round?`)) {
                          try {
                            await moodleCall('local_aurahr_jobs_finalize_jd', { jobid: jobId, pass_count: passCount });
                            await loadJob();
                            setRefreshTrigger(prev => prev + 1);
                            alert(`JD Round Finalized! Top ${passCount} candidates moved to Academia round.`);
                          } catch (err) {
                            console.error('Failed to finalize JD', err);
                            alert('Failed to finalize JD round.');
                          }
                        }
                      }}
                    >
                      <Sparkles size={16} />
                      {job.jd_analysis?.is_finalized ? 'FINALIZED' : 'FINAL'}
                    </button>
                  </div>
                </div>
              </div>

              {/* JD Parser Action Card */}
              <motion.button
                whileHover={job.jd_analysis?.is_finalized ? {} : { scale: 1.01, y: -2 }}
                whileTap={job.jd_analysis?.is_finalized ? {} : { scale: 0.99 }}
                onClick={runJDParser}
                disabled={parsing || !!job.jd_analysis?.is_finalized}
                className="w-full sm:w-80 bento-card p-5 text-left hover:shadow-lg hover:border-sage/30 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-sage/10 text-sage">
                    {parsing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  </div>
                  <span className="text-sm font-semibold text-ink group-hover:text-sage transition-colors">
                    {parsing ? 'Analyzing...' : hasAnalysis ? 'Re-run JD Parser' : 'Run JD Parser'}
                  </span>
                </div>
                <p className="text-xs text-ink/40">
                  {job.jd_analysis?.is_finalized 
                    ? 'JD Round has been finalized. You cannot re-run the parser.' 
                    : 'AI-powered analysis of the job description to extract skill requirements.'}
                </p>
              </motion.button>

              {/* JD Analysis 4-Box */}
              {hasAnalysis && job.jd_analysis && (
                <div className="space-y-4 min-w-0">
                  <h3 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
                    <Sparkles size={18} className="text-sage shrink-0" />
                    JD Analysis — Skill Breakdown
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SkillBox title="Must-Have" skills={JSON.parse(job.jd_analysis.must_have)} color="bg-rust/8 border-rust/15" badgeColor="bg-rust/15 text-rust" icon={<AlertTriangle size={14} />} />
                    <SkillBox title="Good-to-Have" skills={JSON.parse(job.jd_analysis.good_to_have)} color="bg-gold/8 border-gold/15" badgeColor="bg-gold/15 text-gold" icon={<CheckCircle size={14} />} />
                    <SkillBox title="Future-Proof" skills={JSON.parse(job.jd_analysis.future_proof)} color="bg-blue-500/8 border-blue-200" badgeColor="bg-blue-500/15 text-blue-600" icon={<Sparkles size={14} />} />
                    <SkillBox title="Team Gap" skills={JSON.parse(job.jd_analysis.team_gap)} color="bg-sage/8 border-sage/15" badgeColor="bg-sage/15 text-sage" icon={<Users size={14} />} />
                  </div>
                </div>
              )}

              {/* Match Distribution Graph */}
              {hasAnalysis && (
                <MatchDistributionGraph jobId={job.id} total={job.application_count || 0} refreshTrigger={refreshTrigger} />
              )}

              {/* Removed Duplicate Description Block from below JD Graph since it's now in the header */}
            </div>
          )}

          {activeTab === 'academia' && (
            <AcademiaRoundTab jobId={job.id} aiPassCount={job.jd_analysis?.pass_count} />
          )}

          {activeTab === 'interviews' && (
            <InterviewPanelTab jobId={job.id} />
          )}

          {activeTab === 'results' && (
            <ResultsTab jobId={job.id} initialStatus={job.status} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Ranked Applications Table (Always visible at the bottom per project plan) */}
      <RankedApplicationsTable jobId={job.id} refreshTrigger={refreshTrigger} applications={applications} />

      {/* ── Manual Resume Upload Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => !uploading && setShowUploadModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-cream rounded-3xl shadow-2xl w-full max-w-lg border border-ink/10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-ink/8">
                <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                  <Upload size={18} className="text-sage" />
                  Upload Resume Manually
                </h3>
                <button
                  onClick={() => !uploading && setShowUploadModal(false)}
                  className="p-2 rounded-xl hover:bg-ink/5 text-ink/40 transition-colors disabled:opacity-40"
                  disabled={uploading}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal body */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!uploadFile) { alert('Please select a resume file.'); return; }
                  setUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append('file',           uploadFile);
                    fd.append('firstname',      uploadForm.firstname);
                    fd.append('lastname',       uploadForm.lastname);
                    fd.append('email',          uploadForm.email);
                    fd.append('jobId',          String(typeof jobId === 'number' ? jobId : Number(rawId)));
                    fd.append('jobDescription', job.description || '');

                    // Do NOT set Content-Type — browser must set the multipart boundary
                    const res = await fetch('/api/candidates/manual-upload', {
                      method:      'POST',
                      credentials: 'include',
                      body:        fd,
                    });
                    const data = await res.json();

                    if (!res.ok || !data.success) {
                      throw new Error(data.error || 'Upload failed.');
                    }

                    setShowUploadModal(false);
                    setUploadForm({ firstname: '', lastname: '', email: '' });
                    setUploadFile(null);
                    setRefreshTrigger(prev => prev + 1);
                    alert(`Resume uploaded successfully! JD score: ${data.jdScore ?? 'N/A'}. The candidate has been added to the pipeline.`);
                  } catch (err: any) {
                    alert(`Error: ${err.message}`);
                  } finally {
                    setUploading(false);
                  }
                }}
                className="p-6 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider">First Name</label>
                    <input
                      type="text"
                      required
                      value={uploadForm.firstname}
                      onChange={(e) => setUploadForm(p => ({ ...p, firstname: e.target.value }))}
                      placeholder="Jane"
                      className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider">Last Name</label>
                    <input
                      type="text"
                      required
                      value={uploadForm.lastname}
                      onChange={(e) => setUploadForm(p => ({ ...p, lastname: e.target.value }))}
                      placeholder="Doe"
                      className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    required
                    value={uploadForm.email}
                    onChange={(e) => setUploadForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="jane.doe@example.com"
                    className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider">Resume File</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-ink/70 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-ink/5 file:text-ink/60 hover:file:bg-ink/10 transition-all cursor-pointer"
                  />
                  <p className="text-[11px] text-ink/30">PDF, DOC, or DOCX — max 10 MB</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => !uploading && setShowUploadModal(false)}
                    disabled={uploading}
                    className="px-5 py-2 rounded-xl text-sm font-bold text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex items-center gap-2 px-5 py-2 bg-sage text-white rounded-xl text-sm font-bold hover:bg-sage/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    {uploading ? 'Uploading...' : 'Upload & Ingest'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
        active ? 'border-sage text-sage' : 'border-transparent text-ink/40 hover:text-ink/80 hover:border-ink/20'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function PlaceholderTab({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bento-card p-12 flex flex-col items-center justify-center text-center">
      <div className="text-sage mb-4 opacity-50">{icon}</div>
      <h3 className="font-serif text-lg font-semibold text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink/50 max-w-sm">{desc}</p>
      <span className="mt-6 px-3 py-1 bg-ink/5 text-ink/40 text-[10px] font-bold uppercase tracking-wider rounded-lg">Coming Soon</span>
    </div>
  );
}

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bento-card p-4 flex items-center gap-3">
      <div className="text-ink/30">{icon}</div>
      <div>
        <p className="text-[10px] text-ink/35 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm font-bold text-ink font-mono">{value}</p>
      </div>
    </div>
  );
}

function SkillBox({
  title, skills, color, badgeColor, icon,
}: {
  title: string; skills: string[]; color: string; badgeColor: string; icon: React.ReactNode;
}) {
  const isTeamGap = title.toLowerCase().includes('team gap');
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${color}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`p-1.5 rounded-lg ${badgeColor}`}>{icon}</span>
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        {!isTeamGap && <span className="text-[10px] font-mono text-ink/30 ml-auto">{skills.length}</span>}
      </div>
      {isTeamGap ? (
        <div className="text-xs text-ink/50 italic py-2">
          Feature coming soon: Team skill gap matching and analytics will be available in a future update.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill, i) => (
            <span
              key={i}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium ${badgeColor}`}
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function MatchDistributionGraph({ jobId, total, refreshTrigger }: { jobId: number | string, total: number, refreshTrigger?: number }) {
  const [data, setData] = useState([
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 },
  ]);

  useEffect(() => {
    async function fetchData() {
      if (!jobId) return;

      const isKekaJob = typeof jobId === 'string' && jobId.includes('-');
      if (isKekaJob) {
        return; // Data naturally stays at 0
      }

      try {
        const res = await moodleCall<{ applications: any[] }>('local_aurahr_jobs_list_applications', { jobid: jobId });
        const apps = res.applications || [];
        const counts = [0, 0, 0, 0, 0];
        
        apps.forEach(app => {
          const score = app.jd_score || 0;
          if (score <= 20) counts[0]++;
          else if (score <= 40) counts[1]++;
          else if (score <= 60) counts[2]++;
          else if (score <= 80) counts[3]++;
          else counts[4]++;
        });

        setData([
          { range: '0-20%', count: counts[0] },
          { range: '21-40%', count: counts[1] },
          { range: '41-60%', count: counts[2] },
          { range: '61-80%', count: counts[3] },
          { range: '81-100%', count: counts[4] },
        ]);
      } catch (err) {
        console.error('Failed to load distribution data', err);
      }
    }
    fetchData();
  }, [jobId, refreshTrigger]);

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bento-card p-6 mt-6">
      <h3 className="font-serif text-lg font-semibold text-ink mb-6 flex items-center gap-2">
        <BarChart3 size={18} className="text-sage" />
        Percentage Match vs Candidates
      </h3>
      <div className="flex items-end gap-2 h-48 w-full pt-6">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
            <div className="w-full relative flex items-end justify-center h-full bg-warm-sand/30 rounded-t-xl overflow-hidden group">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${(d.count / maxCount) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="w-full bg-sage/60 group-hover:bg-sage transition-colors rounded-t-xl relative"
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-ink opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {d.count} candidates
                </div>
              </motion.div>
            </div>
            <span className="text-[10px] font-semibold text-ink/50 whitespace-nowrap">{d.range}</span>
          </div>
        ))}
      </div>
      <div className="text-center mt-6 text-xs text-ink/40">
        Shows the distribution of JD parser match scores across {total} applicants.
      </div>
    </div>
  );
}
