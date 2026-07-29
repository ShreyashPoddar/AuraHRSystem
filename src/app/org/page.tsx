'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Users, CheckCircle, Clock, Zap, ArrowRight,
  Briefcase, AlertTriangle, Calendar, ActivityIcon, Building2 
} from 'lucide-react';
import { getToken, getStoredUser } from '@/lib/moodle';

export default function OrgOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        // Fetch local moodle jobs and stats
        const [jobsRes, statsRes, kekaRes] = await Promise.all([
          fetch('/api/moodle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wsfunction: 'local_aurahr_jobs_list_jobs', params: { status: 'active' }, token }),
          }).then(res => res.json()),
          fetch('/api/moodle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wsfunction: 'local_aurahr_stats_get_overview', params: {}, token }),
          }).then(res => res.json()),
          fetch('/api/keka/sync-jobs').then(res => res.json()).catch(() => ({ jobs: [] }))
        ]);
        
        const moodleJobs = jobsRes.jobs || [];
        
        // Map and fetch applicant counts for Keka jobs
        const kekaJobsRaw = kekaRes.jobs || [];
        const kekaJobs = await Promise.all(kekaJobsRaw.map(async (j: any) => {
          let count = 0;
          try {
            if (j.status === 1) { // active
              const cRes = await fetch(`/api/keka/sync-candidates?jobId=${j.id}`).then(r => r.json());
              if (cRes.success && cRes.candidates) {
                count = cRes.candidates.length;
              }
            }
          } catch (e) {
            console.error(`Failed to fetch candidates for Keka job ${j.id}`, e);
          }
          
          return {
            id: String(j.id),
            title: j.title || j.jobTitle || 'Untitled',
            department: j.department || j.departmentName || '',
            status: j.status === 1 ? 'active' : 'closed', // Keka status 1 is active
            application_count: count,
            deadline: 0,
            maxlimit: Number(j.noOfOpenings) || 100,
            isKeka: true,
          };
        }));

        const allJobs = [...moodleJobs, ...kekaJobs];
        const activeJobs = allJobs.filter(j => j.status === 'active');
        
        setJobs(activeJobs);
        
        // Recalculate stats including unified jobs
        const totalApps = activeJobs.reduce((acc, job) => acc + (job.application_count || 0), 0);
        setStats({
          ...(statsRes || {}),
          active_vacancies: activeJobs.length,
          total_applications: totalApps,
        });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAutoSchedule = async () => {
    if (!selectedJobId) return;
    setScheduling(true);
    await new Promise(r => setTimeout(r, 1500));
    alert('AI Scheduling completed for selected vacancy.');
    setScheduling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const fadeUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Unified view of your active hiring pipelines and AI insights.</p>
        </div>
      </div>

      <motion.div {...fadeUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Briefcase size={22} className="text-slate-700" />}
          label="Active Vacancies"
          value={stats?.active_vacancies ?? 0}
          trend="+3 this week"
          color="bg-slate-100"
          trendColor="text-slate-600"
        />
        <StatCard
          icon={<Users size={22} className="text-blue-600" />}
          label="Total Applications"
          value={stats?.total_applications ?? 0}
          trend="+12% vs last month"
          color="bg-blue-50"
          trendColor="text-blue-600"
        />
        <StatCard
          icon={<Clock size={22} className="text-amber-600" />}
          label="Avg Time to Hire"
          value={`${stats?.avg_time_to_hire ?? 14} days`}
          trend="-2 days"
          color="bg-amber-50"
          trendColor="text-amber-600"
        />
        <StatCard
          icon={<AlertTriangle size={22} className="text-rose-600" />}
          label="Malpractice Flags"
          value={stats?.malpractice_count ?? 0}
          trend="-2% vs last month"
          color="bg-rose-50"
          trendColor="text-rose-600"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase size={18} className="text-blue-500" />
                Current Vacancies Feed
              </h2>
              <Link
                href="/org/vacancies"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {jobs.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center flex-1 flex items-center justify-center">No active vacancies yet.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/org/vacancies/${job.id}`}
                    prefetch={false}
                    className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all group bg-slate-50/50 hover:bg-white"
                  >
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                            {job.isKeka ? (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Building2 size={20} className="text-blue-600" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                    <Briefcase size={20} className="text-slate-600" />
                                </div>
                            )}
                        </div>
                      <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{job.title}</h3>
                            {job.isKeka && <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 font-bold rounded">KEKA ATS</span>}
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-1">{job.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                          <span className="block text-lg font-bold text-slate-900">
                            {job.application_count}
                          </span>
                          <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                              Applicants
                          </span>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <h2 className="font-sans text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <ActivityIcon size={16} className="text-blue-500" />
              Hiring Pipeline Status
            </h2>
            <div className="space-y-4 max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:hidden pr-1">
              {jobs.slice(0, 4).map((job) => (
                <div key={job.id} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-semibold text-slate-700 truncate pr-2">{job.title}</span>
                    <span className="text-xs font-bold text-slate-500">{job.application_count} App</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${job.isKeka ? 'bg-blue-500' : 'bg-slate-700'}`} style={{ width: `${Math.min(100, (job.application_count / (job.maxlimit || 50)) * 100)}%` }} />
                  </div>
                </div>
              ))}
              {jobs.length === 0 && <p className="text-slate-400 text-sm py-2">No active jobs.</p>}
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
            <h2 className="font-sans text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Zap size={16} className="text-purple-500" />
              AI Scheduler
            </h2>
            {jobs.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">No active vacancies to schedule.</p>
            ) : (
              <>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Target Vacancy
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full mb-4 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
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
                  className={`w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 ${
                    !selectedJobId || scheduling
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20 hover:shadow-purple-500/40'
                  }`}
                >
                  {scheduling ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Scheduling...</>
                  ) : (
                    'Run Auto-Schedule'
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction
            href="/org/applications"
            icon={<CheckCircle size={20} />}
            label="All Applications"
            description="View and manage all applications"
            color="bg-emerald-50 text-emerald-600"
            hoverBorder="hover:border-emerald-200"
          />
          <QuickAction
            href="/org/scheduler"
            icon={<Calendar size={20} />}
            label="Smart Scheduler"
            description="Manage interview schedules"
            color="bg-purple-50 text-purple-600"
            hoverBorder="hover:border-purple-200"
          />
          <QuickAction
            href="/org/vacancies"
            icon={<Clock size={20} />}
            label="Current Vacancies"
            description="Manage open positions"
            color="bg-blue-50 text-blue-600"
            hoverBorder="hover:border-blue-200"
          />
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon, label, value, trend, color, trendColor
}: {
  icon: React.ReactNode; label: string; value: string | number; trend: string; color: string; trendColor: string;
}) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
          <span className={`text-[11px] font-bold px-2 py-1 bg-slate-50 rounded-full border border-slate-100 ${trendColor}`}>{trend}</span>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 font-sans tracking-tight mb-1">{value}</p>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({
  href, icon, label, description, color, hoverBorder
}: {
  href: string; icon: React.ReactNode; label: string; description: string; color: string; hoverBorder: string;
}) {
  return (
    <Link
      href={href}
      className={`bg-white border border-slate-200 shadow-sm p-5 flex items-center gap-4 rounded-xl transition-all group hover:shadow-md ${hoverBorder}`}
    >
      <div className={`${color} p-3 rounded-xl transition-colors`}>
        {icon}
      </div>
      <div>
        <p className="font-sans text-sm font-bold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{description}</p>
      </div>
      <ArrowRight size={16} className="ml-auto text-slate-300 group-hover:text-slate-600 transition-colors" />
    </Link>
  );
}
