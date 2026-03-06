'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import TallerR1Sidebar from '@/components/navigation/TallerR1Sidebar';
import { useAuthTallerStore } from '@/store/auth-taller.store';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

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

    const currentSite = params.site as string;
    const validSites = ['r1', 'r2', 'r3'];

    // If it's a valid site, sync it with the store
    if (isClient && validSites.includes(currentSite)) {
      const { selectedSite, setSelectedSite } = useAuthTallerStore.getState();
      if (selectedSite !== currentSite) {
        setSelectedSite(currentSite as any);
      }
    } else if (isClient && currentSite !== 'site-selection' && !validSites.includes(currentSite)) {
      // If invalid site and not site-selection, redirect to selection
      const locale = params.locale || 'es';
      router.push(`/${locale}/site-selection`);
    }
  }, [user, router, isClient, params.locale, params.site]);

  // Prevent hydration mismatch or flash
  if (!isClient) return null;

  // If not logged in (and handled by useEffect, but for safety return null/loader)
  if (!user) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen force-light-mode w-full overflow-x-hidden" data-theme="light">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-4 z-40">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-6 w-6 text-gray-600" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" hideCloseButton className="p-0 sm:p-0 w-64 border-none sm:max-w-none">
              <div className="h-full bg-white [&>aside]:fixed-none [&>aside]:static [&>aside]:flex [&>aside]:w-full">
                <TallerR1Sidebar
                  isCollapsed={false}
                  onToggle={() => { }}
                />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex flex-col">
            <span className="text-lg font-black text-red-600 font-brand tracking-tighter leading-none">
              RAYMOND
            </span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
              {(params.site as string || 'R1').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Desktop Taller Sidebar */}
        <TallerR1Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Module Content Area */}
        <div className={cn(
          "flex-1 transition-all duration-300 w-full min-w-0",
          "pt-16 lg:pt-0",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}>
          <main className="p-0">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}

