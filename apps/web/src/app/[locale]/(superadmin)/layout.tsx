'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import EnterpriseLayout from '@/components/layouts/EnterpriseLayout'

/**
 * SuperAdmin Layout
 * Only accessible to users with isSuperadmin = true
 */
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { user, isLoading } = useAuthStore()

    useEffect(() => {
        // Guard: Only SuperAdmin users can access this layout
        if (!isLoading && (!user || !user.isSuperadmin)) {
            console.warn('[SuperAdminLayout] Access denied - redirecting to dashboard')
            router.push('/dashboard')
        }
    }, [user, isLoading, router])

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading SuperAdmin Panel...</p>
                </div>
            </div>
        )
    }

    // Don't render if not SuperAdmin
    if (!user?.isSuperadmin) {
        return null
    }

    return <EnterpriseLayout>{children}</EnterpriseLayout>
}
