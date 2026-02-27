'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import TallerR1Sidebar from '@/components/navigation/TallerR1Sidebar';
import { useAuthTallerStore } from '@/store/auth-taller.store';
import { useRouter, usePathname, useParams } from 'next/navigation';

const queryClient = new QueryClient();

export default function TallerR1Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuthTallerStore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // If not logged in
    if (isClient && !user) {
      const locale = params.locale || 'es';
      // Redirect to main login page
      router.push(`/${locale}/login`);
      return;
    }

    // If logged in but no site selected, and not already on selection page
    if (isClient && user && !useAuthTallerStore.getState().selectedSite && !pathname.includes('site-selection')) {
      const locale = params.locale || 'es';
      router.push(`/${locale}/taller-r1/site-selection`);
    }
  }, [user, router, isClient, params.locale, pathname]);

  // Prevent hydration mismatch or flash
  if (!isClient) return null;

  // If not logged in (and handled by useEffect, but for safety return null/loader)
  if (!user) return null;

  const isSiteSelection = pathname.includes('site-selection');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen force-light-mode w-full overflow-x-hidden" data-theme="light">
        {/* Taller R1 Secondary Sidebar - Hidden during site selection */}
        {!isSiteSelection && (
          <TallerR1Sidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* Module Content Area */}
        <div className={cn(
          "flex-1 transition-all duration-300 w-full min-w-0",
          !isSiteSelection
            ? (sidebarCollapsed ? "md:ml-16 ml-16" : "md:ml-64 ml-16")
            : "ml-0"
        )}>
          <main className="p-0">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}

