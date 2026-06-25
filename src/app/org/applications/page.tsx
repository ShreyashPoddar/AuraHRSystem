'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FileText, ArrowRight, Calendar, X,
  Loader2, CheckCircle, Briefcase,
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

interface Job {
  id: number;
  title: string;
  description: string;
  department: string;
  status: string;
  application_count: number;
  deadline: number;
  timecreated: number;
  timemodified: number;
  _fromKeka?: boolean;
}

const statusBadge: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700',
  closed: 'bg-ink/10 text-ink/50',
  archived: 'bg-rust/10 text-rust/70',
};

export default function ApplicationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      // Load Moodle jobs
      const res = await moodleCall<{ jobs: Job[] }>('local_aurahr_jobs_list_jobs', { status: 'all' });
      const moodleJobs = res.jobs;

      // Load Keka jobs
      let kekaJobs: Job[] = [];
      try {
        const kekaRes = await fetch('/api/keka/sync-jobs');
        const kekaData = await kekaRes.json();
        if (kekaData.success && Array.isArray(kekaData.jobs)) {
          const moodleIds = new Set(moodleJobs.map((j) => j.id));
          const baseKekaJobs = kekaData.jobs.filter((kj: any) => !moodleIds.has(kj.id));
          
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
              description: '',
              department: kj.department || kj.departmentName || '',
              status: 'active',
              application_count: count,
              deadline: 0,
              timecreated: 0,
              timemodified: 0,
              _fromKeka: true,
            };
          }));
        }
      } catch (kekaErr) {
        console.warn('Keka job sync failed:', kekaErr);
      }

      setJobs([...moodleJobs, ...kekaJobs]);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.department.toLowerCase().includes(search.toLowerCase())
  );

  function formatDate(ts: number) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  return (
    <div className="space-y-6 flex-1 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Applications</h1>
          <p className="text-ink/50 mt-1 font-sans text-sm">
            Manage all job postings and view their application pipelines.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-ink text-cream rounded-2xl font-sans text-sm font-semibold hover:bg-ink/90 transition-colors shadow-lg shadow-ink/10"
        >
          <Plus size={18} />
          <span>Create Vacancy</span>
        </motion.button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or department..."
          className="w-full pl-11 pr-4 py-3 bg-cream border border-ink/8 rounded-2xl text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
        />
      </div>

      {/* Jobs list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-sage" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-card p-12 text-center">
          <Briefcase size={40} className="text-ink/15 mx-auto mb-3" />
          <p className="text-ink/40 text-sm">
            {search ? 'No matching vacancies found.' : 'No vacancies created yet. Click "Create Vacancy" to get started.'}
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
            >
              <Link
                href={`/org/applications/${job.id}`}
                className="bento-card p-5 flex items-center justify-between hover:shadow-lg hover:border-ink/15 transition-all group block"
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className="p-3 rounded-xl bg-sage/10 text-sage shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-sans text-sm font-semibold text-ink group-hover:text-sage transition-colors flex items-center gap-2">
                      <span className="truncate">{job.title}</span>
                      {job._fromKeka && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-500/15 text-teal-600 border border-teal-500/20 tracking-wide uppercase">
                          Keka
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-ink/40 mt-0.5">
                      {job.department || 'General'} {job.timecreated ? `· Created ${formatDate(job.timecreated)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${statusBadge[job.status] || 'bg-ink/5 text-ink/50'}`}>
                    {job.status}
                  </span>

                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-mono font-semibold text-ink">{job.application_count}</p>
                    <p className="text-[10px] text-ink/30 uppercase tracking-wider">applicants</p>
                  </div>

                  {job.deadline > 0 && (
                    <div className="text-right hidden md:block">
                      <div className="flex items-center gap-1 text-xs text-ink/40">
                        <Calendar size={12} />
                        <span>{formatDate(job.deadline)}</span>
                      </div>
                    </div>
                  )}

                  <ArrowRight size={16} className="text-ink/15 group-hover:text-sage transition-colors" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Vacancy Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateVacancyModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              loadJobs();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Create Vacancy Modal ──────────────────────────────────────────

function CreateVacancyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    department: '',
    vacancies: 1,
    deadline: '',
    maxlimit: 100,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await moodleCall('local_aurahr_jobs_create_job', {
        title: form.title,
        description: form.description,
        department: form.department,
        vacancies: form.vacancies,
        deadline: form.deadline ? Math.floor(new Date(form.deadline).getTime() / 1000) : 0,
        maxlimit: form.maxlimit,
      });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create vacancy.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-cream rounded-3xl border border-ink/10 shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink/8">
          <h2 className="font-serif text-xl font-bold text-ink">Create New Vacancy</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-ink/5 text-ink/40 hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 bg-rust/10 border border-rust/20 rounded-2xl text-rust text-sm">
              {error}
            </div>
          )}

          <Field label="Job Title" required>
            <input
              type="text" value={form.title} onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer" required
              className="input-field"
            />
          </Field>

          <Field label="Description" required>
            <textarea
              value={form.description} onChange={(e) => update('description', e.target.value)}
              placeholder="Describe the role, responsibilities, and requirements..."
              rows={4} required
              className="input-field resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              <input
                type="text" value={form.department} onChange={(e) => update('department', e.target.value)}
                placeholder="Engineering"
                className="input-field"
              />
            </Field>
            <Field label="Approx. Vacancies">
              <input
                type="number" value={form.vacancies} onChange={(e) => update('vacancies', parseInt(e.target.value) || 1)}
                min={1} required
                className="input-field"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Application Deadline">
              <input
                type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Max Applications">
              <input
                type="number" value={form.maxlimit} onChange={(e) => update('maxlimit', parseInt(e.target.value) || 100)}
                min={1} required
                className="input-field"
              />
            </Field>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-ink text-cream rounded-2xl font-sans font-semibold text-sm hover:bg-ink/90 disabled:opacity-60 transition-colors shadow-lg shadow-ink/10"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <CheckCircle size={18} />
                <span>CREATE</span>
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">
        {label} {required && <span className="text-rust">*</span>}
      </label>
      {children}
    </div>
  );
}
