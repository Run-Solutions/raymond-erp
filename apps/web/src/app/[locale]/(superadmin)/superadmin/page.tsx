'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Building2, Users, FolderKanban, ClipboardList, UsersRound } from 'lucide-react'

interface GlobalAnalytics {
    organizations: {
        total: number
        active: number
        inactive: number
    }
    users: number
    projects: number
    tasks: number
    clients: number
}

export default function SuperAdminDashboard() {
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['superadmin', 'analytics'],
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: GlobalAnalytics }>('/superadmin/analytics')
            return response.data.data
        },
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    const stats = [
        {
            name: 'Total Organizations',
            value: analytics?.organizations.total || 0,
            icon: Building2,
            color: 'bg-blue-500',
            details: `${analytics?.organizations.active || 0} active, ${analytics?.organizations.inactive || 0} inactive`,
        },
        {
            name: 'Total Users',
            value: analytics?.users || 0,
            icon: Users,
            color: 'bg-green-500',
        },
        {
            name: 'Total Projects',
            value: analytics?.projects || 0,
            icon: FolderKanban,
            color: 'bg-purple-500',
        },
        {
            name: 'Total Tasks',
            value: analytics?.tasks || 0,
            icon: ClipboardList,
            color: 'bg-orange-500',
        },
        {
            name: 'Total Clients',
            value: analytics?.clients || 0,
            icon: UsersRound,
            color: 'bg-pink-500',
        },
    ]

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">SuperAdmin Dashboard</h1>
                <p className="text-gray-600 mt-2">Global system overview and management</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={stat.name}
                            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600 font-medium">{stat.name}</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                                    {stat.details && (
                                        <p className="text-xs text-gray-500 mt-1">{stat.details}</p>
                                    )}
                                </div>
                                <div className={`${stat.color} p-3 rounded-lg`}>
                                    <Icon className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                        href="/superadmin/organizations"
                        className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                            <p className="font-semibold text-gray-900">Manage Organizations</p>
                            <p className="text-sm text-gray-600">View and manage all organizations</p>
                        </div>
                    </a>
                    <a
                        href="/superadmin/organizations/new"
                        className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Building2 className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                            <p className="font-semibold text-gray-900">Create Organization</p>
                            <p className="text-sm text-gray-600">Add a new organization</p>
                        </div>
                    </a>
                    <a
                        href="/dashboard"
                        className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Users className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                            <p className="font-semibold text-gray-900">Back to App</p>
                            <p className="text-sm text-gray-600">Return to normal mode</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    )
}
