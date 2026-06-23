'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Briefcase, Upload,
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
    resume_name: '',
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
            resume_name: parsed.resume_name || '',
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

  const [uploadingResume, setUploadingResume] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }
    setUploadingResume(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        // Strip the data URL prefix (e.g. data:application/pdf;base64,) to send pure base64
        const base64data = result.includes(',') ? result.split(',')[1] : result;
        
        try {
          // 1. Upload to Moodle
          await moodleCall('local_aurahr_jobs_upload_resume', {
            filename: file.name,
            base64data
          });

          // 2. Update local state and Moodle user prefs JSON
          const updatedForm = { ...form, resume_name: file.name };
          setForm(updatedForm);

          await moodleCall('local_aurahr_jobs_update_user_prefs', {
            data: JSON.stringify(updatedForm)
          });

          alert('Resume uploaded and parsed successfully!');
        } catch (err) {
          console.error(err);
          alert('Failed to upload/parse resume.');
        } finally {
          setUploadingResume(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Error reading file.');
      setUploadingResume(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

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

      {/* Resume upload */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bento-card p-6"
      >
        <h3 className="font-serif text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <Briefcase size={18} className="text-blue-500" />
          Resume
        </h3>
        
        <input 
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
          accept=".pdf,.doc,.docx"
          className="hidden"
        />

        {uploadingResume ? (
          <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center bg-blue-500/5">
            <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-ink">Uploading & Analyzing Resume...</p>
            <p className="text-xs text-ink/40 mt-1">This might take a moment as our AI extracts skills and socials.</p>
          </div>
        ) : form.resume_name ? (
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                <Briefcase size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-ink truncate max-w-xs sm:max-w-md">{form.resume_name}</p>
                <p className="text-xs text-ink/40">Uploaded Resume</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-xl transition-all"
            >
              Replace File
            </button>
          </div>
        ) : (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer relative overflow-hidden group ${
              isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-ink/10 hover:border-blue-300'
            }`}
          >
            <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <Upload size={32} className="text-ink/20 mx-auto mb-3 group-hover:text-blue-500 transition-colors relative z-10" />
            <p className="text-sm text-ink/40 relative z-10">
              Drag & drop your resume here, or <span className="text-blue-500 font-medium">browse files</span>
            </p>
            <p className="text-xs text-ink/25 mt-1 relative z-10">PDF, DOC, DOCX (max 5MB)</p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider relative z-10">
              <CheckCircle size={12} /> AWS AI OCR Active
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
