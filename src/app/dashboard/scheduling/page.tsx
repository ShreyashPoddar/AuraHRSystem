import { AIDateScheduling } from "@/components/experiments/AIDateScheduling";

export default function SchedulingPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-serif font-bold text-ink mb-2">Smart Scheduler</h1>
      <p className="text-ink/60 mb-8">AI-Optimized calendar coordination for lightning-fast recruitment.</p>
      
      <div className="rounded-3xl overflow-hidden shadow-lg border border-ink/10 bg-cream min-h-[500px]">
        <AIDateScheduling />
      </div>
    </div>
  );
}
