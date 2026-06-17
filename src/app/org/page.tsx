'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Briefcase, Users, CheckCircle, Clock, AlertTriangle,
  ArrowRight, TrendingUp, Zap, Calendar, Target, Activity, Play, ActivityIcon,
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

interface Job {
  id: number;
  title: string;
  department: string;
  status: string;
  application_count: number;
  deadline: number;
  maxlimit: number;
}

interface StageCount {
  stage: string;
  count: number;
}

interface Stats {
  total_applications: number;
  active_jobs: number;
  malpractice_count: number;
  avg_overall_score: number;
  stage_counts: StageCount[];
  team_gaps?: string[];
}

const stageColors: Record<string, string> = {
  applied: 'bg-blue-500/15 text-blue-700',
  screened: 'bg-amber-500/15 text-amber-700',
  academia: 'bg-purple-500/15 text-purple-700',
  interview: 'bg-gold/15 text-gold',
  offer: 'bg-sage/15 text-sage',
  selected: 'bg-emerald-500/15 text-emerald-700',
  rejected: 'bg-rust/15 text-rust',
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function OrgOverviewPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [closedJobs, setClosedJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<number | ''>('');
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [jobsRes, closedJobsRes, statsRes] = await Promise.all([
          moodleCall<{ jobs: Job[] }>('local_aurahr_jobs_list_jobs', { status: 'active' }),
          moodleCall<{ jobs: Job[] }>('local_aurahr_jobs_list_jobs', { status: 'closed' }),
          moodleCall<Stats>('local_aurahr_jobs_get_stats', {})
        ]);
        setJobs(jobsRes.jobs);
        setClosedJobs(closedJobsRes.jobs);
        setStats(statsRes);
        
        // Auto-select first job if any
        if (jobsRes.jobs && jobsRes.jobs.length > 0) {
          setSelectedJobId(jobsRes.jobs[0].id);
        }
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAutoSchedule() {
    if (!selectedJobId) return alert('Please select a vacancy first');
    setScheduling(true);
    try {
      const res = await moodleCall<{ success: boolean; scheduled: number; message: string }>(
        'local_aurahr_scheduler_auto_schedule',
        { jobid: selectedJobId }
      );
      if (res.success) {
        alert(res.message);
      } else {
        alert('Failed to auto-schedule: ' + res.message);
      }
    } catch (err: any) {
      alert('Error running auto-schedule: ' + err.message);
    } finally {
      setScheduling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Page Header */}
      <motion.div {...fadeUp} transition={{ delay: 0 }}>
        <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Overview</h1>
        <p className="text-ink/50 mt-1 font-sans text-sm">
          Welcome back. Here&apos;s what&apos;s happening across your recruitment.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Briefcase size={20} />}
          label="Active Vacancies"
          value={stats?.active_jobs ?? 0}
          color="bg-sage/10 text-sage"
        />
        <StatCard
          icon={<Users size={20} />}
          label="Total Applications"
          value={stats?.total_applications ?? 0}
          color="bg-gold/10 text-gold"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Avg. Overall Score"
          value={`${stats?.avg_overall_score?.toFixed(1) ?? '0'}%`}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Malpractice Flags"
          value={stats?.malpractice_count ?? 0}
          color="bg-rust/10 text-rust"
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        {/* Current Vacancies Widget */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="w-full">
          <div className="bento-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
                <Briefcase size={18} className="text-sage" />
                Current Vacancies
              </h2>
              <Link
                href="/org/vacancies"
                className="text-xs font-medium text-sage hover:text-sage/80 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {jobs.length === 0 ? (
              <p className="text-ink/40 text-sm py-8 text-center">No active vacancies yet.</p>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 5).map((job) => (
                  <Link
                    key={job.id}
                    href={`/org/vacancies/${job.id}`}
                    className="flex items-center justify-between p-4 rounded-2xl bg-warm-sand/40 hover:bg-warm-sand/70 transition-colors group"
                  >
                    <div>
                      <p className="font-sans text-sm font-semibold text-ink group-hover:text-sage transition-colors">
                        {job.title}
                      </p>
                      <p className="text-xs text-ink/40 mt-0.5">{job.department || 'General'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-ink/50">
                        {job.application_count} applicants
                      </span>
                      <ArrowRight size={14} className="text-ink/20 group-hover:text-sage transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>


      </div>

      {/* Secondary Grid for other widgets */}
      <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hiring Status per Vacancy Widget */}
        <div className="bento-card p-6">
          <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-4">
            <ActivityIcon size={18} className="text-blue-500" />
            Hiring Status
          </h2>
          <div className="space-y-4">
            {jobs.slice(0, 3).map((job) => (
              <div key={job.id} className="border-b border-ink/5 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-ink truncate">{job.title}</span>
                  <span className="text-xs font-mono font-bold text-ink/50">{job.application_count}</span>
                </div>
                <div className="w-full h-1.5 bg-ink/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (job.application_count / (job.maxlimit || 50)) * 100)}%` }} />
                </div>
              </div>
            ))}
            {jobs.length === 0 && <p className="text-ink/40 text-sm text-center py-2">No active jobs.</p>}
          </div>
        </div>

        {/* Finished Processes Widget */}
        <div className="bento-card p-6">
          <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-emerald-500" />
            Finished Processes
          </h2>
          <div className="space-y-3">
            {closedJobs.length === 0 ? (
              <p className="text-ink/40 text-sm py-4 text-center">No finished processes yet.</p>
            ) : (
              closedJobs.slice(0, 3).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-ink/5">
                  <div>
                    <p className="text-sm font-semibold text-ink">{job.title}</p>
                    <p className="text-xs text-ink/50 mt-0.5">{job.application_count} Applicants</p>
                  </div>
                  <Link href={`/org/vacancies/${job.id}`}>
                    <ArrowRight size={14} className="text-ink/20 hover:text-emerald-500 cursor-pointer transition-colors" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Critical Tech Gaps & AI Scheduler */}
        <div className="space-y-6">
          {/* Critical Tech Gaps Widget */}
          <div className="bento-card p-5 bg-sage/5 border-sage/10">
            <h2 className="font-serif text-base font-semibold text-ink flex items-center gap-2 mb-3">
              <Users size={16} className="text-sage" />
              Critical Tech Gaps
            </h2>
            {stats?.team_gaps && stats.team_gaps.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                {stats.team_gaps.map((skill, index) => (
                  <span
                    key={index}
                    className="text-[10px] font-semibold px-2 py-1 rounded bg-sage/15 text-sage capitalize"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink/50 italic">No critical tech gaps identified.</p>
            )}
          </div>

          {/* AI Scheduler Widget */}
          <div className="bento-card p-5 bg-gold/5 border-gold/10">
            <h2 className="font-serif text-base font-semibold text-ink flex items-center gap-2 mb-2">
              <Zap size={16} className="text-gold" />
              AI Scheduler
            </h2>
            {jobs.length === 0 ? (
              <p className="text-xs text-ink/50 italic mb-3">No active vacancies to schedule.</p>
            ) : (
              <>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-ink/40 mb-1">
                  Target Vacancy
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full mb-3 p-2 text-xs bg-white border border-ink/10 rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-gold/30"
                >
                  <option value="">Select a vacancy...</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAutoSchedule}
                  disabled={!selectedJobId || scheduling}
                  className={`w-full py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm ${
                    !selectedJobId || scheduling
                      ? 'bg-gold/40 cursor-not-allowed'
                      : 'bg-gold hover:bg-gold/90'
                  }`}
                >
                  {scheduling ? 'Scheduling...' : 'Run Auto-Schedule'}
                </button>
              </>
            )}
          </div>
        </div>

      </motion.div>

      {/* Quick Actions Row */}
      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction
            href="/org/applications"
            icon={<CheckCircle size={20} />}
            label="All Applications"
            description="View and manage all applications"
            color="text-sage"
          />
          <QuickAction
            href="/org/scheduler"
            icon={<Calendar size={20} />}
            label="Smart Scheduler"
            description="Manage interview schedules"
            color="text-gold"
          />
          <QuickAction
            href="/org/vacancies"
            icon={<Clock size={20} />}
            label="Current Vacancies"
            description="Manage open positions"
            color="text-blue-600"
          />
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <div className="bento-card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-ink/40 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-ink font-serif mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({
  href, icon, label, description, color,
}: {
  href: string; icon: React.ReactNode; label: string; description: string; color: string;
}) {
  return (
    <Link
      href={href}
      className="bento-card p-5 flex items-center gap-4 hover:shadow-lg hover:border-ink/15 transition-all group"
    >
      <div className={`${color} opacity-70 group-hover:opacity-100 transition-opacity`}>
        {icon}
      </div>
      <div>
        <p className="font-sans text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink/40 mt-0.5">{description}</p>
      </div>
      <ArrowRight size={14} className="ml-auto text-ink/15 group-hover:text-ink/40 transition-colors" />
    </Link>
  );
}
