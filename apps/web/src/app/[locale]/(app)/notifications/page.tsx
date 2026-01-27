'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Bell, Check, Trash2, Settings, Filter } from 'lucide-react'
import Button from '@/components/ui/button'
import {
    useNotifications,
    useUnreadNotificationsCount,
    useMarkNotificationAsRead,
    useDeleteNotification,
    useMarkAllNotificationsAsRead,
    Notification,
} from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { getInitials } from '@/lib/utils'
import { getNotificationRoute } from '@/lib/notification-routes'

export default function NotificationsPage() {
    const router = useRouter()
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
    const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
    
    const { data: notificationsData, isLoading } = useNotifications({
        limit: 50,
        read: filter === 'unread' ? false : filter === 'read' ? true : undefined,
        type: typeFilter,
    })
    
    const { data: unreadCount = 0 } = useUnreadNotificationsCount()
    const markAsRead = useMarkNotificationAsRead()
    const deleteNotification = useDeleteNotification()
    const markAllAsRead = useMarkAllNotificationsAsRead()
    
    const notifications = notificationsData?.data || []
    
    const handleMarkAsRead = (id: string) => {
        markAsRead.mutate(id)
    }
    
    const handleDelete = (id: string) => {
        deleteNotification.mutate(id)
    }
    
    const handleMarkAllRead = () => {
        markAllAsRead.mutate()
    }
    
    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead.mutate(notification.id)
        }
        
        // Get the correct route using the route mapper
        const route = getNotificationRoute(notification.link, notification.metadata)
        
        if (route) {
            router.push(route)
        } else {
            // Stay on notifications page if no valid route
            console.warn('No valid route found for notification:', notification)
        }
    }
    
    const getNotificationTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
            SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
            WARNING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
            ERROR: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
            TASK_ASSIGNED: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
            TASK_UPDATED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
            TASK_COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
            PROJECT_CREATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
            DISPATCH_RECEIVED: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
        }
        return colors[type] || colors.INFO
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {unreadCount > 0 && (
                        <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                            <Check className="w-4 h-4 mr-2" />
                            Mark all read
                        </Button>
                    )}
                    <Button variant="secondary" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={filter === 'all' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setFilter('all')}
                        >
                            All
                        </Button>
                        <Button
                            variant={filter === 'unread' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setFilter('unread')}
                        >
                            Unread
                        </Button>
                        <Button
                            variant={filter === 'read' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setFilter('read')}
                        >
                            Read
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No notifications found
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex items-start gap-4">
                                    {notification.users ? (
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage
                                                src={notification.users.avatar_url || undefined}
                                                alt={notification.users.first_name}
                                            />
                                            <AvatarFallback>
                                                {getInitials(
                                                    notification.users.first_name,
                                                    notification.users.last_name
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                                            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {notification.title}
                                            </h3>
                                            {!notification.read && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <Badge className={`text-xs ${getNotificationTypeColor(notification.type)}`}>
                                                {notification.type.replace(/_/g, ' ')}
                                            </Badge>
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                {formatDistanceToNow(new Date(notification.created_at), {
                                                    addSuffix: true,
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-2 md:mt-0 shrink-0">
                                        {!notification.read && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleMarkAsRead(notification.id)
                                                }}
                                            >
                                                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDelete(notification.id)
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}
