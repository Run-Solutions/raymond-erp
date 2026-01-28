'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import TallerR1Sidebar from '@/components/navigation/TallerR1Sidebar';

const queryClient = new QueryClient();

export default function TallerR1Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
