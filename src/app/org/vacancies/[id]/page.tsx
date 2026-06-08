'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Users, Calendar, Loader2, Sparkles, ChevronRight,
  BarChart3, CheckCircle, XCircle, AlertTriangle, BookOpen, Clock
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';
import AcademiaRoundTab from '@/components/AcademiaRoundTab';
import InterviewPanelTab from '@/components/InterviewPanelTab';
import ResultsTab from '@/components/ResultsTab';
import RankedApplicationsTable from '@/components/RankedApplicationsTable';

interface Job {
  id: number;
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
  const jobId = Number(params?.id);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('jd');
  const [passCount, setPassCount] = useState<number | ''>('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await moodleCall<Job>('local_aurahr_jobs_get_job', { jobid: jobId });
      setJob(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { loadJob(); }, [loadJob]);

  useEffect(() => {
    if (job?.jd_analysis?.pass_count) {
      setPassCount(job.jd_analysis.pass_count);
    }
  }, [job]);

  async function runJDParser() {
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
  
  // Calculate breakdown stats
  const getStageCount = (stage: string) => job.stage_counts.find(s => s.stage === stage)?.count || 0;
  const appliedCount = job.application_count;
  const academiaQualified = getStageCount('screened') + getStageCount('academia') + getStageCount('interview') + getStageCount('offer') + getStageCount('selected');
  const interviewQualified = getStageCount('interview') + getStageCount('offer') + getStageCount('selected');
  const interviewsPending = getStageCount('interview');
  const selectedCount = getStageCount('selected');

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bento-card p-6 border-l-4 border-sage">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">{job.title}</h1>
            <p className="text-sm text-ink/40 mt-1">
              {job.department || 'General'} · Created: <span className="text-ink/70 font-medium">{formatDate(job.timecreated)}</span> · Date Finished: <span className="text-ink/70 font-medium">{formatDate(job.deadline)}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl capitalize ${
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
          
          {editingDesc ? (
            <textarea
              className="w-full h-32 p-3 bg-cream border border-ink/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-sage"
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
            />
          ) : (
            <div className="text-sm text-ink/70 leading-relaxed max-h-32 overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: job.description }} />
          )}
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-ink/10">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <QuickStat icon={<Users size={16} />} label="Applications" value={job.application_count} />
                <QuickStat icon={<Calendar size={16} />} label="Deadline" value={formatDate(job.deadline)} />
                <QuickStat icon={<FileText size={16} />} label="Max Limit" value={job.maxlimit} />
                <QuickStat icon={<Sparkles size={16} />} label="JD Analyzed" value={hasAnalysis ? 'Yes' : 'No'} />
              </div>

              {/* JD Parser Configuration */}
              <div className="bento-card p-6">
                <h4 className="text-sm font-semibold text-ink mb-4 flex items-center justify-between">
                  <span>Configuration</span>
                  {hasAnalysis && job.jd_analysis ? (
                    <div className="flex items-center gap-2">
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
                    <span className="text-[10px] uppercase tracking-wider font-bold text-ink/40 bg-ink/5 px-2 py-1 rounded">
                      Run JD Parser for AI Suggestion
                    </span>
                  )}
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2">
                      No. of applicants to pass JD Parser
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
                  <div className="flex gap-2">
                    <button 
                      disabled={!!job.jd_analysis?.is_finalized}
                      className="bg-sage text-white text-sm font-bold py-2.5 px-6 rounded-xl hover:bg-sage/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
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
                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
                    <Sparkles size={18} className="text-sage" />
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
      <RankedApplicationsTable jobId={job.id} refreshTrigger={refreshTrigger} />
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

function MatchDistributionGraph({ jobId, total, refreshTrigger }: { jobId: number, total: number, refreshTrigger?: number }) {
  const [data, setData] = useState([
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 },
  ]);

  useEffect(() => {
    async function fetchData() {
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
