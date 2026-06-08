'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, ArrowRight, Plus, Video, X, Trash2 } from 'lucide-react';
import { moodleCall } from '@/lib/moodle';
import { useAuth } from '@/contexts/AuthContext';

export default function CandidateSchedulerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'interviews' | 'freetime'>('interviews');
  const [loading, setLoading] = useState(true);

  // Data States
  const [interviews, setInterviews] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));

  // Reschedule Modal States
  const [isReschedModalOpen, setIsReschedModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [reschedReason, setReschedReason] = useState('');
  const [reschedTime, setReschedTime] = useState('');

  // Add Time Slot Modal States
  const [isAddTimeModalOpen, setIsAddTimeModalOpen] = useState(false);
  const [addTimeDayIndex, setAddTimeDayIndex] = useState(0);
  const [addTimeStart, setAddTimeStart] = useState('09:00');
  const [addTimeEnd, setAddTimeEnd] = useState('17:00');
  const [addTimeRecurring, setAddTimeRecurring] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [user]);

  async function loadAllData() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [interviewData, availabilityData] = await Promise.all([
        moodleCall('local_aurahr_interview_list', { candidateid: user.id }),
        moodleCall('local_aurahr_scheduler_get_availability', { userid: user.id })
      ]);
      setInterviews((interviewData as any).interviews || []);
      setSlots((availabilityData as any).slots || []);
    } catch (err) {
      console.error('Failed to load candidate scheduler data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReschedule() {
    if (!selectedInterview) return;
    if (!reschedReason || !reschedTime) return alert('Please enter both a reason and a proposed time');
    try {
      const proposed_time = Math.floor(new Date(reschedTime).getTime() / 1000);
      await moodleCall('local_aurahr_scheduler_request_reschedule', {
        interviewid: selectedInterview.id,
        reason: reschedReason,
        new_time: proposed_time
      });
      alert('Reschedule request sent successfully!');
      setIsReschedModalOpen(false);
      setReschedReason('');
      setReschedTime('');
      loadAllData();
    } catch (err: any) {
      alert('Failed to send reschedule request: ' + err.message);
    }
  }

  function handleAddSlotLocal() {
    if (!addTimeStart || !addTimeEnd) return alert('Please enter both start and end time');
    
    // Calculate date for the day index
    const date = new Date();
    date.setDate(date.getDate() + addTimeDayIndex);
    const dayOfWeek = date.getDay();
    const specificDate = addTimeRecurring ? 0 : Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000);

    const newSlot = {
      id: Math.floor(Math.random() * -100000), // temp local ID
      userid: user?.id || 0,
      day_of_week: dayOfWeek,
      start_time: addTimeStart,
      end_time: addTimeEnd,
      recurring: addTimeRecurring ? 1 : 0,
      specific_date: specificDate
    };

    setSlots([...slots, newSlot]);
    setIsAddTimeModalOpen(false);
  }

  function handleDeleteSlotLocal(slotId: number) {
    setSlots(slots.filter(s => s.id !== slotId));
  }

  async function handleUpdateAvailability() {
    if (!user?.id) return;
    try {
      await moodleCall('local_aurahr_scheduler_set_availability', {
        userid: user.id,
        slots: slots.map(s => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          recurring: s.recurring,
          specific_date: s.specific_date
        }))
      });
      alert('Availability updated successfully!');
      setActiveTab('interviews'); // navigate to My Interviews page
      loadAllData();
    } catch (err: any) {
      alert('Failed to update availability: ' + err.message);
    }
  }

  // Filter interviews
  const upcomingInterviews = interviews.filter(inv => inv.status === 'scheduled');
  const pastInterviews = interviews.filter(inv => inv.status !== 'scheduled');

  // Next 7 days helper
  const next7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    const dateStr = date.toDateString();
    
    // Filter slots corresponding to this specific day index
    const daySlots = slots.filter(s => {
      if (s.recurring === 1) {
        return s.day_of_week === dayOfWeek;
      } else {
        const sDate = new Date(s.specific_date * 1000);
        return sDate.toDateString() === dateStr;
      }
    });

    return {
      index: i,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      dateObj: date,
      slots: daySlots
    };
  });

  return (
    <div className="space-y-6 max-w-5xl relative">
      <div>
        <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Smart Scheduler</h1>
        <p className="text-ink/50 mt-1 text-sm">Manage your upcoming interviews and update your availability.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-ink/10 pb-px">
        <button
          onClick={() => setActiveTab('interviews')}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'interviews' ? 'text-ink' : 'text-ink/40 hover:text-ink/70'
          }`}
        >
          My Interviews
          {activeTab === 'interviews' && (
            <motion.div layoutId="candidate-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('freetime')}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'freetime' ? 'text-ink' : 'text-ink/40 hover:text-ink/70'
          }`}
        >
          My Free Time
          {activeTab === 'freetime' && (
            <motion.div layoutId="candidate-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="pt-4">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-ink/50">Loading scheduler data...</div>
        ) : activeTab === 'interviews' ? (
          <div className="space-y-8">
            <div>
              <h3 className="font-serif text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                <Clock size={18} className="text-blue-500" /> Upcoming Interviews
              </h3>
              <div className="space-y-4">
                {upcomingInterviews.length === 0 ? (
                  <p className="text-sm text-ink/50 italic p-4 bg-ink/5 rounded-xl border border-ink/10">No upcoming interviews scheduled.</p>
                ) : (
                  upcomingInterviews.map((interview) => (
                    <div key={interview.id} className="bento-card p-5 flex items-center justify-between">
                      <div>
                        <h4 className="font-sans text-sm font-semibold text-ink">{interview.job_title || 'Technical Interview'}</h4>
                        <p className="text-xs text-ink/50 mt-1">{new Date(interview.scheduled_at * 1000).toLocaleString()} ({interview.duration_mins} mins)</p>
                        {interview.interviewer_name && (
                          <p className="text-xs text-ink/70 mt-1">Interviewer: {interview.interviewer_name}</p>
                        )}
                      </div>
                      {(() => {
                        const isLive = currentTime >= interview.scheduled_at && currentTime <= (interview.scheduled_at + interview.duration_mins * 60);
                        return (
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => {
                                setSelectedInterview(interview);
                                setIsReschedModalOpen(true);
                              }}
                              className="text-xs font-semibold text-ink/40 hover:text-ink transition-colors px-3 py-1.5 rounded-lg border border-ink/10"
                            >
                              Request Reschedule
                            </button>
                            {isLive ? (
                              <a 
                                href={`/candidate/interview/${interview.applicationid}`}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors shadow-md"
                              >
                                <Video size={14} /> Join Now
                              </a>
                            ) : (
                              <button 
                                disabled
                                className="flex items-center gap-2 px-4 py-2 bg-ink/10 text-ink/40 rounded-xl text-sm font-semibold cursor-not-allowed border border-ink/10"
                              >
                                <Video size={14} /> Join Now (Not Live)
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="font-serif text-lg font-semibold text-ink/50 mb-4 flex items-center gap-2">
                <Clock size={18} /> Past Interviews
              </h3>
              <div className="space-y-4 opacity-70">
                {pastInterviews.length === 0 ? (
                  <p className="text-sm text-ink/50 italic p-4">No past interviews.</p>
                ) : (
                  pastInterviews.map((interview) => (
                    <div key={interview.id} className="bento-card p-5 flex items-center justify-between bg-ink/5 border-none">
                      <div>
                        <h4 className="font-sans text-sm font-semibold text-ink">{interview.job_title || 'Technical Interview'}</h4>
                        <p className="text-xs text-ink/50 mt-1">{new Date(interview.scheduled_at * 1000).toLocaleString()}</p>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 bg-ink/10 text-ink/60 rounded-lg capitalize">{interview.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bento-card p-6">
            <h3 className="font-serif text-lg font-semibold text-ink mb-2">Set Your Availability</h3>
            <p className="text-sm text-ink/60 mb-6">Let the auto-scheduler know when you are free for the next 7 days.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
              {next7Days.map((day) => (
                <div key={day.index} className="border border-ink/10 rounded-xl p-3 flex flex-col justify-between hover:border-blue-300 transition-colors bg-ink/5 min-h-[160px]">
                  <div>
                    <p className="text-[10px] text-ink/40 uppercase tracking-wider mb-1 text-center font-bold">{day.dayName}</p>
                    <p className="text-lg font-serif font-bold text-ink text-center mb-2">{day.dayNum}</p>
                    
                    {/* Visualizer for existing slots */}
                    <div className="space-y-1 max-h-[80px] overflow-y-auto mb-2 pr-0.5">
                      {day.slots.map((s) => (
                        <div key={s.id} className="text-[10px] text-ink/80 bg-white border border-ink/10 px-1.5 py-0.5 rounded flex justify-between items-center">
                          <span>{s.start_time}-{s.end_time}</span>
                          <button onClick={() => handleDeleteSlotLocal(s.id)} className="text-rust/70 hover:text-rust ml-1 font-bold">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setAddTimeDayIndex(day.index);
                      setIsAddTimeModalOpen(true);
                    }}
                    className="mt-2 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded w-full hover:bg-blue-500 hover:text-white transition-colors"
                  >
                    + Add Time
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={handleUpdateAvailability}
              className="w-full flex justify-center py-3 bg-ink text-cream rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors shadow-lg"
            >
              Update Availability
            </button>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {isReschedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-cream rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsReschedModalOpen(false)} className="absolute top-4 right-4 p-2 text-ink/50 hover:bg-ink/10 rounded-full transition-colors">
              <X size={18} />
            </button>
            <h2 className="font-serif text-xl font-bold text-ink mb-2">Request Reschedule</h2>
            <p className="text-sm text-ink/60 mb-6">Propose a new time for your interview. The recruiter will review it.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-1">Reason for rescheduling</label>
                <textarea 
                  value={reschedReason}
                  onChange={e => setReschedReason(e.target.value)}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g. Schedule conflict, medical checkup"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-1">Proposed New Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={reschedTime}
                  onChange={e => setReschedTime(e.target.value)}
                  className="w-full bg-white border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <button 
                onClick={handleRequestReschedule}
                className="w-full py-3 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors mt-4 shadow-md"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Time Slot Modal */}
      {isAddTimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-cream rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setIsAddTimeModalOpen(false)} className="absolute top-4 right-4 p-2 text-ink/50 hover:bg-ink/10 rounded-full transition-colors">
              <X size={18} />
            </button>
            <h2 className="font-serif text-lg font-bold text-ink mb-1">Add Availability Slot</h2>
            <p className="text-xs text-ink/60 mb-4">
              For {new Date(new Date().setDate(new Date().getDate() + addTimeDayIndex)).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 bg-ink/5 rounded-xl border border-ink/10">
                <span className="text-xs font-semibold text-ink">Repeat weekly on this day</span>
                <input 
                  type="checkbox" 
                  checked={addTimeRecurring} 
                  onChange={e => setAddTimeRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-ink/10 text-blue-500 focus:ring-blue-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Start Time</label>
                  <input 
                    type="time" 
                    value={addTimeStart}
                    onChange={e => setAddTimeStart(e.target.value)}
                    className="w-full bg-white border border-ink/10 rounded-lg px-2.5 py-1.5 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink/60 mb-1">End Time</label>
                  <input 
                    type="time" 
                    value={addTimeEnd}
                    onChange={e => setAddTimeEnd(e.target.value)}
                    className="w-full bg-white border border-ink/10 rounded-lg px-2.5 py-1.5 text-xs text-ink"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddSlotLocal}
                className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors mt-2"
              >
                Add Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
