import { LiveAIProctoring } from "@/components/experiments/LiveAIProctoring";
import IntegrityTimeline from "@/components/features/CandidateSuite/IntegrityTimeline";

export default function ProctoringPage() {
  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <div className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-ink mb-2">Live AI Proctoring</h1>
        <p className="text-ink/60">Secure, high-fidelity webcam tracking environment powered by Neev Cloud.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-3xl overflow-hidden shadow-2xl border border-ink/10 bg-ink min-h-[500px]">
          <LiveAIProctoring />
        </div>
        
        <div className="lg:col-span-1">
          <IntegrityTimeline />
        </div>
      </div>
    </div>
  );
}
