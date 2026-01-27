'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Trash2, X, CheckCheck } from 'lucide-react'
import { useNotifications, useUnreadNotificationsCount, useMarkNotificationAsRead, useDeleteNotification, useMarkAllNotificationsAsRead, Notification } from '@/hooks/useNotifications'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import Button from '../ui/button'
import { formatDistanceToNow } from 'date-fns'
import { useOrganizationStore } from '@/store/organization.store'
import { getInitials } from '@/lib/utils'
import { getNotificationRoute } from '@/lib/notification-routes'

export default function NotificationBell() {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { currentOrganization } = useOrganizationStore()
    
    const { data: notificationsData } = useNotifications({ limit: 10, read: false })
    const { data: unreadCount = 0 } = useUnreadNotificationsCount()
    const markAsRead = useMarkNotificationAsRead()
    const deleteNotification = useDeleteNotification()
    const markAllAsRead = useMarkAllNotificationsAsRead()
    
    const notifications = notificationsData?.data || []
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])
    
    const handleNotificationClick = (notification: Notification) => {
        markAsRead.mutate(notification.id)
        
        // Get the correct route using the route mapper
        const route = getNotificationRoute(notification.link, notification.metadata)
        
        if (route) {
            router.push(route)
        } else {
            // Fallback to notifications page if no valid route
            router.push('/notifications')
        }
        
        setIsOpen(false)
    }
    
    const handleMarkAllRead = () => {
        markAllAsRead.mutate()
    }
    
    const getNotificationTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
            WARNING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
            ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
            TASK_ASSIGNED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
            TASK_UPDATED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
            TASK_COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
            PROJECT_CREATED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
            PROJECT_UPDATED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800',
            PROJECT_COMPLETED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800',
            DISPATCH_RECEIVED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
            DISPATCH_RESOLVED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
            DISPATCH_CONVERTED_TO_TASK: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800',
            EXPENSE_SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            EXPENSE_APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
            EXPENSE_REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
            TIME_ENTRY_SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            TIME_ENTRY_APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
            TIME_ENTRY_REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
            INVOICE_CREATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            INVOICE_PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
            PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
            ACCOUNT_PAYABLE_DUE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
            ACCOUNT_PAYABLE_PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
            ACCOUNT_PAYABLE_OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
            ACCOUNT_RECEIVABLE_DUE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
            ACCOUNT_RECEIVABLE_PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
            ACCOUNT_RECEIVABLE_OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
            PURCHASE_ORDER_CREATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            PURCHASE_ORDER_APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
            PURCHASE_ORDER_REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
            PURCHASE_ORDER_PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        }
        return colors[type] || colors.INFO
    }
    
    const getNotificationIcon = (type: string) => {
        if (type.includes('SUCCESS') || type.includes('COMPLETED') || type.includes('APPROVED') || type.includes('PAID')) {
            return '✓'
        }
        if (type.includes('ERROR') || type.includes('REJECTED') || type.includes('OVERDUE')) {
            return '⚠'
        }
        if (type.includes('WARNING') || type.includes('DUE')) {
            return '⏰'
        }
        return 'ℹ'
    }
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 group"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white rounded-full shadow-lg animate-pulse"
                        style={{
                            backgroundColor: currentOrganization?.accentColor || '#ef4444'
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
            
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-[380px] sm:w-[420px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                    <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        Notificaciones
                                    </h3>
                                    {unreadCount > 0 && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {unreadCount} sin leer
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleMarkAllRead}
                                        className="text-xs h-8 px-2"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                                        Marcar todas
                                    </Button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        No hay notificaciones
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Te notificaremos cuando haya algo nuevo
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer group ${
                                                !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
                                            }`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="flex items-start gap-3">
                                                {notification.users ? (
                                                    <Avatar className="h-10 w-10 shrink-0 ring-2 ring-gray-200 dark:ring-gray-700">
                                                        <AvatarImage
                                                            src={notification.users.avatar_url || undefined}
                                                            alt={notification.users.first_name}
                                                        />
                                                        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                                            {getInitials(
                                                                notification.users.first_name,
                                                                notification.users.last_name
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 ring-2 ring-gray-200 dark:ring-gray-700">
                                                        <span className="text-white font-bold text-sm">
                                                            {getNotificationIcon(notification.type)}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.read && (
                                                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5 animate-pulse" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2.5 leading-relaxed line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <Badge
                                                            className={`text-[10px] px-2 py-0.5 font-medium border ${getNotificationTypeColor(notification.type)}`}
                                                        >
                                                            {notification.type.replace(/_/g, ' ')}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                            {formatDistanceToNow(new Date(notification.created_at), {
                                                                addSuffix: true,
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                markAsRead.mutate(notification.id)
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                                            title="Marcar como leída"
                                                        >
                                                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            deleteNotification.mutate(notification.id)
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <button
                                    onClick={() => {
                                        router.push('/notifications')
                                        setIsOpen(false)
                                    }}
                                    className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                                >
                                    Ver todas las notificaciones
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
