'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Loader2 } from 'lucide-react';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration to prevent SSR/client mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only handle redirection after hydration is complete
    if (!isHydrated) return;
    
    // If not loading and no user, redirect to login after a short delay
    if (!loading && !user) {
      const timer = setTimeout(() => {
        console.log('Redirecting to login - no authenticated user');
        router.replace('/login');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, user, router, isHydrated]);

  // Show loading during auth check or before hydration
  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {!isHydrated ? 'Initializing...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // If no user after loading and hydration, show nothing while redirecting
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <Sidebar>
      {children}
    </Sidebar>
  );
}