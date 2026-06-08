'use client';

import { type ReactNode } from 'react';
import { OrgSidebar } from '@/components/OrgSidebar';
import { TopNavBar } from '@/components/TopNavBar';
import RouteGuard from '@/components/RouteGuard';

export default function OrgLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard role="organization">
      <div className="flex h-screen overflow-hidden bg-warm-sand">
        {/* Sidebar */}
        <OrgSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNavBar title="AuraHR" showBack={true} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
