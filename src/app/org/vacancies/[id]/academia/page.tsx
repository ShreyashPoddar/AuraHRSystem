'use client';

import { useParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import AssessmentBuilder from '@/components/AssessmentBuilder';

export default function OrgAcademiaPage() {
  const params = useParams();
  const jobId = params?.id;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Academia Round</h1>
        <p className="text-ink/50 mt-1 text-sm">Configure technical assessment for this position.</p>
      </div>

      <div className="space-y-8">
        <div className="bento-card p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600"><FileText size={18} /></div>
            <h3 className="font-serif text-lg font-semibold text-ink">Assessment Details</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Test Duration (Minutes)</label>
              <input type="number" defaultValue={45} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Number of Questions</label>
              <input type="number" defaultValue={20} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Pass Percentage</label>
              <div className="relative">
                <input type="number" defaultValue={70} className="input-field" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 font-bold">%</span>
              </div>
            </div>
            <button className="px-5 py-2.5 bg-ink text-cream rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors w-full mt-2">
              Save Configuration
            </button>
          </div>
        </div>

        {/* Unified Assessment Builder */}
        <AssessmentBuilder />
      </div>
    </div>
  );
}
