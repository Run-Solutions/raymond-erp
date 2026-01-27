'use client'

import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Card } from '../ui/card'

export interface FinancialGuardProps {
    children: React.ReactNode
    fallback?: React.ReactNode
}

export default function FinancialGuard({ children, fallback }: FinancialGuardProps) {
    const { user } = useAuthStore()
    const router = useRouter()

    // CRITICAL: Check multiple possible role fields and SuperAdmin flag
    const userRole = user?.isSuperadmin ? 'Superadmin' :
                    (typeof user?.role === 'object' ? (user.role as any)?.name : user?.role)
    const hasFinancialAccess = user?.isSuperadmin || ['Superadmin', 'Super Admin', 'CEO', 'CFO', 'Contador Senior'].includes(userRole || '')

    if (!hasFinancialAccess) {
        return fallback || (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Card className="p-6 max-w-md text-center">
                    <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Access Denied
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        You don't have permission to access financial modules. Only Admin and CFO roles can view this content.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </Card>
            </div>
        )
    }

    return <>{children}</>
}
