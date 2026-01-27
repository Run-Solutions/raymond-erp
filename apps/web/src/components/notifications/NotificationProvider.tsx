'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useNotifications, Notification } from '@/hooks/useNotifications'
import { useOrganizationStore } from '@/store/organization.store'
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import { getNotificationRoute } from '@/lib/notification-routes'

// Store seen notification IDs in memory (resets on page reload)
const seenNotificationIds = new Set<string>()

export function NotificationProvider() {
    const router = useRouter()
    const { currentOrganization } = useOrganizationStore()
    const { data: notificationsData } = useNotifications({ limit: 10, read: false })
    const previousNotificationsRef = useRef<Notification[]>([])
    const isInitialLoad = useRef(true)

    useEffect(() => {
        const notifications = notificationsData?.data || []
        
        // Skip showing toasts on initial load to avoid showing old notifications
        if (isInitialLoad.current) {
            isInitialLoad.current = false
            previousNotificationsRef.current = notifications
            // Mark all initial notifications as seen
            notifications.forEach(n => seenNotificationIds.add(n.id))
            return
        }
        
        if (notifications.length > 0) {
            // Find new notifications (not in previous list)
            const previousIds = new Set(previousNotificationsRef.current.map(n => n.id))
            const newNotifications = notifications.filter(n => !previousIds.has(n.id) && !seenNotificationIds.has(n.id))
            
            // Show toast for each new notification
            newNotifications.forEach((notification) => {
                seenNotificationIds.add(notification.id)
                
                // Get icon based on type
                const getIcon = (type: string) => {
                    if (type.includes('SUCCESS') || type.includes('COMPLETED') || type.includes('APPROVED') || type.includes('PAID')) {
                        return <CheckCircle className="w-5 h-5 text-green-500" />
                    }
                    if (type.includes('ERROR') || type.includes('REJECTED') || type.includes('OVERDUE')) {
                        return <XCircle className="w-5 h-5 text-red-500" />
                    }
                    if (type.includes('WARNING') || type.includes('DUE')) {
                        return <AlertCircle className="w-5 h-5 text-yellow-500" />
                    }
                    return <Info className="w-5 h-5 text-blue-500" />
                }

                // Get toast variant based on type
                const getVariant = (type: string): 'success' | 'error' | 'warning' | 'info' => {
                    if (type.includes('SUCCESS') || type.includes('COMPLETED') || type.includes('APPROVED') || type.includes('PAID')) {
                        return 'success'
                    }
                    if (type.includes('ERROR') || type.includes('REJECTED') || type.includes('OVERDUE')) {
                        return 'error'
                    }
                    if (type.includes('WARNING') || type.includes('DUE')) {
                        return 'warning'
                    }
                    return 'info'
                }

                const variant = getVariant(notification.type)
                const icon = getIcon(notification.type)
                const route = getNotificationRoute(notification.link, notification.metadata)

                toast[variant](notification.title, {
                    description: notification.message,
                    icon,
                    duration: 6000,
                    action: route ? {
                        label: 'Ver',
                        onClick: () => {
                            router.push(route)
                        },
                    } : undefined,
                })
            })
            
            // Update previous notifications
            previousNotificationsRef.current = notifications
        }
    }, [notificationsData, router])

    return null
}

