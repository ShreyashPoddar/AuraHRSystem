'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ArrowUpDown, Users, AlertTriangle,
  Loader2, Star, Eye, X, Mail, Phone, MapPin, Briefcase, GraduationCap, Code, Video,
  FileText, ChevronRight, RefreshCw
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';
import RadarChart from '@/components/RadarChart';

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
  github_score?: number | null;
  leetcode_score?: number | null;
  overall_score?: number | null;
  malpractice: number;
  recruiter_rating: number;
  timecreated: number;
  timemodified: number;
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
  github_score: number | null;
  leetcode_score: number | null;
  github_url?: string;
  leetcode_url?: string;
  matched_skills: string;
  recruiter_rating: number;
  recruiter_feedback: string;
  ai_summary: string;
  timecreated: number;
  timemodified: number;
}

const STAGES = ['applied', 'screened', 'academia', 'interview', 'offer', 'selected', 'rejected'];

const stageColors: Record<string, string> = {
  applied: 'bg-blue-500/15 text-blue-700 border-blue-200',
  screened: 'bg-amber-500/15 text-amber-700 border-amber-200',
  academia: 'bg-purple-500/15 text-purple-700 border-purple-200',
  interview: 'bg-gold/15 text-gold border-gold/30',
  offer: 'bg-sage/15 text-sage border-sage/30',
  selected: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  rejected: 'bg-rust/15 text-rust border-rust/30',
};

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
  jobId: number;
  refreshTrigger?: number;
}

export default function RankedApplicationsTable({ jobId, refreshTrigger }: RankedApplicationsTableProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortField, setSortField] = useState('overall_score');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedApp, setSelectedApp] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stageCounts, setStageCounts] = useState<Array<{stage: string, count: number}>>([]);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadApplications = useCallback(async (isBackground = false) => {
    if (!jobId) return;
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
  }, [jobId, stageFilter, search, sortField, sortDir, refreshTrigger]);

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

  async function openDetail(appId: number) {
    setDetailLoading(true);
    try {
      const detail = await moodleCall<ApplicationDetail>('local_aurahr_jobs_get_application', { applicationid: appId });
      setSelectedApp(detail);
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

      {/* Pipeline chips */}
      {stageCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStageFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              stageFilter === '' ? 'bg-ink text-cream border-ink' : 'bg-ink/5 text-ink/50 border-ink/10 hover:border-ink/20'
            }`}
          >
            All ({stageCounts.reduce((acc, curr) => acc + curr.count, 0)})
          </button>
          {stageCounts.map((s) => (
            <button
              key={s.stage}
              onClick={() => setStageFilter(stageFilter === s.stage ? '' : s.stage)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
                stageFilter === s.stage
                  ? stageColors[s.stage] || 'bg-ink text-cream border-ink'
                  : 'bg-ink/5 text-ink/50 border-ink/10 hover:border-ink/20'
              }`}
            >
              {s.stage} ({s.count})
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
              className={`px-2 py-1 rounded-lg transition-colors ${
                sortField === f ? 'bg-gold/15 text-gold font-semibold' : 'hover:bg-ink/5'
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
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">App ID</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">Date Applied</th>
                <th className="text-right px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">GitHub</th>
                <th className="text-right px-5 py-3.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">LeetCode</th>
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
                      onClick={() => openDetail(app.id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage/40 to-gold/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {app.firstname[0]}{app.lastname[0]}
                      </div>
                      <p className="text-sm font-semibold text-ink truncate max-w-[150px] hover:text-sage transition-colors">{app.firstname} {app.lastname}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono text-ink/40">APP-{app.id}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-ink/50">{formatDate(app.timecreated)}</span>
                  </td>
                  <td className={`px-5 py-4 text-right text-sm font-mono font-medium ${scoreColor(app.github_score)}`}>
                    {app.github_score !== null && app.github_score !== undefined ? `${app.github_score.toFixed(1)}` : '—'}
                  </td>
                  <td className={`px-5 py-4 text-right text-sm font-mono font-medium ${scoreColor(app.leetcode_score)}`}>
                    {app.leetcode_score !== null && app.leetcode_score !== undefined ? `${app.leetcode_score.toFixed(1)}` : '—'}
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
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize whitespace-nowrap ${stageColors[app.stage] || 'bg-ink/5 text-ink/50'}`}>
                      {app.stage}
                    </span>
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
        {(selectedApp || detailLoading) && (
          <CandidateDetailPopup
            app={selectedApp}
            loading={detailLoading}
            onClose={() => setSelectedApp(null)}
            onStageUpdate={loadApplications}
          />
        )}
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
  onStageUpdate: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  async function moveStage(newStage: string) {
    if (!app) return;
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
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-white border border-ink/10 rounded-xl shadow-xl overflow-hidden z-10"
                      >
                        <div className="px-3 py-2 text-[10px] font-bold text-ink/40 uppercase tracking-wider bg-ink/5">Move to stage</div>
                        {STAGES.filter(s => s !== app.stage).map(s => (
                          <button
                            key={s}
                            onClick={() => moveStage(s)}
                            className="w-full text-left px-4 py-2.5 text-sm font-semibold capitalize hover:bg-sage/10 hover:text-sage transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
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
                <span className={`text-sm font-bold px-3 py-1 rounded-lg capitalize ${stageColors[app.stage] || 'bg-ink/5 text-ink/50'}`}>
                  {app.stage}
                </span>
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
              {app.github_url && (
                <a href={app.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-ink bg-ink/10 hover:bg-ink/20 px-3 py-1.5 rounded-xl transition-colors">
                  <Code size={12} /> GitHub
                </a>
              )}
              {app.leetcode_url && (
                <a href={app.leetcode_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-gold bg-gold/10 hover:bg-gold/20 px-3 py-1.5 rounded-xl transition-colors">
                  <Code size={12} /> LeetCode
                </a>
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
                  <ScoreCard label="JD Parser" value={app.jd_score} />
                  <ScoreCard label="Academia" value={app.academia_score} />
                  <ScoreCard label="Interview" value={app.interview_score} />
                  <ScoreCard label="Overall" value={app.overall_score} highlight />
                  {(app.github_score !== null && app.github_score !== undefined) ? <ScoreCard label="GitHub" value={app.github_score} /> : null}
                  {(app.leetcode_score !== null && app.leetcode_score !== undefined) ? <ScoreCard label="LeetCode" value={app.leetcode_score} /> : null}
                </div>
              </div>

              {/* Radar Chart */}
              <div className="bg-warm-sand/20 rounded-2xl p-4 flex flex-col justify-center items-center h-full">
                <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2 w-full">Performance Radar</p>
                <div className="w-full h-40">
                  <RadarChart data={{
                    technical: app.jd_score || 0,
                    culture: app.interview_score || 0,
                    communication: app.interview_score || 0,
                    leadership: app.overall_score || 0,
                    adaptability: app.academia_score || 0
                  }} />
                </div>
              </div>
            </div>

            {/* External Platform & Resume Skills */}
            <div>
              <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-3">Skill Sources & Scores</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlatformScoreCard icon={<FileText size={16} className="text-blue-500" />} label="Resume Skills" skills={app.resume_skills} score={app.jd_score} />
                <PlatformScoreCard icon={<Code size={16} className="text-ink" />} label="GitHub" score={app.github_score} />
                <PlatformScoreCard icon={<Code size={16} className="text-gold" />} label="LeetCode" score={app.leetcode_score} />
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
            {app.stage === 'interview' && (
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
