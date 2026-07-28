'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ArrowUpDown, Users, AlertTriangle,
  Loader2, X, Mail, Phone, MapPin, GraduationCap, Code, Video,
  FileText, ChevronRight, RefreshCw, ShieldAlert, PauseCircle
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';
import RadarChart from '@/components/RadarChart';
import {
  STAGE_META,
  getManualMoveOptions,
  getFullStandardManualOptions,
  type PipelineStage,
  PIPELINE_STAGES,
  normaliseLegacyStage,
  getMacroGroup,
  MACRO_PIPELINE,
  isOverrideOption,
} from '@/lib/pipeline';

interface Application {
  rank: number;
  id: number;
  userid: number;
  jobid: number;
  firstname: string;
  lastname: string;
  email: string;
  stage: string;
  jd_score?: number | null;
  academia_score?: number | null;
  interview_score?: number | null;
  overall_score?: number | null;
  malpractice: number;
  recruiter_rating: number;
  timecreated: number;
  timemodified: number;
  resumeUrl?: string | null;
  kekaId?: string | null; // KEKA candidate UUID — needed for lazy resume fetch
}

interface ApplicationDetail {
  id: number;
  userid: number;
  jobid: number;
  job_title: string;
  job_department: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  bio: string;
  stage: string;
  jd_score?: number | null;
  academia_score?: number | null;
  interview_score?: number | null;
  overall_score?: number | null;
  malpractice: number;
  age: number | null;
  gender: string;
  role: string;
  education_details: string;
  resume_skills: string;
  matched_skills: string;
  recruiter_rating: number;
  recruiter_feedback: string;
  ai_summary: string;
  timecreated: number;
  timemodified: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

// ── Stage helpers (sourced from central pipeline module) ────────────

/**
 * Returns badge classes for any stage string.
 * Normalises legacy Moodle lowercase stages to the 12-stage enum first.
 */
function getStageBadgeClass(stage: string): string {
  const normalised = normaliseLegacyStage(stage);
  return STAGE_META[normalised]?.badgeClass ?? 'bg-ink/5 text-ink/50 border-ink/10';
}

/**
 * Returns the human-readable label for any stage string.
 */
function getStageLabel(stage: string): string {
  const normalised = normaliseLegacyStage(stage);
  return STAGE_META[normalised]?.label ?? stage;
}

/**
 * Returns tooltip for automated/restricted stages.
 */
function getStageTooltip(stage: string): string | undefined {
  const normalised = normaliseLegacyStage(stage);
  const meta = STAGE_META[normalised];
  if (!meta) return undefined;
  if (normalised === 'Imported' || normalised === 'Under AI Screening') {
    return 'AI is evaluating this candidate — only Reject or Hold overrides are allowed.';
  }
  if (normalised === 'Assessment In Progress' || normalised === 'Assessment Completed') {
    return 'Moodle owns this transition. Only Reject or Hold overrides are available.';
  }
  return undefined;
}

function formatDate(ts: number) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function scoreColor(score: number | null | undefined) {
  if (score === null || score === undefined) return 'text-ink/20';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-rust';
}

interface RankedApplicationsTableProps {
  jobId: number | string;
  refreshTrigger?: number;
  applications?: Application[];
}

export default function RankedApplicationsTable(props: RankedApplicationsTableProps) {
  const { jobId, refreshTrigger } = props;
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortField, setSortField] = useState('overall_score');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | number | null>(null);
  const [moodleDetails, setMoodleDetails] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stageCounts, setStageCounts] = useState<Array<{ stage: string, count: number }>>([]);
  const [loadingResumeId, setLoadingResumeId] = useState<number | string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isKekaJob = typeof jobId === 'string' && String(jobId).includes('-');

  useEffect(() => {
    if (isKekaJob && props.applications) {
      setApplications(props.applications);
      setTotal(props.applications.length);
      setLoading(false);
    }
  }, [props.applications, isKekaJob]);

  const loadApplications = useCallback(async (isBackground = false) => {
    if (!jobId) return;

    // Schema Check: If it's a Keka UUID, short-circuit and rely on props
    if (isKekaJob) {
      if (props.applications) {
        setApplications(props.applications);
        setTotal(props.applications.length);
      } else {
        setApplications([]);
        setTotal(0);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    try {
      const [appsRes, jobRes] = await Promise.all([
        moodleCall<{ applications: Application[]; total: number }>('local_aurahr_jobs_list_applications', { jobid: jobId, stage: stageFilter, search, sort_field: sortField, sort_dir: sortDir }),
        moodleCall<any>('local_aurahr_jobs_get_job', { jobid: jobId })
      ]);
      setApplications(appsRes.applications);
      setTotal(appsRes.total);
      if (jobRes.stage_counts) {
        setStageCounts(jobRes.stage_counts);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId, stageFilter, search, sortField, sortDir, refreshTrigger, props.applications]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  // Auto-poll every 30 seconds so academia/interview scores update without manual reload
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      loadApplications(true);
    }, 30000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [loadApplications]);

  async function openDetail(app: any) {
    const appId = typeof app === 'object' ? app.id : app;
    setSelectedApp(appId); // Store ID for live state sync
    if (typeof appId === 'string' && String(appId).includes('-')) {
      // Keka candidates don't need additional fetching
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await moodleCall<ApplicationDetail>('local_aurahr_jobs_get_application', { applicationid: appId });
      setMoodleDetails(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortField(field);
      setSortDir('DESC');
    }
  }

  return (
    <div className="space-y-6 mt-12 border-t border-ink/10 pt-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="text-sage" size={24} />
          <h2 className="font-serif text-2xl font-bold text-ink">Ranked Applications</h2>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-ink/30 font-medium">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => loadApplications(true)}
            disabled={refreshing || loading}
            title="Refresh scores"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink/60 bg-ink/5 hover:bg-ink/10 border border-ink/10 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Pipeline chips — grouped by macro stage */}
      {stageCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStageFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${stageFilter === '' ? 'bg-ink text-cream border-ink' : 'bg-ink/5 text-ink/50 border-ink/10 hover:border-ink/20'
              }`}
          >
            All ({stageCounts.reduce((acc, curr) => acc + curr.count, 0)})
          </button>
          {stageCounts.map((s) => (
            <button
              key={s.stage}
              onClick={() => setStageFilter(stageFilter === s.stage ? '' : s.stage)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${stageFilter === s.stage
                ? getStageBadgeClass(s.stage)
                : 'bg-ink/5 text-ink/50 border-ink/10 hover:border-ink/20'
                }`}
            >
              {getStageLabel(s.stage)} ({s.count})
            </button>
          ))}
        </div>
      )}

      {/* Search + Sort controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates..."
            className="w-full pl-11 pr-4 py-2.5 bg-cream border border-ink/8 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-ink/40">
          <Filter size={14} />
          <span>Sort:</span>
          {['overall_score', 'jd_score', 'timecreated'].map((f) => (
            <button
              key={f}
              onClick={() => toggleSort(f)}
              className={`px-2 py-1 rounded-lg transition-colors ${sortField === f ? 'bg-gold/15 text-gold font-semibold' : 'hover:bg-ink/5'
                }`}
            >
              {f.replace('_', ' ').replace('timecreated', 'date')}
              {sortField === f && (
                <ArrowUpDown size={10} className="inline ml-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Applications table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-sage" />
        </div>
      ) : applications.length === 0 ? (
        <div className="bento-card p-12 text-center">
          <Users size={40} className="text-ink/15 mx-auto mb-3" />
          <p className="text-ink/40 text-sm">No applications found.</p>
        </div>
      ) : (
        <div className="bento-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-ink/8 bg-warm-sand/30">
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">S.No.</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">Name</th>
                  <th className="text-center px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">Resume</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">App ID</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">Date Applied</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">JD</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">Acad.</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">Interview</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">Stage</th>
                  <th className="text-center px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">Malpractice</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider whitespace-nowrap">Overall Score</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, idx) => (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-ink/5 hover:bg-warm-sand/20 transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono text-ink/40 font-medium">{idx + 1}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openDetail(app)}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage/40 to-gold/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {app.firstname[0]}{app.lastname[0]}
                        </div>
                        <p className="text-sm font-semibold text-ink truncate max-w-[150px] hover:text-sage transition-colors">{app.firstname} {app.lastname}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {(() => {
                        // For Keka candidates, app.id IS the Keka UUID.
                        // app.kekaId is an optional override; fall back to app.id when it's a UUID.
                        const effectiveKekaId: string | null =
                          app.kekaId ||
                          (typeof app.id === 'string' && String(app.id).includes('-') ? String(app.id) : null);

                        // Priority: local state cache > prop from server > not loaded
                        const url = resolvedUrls[String(app.id)] ?? app.resumeUrl;

                        if (loadingResumeId === app.id) {
                          return <Loader2 size={16} className="animate-spin text-ink/30 mx-auto" />;
                        }

                        if (url) {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(url, '_blank');
                              }}
                              className="text-slate-400 hover:text-green-700 transition-colors inline-flex items-center justify-center p-1"
                              title="View Resume"
                            >
                              <FileText size={18} />
                            </button>
                          );
                        }

                        if (!effectiveKekaId) {
                          // Non-Keka candidate with no resume URL — static dash
                          return <span className="text-ink/20">—</span>;
                        }

                        // Resume not yet fetched — clickable dash triggers lazy fetch
                        return (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setLoadingResumeId(app.id);
                              try {
                                const params = new URLSearchParams({
                                  email: app.email,
                                  kekaId: effectiveKekaId,
                                });
                                const res = await fetch(`/api/keka/candidate-resume?${params}`);
                                const data = await res.json();
                                if (data.success && data.url) {
                                  setResolvedUrls(prev => ({ ...prev, [String(app.id)]: data.url }));
                                  window.open(data.url, '_blank');
                                }
                                // If no URL returned, silently revert to dash
                              } catch {
                                // Network error — silently revert to dash
                              } finally {
                                setLoadingResumeId(null);
                              }
                            }}
                            className="text-ink/30 hover:text-green-700 transition-colors inline-flex items-center justify-center p-1 group"
                            title="Click to load resume"
                          >
                            <FileText size={16} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono text-ink/40">APP-{app.id}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-ink/50">{formatDate(app.timecreated)}</span>
                    </td>
                    <td className={`px-5 py-4 text-right text-sm font-mono font-medium ${scoreColor(app.jd_score)}`}>
                      {app.jd_score !== null && app.jd_score !== undefined ? `${app.jd_score.toFixed(1)}` : '—'}
                    </td>
                    <td className={`px-5 py-4 text-right text-sm font-mono font-medium ${scoreColor(app.academia_score)}`}>
                      {app.academia_score !== null && app.academia_score !== undefined ? `${app.academia_score.toFixed(1)}` : '—'}
                    </td>
                    <td className={`px-5 py-4 text-right text-sm font-mono font-medium ${scoreColor(app.interview_score)}`}>
                      {app.interview_score !== null && app.interview_score !== undefined ? `${app.interview_score.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {/* Micro-stage badge with animated dot for live states */}
                      <div className="flex items-center gap-2">
                        {(app.stage === 'Under AI Screening' || app.stage === 'Assessment In Progress') && (
                          <span className={`w-1.5 h-1.5 rounded-full ${STAGE_META[normaliseLegacyStage(app.stage)]?.dotClass ?? 'bg-ink/20'}`} />
                        )}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap ${getStageBadgeClass(app.stage)}`}>
                          {getStageLabel(app.stage)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      {app.malpractice >= 5 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rust/10 text-rust rounded-lg text-xs font-bold border border-rust/20" title={`${app.malpractice} violations (Disqualified)`}>
                          <AlertTriangle size={12} />
                          <span>{app.malpractice} (Disqualified)</span>
                        </span>
                      ) : app.malpractice > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-700 rounded-lg text-xs font-bold border border-amber-200/50" title={`${app.malpractice} violations flagged`}>
                          <AlertTriangle size={12} />
                          <span>{app.malpractice} Flags</span>
                        </span>
                      ) : (
                        <span className="text-ink/20 font-medium">—</span>
                      )}
                    </td>
                    <td className={`px-5 py-4 text-right text-sm font-mono font-bold ${scoreColor(app.overall_score)}`}>
                      {app.overall_score !== null && app.overall_score !== undefined ? `${app.overall_score.toFixed(1)}` : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Detail Popup */}
      <AnimatePresence>
        {selectedApp && (() => {
          const liveApp = applications.find(a => String(a.id) === String(selectedApp));
          const activeCandidate = moodleDetails && String(moodleDetails.id) === String(selectedApp)
            ? { ...moodleDetails, ...liveApp }
            : liveApp;
          return activeCandidate ? (
            <CandidateDetailPopup
              app={activeCandidate as any}
              loading={detailLoading}
              onClose={() => {
                setSelectedApp(null);
                setMoodleDetails(null);
              }}
              onStageUpdate={(newStage?: string, appId?: string) => {
                if (newStage && appId) {
                  setApplications(prev => prev.map(a => String(a.id) === appId ? { ...a, stage: newStage } : a));
                } else {
                  loadApplications();
                }
              }}
            />
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
}

// ── Candidate Detail Popup ────────────────────────────────────────

function CandidateDetailPopup({
  app,
  loading,
  onClose,
  onStageUpdate,
}: {
  app: ApplicationDetail | null;
  loading: boolean;
  onClose: () => void;
  onStageUpdate: (newStage?: string, appId?: string) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Contact modal state ───────────────────────────────────────────
  const [showContact, setShowContact] = useState(false);
  const [contactTemplates, setContactTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [sending, setSending] = useState(false);

  async function openContactModal() {
    setShowContact(true);
    try {
      const res = await fetch('/api/candidates/contact');
      const data = await res.json();
      setContactTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to fetch email templates:', err);
    }
  }

  function applyTemplate(templateId: string, templates: EmailTemplate[]) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl || !app) return;
    const name = `${app.firstname} ${app.lastname}`;
    const jobTitle = app.job_title || app.role || '';
    setContactSubject(tpl.subject.replace(/\{\{candidateName\}\}/g, name).replace(/\{\{jobTitle\}\}/g, jobTitle));
    setContactBody(tpl.body.replace(/\{\{candidateName\}\}/g, name).replace(/\{\{jobTitle\}\}/g, jobTitle));
  }

  async function handleSendEmail() {
    if (!app) return;
    setSending(true);
    try {
      const res = await fetch('/api/candidates/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: app.id,
          candidateEmail: app.email,
          templateId: selectedTemplateId || null,
          subject: contactSubject,
          htmlBody: contactBody,
          sentBy: 'unknown',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email.');
      setShowContact(false);
      setContactSubject('');
      setContactBody('');
      setSelectedTemplateId('');
      alert(`Email sent successfully to ${app.email}${data.dryRun ? ' (dry run — not actually delivered)' : ''}.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  // Flatten Metric Data Mapping
  const isKekaJob = app && typeof app.id === 'string' && String(app.id).includes('-');
  const jdScore = app?.jd_score ?? 0;
  const overallScore = app?.overall_score ?? 0;
  const isKekaEvaluated = isKekaJob && app?.jd_score !== undefined && app?.jd_score !== null;

  async function moveStage(newStage: string) {
    if (!app) return;

    if (isKekaJob) {
      onStageUpdate(newStage, String(app.id));
      setShowDropdown(false);
      return;
    }

    setUpdating(true);
    setShowDropdown(false);
    try {
      await moodleCall('local_aurahr_jobs_update_stage', {
        applicationid: app.id,
        stage: newStage,
      });
      onStageUpdate();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-cream h-full w-full max-w-xl border-l border-ink/10 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-sage" />
          </div>
        ) : app ? (
          <div className="p-6 space-y-8">
            {/* Header: Photo, Name, Age, Gender, Role, Phone */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sage to-gold flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0">
                  {app.firstname[0]}{app.lastname[0]}
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-ink">
                    {app.firstname} {app.lastname}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-ink/60 font-medium">
                    {app.role && <span>{app.role}</span>}
                    {app.role && <span className="w-1 h-1 rounded-full bg-ink/20"></span>}
                    {app.age && <span>{app.age} yrs</span>}
                    {app.age && <span className="w-1 h-1 rounded-full bg-ink/20"></span>}
                    {app.gender && <span className="capitalize">{app.gender}</span>}
                  </div>
                  {app.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-ink/50 mt-1">
                      <Phone size={12} /> {app.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Dropdown */}
              <div className="relative shrink-0 flex items-start gap-2">
                {/* Contact button */}
                <button
                  onClick={openContactModal}
                  className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors shadow-sm"
                >
                  <Mail size={16} />
                  Contact
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-sage text-white rounded-xl text-sm font-semibold hover:bg-sage/90 transition-colors shadow-sm"
                  >
                    {updating ? <Loader2 size={16} className="animate-spin" /> : 'Actions'}
                    <ChevronRight size={14} className={`transition-transform ${showDropdown ? 'rotate-90' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showDropdown && (() => {
                      const options = isKekaJob
                        ? getFullStandardManualOptions(app.stage)
                        : getManualMoveOptions(app.stage);
                      const forwardOptions = options.filter(s => !isOverrideOption(s));
                      const overrideOptions = options.filter(s => isOverrideOption(s));
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-56 bg-white border border-ink/10 rounded-xl shadow-xl overflow-hidden z-10"
                        >
                          {/* Forward stage options */}
                          {forwardOptions.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-[10px] font-bold text-ink/40 uppercase tracking-wider bg-ink/5">Move to stage</div>
                              {forwardOptions.map(s => (
                                <button
                                  key={s}
                                  onClick={() => moveStage(s)}
                                  className="w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-sage/10 hover:text-sage flex items-center gap-2"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${STAGE_META[s]?.dotClass ?? 'bg-ink/20'}`} />
                                  {STAGE_META[s]?.label ?? s}
                                </button>
                              ))}
                            </>
                          )}
                          {/* Always-available override exits */}
                          {overrideOptions.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-[10px] font-bold text-ink/40 uppercase tracking-wider bg-ink/5 border-t border-ink/5">
                                Override
                              </div>
                              {overrideOptions.map(s => (
                                <button
                                  key={s}
                                  onClick={() => moveStage(s)}
                                  className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${STAGE_META[s]?.terminal
                                    ? 'text-red-600 hover:bg-red-50'
                                    : 'text-zinc-600 hover:bg-zinc-50'
                                    }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </>
                          )}
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-ink/5 text-ink/40 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Pipeline Status & Malpractice */}
            <div className="flex items-center justify-between p-4 bg-warm-sand/30 rounded-2xl border border-ink/5">
              <div>
                <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-1">Pipeline Stage</p>
                {/* Micro stage badge */}
                <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border inline-flex items-center gap-2 ${getStageBadgeClass(app.stage)}`}>
                  {(app.stage === 'Under AI Screening' || app.stage === 'Assessment In Progress') && (
                    <span className={`w-1.5 h-1.5 rounded-full ${STAGE_META[normaliseLegacyStage(app.stage)]?.dotClass ?? 'bg-ink/20'}`} />
                  )}
                  {getStageLabel(app.stage)}
                </span>
                {!isKekaJob && getStageTooltip(app.stage) && (
                  <p className="text-[10px] text-ink/40 mt-1 max-w-[220px] leading-snug">{getStageTooltip(app.stage)}</p>
                )}
              </div>
              {app.malpractice >= 5 ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-rust/10 border border-rust/20 rounded-lg text-rust">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-bold">{app.malpractice} Violations (Disqualified)</span>
                </div>
              ) : app.malpractice > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-200 rounded-lg text-amber-700">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-bold">{app.malpractice} Violations Flagged</span>
                </div>
              ) : null}
            </div>

            {/* Contact & Socials */}
            <div className="flex flex-wrap gap-3">
              {app.email && (
                <span className="flex items-center gap-1.5 text-xs text-ink/50 bg-ink/5 px-3 py-1.5 rounded-xl">
                  <Mail size={12} /> {app.email}
                </span>
              )}
              {app.phone && (
                <span className="flex items-center gap-1.5 text-xs text-ink/50 bg-ink/5 px-3 py-1.5 rounded-xl">
                  <Phone size={12} /> {app.phone}
                </span>
              )}
              {app.city && (
                <span className="flex items-center gap-1.5 text-xs text-ink/50 bg-ink/5 px-3 py-1.5 rounded-xl">
                  <MapPin size={12} /> {app.city}{app.country ? `, ${app.country}` : ''}
                </span>
              )}
            </div>

            {/* Education Details */}
            {app.education_details && (
              <div>
                <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <GraduationCap size={14} /> Education Details
                </p>
                <p className="text-sm text-ink/80 leading-relaxed p-3 bg-white border border-ink/5 rounded-xl">
                  {app.education_details}
                </p>
              </div>
            )}

            {/* Polygonal Graphical Representation & Scores Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Core Scores */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider">Core Assessment Scores</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ScoreCard label="JD Parser" value={jdScore} />
                  <ScoreCard label="Academia" value={app.academia_score} />
                  <ScoreCard label="Interview" value={app.interview_score} />
                  <ScoreCard label="Overall" value={overallScore} highlight />
                </div>
              </div>

              {/* Radar Chart */}
              <div className="bg-warm-sand/20 rounded-2xl p-4 flex flex-col justify-center items-center h-full">
                <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2 w-full">Performance Radar</p>
                <div className="w-full h-40">
                  <RadarChart data={{
                    technical: jdScore || 0,
                    culture: app.interview_score || 0,
                    communication: app.interview_score || 0,
                    leadership: overallScore || 0,
                    adaptability: app.academia_score || 0
                  }} />
                </div>
              </div>
            </div>

            {/* External Platform & Resume Skills */}
            <div>
              <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-3">Skill Sources & Scores</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlatformScoreCard icon={<FileText size={16} className="text-blue-500" />} label="Resume Skills" skills={app.resume_skills} score={jdScore} />
              </div>
            </div>

            {/* Matched Skills */}
            {app.matched_skills && (
              <div>
                <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">Matched Skills (JD Parser)</p>
                <div className="flex flex-wrap gap-2 p-4 bg-sage/5 border border-sage/10 rounded-xl">
                  {app.matched_skills.split(',').map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 bg-sage/15 text-sage text-xs font-semibold rounded-lg">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Join Interview Button */}
            {app.stage === 'Screening Scheduled' && (
              <div className="pt-2 border-t border-ink/10">
                <button
                  onClick={() => window.location.href = `/org/interview/${app.id}`}
                  className="w-full py-3 bg-gold text-white rounded-xl text-sm font-bold shadow-md hover:bg-gold/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Video size={18} /> Join Interview Room
                </button>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>

      {/* ── Contact Candidate Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowContact(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-cream rounded-3xl shadow-2xl w-full max-w-2xl border border-ink/10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-ink/8">
                <h3 className="font-serif text-xl font-bold text-ink">
                  Contact {app?.firstname} {app?.lastname}
                </h3>
                <button
                  onClick={() => setShowContact(false)}
                  className="p-2 rounded-xl hover:bg-ink/5 text-ink/40 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-5">
                {/* Template selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-ink/40 uppercase tracking-wider">
                    Email Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTemplateId(id);
                      if (id) applyTemplate(id, contactTemplates);
                    }}
                    className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                  >
                    <option value="">— Select a template (optional) —</option>
                    {contactTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-ink/40 uppercase tracking-wider">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                  />
                </div>

                {/* Body field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-ink/40 uppercase tracking-wider">
                    Body (HTML)
                  </label>
                  <textarea
                    value={contactBody}
                    onChange={(e) => setContactBody(e.target.value)}
                    placeholder="Enter email body..."
                    rows={10}
                    className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all resize-y font-mono"
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink/8 bg-warm-sand/20">
                <button
                  onClick={() => setShowContact(false)}
                  disabled={sending}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sending || !contactSubject.trim() || !contactBody.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-sage text-white rounded-xl text-sm font-bold hover:bg-sage/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PlatformScoreCard({ icon, label, score, skills }: { icon: React.ReactNode, label: string, score: number | null | undefined, skills?: string }) {
  if (score === null && !skills) return null;
  const validScore = (score !== null && score !== undefined) ? Math.min(100, Math.max(0, score)) : 0;
  return (
    <div className="p-3.5 bg-white border border-ink/5 rounded-xl shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-ink/70">{label}</span>
        </div>
        {score !== null && (
          <span className={`text-sm font-mono font-bold ${validScore >= 70 ? 'text-emerald-600' : validScore >= 40 ? 'text-amber-600' : 'text-rust'}`}>
            {validScore.toFixed(1)}%
          </span>
        )}
      </div>
      {score !== null && (
        <div className="w-full h-1.5 bg-ink/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${validScore}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full ${validScore >= 70 ? 'bg-emerald-500' : validScore >= 40 ? 'bg-amber-500' : 'bg-rust'}`}
          />
        </div>
      )}
      {skills && (
        <p className="text-[10px] text-ink/50 mt-1 line-clamp-2 leading-relaxed">
          {skills}
        </p>
      )}
    </div>
  );
}

function ScoreCard({ label, value, highlight }: { label: string; value: number | null | undefined; highlight?: boolean }) {
  if (value === null || value === undefined) {
    return (
      <div className={`p-3 rounded-xl ${highlight ? 'bg-sage/10 border border-sage/20' : 'bg-warm-sand/50'}`}>
        <p className="text-[10px] text-ink/40 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-lg font-bold font-mono mt-1 text-ink/20">—</p>
      </div>
    );
  }
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={`p-3 rounded-xl ${highlight ? 'bg-sage/10 border border-sage/20' : 'bg-warm-sand/50'}`}>
      <p className="text-[10px] text-ink/40 uppercase tracking-wider font-semibold">{label}</p>
      <p className={`text-lg font-bold font-mono mt-1 ${value >= 70 ? 'text-emerald-600' : value >= 40 ? 'text-amber-600' : 'text-rust'}`}>
        {value.toFixed(1)}%
      </p>
      <div className="w-full h-1.5 bg-ink/5 rounded-full mt-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-rust'}`}
        />
      </div>
    </div>
  );
}
