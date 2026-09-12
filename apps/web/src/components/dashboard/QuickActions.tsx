'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    FileText,
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    Users,
    FolderKanban,
    ArrowRight
} from "lucide-react"
import { Link } from "@/i18n/routing"
import { usePurchaseOrders, useAccountsPayable, useAccountsReceivable } from "@/hooks/useFinance"
import api from '@/lib/api'
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useTranslations } from 'next-intl'

export function QuickActions() {
    const t = useTranslations('dashboard.quickActions')
    const { data: purchaseOrders} = usePurchaseOrders()
    const { data: accountsPayable } = useAccountsPayable()
    const { data: accountsReceivable } = useAccountsReceivable()
    const [tasks, setTasks] = useState<any[]>([])

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await api.get('/tasks', {
                    params: {
                        page: 1,
                        limit: 100 // Get enough tasks for the dashboard
                    }
                })
                // Handle different response structures
                let tasksList: any[] = []
                if (Array.isArray(res.data)) {
                    tasksList = res.data
                } else if (Array.isArray(res.data?.data)) {
                    tasksList = res.data.data
                } else if (res.data?.data && Array.isArray(res.data.data)) {
                    tasksList = res.data.data
                }
                setTasks(tasksList)
            } catch (error: any) {
                // Only log if it's not a silent error
                if (!error?.silent && !error?.isSessionExpired) {
                    console.error('Failed to fetch tasks:', error?.response?.data?.message || error?.message || 'Unknown error')
                }
                // Set empty array on error to prevent UI issues
                setTasks([])
            }
        }
        fetchTasks()
    }, [])

    // Calculate pending items - show multiple statuses for better visibility
    const pendingPOs = purchaseOrders?.filter((po: any) =>
        ['PENDING', 'DRAFT'].includes(po.status)
    ) || []
    const pendingAP = accountsPayable?.filter((ap: any) =>
        ['PENDING', 'PARTIAL', 'OVERDUE'].includes(ap.status)
    ) || []
    const pendingAR = accountsReceivable?.filter((ar: any) =>
        ['PENDING', 'PARTIAL', 'OVERDUE'].includes(ar.status)
    ) || []
    const pendingTasks = tasks.filter((task: any) =>
        !['DONE', 'CANCELLED'].includes(task.status)
    ) || []

    const quickActions = [
        {
            title: t('purchaseOrders.title'),
            description: t('purchaseOrders.description'),
            count: pendingPOs.length,
            icon: FileText,
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-50 dark:bg-blue-950",
            href: "/finance/purchase-orders",
            items: pendingPOs.slice(0, 3)
        },
        {
            title: t('accountsPayable.title'),
            description: t('accountsPayable.description'),
            count: pendingAP.length,
            icon: DollarSign,
            color: "text-red-600 dark:text-red-400",
            bgColor: "bg-red-50 dark:bg-red-950",
            href: "/finance/ap",
            items: pendingAP.slice(0, 3)
        },
        {
            title: t('accountsReceivable.title'),
            description: t('accountsReceivable.description'),
            count: pendingAR.length,
            icon: TrendingUp,
            color: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-50 dark:bg-green-950",
            href: "/finance/ar",
            items: pendingAR.slice(0, 3)
        },
        {
            title: t('pendingTasks.title'),
            description: t('pendingTasks.description'),
            count: pendingTasks.length,
            icon: CheckCircle2,
            color: "text-purple-600 dark:text-purple-400",
            bgColor: "bg-purple-50 dark:bg-purple-950",
            href: "/tasks",
            items: pendingTasks.slice(0, 3)
        }
    ]

    return (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {quickActions.map((action) => {
                const Icon = action.icon
                return (
                    <Card key={action.title} className="hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: action.color.includes('blue') ? '#2563eb' : action.color.includes('red') ? '#dc2626' : action.color.includes('green') ? '#16a34a' : action.color.includes('purple') ? '#9333ea' : '#ea580c' }}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className={`p-2.5 rounded-xl ${action.bgColor} shadow-sm`}>
                                    <Icon className={`w-5 h-5 ${action.color}`} />
                                </div>
                                <Badge
                                    variant={action.count > 0 ? "default" : "secondary"}
                                    className="text-xs font-semibold"
                                >
                                    {action.count}
                                </Badge>
                            </div>
                            <CardTitle className="text-base font-semibold">{action.title}</CardTitle>
                            <CardDescription className="text-xs">{action.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            {action.items.length > 0 ? (
                                <div className="space-y-1.5 mb-3">
                                    {action.items.map((item: any, idx: number) => (
                                        <div key={idx} className="text-xs p-2 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted transition-colors">
                                            <p className="font-medium truncate text-foreground">
                                                {item.folio || item.concepto || item.title || `Item ${idx + 1}`}
                                            </p>
                                            {item.monto && (
                                                <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                                                    ${parseFloat(item.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground mb-3 text-center py-4 italic">
                                    {t('noPending', { defaultValue: 'No hay elementos pendientes' })}
                                </p>
                            )}
                            <Link href={action.href}>
                                <Button variant="ghost" size="sm" className="w-full group h-8 text-xs">
                                    {t('viewAll')}
                                    <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
