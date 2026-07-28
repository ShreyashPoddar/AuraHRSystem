'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Briefcase,
  CheckCircle, Loader2, Link,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { moodleCall } from '@/lib/moodle';

export default function CandidateProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstname: user?.firstname || '',
    lastname: user?.lastname || '',
    email: user?.email || '',
    phone: '',
    city: '',
    dob: '',
    gender: '',
    education: '',
    tech_skills: '',
    nontech_skills: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await moodleCall<{ data: string }>('local_aurahr_jobs_get_user_prefs', {});
        if (res.data && res.data !== '{}') {
          const parsed = JSON.parse(res.data);
          setForm(prev => ({
            ...prev,
            firstname: parsed.firstname || prev.firstname,
            lastname: parsed.lastname || prev.lastname,
            phone: parsed.phone || '',
            city: parsed.city || '',
            dob: parsed.dob || '',
            gender: parsed.gender || '',
            education: parsed.education || '',
            tech_skills: parsed.tech_skills || '',
            nontech_skills: parsed.nontech_skills || '',
            bio: parsed.bio || '',
          }));
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Save all fields to Moodle user preferences
      await moodleCall('local_aurahr_jobs_update_user_prefs', {
        data: JSON.stringify(form)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-sage" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Profile</h1>
        <p className="text-ink/50 mt-1 text-sm">Complete your profile to improve your application visibility.</p>
      </div>

      {/* Avatar section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bento-card p-6 flex items-center gap-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          {form.firstname[0] || 'U'}{form.lastname[0] || ''}
        </div>
        <div>
          <h2 className="font-sans text-lg font-semibold text-ink">
            {form.firstname} {form.lastname}
          </h2>
          <p className="text-sm text-ink/40">{form.email}</p>
          <button className="mt-2 text-xs text-blue-500 hover:text-blue-600 font-medium">
            Change photo
          </button>
        </div>
      </motion.div>

      {/* Profile form */}
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSave}
        className="bento-card p-6 space-y-5"
      >
        <h3 className="font-serif text-lg font-semibold text-ink">Personal Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">
              <User size={14} className="inline mr-1" /> First Name
            </label>
            <input type="text" value={form.firstname} onChange={e => update('firstname', e.target.value)}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Last Name</label>
            <input type="text" value={form.lastname} onChange={e => update('lastname', e.target.value)}
              className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">
              <Mail size={14} className="inline mr-1" /> Email
            </label>
            <input type="email" value={form.email} disabled className="input-field opacity-50 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">
              <Phone size={14} className="inline mr-1" /> Phone
            </label>
            <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
              placeholder="+91 98765 43210" className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Date of Birth</label>
            <input type="date" value={form.dob} onChange={e => update('dob', e.target.value)}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Gender</label>
            <select value={form.gender} onChange={e => update('gender', e.target.value)} className="input-field">
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">
            <MapPin size={14} className="inline mr-1" /> City
          </label>
          <input type="text" value={form.city} onChange={e => update('city', e.target.value)}
            placeholder="Mumbai, India" className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Educational Details</label>
          <textarea value={form.education} onChange={e => update('education', e.target.value)}
            placeholder="e.g. B.Tech in Computer Science, IIT Bombay (2020-2024)"
            rows={2} className="input-field resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Technical Skills</label>
          <input type="text" value={form.tech_skills} onChange={e => update('tech_skills', e.target.value)}
            placeholder="React, Node.js, Python, AWS (comma separated)" className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Non-Technical Skills</label>
          <input type="text" value={form.nontech_skills} onChange={e => update('nontech_skills', e.target.value)}
            placeholder="Leadership, Communication, Agile (comma separated)" className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Bio</label>
          <textarea value={form.bio} onChange={e => update('bio', e.target.value)}
            placeholder="Tell recruiters about yourself, your experience, and what's you're looking for..."
            rows={4} className="input-field resize-none" />
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-ink text-cream rounded-2xl font-sans font-semibold text-sm hover:bg-ink/90 disabled:opacity-60 transition-colors shadow-lg"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> :
           saved ? <><CheckCircle size={16} /> Saved!</> :
           <>Save Changes</>}
        </motion.button>
      </motion.form>

    </div>
  );
}
