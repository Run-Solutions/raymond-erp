'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import AdminComercialSidebar from '@/components/navigation/AdminComercialSidebar';
import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname, useParams } from 'next/navigation';

const queryClient = new QueryClient();

export default function AdminComercialLayout({ children }: { children: React.ReactNode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { user, isLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient && !isLoading && !user) {
            const locale = params.locale || 'es';
            router.push(`/${locale}/login`);
        }
    }, [user, isLoading, router, isClient, params.locale]);

    if (!isClient) return null;
    if (!user && isLoading) return null;

    return (
        <QueryClientProvider client={queryClient}>
            <div className="flex min-h-screen force-light-mode w-full overflow-x-hidden" data-theme="light">
                <AdminComercialSidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />

                <div className={cn(
                    "flex-1 transition-all duration-300 w-full min-w-0",
                    sidebarCollapsed ? "md:ml-16 ml-16" : "md:ml-64 ml-16"
                )}>
                    <main className="p-0">
                        {children}
                    </main>
                </div>
            </div>
        </QueryClientProvider>
    );
}
