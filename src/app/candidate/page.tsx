'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Briefcase, FileText, Clock, CheckCircle, AlertTriangle,
  ArrowRight, Calendar, Activity, Play, Video,
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';
import { useAuth } from '@/contexts/AuthContext';

interface Application {
  id: number;
  jobid: number;
  job_title: string;
  job_department: string;
  stage: string;
  overall_score: number;
  jd_score: number;
  malpractice: number;
  timecreated: number;
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

const stageLabels: Record<string, string> = {
  applied: 'Application Submitted',
  screened: 'Under Review',
  academia: 'Assessment Round',
  interview: 'Interview Scheduled',
  offer: 'Offer Stage',
  selected: 'Congratulations! Selected',
  rejected: 'Not Selected',
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // This would need a custom "my applications" endpoint — using a placeholder.
        const res = await moodleCall<{ applications: Application[] }>(
          'local_aurahr_jobs_list_applications',
          { jobid: 0 } // 0 = all jobs, filtered by current user on server side
        );
        setApplications(res.applications || []);
      } catch (err) {
        console.warn("Moodle backend offline. Using high-fidelity mockup data.", err);
        setApplications([
          {
            id: 1,
            jobid: 1,
            job_title: 'Senior Frontend Engineer',
            job_department: 'Engineering',
            stage: 'academia',
            overall_score: 0,
            jd_score: 95,
            malpractice: 0,
            timecreated: Math.floor(Date.now() / 1000) - 86400 * 2
          },
          {
            id: 2,
            jobid: 2,
            job_title: 'Product Manager',
            job_department: 'Product',
            stage: 'interview',
            overall_score: 85,
            jd_score: 88,
            malpractice: 0,
            timecreated: Math.floor(Date.now() / 1000) - 86400 * 5
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeApps = applications.filter(a => !['rejected', 'selected'].includes(a.stage));
  const completedApps = applications.filter(a => ['rejected', 'selected'].includes(a.stage));

  function formatDate(ts: number) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Welcome */}
      <motion.div {...fadeUp}>
        <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">
          Welcome back{user?.firstname ? `, ${user.firstname}` : ''}
        </h1>
        <p className="text-ink/50 mt-1 text-sm">
          Track your applications and upcoming assessments.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600"><FileText size={20} /></div>
          <div>
            <p className="text-xs font-medium text-ink/40 uppercase tracking-wider">Active Applications</p>
            <p className="text-2xl font-bold text-ink font-serif">{activeApps.length}</p>
          </div>
        </div>
        <div className="bento-card p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600"><CheckCircle size={20} /></div>
          <div>
            <p className="text-xs font-medium text-ink/40 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-ink font-serif">{completedApps.length}</p>
          </div>
        </div>
        <div className="bento-card p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-gold/10 text-gold"><Briefcase size={20} /></div>
          <div>
            <p className="text-xs font-medium text-ink/40 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-ink font-serif">{applications.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Active Applications */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            Active Applications
          </h2>
          <Link href="/candidate/applications" className="text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {activeApps.length === 0 ? (
          <div className="bento-card p-12 text-center">
            <Briefcase size={40} className="text-ink/15 mx-auto mb-3" />
            <p className="text-ink/40 text-sm">No active applications.</p>
            <Link href="/candidate/posts" className="text-blue-500 text-sm font-medium hover:underline mt-2 inline-block">
              Browse open positions →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeApps.slice(0, 5).map((app, idx) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                <div className="bento-card p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <p className="font-sans text-sm font-semibold text-ink">{app.job_title}</p>
                      <p className="text-xs text-ink/40 mt-0.5">{app.job_department} · Applied {formatDate(app.timecreated)}</p>
                      {(app.jd_score > 0 || app.overall_score > 0) && (
                        <p className="text-xs font-semibold text-sage mt-1">
                          {app.jd_score > 0 && `JD Score: ${app.jd_score}%`}
                          {app.jd_score > 0 && app.overall_score > 0 && ' | '}
                          {app.overall_score > 0 && `Overall Score: ${app.overall_score}%`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                      {app.malpractice === 1 && <span title="Malpractice flagged"><AlertTriangle size={14} className="text-rust" /></span>}
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${stageColors[app.stage]}`}>
                        {stageLabels[app.stage] || app.stage}
                      </span>
                    </div>
                    {app.stage === 'screened' && (
                       <span className="text-[10px] font-bold text-sage bg-sage/10 px-2 py-0.5 rounded">Shortlisted! Awaiting test schedule.</span>
                    )}
                    {app.stage === 'academia' && (
                       <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1">
                         <AlertTriangle size={10} /> Test Scheduled! Check below.
                       </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Grid for other widgets */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tests Scheduled Widget */}
        <div className="bento-card p-6">
          <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-4">
            <Activity size={18} className="text-purple-500" />
            Tests Scheduled
          </h2>
          <div className="space-y-3">
            {applications.filter(a => a.stage === 'academia').length === 0 ? (
              <p className="text-xs text-ink/40 italic">No tests scheduled at the moment.</p>
            ) : (
              applications.filter(a => a.stage === 'academia').map((app) => (
                <div key={app.id} className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-ink">{app.job_title} - Academia</p>
                  </div>
                  <p className="text-xs text-ink/50 mb-3">Check test portal for timings</p>
                  <Link href={`/candidate/test/${app.jobid}`} className="flex items-center justify-center gap-2 w-full py-2 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 transition-colors shadow-sm">
                    <Play size={14} /> START TEST
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Interviews Scheduled Widget */}
        <div className="bento-card p-6">
          <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-gold" />
            Interviews Scheduled
          </h2>
          <div className="space-y-3">
            {/* Dummy interview data for UI display */}
            <div className="p-4 rounded-xl bg-gold/5 border border-gold/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-ink">Product Manager - Final Round</p>
              </div>
              <p className="text-xs text-ink/50 mb-3">Tomorrow, 10:00 AM - 11:00 AM</p>
              <Link href="/candidate/interview/1" className="flex items-center justify-center gap-2 w-full py-2 bg-ink/5 text-ink/50 rounded-lg text-xs font-bold cursor-not-allowed">
                <Video size={14} /> JOIN NOW
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Finished Processes Widget */}
      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-4">
          <CheckCircle size={18} className="text-emerald-500" />
          Finished Processes
        </h2>
        {completedApps.length === 0 ? (
          <p className="text-ink/40 text-sm">No finished processes yet.</p>
        ) : (
          <div className="space-y-3">
            {completedApps.slice(0, 3).map((app, idx) => (
              <div key={app.id} className="bento-card p-4 flex items-center justify-between bg-ink/5 border-none opacity-80 hover:opacity-100 transition-opacity">
                <div>
                  <p className="font-sans text-sm font-semibold text-ink">{app.job_title}</p>
                  <p className="text-xs text-ink/50 mt-0.5">Finished {formatDate(app.timecreated)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${stageColors[app.stage]}`}>
                    {stageLabels[app.stage] || app.stage}
                  </span>
                  <Link href={`/candidate/applications/${app.id}`} className="text-blue-500 hover:text-blue-600 flex items-center">
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/candidate/posts" className="bento-card p-5 flex items-center gap-4 hover:shadow-lg hover:border-blue-200 transition-all group">
            <Briefcase size={20} className="text-blue-500 opacity-70 group-hover:opacity-100" />
            <div>
              <p className="font-sans text-sm font-semibold text-ink">Browse Open Posts</p>
              <p className="text-xs text-ink/40 mt-0.5">Find and apply to new positions</p>
            </div>
            <ArrowRight size={14} className="ml-auto text-ink/15 group-hover:text-ink/40" />
          </Link>
          <Link href="/candidate/profile" className="bento-card p-5 flex items-center gap-4 hover:shadow-lg hover:border-gold/30 transition-all group">
            <Calendar size={20} className="text-gold opacity-70 group-hover:opacity-100" />
            <div>
              <p className="font-sans text-sm font-semibold text-ink">Complete Profile</p>
              <p className="text-xs text-ink/40 mt-0.5">Upload resume and set availability</p>
            </div>
            <ArrowRight size={14} className="ml-auto text-ink/15 group-hover:text-ink/40" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
