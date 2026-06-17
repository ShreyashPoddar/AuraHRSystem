'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  /** The portal role this route requires. */
  role: 'organization' | 'candidate';
  children: React.ReactNode;
}

/**
 * Protects a route by:
 *  1. Showing a spinner while auth state is being restored from cookies.
 *  2. Redirecting to /login if the user is not authenticated.
 *  3. Redirecting to the correct portal if the user's role doesn't match.
 */
export default function RouteGuard({ role, children }: RouteGuardProps) {
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Still hydrating from cookie — wait.

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Redirect to correct portal if role mismatch.
    if (userRole && userRole !== role) {
      router.replace(userRole === 'organization' ? '/org' : '/candidate');
    }
  }, [isLoading, isAuthenticated, userRole, role, router]);

  // Show a full-page spinner while loading or redirecting.
  if (isLoading || !isAuthenticated || (userRole && userRole !== role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-sand">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-sage" />
          <p className="text-sm text-ink/40 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
