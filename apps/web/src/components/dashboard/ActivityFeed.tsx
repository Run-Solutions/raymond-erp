'use client'

import { useEffect, useState } from 'react'
import { Card } from '../ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { formatDate, getInitials } from '@/lib/utils'
import { AuditLog } from '@/types'
import api from '@/lib/api'
import Loader from '../ui/loader'

export default function ActivityFeed() {
    const [activities, setActivities] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const response = await api.get<{ success: boolean, data: AuditLog[] }>('/audit?limit=10')
                setActivities(response.data.data || [])
            } catch (error) {
                console.error('Failed to fetch activities:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchActivities()
    }, [])

    if (loading) {
        return (
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Recent Activity
                </h3>
                <Loader size="md" />
            </Card>
        )
    }

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Recent Activity
            </h3>

            <div className="space-y-4">
                {activities.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                        No recent activity
                    </p>
                ) : (
                    activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(activity.user?.firstName || '', activity.user?.lastName || '')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                    <span className="font-medium">
                                        {activity.user?.firstName} {activity.user?.lastName}
                                    </span>
                                    {' '}
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {activity.action}
                                    </span>
                                    {' '}
                                    <span className="font-medium">{activity.resource}</span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formatDate(activity.createdAt, 'relative')}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    )
}
