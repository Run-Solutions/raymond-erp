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
    }
  }, [user, router, isClient, params.locale]);

  // Prevent hydration mismatch or flash
  if (!isClient) return null;

  // If not logged in (and handled by useEffect, but for safety return null/loader)
  if (!user) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex bg-gray-50 min-h-screen force-light-mode" data-theme="light">
        {/* Taller R1 Secondary Sidebar */}
        <TallerR1Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Module Content Area */}
        <div className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}>
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}

