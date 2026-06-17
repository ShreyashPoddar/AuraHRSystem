'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, ShieldCheck, Settings2, Bell, Zap, 
  AlertTriangle, Upload, Eye, EyeOff, Save, Trash2, Globe, ArrowRight, Loader2
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

const ToggleSwitch = ({ isOn, onToggle }: { isOn: boolean, onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2 ${isOn ? 'bg-sage' : 'bg-ink/20'}`}
  >
    <motion.span
      animate={{ x: isOn ? 22 : 2 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm"
    />
  </button>
);

export default function OrgSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({ 
    companyName: '', 
    industry: 'Technology',
    size: '51-200',
    website: '',
    gstin: '', 
    tan: '',
    pan: '',
    defaultState: 'Maharashtra',
    address: '',
    geminiKey: '',
    moodleUrl: 'http://localhost/moodle',
    jitsiUrl: 'https://meet.jit.si'
  });

  const [recruitment, setRecruitment] = useState({
    autoScreen: true,
    malpractice: true,
    autoReject: false,
    requireSocials: false,
    githubFallback: 60,
    leetcodeFallback: 60
  });

  const [notifs, setNotifs] = useState({
    newApp: true,
    assessmentDone: true,
    interviewRemind: true,
    weeklySummary: false
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await moodleCall<any>('local_aurahr_jobs_get_org_config');
        const data = JSON.parse(res.data || '{}');
        if (data.formData) setFormData(data.formData);
        if (data.recruitment) {
          setRecruitment(prev => ({
            ...prev,
            ...data.recruitment,
            githubFallback: data.recruitment.githubFallback !== undefined ? Number(data.recruitment.githubFallback) : 60,
            leetcodeFallback: data.recruitment.leetcodeFallback !== undefined ? Number(data.recruitment.leetcodeFallback) : 60,
          }));
        }
        if (data.notifs) setNotifs(data.notifs);
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await moodleCall('local_aurahr_jobs_update_org_config', {
        data: JSON.stringify({ formData, recruitment, notifs })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const PipelineStage = ({ name, active = false }: { name: string, active?: boolean }) => (
    <div className={`flex items-center justify-center px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider ${active ? 'bg-sage/10 border-sage/30 text-sage' : 'bg-ink/5 border-ink/10 text-ink/40'}`}>
      {name}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center py-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight mb-1">Platform Settings</h1>
          <p className="text-ink/60 text-sm">Configure your organization, recruitment pipeline, and integrations.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Company Profile */}
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bento-card p-8">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-ink/5">
                <Building2 className="text-gold" size={24} />
                <h2 className="font-serif text-xl font-bold text-ink">Company Profile</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">Company Legal Name</label>
                  <input type="text" className="input-field" placeholder="e.g. aurhr Global Pvt Ltd" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">Industry</label>
                    <select className="input-field" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})}>
                      <option>Technology</option><option>Healthcare</option><option>Finance</option><option>Manufacturing</option><option>Education</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">Company Size</label>
                    <select className="input-field" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})}>
                      <option>1-10</option><option>11-50</option><option>51-200</option><option>201-500</option><option>500+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">Website URL</label>
                  <input type="url" className="input-field" placeholder="https://www.example.com" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">Company Logo</label>
                  <div className="border-2 border-dashed border-ink/10 hover:border-gold/50 bg-warm-sand/40 rounded-xl p-8 flex flex-col items-center justify-center text-ink/50 transition-colors cursor-pointer group">
                    <Upload className="w-8 h-8 mb-3 text-ink/30 group-hover:text-gold transition-colors" />
                    <p className="text-sm font-medium text-ink">Drag and drop your logo here</p>
                    <p className="text-xs mt-1">PNG or JPG up to 2MB</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Statutory Identity */}
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bento-card p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-warm-sand rounded-full blur-3xl opacity-50 -z-10" />
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-ink/5">
                <ShieldCheck className="text-sage" size={24} />
                <h2 className="font-serif text-xl font-bold text-ink">Statutory Identity (India)</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">GSTIN Number</label>
                    <input type="text" className="input-field font-mono" placeholder="27XXXXX0000X1Z5" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">TAN Number</label>
                    <input type="text" className="input-field font-mono" placeholder="MUMB12345C" value={formData.tan} onChange={e => setFormData({...formData, tan: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">PAN Number</label>
                    <input type="text" className="input-field font-mono" placeholder="ABCDE1234F" value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">Default Operating Region (PT)</label>
                    <select className="input-field" value={formData.defaultState} onChange={e => setFormData({...formData, defaultState: e.target.value})}>
                      <option>Maharashtra</option><option>Karnataka</option><option>Delhi</option><option>Tamil Nadu</option><option>Telangana</option><option>Gujarat</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">Registered Address</label>
                  <textarea rows={3} className="input-field resize-none" placeholder="Enter full registered address..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>
            </motion.section>
            
            {/* Recruitment Pipeline */}
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bento-card p-8">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-ink/5">
                <Settings2 className="text-gold" size={24} />
                <h2 className="font-serif text-xl font-bold text-ink">Recruitment Settings</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink text-sm">Auto-screen with AI</p>
                    <p className="text-ink/50 text-xs mt-0.5">Use JD Parser to automatically move qualified candidates to Academia</p>
                  </div>
                  <ToggleSwitch isOn={recruitment.autoScreen} onToggle={() => setRecruitment({...recruitment, autoScreen: !recruitment.autoScreen})} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink text-sm">Malpractice Detection</p>
                    <p className="text-ink/50 text-xs mt-0.5">Monitor candidates during assessments for tab switches and voices</p>
                  </div>
                  <ToggleSwitch isOn={recruitment.malpractice} onToggle={() => setRecruitment({...recruitment, malpractice: !recruitment.malpractice})} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink text-sm">Social Profile Analysis Lock</p>
                    <p className="text-ink/50 text-xs mt-0.5">Require GitHub/LeetCode analysis before shortlisting</p>
                  </div>
                  <ToggleSwitch isOn={recruitment.requireSocials} onToggle={() => setRecruitment({...recruitment, requireSocials: !recruitment.requireSocials})} />
                </div>

                {/* Fallback settings */}
                <div className="mt-6 pt-6 border-t border-ink/5 space-y-4">
                  <h3 className="text-xs font-bold text-ink/40 uppercase tracking-wider mb-2">Social Analysis Fallback Scores</h3>
                  <p className="text-xs text-ink/50 mb-4">Set the baseline scores assigned when a candidate's profile is gated, rate-limited, or empty.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink/60 mb-1.5">GitHub Fallback</label>
                      <input 
                        type="number" 
                        min="0" max="100" 
                        className="input-field py-2 text-center font-mono" 
                        value={recruitment.githubFallback} 
                        onChange={e => setRecruitment({...recruitment, githubFallback: Math.min(100, Math.max(0, Number(e.target.value)))})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink/60 mb-1.5">LeetCode Fallback</label>
                      <input 
                        type="number" 
                        min="0" max="100" 
                        className="input-field py-2 text-center font-mono" 
                        value={recruitment.leetcodeFallback} 
                        onChange={e => setRecruitment({...recruitment, leetcodeFallback: Math.min(100, Math.max(0, Number(e.target.value)))})} 
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-ink/5">
                  <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-4">Default Pipeline Stages</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <PipelineStage name="Applied" active />
                    <ArrowRight size={14} className="text-ink/20" />
                    <PipelineStage name="Screened" active />
                    <ArrowRight size={14} className="text-ink/20" />
                    <PipelineStage name="Academia" active />
                    <ArrowRight size={14} className="text-ink/20" />
                    <PipelineStage name="Interview" active />
                    <ArrowRight size={14} className="text-ink/20" />
                    <PipelineStage name="Offer" active />
                    <ArrowRight size={14} className="text-ink/20" />
                    <PipelineStage name="Selected" active />
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            
            {/* Integrations */}
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bento-card p-6">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-ink/5">
                <Zap className="text-rust" size={20} />
                <h2 className="font-serif text-lg font-bold text-ink">Integrations</h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="flex items-center justify-between text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">
                    Gemini API Key (AI Features)
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </label>
                  <div className="relative">
                    <input 
                      type={showApiKey ? 'text' : 'password'} 
                      className="input-field font-mono text-sm pr-12" 
                      value={formData.geminiKey} 
                      onChange={e => setFormData({...formData, geminiKey: e.target.value})} 
                    />
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/80 transition-colors">
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center justify-between text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">
                    Moodle Instance URL
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </label>
                  <input type="text" className="input-field text-sm" value={formData.moodleUrl} onChange={e => setFormData({...formData, moodleUrl: e.target.value})} />
                </div>

                <div>
                  <label className="flex items-center justify-between text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-2">
                    Jitsi Server URL
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </label>
                  <input type="text" className="input-field text-sm" value={formData.jitsiUrl} onChange={e => setFormData({...formData, jitsiUrl: e.target.value})} />
                </div>
              </div>
            </motion.section>

            {/* Notifications */}
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bento-card p-6">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-ink/5">
                <Bell className="text-sage" size={20} />
                <h2 className="font-serif text-lg font-bold text-ink">Notifications</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink">New applications</span>
                  <ToggleSwitch isOn={notifs.newApp} onToggle={() => setNotifs({...notifs, newApp: !notifs.newApp})} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink">Assessments completed</span>
                  <ToggleSwitch isOn={notifs.assessmentDone} onToggle={() => setNotifs({...notifs, assessmentDone: !notifs.assessmentDone})} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink">Interview reminders</span>
                  <ToggleSwitch isOn={notifs.interviewRemind} onToggle={() => setNotifs({...notifs, interviewRemind: !notifs.interviewRemind})} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink">Weekly summary report</span>
                  <ToggleSwitch isOn={notifs.weeklySummary} onToggle={() => setNotifs({...notifs, weeklySummary: !notifs.weeklySummary})} />
                </div>
              </div>
            </motion.section>

            {/* Danger Zone */}
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bento-card p-6 border-red-500/20 bg-red-500/5">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="text-red-500" size={20} />
                <h2 className="font-serif text-lg font-bold text-red-600">Danger Zone</h2>
              </div>
              <div className="space-y-3">
                <button type="button" className="w-full flex items-center justify-center text-sm font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200 transition-colors px-4 py-2.5 rounded-lg shadow-sm">
                  <Globe size={16} className="mr-2" /> Archive All Jobs
                </button>
                <button type="button" className="w-full flex items-center justify-center text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors px-4 py-2.5 rounded-lg shadow-sm">
                  <Trash2 size={16} className="mr-2" /> Reset Recruitment Data
                </button>
              </div>
            </motion.section>

          </div>
        </div>

        {/* Global Save Bar */}
        <div className="sticky bottom-6 z-50 flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border border-ink/10 rounded-2xl shadow-xl">
          <div className="flex items-center">
            {saved && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-emerald-600 flex items-center text-sm font-bold font-mono bg-emerald-50 px-4 py-2 rounded-lg ml-2">
                <ShieldCheck size={16} className="mr-2" /> Settings Saved
              </motion.div>
            )}
          </div>
          <button type="submit" className="bg-ink hover:bg-gold text-white hover:text-ink px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center">
            <Save size={18} className="mr-2" />
            Save All Changes
          </button>
        </div>
      </form>
    </div>
  );
}
