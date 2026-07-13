'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, ChevronRight, Clock, Users, Loader2 } from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

interface Job {
  id: number;
  title: string;
  department: string;
  status: string;
  application_count: number;
  deadline: number;
  _fromKeka?: boolean;
}

export default function VacanciesLayout({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function load() {
      try {
        // Load Moodle-native jobs
        const res = await moodleCall<{ jobs: Job[] }>('local_aurahr_jobs_list_jobs', { status: 'active' });
        const moodleJobs: Job[] = res.jobs;

        // Load Keka jobs and merge — no hardcoded IDs, purely dynamic
        let kekaJobs: Job[] = [];
        try {
          const kekaRes = await fetch('/api/keka/sync-jobs');
          const kekaData = await kekaRes.json();
          if (kekaData.success && Array.isArray(kekaData.jobs)) {
            // Map Keka shape to our Job interface
            const moodleIds = new Set(moodleJobs.map((j) => j.id));
            const baseKekaJobs = kekaData.jobs.filter((kj: any) => !moodleIds.has(kj.id)); // avoid duplicates
            
            kekaJobs = await Promise.all(baseKekaJobs.map(async (kj: any) => {
              let count = kj.candidateCount ?? 0;
              if (count === 0) {
                 try {
                   const cRes = await fetch(`/api/keka/sync-candidates?jobId=${kj.id}`);
                   const cData = await cRes.json();
                   if (cData.success && Array.isArray(cData.candidates)) {
                     count = cData.candidates.length;
                   }
                 } catch(e) {}
              }
              return {
                id: kj.id,
                title: kj.title || kj.jobTitle || 'Untitled',
                department: kj.department || kj.departmentName || '',
                status: 'active',
                application_count: count,
                deadline: 0,
                _fromKeka: true,
              };
            }));
          }
        } catch (kekaErr) {
          console.warn('Keka job sync failed (non-fatal):', kekaErr);
        }

        setJobs([...moodleJobs, ...kekaJobs]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatDate(ts: number) {
    if (!ts) return 'No deadline';
    return new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="flex flex-row gap-6 w-full h-full">
      {/* Side Panel — Job List */}
      <div className="w-56 lg:w-80 shrink-0">
        <div className="bento-card overflow-hidden h-[calc(100vh-120px)] flex flex-col">
          <div className="px-5 py-4 border-b border-ink/8 shrink-0">
            <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
              <Briefcase size={18} className="text-sage" />
              Open Positions
            </h2>
            <p className="text-xs text-ink/40 mt-0.5">{jobs.length} active vacancies</p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-sage" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-ink/40">No active vacancies</div>
            ) : (
              <div className="divide-y divide-ink/5">
                {jobs.map((job, idx) => {
                  const isSelected = pathname === `/org/vacancies/${job.id}`;
                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <Link
                        href={`/org/vacancies/${job.id}`}
                        className={`flex items-center justify-between px-5 py-4 transition-all group ${
                          isSelected
                            ? 'bg-sage/10 border-l-4 border-sage'
                            : 'hover:bg-warm-sand/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold truncate ${
                              isSelected ? 'text-sage' : 'text-ink group-hover:text-sage'
                            } transition-colors`}>
                              {job.title}
                            </p>
                            {job._fromKeka && (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-500/15 text-teal-600 border border-teal-500/20 tracking-wide uppercase">
                                Keka
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[11px] text-ink/35">
                              <Users size={10} /> {job.application_count}
                            </span>
                            {!job._fromKeka && (
                              <span className="flex items-center gap-1 text-[11px] text-ink/35">
                                <Clock size={10} /> {formatDate(job.deadline)}
                              </span>
                            )}
                            {job.department && (
                              <span className="text-[11px] text-ink/35 truncate">{job.department}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className={`shrink-0 ${
                          isSelected ? 'text-sage' : 'text-ink/15 group-hover:text-ink/30'
                        } transition-colors`} />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-y-auto pr-2">
        {children}
      </div>
    </div>
  );
}
