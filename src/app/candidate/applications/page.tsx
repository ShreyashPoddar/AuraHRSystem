'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Clock, AlertTriangle, CheckCircle, XCircle,
  Loader2, Briefcase, ChevronRight, Check, Play, Video
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

interface Application {
  id: number;
  jobid: number;
  job_title: string;
  job_department: string;
  stage: string;
  jd_score: number;
  academia_score: number;
  interview_score: number;
  overall_score: number;
  malpractice: number;
  timecreated: number;
}

const stageConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  applied:   { label: 'Applied',          icon: <Clock size={14} />,        color: 'bg-blue-500/15 text-blue-700 border-blue-200' },
  screened:  { label: 'Under Review',     icon: <FileText size={14} />,     color: 'bg-amber-500/15 text-amber-700 border-amber-200' },
  academia:  { label: 'Assessment',       icon: <FileText size={14} />,     color: 'bg-purple-500/15 text-purple-700 border-purple-200' },
  interview: { label: 'Interview',        icon: <Briefcase size={14} />,   color: 'bg-gold/15 text-gold border-gold/30' },
  offer:     { label: 'Offer',            icon: <CheckCircle size={14} />, color: 'bg-sage/15 text-sage border-sage/30' },
  selected:  { label: 'Selected',         icon: <CheckCircle size={14} />, color: 'bg-emerald-500/15 text-emerald-700 border-emerald-200' },
  rejected:  { label: 'Rejected',         icon: <XCircle size={14} />,     color: 'bg-rust/15 text-rust border-rust/30' },
};

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'jd' | 'academia' | 'interview' | 'result'>('jd');

  useEffect(() => {
    async function load() {
      try {
        const res = await moodleCall<{ applications: Application[] }>(
          'local_aurahr_jobs_list_applications',
          { jobid: 0 }
        );
        const apps = res.applications || [];
        setApplications(apps);
        if (apps.length > 0) {
          setSelectedAppId(apps[0].id); // Open latest one by default
        }
      } catch (err) {
        console.warn("Moodle backend offline. Using mock applications.", err);
        const mockApps: Application[] = [
          {
            id: 1,
            jobid: 1,
            job_title: 'Senior Frontend Engineer',
            job_department: 'Engineering',
            stage: 'academia',
            jd_score: 95,
            academia_score: 0,
            interview_score: 0,
            overall_score: 0,
            malpractice: 0,
            timecreated: Math.floor(Date.now() / 1000) - 86400 * 2
          },
          {
            id: 2,
            jobid: 2,
            job_title: 'Product Manager',
            job_department: 'Product',
            stage: 'interview',
            jd_score: 88,
            academia_score: 85,
            interview_score: 0,
            overall_score: 85,
            malpractice: 0,
            timecreated: Math.floor(Date.now() / 1000) - 86400 * 5
          }
        ];
        setApplications(mockApps);
        setSelectedAppId(mockApps[0].id);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatDate(ts: number) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const selectedApp = applications.find(a => a.id === selectedAppId);

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-4 sm:-m-6 lg:-m-8">
      {/* Side Panel */}
      <div className="w-80 border-r border-ink/10 bg-warm-sand/20 overflow-y-auto flex flex-col shrink-0">
        <div className="p-5 border-b border-ink/10">
          <h2 className="font-serif text-xl font-bold text-ink">My Applications</h2>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {applications.length === 0 ? (
            <p className="text-ink/40 text-sm text-center py-8">No applications found.</p>
          ) : (
            applications.map(app => {
              const isActive = app.id === selectedAppId;
              const stage = stageConfig[app.stage] || { label: app.stage, icon: <Clock size={14} />, color: 'bg-ink/5 text-ink/50' };
              
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    isActive ? 'bg-white shadow-md border-transparent ring-1 ring-blue-500/20' : 'hover:bg-white/50 border border-transparent hover:border-ink/5'
                  }`}
                >
                  <h3 className={`font-sans text-sm font-semibold truncate ${isActive ? 'text-blue-600' : 'text-ink'}`}>
                    {app.job_title}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${stage.color}`}>
                      {stage.icon} {stage.label}
                    </span>
                    <span className="text-[10px] text-ink/40 font-mono">{formatDate(app.timecreated)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-cream/30 min-w-0">
        {selectedApp ? (
          <>
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-ink/10 bg-white">
              <h1 className="font-serif text-2xl font-bold text-ink mb-1">{selectedApp.job_title}</h1>
              <p className="text-sm text-ink/50">{selectedApp.job_department} · Applied on {formatDate(selectedApp.timecreated)}</p>
            </div>

            {/* Top Navigation */}
            <div className="px-6 md:px-8 border-b border-ink/10 flex gap-6 bg-white shrink-0 overflow-x-auto">
              {[
                { id: 'jd', label: 'JD Parser' },
                { id: 'academia', label: 'Academia Round' },
                { id: 'interview', label: 'Interview Panel' },
                { id: 'result', label: 'Result' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-ink/50 hover:text-ink/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-3xl"
                >
                  {activeTab === 'jd' && (
                    <div className="space-y-6">
                      <div className="bento-card p-6">
                        <h3 className="font-serif text-lg font-semibold text-ink mb-4">JD Parser Match</h3>
                        <div className="flex items-center gap-6 mb-6">
                          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center rounded-full border-4 border-emerald-500 text-2xl font-serif font-bold text-emerald-600">
                            {selectedApp.jd_score || 85}%
                          </div>
                          <div>
                            <p className="text-sm text-ink/60">Your resume matched highly with the core requirements.</p>
                            <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1"><Check size={16} /> Shortlisted for next round</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                            <p className="text-xs text-ink/40 font-semibold uppercase mb-2">Must Have Skills</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs px-2 py-1 bg-white rounded-md shadow-sm text-ink">React</span>
                              <span className="text-xs px-2 py-1 bg-white rounded-md shadow-sm text-ink">TypeScript</span>
                            </div>
                          </div>
                          <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                            <p className="text-xs text-ink/40 font-semibold uppercase mb-2">Good to Have Skills</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs px-2 py-1 bg-white rounded-md shadow-sm text-ink">GraphQL</span>
                            </div>
                          </div>
                          <div className="p-4 bg-gold/5 rounded-xl border border-gold/10">
                            <p className="text-xs text-ink/40 font-semibold uppercase mb-2">Future Proof Skills</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs px-2 py-1 bg-white rounded-md shadow-sm text-ink">Next.js App Router</span>
                            </div>
                          </div>
                          <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                            <p className="text-xs text-ink/40 font-semibold uppercase mb-2">Team Gap Skills</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs px-2 py-1 bg-white rounded-md shadow-sm text-ink">AWS Deployment</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'academia' && (
                    <div className="bento-card p-6">
                      <h3 className="font-serif text-lg font-semibold text-ink mb-4">Academia Round</h3>
                      {selectedApp.jd_score >= 50 ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-ink">Technical Assessment</p>
                              <p className="text-xs text-ink/50 mt-1">Scheduled on: <span className="font-medium text-ink">Oct 15, 2026 at 2:00 PM</span></p>
                            </div>
                            <a href="/candidate/test/1" className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                              <Play size={14} /> START TEST
                            </a>
                          </div>
                          {selectedApp.academia_score > 0 && (
                            <div className="mt-4 p-4 border border-ink/10 rounded-xl">
                              <p className="text-sm text-ink/60">Score: <span className="font-bold text-ink">{selectedApp.academia_score}%</span></p>
                              <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1"><Check size={16} /> Qualified</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-ink/50 text-sm">You did not qualify for this round.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'interview' && (
                    <div className="bento-card p-6">
                      <h3 className="font-serif text-lg font-semibold text-ink mb-4">Interview Panel</h3>
                      {(selectedApp.academia_score >= 50 || selectedApp.stage === 'interview') ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-gold/5 border border-gold/20 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-ink">Final Interview</p>
                              <p className="text-xs text-ink/50 mt-1">Scheduled on: <span className="font-medium text-ink">Oct 20, 2026 at 11:00 AM</span></p>
                            </div>
                            <a href="/candidate/interview/1" className="flex items-center gap-2 px-4 py-2 bg-gold text-white text-xs font-bold rounded-lg shadow-md hover:bg-gold/90 transition-colors">
                              <Video size={14} /> JOIN NOW
                            </a>
                          </div>
                          {selectedApp.interview_score > 0 && (
                            <div className="mt-4 p-4 border border-ink/10 rounded-xl">
                              <p className="text-sm text-ink/60">Score: <span className="font-bold text-ink">{selectedApp.interview_score}%</span></p>
                              <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1"><Check size={16} /> Cleared</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-ink/50 text-sm">You did not qualify for this round.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'result' && (
                    <div className="bento-card p-6 text-center">
                      {selectedApp.stage === 'selected' ? (
                        <div className="py-8">
                          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                          </div>
                          <h3 className="font-serif text-2xl font-bold text-ink mb-2">Congratulations!</h3>
                          <p className="text-sm text-ink/60">You have been selected for this position. The HR team will contact you shortly.</p>
                        </div>
                      ) : selectedApp.stage === 'rejected' ? (
                        <div className="py-8">
                          <div className="w-16 h-16 bg-rust/10 text-rust rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle size={32} />
                          </div>
                          <h3 className="font-serif text-2xl font-bold text-ink mb-2">Not Selected</h3>
                          <p className="text-sm text-ink/60">Unfortunately, we will not be moving forward with your application at this time.</p>
                        </div>
                      ) : (
                        <div className="py-8">
                          <div className="w-16 h-16 bg-ink/5 text-ink/40 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock size={32} />
                          </div>
                          <h3 className="font-serif text-xl font-bold text-ink mb-2">Decision Pending</h3>
                          <p className="text-sm text-ink/60">Your application is still in progress. Check back later.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Briefcase size={48} className="text-ink/10 mx-auto mb-4" />
              <p className="text-ink/30 text-sm">Select an application from the left panel to view details.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
