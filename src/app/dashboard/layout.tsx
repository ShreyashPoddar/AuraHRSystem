import Link from 'next/link';
import { Search, Bell, Settings } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-warm-sand flex">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-cream">
        {/* Topbar */}
        <header className="h-16 bg-[#faf9f6] flex items-center justify-end px-8 shrink-0">
          <div className="flex items-center space-x-6">
            {/* Notification Bell */}
            <button className="relative text-ink/70 hover:text-ink transition-colors p-1.5 rounded-full hover:bg-ink/5">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#d9534f] rounded-full border-2 border-[#faf9f6]" />
            </button>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <img 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120" 
                alt="Sarah J." 
                className="w-8 h-8 rounded-full object-cover border border-ink/10"
              />
              <span className="font-sans text-sm font-semibold text-ink">Sarah J.</span>
            </div>

            {/* Gear/Settings */}
            <button className="text-ink/70 hover:text-ink transition-colors p-1.5 rounded-full hover:bg-ink/5">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth bg-[#faf9f6]">
          {children}
        </div>
      </main>
    </div>
  );
}
