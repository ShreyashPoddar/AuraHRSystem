'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, MapPin, Clock, Users, Loader2, Search, ArrowRight, CheckCircle,
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

interface Job {
  id: number;
  title: string;
  description: string;
  department: string;
  vacancies: number;
  deadline: number;
  application_count: number;
}

export default function OpenPostsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<number | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          moodleCall<{ jobs: Job[] }>('local_aurahr_jobs_list_jobs', { status: 'active' }),
          moodleCall<{ applications: Array<{ jobid: number }> }>('local_aurahr_jobs_list_applications', { jobid: 0 })
        ]);
        setJobs(jobsRes.jobs);
        
        const appliedIds = new Set<number>();
        if (appsRes.applications) {
          appsRes.applications.forEach((app) => {
            appliedIds.add(app.jobid);
          });
        }
        setApplied(appliedIds);
      } catch (err) {
        console.error('Failed to load jobs or applications:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleApply(jobId: number) {
    setApplying(jobId);
    try {
      await moodleCall('local_aurahr_jobs_apply', { jobid: jobId });
      setApplied(prev => new Set(prev).add(jobId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Apply failed';
      alert(msg);
    } finally {
      setApplying(null);
    }
  }

  function formatDate(ts: number) {
    if (!ts) return 'No deadline';
    const d = new Date(ts * 1000);
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'Expired';
    if (diff === 0) return 'Today';
    if (diff <= 7) return `${diff} days left`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const filtered = jobs.filter(
    (j) => j.title.toLowerCase().includes(search.toLowerCase()) ||
           j.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Open Positions</h1>
        <p className="text-ink/50 mt-1 text-sm">Browse and apply to available job openings.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or department..."
          className="w-full pl-11 pr-4 py-3 bg-cream border border-ink/8 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-card p-12 text-center">
          <Briefcase size={40} className="text-ink/15 mx-auto mb-3" />
          <p className="text-ink/40 text-sm">
            {search ? 'No matching positions found.' : 'No open positions right now. Check back later!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((job, idx) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bento-card p-6 hover:shadow-lg hover:border-blue-200/50 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-sans text-base font-semibold text-ink">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-ink/40">
                      <MapPin size={12} /> {job.department || 'General'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-ink/40">
                      <Users size={12} /> {job.vacancies} opening{job.vacancies > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-ink/40">
                      <Clock size={12} /> {formatDate(job.deadline)}
                    </span>
                  </div>
                  <p className="text-sm text-ink/50 mt-3 line-clamp-2 leading-relaxed">
                    {job.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                  </p>
                </div>

                <div className="shrink-0">
                  {applied.has(job.id) ? (
                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-semibold">
                      <CheckCircle size={16} />
                      Applied
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleApply(job.id)}
                      disabled={applying === job.id}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-ink text-cream rounded-2xl text-sm font-semibold hover:bg-ink/90 disabled:opacity-60 transition-colors shadow-md"
                    >
                      {applying === job.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          Apply <ArrowRight size={14} />
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
