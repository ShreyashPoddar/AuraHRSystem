'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, ArrowRight, Settings, Plus, UserCheck, CalendarX, ShieldAlert, CheckCircle, XCircle, X, Trash2, AlertTriangle, Bot, Ban, Info } from 'lucide-react';
import { moodleCall } from '@/lib/moodle';
import { useAuth } from '@/contexts/AuthContext';

// --- Toast system ---
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

export default function SchedulerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'pending' | 'availability' | 'rules'>('calendar');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [interviews, setInterviews] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [rules, setRules] = useState<any>({ min_gap_mins: 15, max_per_day: 8, preferred_duration: 30, buffer_days: 1 });
  const [jobsList, setJobsList] = useState<any[]>([]);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  // Modal States
  const [isAutoSchedModalOpen, setIsAutoSchedModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  
  // Clash resolution modal
  const [clashModal, setClashModal] = useState<{
    open: boolean;
    reqId: number;
    reqAction: 'approve' | 'ai_reschedule';
    clashedName: string;
    clashedTime: number;
    proposedTime: number;
  } | null>(null);

  // Cancel interview confirmation modal
  const [cancelModal, setCancelModal] = useState<{ open: boolean; interviewId: number; reason: string } | null>(null);

  // Action loading state per request ID
  const [actionLoading, setActionLoading] = useState<Record<number, string | null>>({});

  // Availability modal states
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [tempSlots, setTempSlots] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState({ day_of_week: 1, start_time: '09:00', end_time: '17:00', recurring: 1, specific_date: '' });

  // Block time off modal states
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ start: '', end: '', reason: '' });

  // Reschedule modal states
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [isReschedModalOpen, setIsReschedModalOpen] = useState(false);
  const [reschedForm, setReschedForm] = useState({ datetime: '', duration: 30 });

  // Form States
  const [autoSchedJobId, setAutoSchedJobId] = useState('');
  const [overrideForm, setOverrideForm] = useState({ applicationid: '', interviewerid: '', datetime: '', duration: 30 });

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const start = Math.floor(Date.now() / 1000) - 86400 * 30; // 30 days ago
      const end = start + 86400 * 90; // +60 days future
      
      const [calData, reqData, slotData, blockData, ruleData, jobsData] = await Promise.all([
        moodleCall('local_aurahr_scheduler_get_calendar', { start_time: start, end_time: end }),
        moodleCall('local_aurahr_scheduler_get_pending_requests', {}),
        moodleCall('local_aurahr_scheduler_get_availability', {}),
        moodleCall('local_aurahr_scheduler_get_blocked_times', {}),
        moodleCall('local_aurahr_scheduler_get_rules', { jobid: 0 }),
        moodleCall('local_aurahr_jobs_list_jobs', { status: 'active' }).catch(() => ({ jobs: [] }))
      ]);
      
      setInterviews((calData as any).events || []);
      setPendingRequests((reqData as any).requests || []);
      setSlots((slotData as any).slots || []);
      setBlockedTimes((blockData as any).blocks || []);
      setJobsList((jobsData as any).jobs || []);
      
      if (ruleData) {
        const rd = ruleData as any;
        setRules({
          min_gap_mins: rd.min_gap_mins ?? 15,
          max_per_day: rd.max_per_day ?? 8,
          preferred_duration: rd.preferred_duration ?? 30,
          buffer_days: rd.buffer_days ?? 1,
        });
      }
    } catch (err) {
      console.error('Failed to load scheduler data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveReschedule(
    id: number,
    action: 'approve' | 'reject' | 'ai_reschedule',
    forceRescheduleBoth = false,
    forceApprove = false
  ) {
    setActionLoading(prev => ({ ...prev, [id]: action }));
    try {
      const res = await moodleCall('local_aurahr_scheduler_approve_reschedule', {
        id,
        action,
        new_time: 0,
        force_reschedule_both: forceRescheduleBoth,
        force_approve: forceApprove
      }) as any;
      
      if (res && res.clash) {
        // Show clash resolution modal instead of window.confirm
        setClashModal({
          open: true,
          reqId: id,
          reqAction: action === 'reject' ? 'approve' : action as 'approve' | 'ai_reschedule',
          clashedName: res.clashed_candidate_name,
          clashedTime: res.clashed_time,
          proposedTime: res.proposed_time,
        });
        return;
      }
      
      if (res && res.success) {
        addToast(
          action === 'reject' ? 'Request rejected successfully.' :
          action === 'ai_reschedule' ? 'AI rescheduled the interview successfully.' :
          'Request approved and interview rescheduled.',
          'success'
        );
        loadAllData();
      } else {
        addToast(res?.message || 'Failed to process request.', 'error');
      }
    } catch (err: any) {
      addToast('Error: ' + (err.message || 'Failed to process request'), 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  }

  async function handleSaveRules() {
    try {
      await moodleCall('local_aurahr_scheduler_update_rules', { ...rules, jobid: 0 });
      addToast('Scheduling rules saved globally!', 'success');
    } catch (err) {
      addToast('Failed to save rules.', 'error');
    }
  }

  async function handleRunAutoScheduler() {
    if (!autoSchedJobId) return addToast('Please select a job first.', 'error');
    try {
      const res = await moodleCall('local_aurahr_scheduler_auto_schedule', { jobid: Number(autoSchedJobId) });
      addToast((res as any).message || 'Auto-scheduler completed.', 'success');
      setIsAutoSchedModalOpen(false);
      loadAllData();
    } catch (err: any) {
      addToast('Failed to run auto-scheduler: ' + err.message, 'error');
    }
  }

  async function handleOverrideSlot() {
    if (!overrideForm.applicationid || !overrideForm.interviewerid || !overrideForm.datetime) return addToast('Please fill all required fields.', 'error');
    try {
      const scheduled_at = Math.floor(new Date(overrideForm.datetime).getTime() / 1000);
      await moodleCall('local_aurahr_scheduler_override_slot', { 
        applicationid: Number(overrideForm.applicationid), 
        interviewerid: Number(overrideForm.interviewerid), 
        scheduled_at, 
        duration_mins: overrideForm.duration 
      });
      addToast('Override slot created successfully!', 'success');
      setIsOverrideModalOpen(false);
      loadAllData();
    } catch (err: any) {
      addToast('Failed to override slot: ' + err.message, 'error');
    }
  }

  function handleCancelInterview(interviewid: number) {
    setCancelModal({ open: true, interviewId: interviewid, reason: '' });
  }

  async function confirmCancelInterview() {
    if (!cancelModal) return;
    if (!cancelModal.reason.trim()) return addToast('Please enter a reason for cancellation.', 'error');
    try {
      await moodleCall('local_aurahr_scheduler_cancel_interview', { interviewid: cancelModal.interviewId, reason: cancelModal.reason });
      addToast('Interview cancelled successfully.', 'success');
      setCancelModal(null);
      loadAllData();
    } catch (err: any) {
      addToast('Failed to cancel interview: ' + err.message, 'error');
    }
  }

  async function handleSaveReschedule() {
    if (!selectedInterview) return;
    if (!reschedForm.datetime) return addToast('Please select a date and time.', 'error');
    try {
      const scheduled_at = Math.floor(new Date(reschedForm.datetime).getTime() / 1000);
      await moodleCall('local_aurahr_scheduler_override_slot', {
        applicationid: selectedInterview.applicationid || 0,
        interviewerid: user?.id || 0,
        scheduled_at,
        duration_mins: Number(reschedForm.duration)
      });
      addToast('Interview rescheduled successfully!', 'success');
      setIsReschedModalOpen(false);
      loadAllData();
    } catch (err: any) {
      addToast('Failed to reschedule: ' + err.message, 'error');
    }
  }

  async function handleSaveAvailability() {
    if (!user?.id) return addToast('User session not loaded. Please refresh.', 'error');
    try {
      await moodleCall('local_aurahr_scheduler_set_availability', {
        userid: user.id,
        slots: tempSlots.map(s => ({
          day_of_week: Number(s.day_of_week),
          start_time: s.start_time,
          end_time: s.end_time,
          recurring: Number(s.recurring),
          specific_date: s.specific_date ? Math.floor(new Date(s.specific_date).getTime() / 1000) : 0
        }))
      });
      addToast('Availability updated successfully!', 'success');
      setIsAvailabilityModalOpen(false);
      loadAllData();
    } catch (err: any) {
      addToast('Failed to save availability: ' + err.message, 'error');
    }
  }

  async function handleDeleteBlockedTime(id: number) {
    try {
      await moodleCall('local_aurahr_scheduler_delete_blocked_time', { id });
      addToast('Blocked time removed.', 'success');
      loadAllData();
    } catch (err: any) {
      addToast('Failed to remove blocked time: ' + err.message, 'error');
    }
  }

  async function handleAddBlockTime() {
    if (!user?.id) return addToast('User session not loaded. Please refresh.', 'error');
    if (!blockForm.start || !blockForm.end || !blockForm.reason) return addToast('Please fill in all fields.', 'error');
    try {
      const start_time = Math.floor(new Date(blockForm.start).getTime() / 1000);
      const end_time = Math.floor(new Date(blockForm.end).getTime() / 1000);
      await moodleCall('local_aurahr_scheduler_block_time', {
        userid: user.id,
        start_time,
        end_time,
        reason: blockForm.reason
      });
      addToast('Time period blocked successfully!', 'success');
      setIsBlockModalOpen(false);
      setBlockForm({ start: '', end: '', reason: '' });
      loadAllData();
    } catch (err: any) {
      addToast('Failed to block time: ' + err.message, 'error');
    }
  }

  return (
    <div className="space-y-6 max-w-7xl relative">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold pointer-events-auto max-w-sm ${
                t.type === 'success' ? 'bg-emerald-600 text-white' :
                t.type === 'error' ? 'bg-red-600 text-white' :
                'bg-ink text-cream'
              }`}
            >
              {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <XCircle size={16} /> : <Info size={16} />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Smart Scheduler</h1>
          <p className="text-ink/50 mt-1 text-sm">Manage interview schedules, team availability, and AI matching rules.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-rust/10 text-rust hover:bg-rust/20 rounded-xl text-sm font-semibold transition-colors" 
                  onClick={() => setIsOverrideModalOpen(true)}>
            <ShieldAlert size={16} /> Override Slot
          </button>
          <button onClick={() => setIsAutoSchedModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-sage text-white rounded-xl text-sm font-semibold hover:bg-sage/90 transition-colors shadow-md">
            <Plus size={16} /> Auto-Schedule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-ink/10 pb-px overflow-x-auto">
        {[
          { id: 'calendar', label: 'Interview Calendar' },
          { id: 'pending', label: `Pending Requests (${pendingRequests.length})` },
          { id: 'availability', label: 'Availability Management' },
          { id: 'rules', label: 'Scheduling Rules' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors relative ${
              activeTab === tab.id ? 'text-ink' : 'text-ink/40 hover:text-ink/70'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-4">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-ink/50">Loading scheduler data...</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'calendar' && (
                <div className="bento-card p-6 min-h-[400px]">
                  <h3 className="font-serif text-lg font-semibold text-ink mb-6">Upcoming Interviews</h3>
                  {interviews.length === 0 ? (
                    <p className="text-ink/50 text-sm">No interviews scheduled in this period.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {interviews.map(inv => (
                        <div key={inv.id} className="p-4 bg-ink/5 rounded-xl border border-ink/10 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold text-ink">{inv.job_title || 'Interview'}</p>
                            <p className="text-xs text-ink/70 mt-0.5">Candidate: {inv.candidate_name || 'N/A'}</p>
                            <p className="text-xs text-ink/60 mt-1">{new Date(inv.scheduled_at * 1000).toLocaleString()} ({inv.duration_mins} mins)</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-2 py-1 text-xs font-bold rounded ${inv.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-ink/10 text-ink/60'}`}>{inv.status}</span>
                            {inv.status === 'scheduled' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedInterview(inv);
                                    setReschedForm({
                                      datetime: new Date(inv.scheduled_at * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                                      duration: inv.duration_mins
                                    });
                                    setIsReschedModalOpen(true);
                                  }}
                                  className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                >
                                  Reschedule
                                </button>
                                <button
                                  onClick={() => handleCancelInterview(inv.id)}
                                  className="text-[10px] font-bold text-rust bg-rust/10 px-2 py-1 rounded hover:bg-rust/20 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="bento-card p-6">
                  <h3 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-4">
                    <UserCheck size={18} className="text-blue-500" /> Review Pending Reschedules
                  </h3>
                  {pendingRequests.length === 0 ? (
                    <p className="text-ink/50 text-sm">No pending requests.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingRequests.map(req => {
                        const isActing = !!actionLoading[req.id];
                        return (
                        <div key={req.id} className="p-4 bg-ink/5 rounded-xl border border-ink/10">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-sans text-sm font-semibold text-ink">{req.candidate_name}</h4>
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">Pending</span>
                              </div>
                              <p className="text-xs text-ink/60 mt-1.5"><span className="font-medium">Reason:</span> {req.reason || 'No reason provided'}</p>
                              <p className="text-xs text-ink/60 mt-0.5">
                                <span className="font-medium">Current:</span> {req.current_time > 0 ? new Date(req.current_time * 1000).toLocaleString() : 'Not set'}
                              </p>
                              <p className="text-xs text-ink/60 mt-0.5">
                                <span className="font-medium">Proposed:</span> {req.new_time > 0 ? new Date(req.new_time * 1000).toLocaleString() : 'No specific time requested'}
                              </p>
                              <p className="text-[10px] text-ink/40 mt-1">Request #{req.id} · Interview #{req.interviewid}</p>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                onClick={() => handleApproveReschedule(req.id, 'approve')}
                                disabled={isActing}
                                className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait transition-colors"
                              >
                                {actionLoading[req.id] === 'approve' ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Clock size={13} /></motion.div> : <CheckCircle size={13} />}
                                Approve Manually
                              </button>
                              <button
                                onClick={() => handleApproveReschedule(req.id, 'ai_reschedule')}
                                disabled={isActing}
                                className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait transition-colors"
                              >
                                {actionLoading[req.id] === 'ai_reschedule' ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Clock size={13} /></motion.div> : <Bot size={13} />}
                                AI Reschedule
                              </button>
                              <button
                                onClick={() => handleApproveReschedule(req.id, 'reject')}
                                disabled={isActing}
                                className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait transition-colors"
                              >
                                {actionLoading[req.id] === 'reject' ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Clock size={13} /></motion.div> : <Ban size={13} />}
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'availability' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bento-card p-6">
                    <h3 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-4">
                      <Clock size={18} className="text-sage" /> Your Weekly Availability
                    </h3>
                    <p className="text-sm text-ink/60 mb-4">You have {slots.length} recurring slots defined.</p>
                    
                    {slots.length > 0 && (
                      <div className="space-y-2 mb-4 max-h-[250px] overflow-y-auto pr-1">
                        {slots.map((s, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-ink/5 rounded-xl border border-ink/10">
                            <div>
                              <span className="font-semibold text-sm text-ink">
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][s.day_of_week]}
                              </span>
                              <span className="text-xs text-ink/60 ml-2">{s.start_time} - {s.end_time}</span>
                              {s.recurring ? (
                                <span className="text-[9px] uppercase font-bold text-sage ml-2 bg-sage/10 px-1.5 py-0.5 rounded">Weekly</span>
                              ) : (
                                <span className="text-[9px] uppercase font-bold text-blue-500 ml-2 bg-blue-50 px-1.5 py-0.5 rounded">One-off</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <button 
                      className="w-full py-2 border border-dashed border-ink/20 rounded-xl text-sm font-semibold text-ink/60 hover:text-ink hover:border-ink/40 transition-colors"
                      onClick={() => {
                        setTempSlots([...slots]);
                        setIsAvailabilityModalOpen(true);
                      }}
                    >
                      + Manage Availability Slots
                    </button>
                  </div>

                  <div className="bento-card p-6">
                    <h3 className="font-serif text-lg font-semibold text-ink flex items-center gap-2 mb-4">
                      <CalendarX size={18} className="text-rust" /> Block Time Off
                    </h3>
                    <div className="space-y-4">
                      {blockedTimes.length === 0 ? (
                        <p className="text-sm text-ink/50">No blocked times.</p>
                      ) : (
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                          {blockedTimes.map(bt => (
                            <div key={bt.id} className="p-3 bg-rust/5 border border-rust/10 rounded-xl flex justify-between items-center">
                              <div>
                                <p className="text-sm font-semibold text-ink">{bt.reason}</p>
                                <p className="text-xs text-ink/50 mt-0.5">
                                  {new Date(bt.start_time * 1000).toLocaleString()} - {new Date(bt.end_time * 1000).toLocaleString()}
                                </p>
                              </div>
                              <button 
                                onClick={() => handleDeleteBlockedTime(bt.id)} 
                                className="p-1.5 text-rust/60 hover:text-rust hover:bg-rust/10 rounded-lg transition-colors"
                                title="Remove Block"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button 
                        className="w-full py-2 bg-rust/10 text-rust rounded-xl text-sm font-semibold hover:bg-rust/20 transition-colors"
                        onClick={() => setIsBlockModalOpen(true)}
                      >
                        + Add Time Off
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'rules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bento-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-xl bg-sage/10 text-sage"><Settings size={18} /></div>
                      <h3 className="font-serif text-lg font-semibold text-ink">Global Rules</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Minimum gap between interviews (mins)</label>
                        <input type="number" value={rules.min_gap_mins} onChange={e => setRules({...rules, min_gap_mins: Number(e.target.value)})} className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-sage/50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Max interviews per day per recruiter</label>
                        <input type="number" value={rules.max_per_day} onChange={e => setRules({...rules, max_per_day: Number(e.target.value)})} className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-sage/50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Default interview duration (mins)</label>
                        <input type="number" value={rules.preferred_duration} onChange={e => setRules({...rules, preferred_duration: Number(e.target.value)})} className="w-full bg-warm-sand/30 border border-ink/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-sage/50" />
                      </div>
                      <button onClick={handleSaveRules} className="px-5 py-2.5 bg-ink text-cream rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors w-full mt-2">
                        Save Global Rules
                      </button>
                    </div>
                  </div>

                  <div className="bento-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Users size={18} /></div>
                      <h3 className="font-serif text-lg font-semibold text-ink">AI Auto-Scheduler</h3>
                    </div>
                    <p className="text-sm text-ink/60 leading-relaxed mb-6">
                      The AI auto-scheduler automatically finds overlapping availability between candidates and interviewers, respecting max limits and buffer times.
                    </p>
                    <button onClick={() => setIsAutoSchedModalOpen(true)} className="flex items-center justify-between w-full p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors group">
                      <div className="text-left">
                        <span className="block text-sm font-semibold text-blue-800">Run Auto-Scheduler</span>
                        <span className="block text-xs text-blue-600/70 mt-0.5">Match availability for all unscheduled interviews</span>
                      </div>
                      <ArrowRight size={16} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Auto Schedule Modal */}
      {isAutoSchedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-cream rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsAutoSchedModalOpen(false)} className="absolute top-4 right-4 p-2 text-ink/50 hover:bg-ink/10 rounded-full transition-colors">
              <X size={18} />
            </button>
            <h2 className="font-serif text-xl font-bold text-ink mb-2">Run Auto-Scheduler</h2>
            <p className="text-sm text-ink/60 mb-6">Select a job to auto-schedule interviews for.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-2">Select Active Job</label>
                <select 
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sage/50"
                  value={autoSchedJobId}
                  onChange={(e) => setAutoSchedJobId(e.target.value)}
                >
                  <option value="">-- Select a Job --</option>
                  {jobsList.map(job => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleRunAutoScheduler}
                className="w-full py-3 bg-sage text-white rounded-xl text-sm font-bold hover:bg-sage/90 transition-colors mt-2"
              >
                Start Auto-Scheduling
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Slot Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-cream rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsOverrideModalOpen(false)} className="absolute top-4 right-4 p-2 text-ink/50 hover:bg-ink/10 rounded-full transition-colors">
              <X size={18} />
            </button>
            <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2 mb-2">
              <ShieldAlert className="text-rust" size={20} /> Override Slot
            </h2>
            <p className="text-sm text-ink/60 mb-6">Force an interview slot regardless of rules or availability.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-1">Application ID</label>
                <input 
                  type="number" 
                  value={overrideForm.applicationid}
                  onChange={e => setOverrideForm({...overrideForm, applicationid: e.target.value})}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sage/50"
                  placeholder="e.g. 42"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-1">Interviewer User ID</label>
                <input 
                  type="number" 
                  value={overrideForm.interviewerid}
                  onChange={e => setOverrideForm({...overrideForm, interviewerid: e.target.value})}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sage/50"
                  placeholder="e.g. 2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-1">Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={overrideForm.datetime}
                  onChange={e => setOverrideForm({...overrideForm, datetime: e.target.value})}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sage/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-1">Duration (mins)</label>
                <input 
                  type="number" 
                  value={overrideForm.duration}
                  onChange={e => setOverrideForm({...overrideForm, duration: Number(e.target.value)})}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sage/50"
                />
              </div>
              <button 
                onClick={handleOverrideSlot}
                className="w-full py-3 bg-rust text-white rounded-xl text-sm font-bold hover:bg-rust/90 transition-colors mt-4 shadow-md"
              >
                Force Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Availability Management Modal */}
      {isAvailabilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-cream rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAvailabilityModalOpen(false)} className="absolute top-4 right-4 p-2 text-ink/50 hover:bg-ink/10 rounded-full transition-colors">
              <X size={18} />
            </button>
            <h2 className="font-serif text-xl font-bold text-ink mb-2">Configure Availability Slots</h2>
            <p className="text-sm text-ink/60 mb-6">Define recurring weekly slots or specific dates when you are free.</p>
            
            {/* Add New Slot form */}
            <div className="p-4 bg-ink/5 rounded-xl border border-ink/10 mb-6 space-y-3">
              <p className="text-xs font-bold text-ink uppercase tracking-wider">Add Availability Slot</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Type</label>
                  <select 
                    value={newSlot.recurring} 
                    onChange={e => setNewSlot({...newSlot, recurring: Number(e.target.value)})}
                    className="w-full bg-white border border-ink/10 rounded-lg px-2 py-1.5 text-xs text-ink"
                  >
                    <option value={1}>Recurring Weekly</option>
                    <option value={0}>One-off Specific Date</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Day of Week</label>
                  <select 
                    value={newSlot.day_of_week} 
                    onChange={e => setNewSlot({...newSlot, day_of_week: Number(e.target.value)})}
                    className="w-full bg-white border border-ink/10 rounded-lg px-2 py-1.5 text-xs text-ink"
                    disabled={!newSlot.recurring}
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              </div>

              {!newSlot.recurring && (
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Specific Date</label>
                  <input 
                    type="date" 
                    value={newSlot.specific_date}
                    onChange={e => setNewSlot({...newSlot, specific_date: e.target.value})}
                    className="w-full bg-white border border-ink/10 rounded-lg px-2 py-1.5 text-xs text-ink"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Start Time (HH:MM)</label>
                  <input 
                    type="time" 
                    value={newSlot.start_time} 
                    onChange={e => setNewSlot({...newSlot, start_time: e.target.value})}
                    className="w-full bg-white border border-ink/10 rounded-lg px-2 py-1.5 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink/60 mb-1">End Time (HH:MM)</label>
                  <input 
                    type="time" 
                    value={newSlot.end_time} 
                    onChange={e => setNewSlot({...newSlot, end_time: e.target.value})}
                    className="w-full bg-white border border-ink/10 rounded-lg px-2 py-1.5 text-xs text-ink"
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  let specDate = 0;
                  if (!newSlot.recurring) {
                    if (!newSlot.specific_date) return alert('Select date');
                    specDate = Math.floor(new Date(newSlot.specific_date + 'T00:00:00').getTime() / 1000);
                  }
                  const slotDay = newSlot.recurring ? newSlot.day_of_week : new Date(newSlot.specific_date + 'T00:00:00').getDay();
                  setTempSlots([...tempSlots, {
                    day_of_week: slotDay,
                    start_time: newSlot.start_time,
                    end_time: newSlot.end_time,
                    recurring: newSlot.recurring,
                    specific_date: specDate
                  }]);
                }}
                className="w-full py-2 bg-sage text-white rounded-lg text-xs font-bold hover:bg-sage/90"
              >
                + Add Slot to List
              </button>
            </div>

            {/* List of slots currently in tempSlots */}
            <div className="space-y-2 mb-6">
              <p className="text-xs font-bold text-ink uppercase tracking-wider">Current / Proposed Slots</p>
              {tempSlots.length === 0 ? (
                <p className="text-xs text-ink/50 italic">No slots defined yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {tempSlots.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-ink/5 border border-ink/10 rounded-lg text-xs text-ink">
                      <div>
                        <span className="font-semibold text-ink">
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][s.day_of_week]}
                        </span>
                        <span className="ml-2">{s.start_time} - {s.end_time}</span>
                        {s.recurring ? (
                          <span className="text-[8px] uppercase font-bold text-sage ml-2 bg-sage/10 px-1 py-0.5 rounded">Weekly</span>
                        ) : (
                          <span className="text-[8px] uppercase font-bold text-blue-500 ml-2 bg-blue-50 px-1 py-0.5 rounded">
                            {s.specific_date ? new Date(s.specific_date * 1000).toLocaleDateString() : 'One-off'}
                          </span>
                        )}
                      </div>
                      <button onClick={() => setTempSlots(tempSlots.filter((_, i) => i !== idx))} className="text-rust font-bold hover:underline">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={handleSaveAvailability}
              className="w-full py-3 bg-ink text-cream rounded-xl text-sm font-bold hover:bg-ink/90 transition-colors"
            >
              Save All Availability
            </button>
          </div>
        </div>
      )}

      {/* Block Time Off Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-cream rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsBlockModalOpen(false)} className="absolute top-4 right-4 p-2 text-ink/50 hover:bg-ink/10 rounded-full transition-colors">
              <X size={18} />
            </button>
            <h2 className="font-serif text-xl font-bold text-ink mb-2">Block Time Off</h2>
            <p className="text-sm text-ink/60 mb-6">Mark periods when you are unavailable for interviews.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink/85 mb-1">Reason</label>
                <input 
                  type="text" 
                  value={blockForm.reason}
                  onChange={e => setBlockForm({...blockForm, reason: e.target.value})}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-sage/50"
                  placeholder="e.g. Focus time, Vacation"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink/85 mb-1">Start Time</label>
                <input 
                  type="datetime-local" 
                  value={blockForm.start}
                  onChange={e => setBlockForm({...blockForm, start: e.target.value})}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-sage/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink/85 mb-1">End Time</label>
                <input 
                  type="datetime-local" 
                  value={blockForm.end}
                  onChange={e => setBlockForm({...blockForm, end: e.target.value})}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-sage/50"
                />
              </div>
              
              <button 
                onClick={handleAddBlockTime}
                className="w-full py-3 bg-rust text-white rounded-xl text-sm font-bold hover:bg-rust/90 transition-colors mt-4 shadow-md"
              >
                Block Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {isReschedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-cream rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsReschedModalOpen(false)} className="absolute top-4 right-4 p-2 text-ink/50 hover:bg-ink/10 rounded-full transition-colors">
              <X size={18} />
            </button>
            <h2 className="font-serif text-xl font-bold text-ink mb-2">Reschedule Interview</h2>
            <p className="text-sm text-ink/60 mb-6">Override the interview time slot.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink/85 mb-1">New Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={reschedForm.datetime}
                  onChange={e => setReschedForm({...reschedForm, datetime: e.target.value})}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-sage/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink/85 mb-1">Duration (mins)</label>
                <input 
                  type="number" 
                  value={reschedForm.duration}
                  onChange={e => setReschedForm({...reschedForm, duration: Number(e.target.value)})}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-sage/50"
                />
              </div>
              
              <button 
                onClick={handleSaveReschedule}
                className="w-full py-3 bg-sage text-white rounded-xl text-sm font-bold hover:bg-sage/90 transition-colors mt-4 shadow-md"
              >
                Save New Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clash Resolution Modal */}
      {clashModal?.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-cream rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-ink">Scheduling Clash Detected</h2>
                <p className="text-xs text-ink/50">How would you like to resolve this conflict?</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ Time Conflict</p>
              <p>The proposed time clashes with <strong>{clashModal.clashedName}</strong>&apos;s interview already scheduled at:</p>
              <p className="font-mono text-xs mt-1 bg-amber-100 px-2 py-1 rounded">{new Date(clashModal.clashedTime * 1000).toLocaleString()}</p>
              <p className="mt-2 text-xs">Proposed new time: <span className="font-mono">{new Date(clashModal.proposedTime * 1000).toLocaleString()}</span></p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const modal = clashModal;
                  setClashModal(null);
                  handleApproveReschedule(modal.reqId, modal.reqAction, false, true);
                }}
                className="w-full flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors text-left group"
              >
                <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Force Approve Anyway</p>
                  <p className="text-xs text-emerald-600">Approve this reschedule and ignore the clash</p>
                </div>
              </button>

              <button
                onClick={() => {
                  const modal = clashModal;
                  setClashModal(null);
                  handleApproveReschedule(modal.reqId, modal.reqAction, true, false);
                }}
                className="w-full flex items-center gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-left group"
              >
                <Bot size={18} className="text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-800">AI Reschedule Both</p>
                  <p className="text-xs text-blue-600">Let AI find new non-clashing slots for both candidates</p>
                </div>
              </button>

              <button
                onClick={() => setClashModal(null)}
                className="w-full flex items-center gap-3 p-3.5 bg-ink/5 border border-ink/10 rounded-xl hover:bg-ink/10 transition-colors text-left"
              >
                <X size={18} className="text-ink/60 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-ink/80">Cancel</p>
                  <p className="text-xs text-ink/50">Go back without making changes</p>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cancel Interview Modal */}
      {cancelModal?.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-cream rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
          >
            <button onClick={() => setCancelModal(null)} className="absolute top-4 right-4 p-2 text-ink/50 hover:bg-ink/10 rounded-full transition-colors">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
                <XCircle size={20} />
              </div>
              <h2 className="font-serif text-lg font-bold text-ink">Cancel Interview</h2>
            </div>
            <p className="text-sm text-ink/60 mb-4">Please provide a reason for cancelling this interview. The candidate will be notified.</p>
            <textarea
              value={cancelModal.reason}
              onChange={e => setCancelModal({ ...cancelModal, reason: e.target.value })}
              placeholder="e.g. Position filled, scheduling conflict..."
              rows={3}
              className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-red-300 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 border border-ink/15 rounded-xl text-sm font-semibold text-ink/60 hover:bg-ink/5 transition-colors">
                Go Back
              </button>
              <button onClick={confirmCancelInterview} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">
                Cancel Interview
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
