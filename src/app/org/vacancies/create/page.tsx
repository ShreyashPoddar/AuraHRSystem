'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, Loader2, Wand2, CheckCircle, Briefcase, Network, Clock } from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

interface ParsedJD {
  title: string;
  department: string;
  tech_skills: string;
  nontech_skills: string;
  experience_required: string;
  short_summary: string;
}

export default function CreateVacancyPage() {
  const router = useRouter();
  
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedJD | null>(null);
  const [saving, setSaving] = useState(false);
  const [deadline, setDeadline] = useState('');

  async function handleParse() {
    if (!rawText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch('/api/jd/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: rawText })
      });
      
      const data = await res.json();
      if (data.success) {
        setParsedData(data.parsed);
      } else {
        alert(data.error || 'Failed to parse JD');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while parsing JD');
    } finally {
      setParsing(false);
    }
  }

  function updateField(field: keyof ParsedJD, value: string) {
    if (parsedData) {
      setParsedData({ ...parsedData, [field]: value });
    }
  }

  async function handlePublish() {
    if (!parsedData) return;
    setSaving(true);
    try {
      // Calculate deadline timestamp
      const deadlineTs = deadline ? Math.floor(new Date(deadline).getTime() / 1000) : 0;
      
      // Combine skills and experience into the description for Moodle
      const fullDescription = `
        <p><strong>Summary:</strong> ${parsedData.short_summary}</p>
        <p><strong>Technical Skills:</strong> ${parsedData.tech_skills}</p>
        <p><strong>Non-Technical Skills:</strong> ${parsedData.nontech_skills}</p>
        <p><strong>Experience:</strong> ${parsedData.experience_required}</p>
      `;

      await moodleCall('local_aurahr_jobs_create_job', {
        title: parsedData.title,
        department: parsedData.department,
        description: fullDescription,
        deadline: deadlineTs
      });
      
      router.push('/org/vacancies');
      router.refresh(); // Refresh the layout to show the new job
    } catch (err) {
      console.error(err);
      alert('Failed to publish vacancy');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-6 pb-24">
      <div>
        <h1 className="font-serif text-3xl font-bold text-ink tracking-tight flex items-center gap-2">
          <Briefcase className="text-sage" /> Create New Vacancy
        </h1>
        <p className="text-ink/50 mt-1 text-sm">Paste a job description and let AI extract the requirements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Input */}
        <div className="bento-card p-6 flex flex-col">
          <h3 className="font-serif text-lg font-semibold text-ink mb-3 flex items-center gap-2">
            <FileText size={18} className="text-blue-500" />
            Raw Job Description
          </h3>
          <textarea 
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste the full job description here..."
            className="w-full flex-1 min-h-[300px] p-4 bg-cream border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-sage/50 resize-none transition-colors"
          />
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleParse}
            disabled={parsing || !rawText.trim()}
            className="mt-4 w-full py-3 bg-ink text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-ink/90 disabled:opacity-50 transition-colors shadow-md group"
          >
            {parsing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} className="group-hover:text-gold transition-colors" />}
            {parsing ? 'Analyzing with AI...' : 'Parse JD with AI'}
          </motion.button>
        </div>

        {/* Right Column: AI Output & Editing */}
        <div className="bento-card p-6 flex flex-col">
          <h3 className="font-serif text-lg font-semibold text-ink mb-3 flex items-center gap-2">
            <Network size={18} className="text-sage" />
            Structured Requirements
          </h3>

          {!parsedData ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink/30 border-2 border-dashed border-ink/10 rounded-2xl">
              <Wand2 size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">Awaiting AI extraction...</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 space-y-4 overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-1 ml-1">Job Title</label>
                <input type="text" value={parsedData.title} onChange={e => updateField('title', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-1 ml-1">Department</label>
                <input type="text" value={parsedData.department} onChange={e => updateField('department', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-1 ml-1">Tech Skills (comma separated)</label>
                <textarea value={parsedData.tech_skills} onChange={e => updateField('tech_skills', e.target.value)} rows={2} className="input-field resize-none text-emerald-700 bg-emerald-500/5 border-emerald-500/20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-1 ml-1">Non-Tech Skills</label>
                <input type="text" value={parsedData.nontech_skills} onChange={e => updateField('nontech_skills', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-1 ml-1">Experience</label>
                <input type="text" value={parsedData.experience_required} onChange={e => updateField('experience_required', e.target.value)} className="input-field" />
              </div>
              
              <div className="pt-4 border-t border-ink/10">
                <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-1 ml-1 flex items-center gap-1">
                  <Clock size={12} /> Application Deadline
                </label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="input-field" />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handlePublish}
                disabled={saving || !parsedData.title}
                className="w-full py-4 mt-6 bg-sage text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-sage/90 disabled:opacity-50 transition-colors shadow-lg"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {saving ? 'Publishing...' : 'Publish Vacancy'}
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
