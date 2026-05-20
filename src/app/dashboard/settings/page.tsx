'use client';
import { useState } from 'react';
import { ShieldCheck, Building } from 'lucide-react';

export default function SettingsPage() {
  const [formData, setFormData] = useState({ companyName: '', gstin: '', tan: '', defaultState: 'Maharashtra' });
  const [saved, setSaved] = useState(false);
  
  const handleSave = (e: any) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-1">Company Settings</h1>
          <p className="text-ink/60 font-sans text-sm">Configure your localized Indian operational data.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="bento-card p-8 bg-white shadow-sm border border-ink/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-warm-sand rounded-full blur-3xl opacity-50 -z-10" />
          
          <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-ink/5">
            <Building className="w-6 h-6 text-gold" />
            <h2 className="font-serif text-2xl text-ink">Statutory Identity</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-6 font-sans">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink/50 mb-2">Company Legal Name</label>
                <input type="text" className="w-full bg-warm-sand/40 border border-ink/10 rounded-xl p-3.5 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all text-ink" placeholder="e.g. NexusHR Global Pvt Ltd" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink/50 mb-2">GSTIN Number</label>
                  <input type="text" className="w-full bg-warm-sand/40 border border-ink/10 rounded-xl p-3.5 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all font-mono text-ink placeholder:text-ink/30" placeholder="27XXXXX0000X1Z5" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink/50 mb-2">TAN Number</label>
                  <input type="text" className="w-full bg-warm-sand/40 border border-ink/10 rounded-xl p-3.5 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all font-mono text-ink placeholder:text-ink/30" placeholder="MUMB12345C" value={formData.tan} onChange={e => setFormData({...formData, tan: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink/50 mb-2">Default Operating Region (For PT)</label>
                <select className="w-full bg-warm-sand/40 border border-ink/10 rounded-xl p-3.5 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all text-ink" value={formData.defaultState} onChange={e => setFormData({...formData, defaultState: e.target.value})}>
                  <option value="Maharashtra">Maharashtra (MH)</option>
                  <option value="Karnataka">Karnataka (KA)</option>
                  <option value="Delhi">Delhi (DL)</option>
                  <option value="Tamil Nadu">Tamil Nadu (TN)</option>
                </select>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-ink/5 flex items-center justify-between">
              {saved ? (
                <div className="text-sage text-sm font-bold font-mono tracking-wide flex items-center bg-sage/10 px-4 py-2.5 rounded-lg border border-sage/20 animate-in zoom-in-95">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Details Verified & Saved
                </div>
              ) : <div/>}
              <button type="submit" className="bg-ink text-cream hover:bg-gold hover:text-ink px-8 py-3.5 rounded-xl text-sm font-medium transition-all shadow-md">
                Save Configurations
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
