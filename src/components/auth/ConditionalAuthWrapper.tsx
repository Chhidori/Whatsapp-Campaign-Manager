'use client';

import { usePathname } from 'next/navigation';
import AuthWrapper from '@/components/auth/AuthWrapper';

export default function ConditionalAuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Public routes that don't need authentication
  const publicRoutes = ['/login'];
  
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }
  
  return <AuthWrapper>{children}</AuthWrapper>;
}