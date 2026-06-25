'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Users, BookOpen, AlertCircle, X, CheckCircle 
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

interface ResultsTabProps {
  jobId: number | string;
  initialStatus?: string;
}

interface StageCount {
  stage: string;
  count: number;
}

interface JobStats {
  total_applications: number;
  stage_counts: StageCount[];
}

interface Application {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  overall_score: number;
}

export default function ResultsTab({ jobId, initialStatus }: ResultsTabProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [ended, setEnded] = useState(initialStatus === 'closed');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statsData, setStatsData] = useState<JobStats | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Application[]>([]);

  useEffect(() => {
    async function fetchStats() {
      if (!jobId) return;

      const isKekaJob = typeof jobId === 'string' && jobId.includes('-');
      if (isKekaJob) {
        setStatsData({
          total_applications: 0,
          stage_counts: []
        });
        setSelectedCandidates([]);
        return;
      }

      try {
        const [statsRes, candidatesRes] = await Promise.all([
          moodleCall<JobStats>('local_aurahr_jobs_get_stats', { jobid: jobId }),
          moodleCall<{applications: Application[]}>('local_aurahr_jobs_list_applications', { 
            jobid: jobId, 
            stage: 'selected',
            sort_field: 'overall_score',
            sort_dir: 'DESC',
            limitfrom: 0,
            limitnum: 100
          })
        ]);
        setStatsData(statsRes);
        setSelectedCandidates(candidatesRes.applications);
      } catch (err) {
        console.error('Failed to load job results data:', err);
      }
    }
    fetchStats();
  }, [jobId]);

  const handleEndApplication = async () => {
    setIsUpdating(true);
    try {
      await moodleCall('local_aurahr_jobs_update_job', { jobid: jobId, status: 'closed' });
      setEnded(true);
      setShowConfirm(false);
      // Optional: Refresh the main page to reflect the new status badge in the header
      window.location.reload();
    } catch (error) {
      console.error('Failed to close job:', error);
      alert('Failed to close the vacancy. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getCount = (stageName: string) => {
    if (!statsData) return 0;
    return statsData.stage_counts.find(s => s.stage === stageName)?.count || 0;
  };

  const totalApplied = statsData?.total_applications || 0;
  const numSelected = getCount('selected');
  const numInterview = getCount('interview');
  const numAcademia = getCount('academia');
  const qualifiedInterview = numInterview + numSelected;
  const qualifiedAcademia = numAcademia + qualifiedInterview;

  const stats = [
    { label: 'no. of applicants applied', value: totalApplied, icon: <Users size={16} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'no. of applicants qualified for academia round', value: qualifiedAcademia, icon: <BookOpen size={16} />, color: 'bg-purple-50 text-purple-600' },
    { label: 'no. of applicants qualified for interview round', value: qualifiedInterview, icon: <Users size={16} />, color: 'bg-gold/10 text-gold' },
    { label: 'Interviews pending', value: numInterview, icon: <AlertCircle size={16} />, color: 'bg-amber-50 text-amber-600' },
    { label: 'no. Selected', value: numSelected, icon: <CheckCircle size={16} />, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      
      {/* Funnel Statistics */}
      <div className="bento-card p-6">
        <h3 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-sage" />
          Hiring Funnel Overview
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-4 bg-warm-sand/30 rounded-2xl border border-ink/5 text-center">
              <div className={`p-2 rounded-xl mb-3 ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-2xl font-bold font-mono text-ink mb-1">{stat.value}</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-ink/40 leading-tight">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Candidates Table */}
      {selectedCandidates.length > 0 && (
        <div className="bento-card p-6">
          <h3 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-emerald-500" />
            Finally Selected Candidates
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink/50">
                  <th className="pb-3 pl-2 font-medium">Candidate Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 pr-2 font-medium text-right">Overall Score</th>
                </tr>
              </thead>
              <tbody>
                {selectedCandidates.map(candidate => (
                  <tr key={candidate.id} className="border-b border-ink/5 last:border-0 hover:bg-ink/5 transition-colors">
                    <td className="py-3 pl-2 font-semibold text-ink text-sm">
                      {candidate.firstname} {candidate.lastname}
                    </td>
                    <td className="py-3 text-ink/60 text-sm">
                      {candidate.email}
                    </td>
                    <td className="py-3 pr-2 font-mono font-bold text-ink text-right text-sm">
                      {candidate.overall_score.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* End Application Banner */}
      <div className={`bento-card p-8 border-2 transition-colors ${ended ? 'border-rust bg-rust/5' : 'border-rust/20'}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className={`font-serif text-xl font-semibold mb-2 ${ended ? 'text-rust' : 'text-ink'}`}>
              {ended ? 'Application Closed' : 'End Application Process'}
            </h3>
            <p className="text-sm text-ink/50 max-w-lg leading-relaxed">
              {ended 
                ? 'This vacancy has been officially closed. No further applications or interviews can be scheduled.' 
                : 'Closing the application process will prevent any new candidates from applying and finalize the current selections. This action cannot be undone easily.'
              }
            </p>
          </div>
          
          {!ended && (
            <button 
              onClick={() => setShowConfirm(true)}
              className="bg-rust text-white px-8 py-3 rounded-xl font-semibold text-sm shadow-sm hover:bg-rust-dark transition-colors shrink-0"
            >
              END Application
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog (Modal) */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-cream rounded-3xl p-8 max-w-md w-full shadow-2xl border border-ink/10"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-rust/10 text-rust rounded-2xl">
                  <AlertCircle size={24} />
                </div>
                <button onClick={() => setShowConfirm(false)} className="text-ink/30 hover:text-ink/60">
                  <X size={20} />
                </button>
              </div>
              
              <h3 className="font-serif text-xl font-bold text-ink mb-2">Are you absolutely sure?</h3>
              <p className="text-sm text-ink/60 mb-6 leading-relaxed">
                This will officially close the vacancy. Selected candidates will be notified, and all other candidates will receive an automated rejection email.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm border border-ink/10 hover:bg-ink/5 transition-colors text-ink/60"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEndApplication}
                  disabled={isUpdating}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-rust text-white shadow hover:bg-rust-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdating ? 'Closing...' : 'Yes, Close Vacancy'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
