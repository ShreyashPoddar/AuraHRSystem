'use client';
import { useState, useEffect } from 'react';
import { ShieldAlert, CalendarClock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function CompliancePage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/compliance/reminders')
      .then(res => res.json())
      .then(data => setReminders(data.reminders || []));
  }, []);

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(isoString));
  };

  const toggleComplete = (id: string) => {
    if (completed.includes(id)) {
      setCompleted(completed.filter(c => c !== id));
    } else {
      setCompleted([...completed, id]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-1">Statutory Compliance</h1>
          <p className="text-ink/60 font-sans text-sm">EPF, ESI, PT and tax filing deadlines exclusively aligned for India workflows.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reminders.map(rem => {
          const isDone = completed.includes(rem.id);
          return (
            <div key={rem.id} className={`bento-card p-6 flex flex-col relative overflow-hidden transition-all duration-300 group ${isDone ? 'bg-sage/10 border-sage/30 shadow-none' : 'bg-white border-ink/10 shadow-sm hover:border-gold/30'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDone ? 'bg-sage/20 text-sage' : rem.isCritical ? 'bg-rust/10 text-rust' : 'bg-gold/10 text-gold'}`}>
                  {isDone ? <ShieldCheck className="w-5 h-5" /> : rem.isCritical ? <ShieldAlert className="w-5 h-5" /> : <CalendarClock className="w-5 h-5" />}
                </div>
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${isDone ? 'bg-sage/20 text-sage' : 'bg-warm-sand text-ink/60'}`}>{rem.type}</span>
              </div>
              <h3 className={`font-serif text-2xl mb-2 transition-all ${isDone ? 'text-ink/40 line-through' : 'text-ink'}`}>{rem.title}</h3>
              <p className={`text-sm font-sans mb-8 transition-colors ${isDone ? 'text-ink/40' : 'text-ink/60'}`}>
                Due by: <span className="font-mono font-bold">{formatDate(rem.dueDate)}</span>
              </p>
              <button 
                onClick={() => toggleComplete(rem.id)}
                className={`mt-auto w-full py-3 rounded-xl text-sm font-medium transition-all flex justify-center items-center shadow-sm ${isDone ? 'bg-sage/20 text-sage hover:bg-sage/30 outline outline-1 outline-sage/30' : 'bg-ink text-cream hover:bg-gold hover:text-ink'}`}
              >
                {isDone ? 'Filed Successfully' : 'Mark as Filed'}
                {isDone && <CheckCircle2 className="w-4 h-4 ml-2" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
