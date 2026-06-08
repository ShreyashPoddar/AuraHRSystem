'use client';

import { type ReactNode } from 'react';
import { CandidateSidebar } from '@/components/CandidateSidebar';
import { TopNavBar } from '@/components/TopNavBar';
import RouteGuard from '@/components/RouteGuard';

export default function CandidateLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard role="candidate">
      <div className="flex h-screen overflow-hidden bg-warm-sand">
        <CandidateSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNavBar title="AuraHR" showBack={true} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
