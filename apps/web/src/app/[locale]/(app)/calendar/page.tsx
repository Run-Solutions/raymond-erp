'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import Button from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus, CheckSquare, Radio, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Task } from '@/types'
import { Dispatch } from '@/hooks/useDispatches'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'
import { format, parseISO, isSameDay, startOfMonth, getDaysInMonth, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Loader from '@/components/ui/loader'
import { useAuthStore } from '@/store/auth.store'

interface CalendarEvent {
    id: string
    title: string
    time: string
    date: string
    color: string
    type: 'task' | 'event'
    taskId?: string
    priority?: string
    fromDispatch?: boolean
    dispatchId?: string
    assigneeName?: string
}

// Helper to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
    if (obj === null || obj === undefined) return obj
    if (Array.isArray(obj)) {
        return obj.map(item => toCamelCase(item))
    }
    if (typeof obj !== 'object') return obj
    
    const camelObj: any = {}
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
            camelObj[camelKey] = toCamelCase(obj[key])
        }
    }
    return camelObj
}

export default function CalendarPage() {
    const router = useRouter()
    const { user } = useAuthStore()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [tasks, setTasks] = useState<Task[]>([])
    const [dispatches, setDispatches] = useState<Dispatch[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const t = useTranslations('calendar')

    // Helper to generate consistent color from string
    const getColorForUser = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }

    // Helper to get priority color
    const getPriorityColor = (priority?: string) => {
        switch (priority?.toUpperCase()) {
            case 'CRITICAL':
                return '#ef4444' // red
            case 'URGENT':
                return '#f97316' // orange
            case 'HIGH':
                return '#eab308' // yellow
            case 'MEDIUM':
                return '#3b82f6' // blue
            case 'LOW':
                return '#10b981' // green
            default:
                return '#3b82f6' // default blue
        }
    }

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                const [tasksRes, dispatchesRes] = await Promise.all([
                    api.get('/tasks').catch(err => {
                        // Error handled gracefully
                        return { data: { data: [] } }
                    }),
                    api.get('/dispatches').catch(err => {
                        // Error handled gracefully
                        return { data: { data: [] } }
                    })
                ])

                // Process Tasks - handle nested response structure
                const extractList = (res: any): any[] => {
                    const body = res.data
                    if (Array.isArray(body)) return body
                    if (typeof body === 'object' && body !== null) {
                        if ('data' in body) {
                            const bodyData = body.data
                            if (Array.isArray(bodyData)) return bodyData
                            if (typeof bodyData === 'object' && bodyData !== null && 'data' in bodyData) {
                                const nestedData = bodyData.data
                                if (Array.isArray(nestedData)) return nestedData
                            }
                        }
                        // Sometimes the response is { success: true, data: [...] }
                        if ('success' in body && 'data' in body && Array.isArray(body.data)) {
                            return body.data
                        }
                    }
                    return []
                }

                const tasksList = extractList(tasksRes)
                // Transform snake_case to camelCase
                const transformedTasks = toCamelCase(tasksList) as Task[]
                setTasks(transformedTasks)

                const dispatchesList = extractList(dispatchesRes)
                // Transform snake_case to camelCase
                const transformedDispatches = toCamelCase(dispatchesList) as Dispatch[]
                setDispatches(transformedDispatches)


            } catch (error) {
                // Error handled gracefully
                setError('Error al cargar datos del calendario')
                toast.error('Error al cargar datos del calendario')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Convert items to calendar events
    const events = useMemo(() => {
        const taskEvents = tasks
            .filter((task) => {
                // Show tasks with due date (not just assigned ones)
                // Also show tasks without assignee if they have a due date
                const dueDate = task.dueDate || (task as any).due_date
                if (!dueDate) return false

                // Try to parse the date
                try {
                    const date = typeof dueDate === 'string' ? parseISO(dueDate) : new Date(dueDate)
                    return isValid(date)
                } catch {
                    return false
                }
            })
            .map((task) => {
                const dueDateStr = task.dueDate || (task as any).due_date
                let dueDate: Date

                try {
                    dueDate = typeof dueDateStr === 'string' ? parseISO(dueDateStr) : new Date(dueDateStr)
                    if (!isValid(dueDate)) {
                        throw new Error('Invalid date')
                    }
                } catch {
                    // Skip invalid dates
                    return null
                }

                const assignee = task.assignee || (task as any).assignee
                const assigneeName = assignee
                    ? `${assignee.firstName || assignee.first_name || ''} ${assignee.lastName || assignee.last_name || ''}`.trim()
                    : 'Sin asignar'

                return {
                    id: task.id,
                    title: task.title || 'Sin título',
                    time: format(dueDate, 'HH:mm'),
                    date: format(dueDate, 'yyyy-MM-dd'),
                    color: getPriorityColor(task.priority),
                    type: 'task' as const,
                    taskId: task.id,
                    priority: task.priority,
                    fromDispatch: !!(task as Task & { sourceDispatchId?: string }).sourceDispatchId,
                    dispatchId: (task as Task & { sourceDispatchId?: string }).sourceDispatchId,
                    assigneeName,
                }
            }) as CalendarEvent[]

        const dispatchEvents: CalendarEvent[] = dispatches
            .filter((d): d is Dispatch & { dueDate: string } => {
                const dueDate = d.dueDate || (d as any).due_date
                return dueDate != null && d.status !== 'RESOLVED' && d.status !== 'CONVERTED_TO_TASK'
            })
            .map(d => {
                const dueDateStr = d.dueDate || (d as any).due_date
                let dueDate: Date
                
                try {
                    dueDate = typeof dueDateStr === 'string' ? parseISO(dueDateStr) : new Date(dueDateStr)
                    if (!isValid(dueDate)) {
                        throw new Error('Invalid date')
                    }
                } catch {
                    return null
                }

                // Determine color based on the "other" person
                const isSender = d.senderId === user?.id || (d as any).sender_id === user?.id
                const otherUserId = isSender ? (d.recipientId || (d as any).recipient_id) : (d.senderId || (d as any).sender_id)
                const color = getColorForUser(otherUserId || 'default')

                const sender = d.sender || (d as any).sender
                const recipient = d.recipient || (d as any).recipient
                const otherUser = isSender ? recipient : sender
                const otherUserName = otherUser
                    ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim()
                    : 'Usuario'

                return {
                    id: d.id,
                    title: d.content || 'Sin contenido',
                    time: format(dueDate, 'HH:mm'),
                    date: format(dueDate, 'yyyy-MM-dd'),
                    color: color,
                    type: 'event' as const,
                    dispatchId: d.id,
                    priority: d.urgencyLevel || (d as any).urgency_level || 'NORMAL',
                    assigneeName: otherUserName,
                }
            })
            .filter(event => event !== null) as CalendarEvent[]

        return [...taskEvents, ...dispatchEvents].sort((a, b) => {
            // Sort by date then time
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            return a.time.localeCompare(b.time)
        })
    }, [tasks, dispatches, user?.id])

    // Get events for a specific date
    const getEventsForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return events.filter((event) => event.date === dateStr)
    }

    // Navigate to details
    const handleEventClick = (event: CalendarEvent) => {
        if (event.taskId) {
            router.push(`/tasks?id=${event.taskId}`)
        } else if (event.dispatchId) {
            router.push(`/command-center?dispatchId=${event.dispatchId}`)
        }
    }

    // Calendar navigation
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const goToToday = () => {
        setCurrentDate(new Date())
    }

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const firstDay = startOfMonth(new Date(year, month, 1))
        const daysInMonth = getDaysInMonth(firstDay)
        const startDayOfWeek = firstDay.getDay()

        const days: (Date | null)[] = []

        // Add empty cells for days before month starts
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null)
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day))
        }

        return days
    }, [currentDate])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader size="lg" text="Cargando calendario..." />
            </div>
        )
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {t('title', { defaultValue: 'Calendario' })}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                        {t('subtitle', { defaultValue: 'Visualiza tus tareas y eventos' })}
                    </p>
                </div>
                <Button 
                    className="w-full sm:w-auto"
                    onClick={() => router.push('/tasks')}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Tarea
                </Button>
            </div>

            {error && (
                <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Calendar */}
                <Card className="lg:col-span-2 p-3 sm:p-6 overflow-x-auto">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6 min-w-[600px] sm:min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={goToPreviousMonth}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Mes anterior"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                                onClick={goToToday}
                                className="px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                            >
                                Hoy
                            </button>
                            <button
                                onClick={goToNextMonth}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Mes siguiente"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 min-w-[600px] sm:min-w-0">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                            <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2">
                                <span className="hidden sm:inline">{day}</span>
                                <span className="sm:hidden">{day[0]}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[600px] sm:min-w-0">
                        {calendarDays.map((day, i) => {
                            if (!day) {
                                return <div key={i} className="aspect-square min-h-[60px] sm:min-h-[80px]" />
                            }

                            const isToday = isSameDay(day, new Date())
                            const dayEvents = getEventsForDate(day)
                            const dayNumber = day.getDate()

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "aspect-square p-0.5 sm:p-1 rounded-md sm:rounded-lg text-xs sm:text-sm transition-colors min-h-[60px] sm:min-h-[80px] border",
                                        isToday
                                            ? 'bg-blue-600 text-white font-semibold border-blue-700'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700'
                                    )}
                                >
                                    <div className={cn("text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1", isToday ? 'text-white' : 'text-gray-600 dark:text-gray-400')}>
                                        {dayNumber}
                                    </div>
                                    <div className="space-y-0.5 sm:space-y-1">
                                        {dayEvents.slice(0, 2).map((event) => (
                                            <button
                                                key={event.id}
                                                onClick={() => handleEventClick(event)}
                                                className="w-full text-left px-0.5 sm:px-1 py-0.5 rounded text-[10px] sm:text-xs truncate block hover:opacity-80 transition-opacity text-white"
                                                style={{ backgroundColor: event.color }}
                                                title={`${event.title} - ${event.time}${event.assigneeName ? ` - ${event.assigneeName}` : ''}`}
                                            >
                                                <div className="flex items-center gap-0.5 sm:gap-1">
                                                    {event.type === 'event' ? (
                                                        <Radio className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" />
                                                    ) : (
                                                        <CheckSquare className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" />
                                                    )}
                                                    <span className="truncate hidden sm:inline">{event.title}</span>
                                                </div>
                                                <div className="text-[8px] sm:text-[10px] opacity-90 hidden sm:block">{event.time}</div>
                                            </button>
                                        ))}
                                        {dayEvents.length > 2 && (
                                            <div className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 px-0.5 sm:px-1">
                                                +{dayEvents.length - 2} más
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>

                {/* Upcoming Events */}
                <Card className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                        Próximas Tareas
                    </h2>
                    {events.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <CheckSquare className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay tareas programadas</p>
                            <p className="text-xs text-gray-400 mt-1">Las tareas con fecha de vencimiento aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                            {events.map((event) => {
                                const eventDate = parseISO(event.date)
                                const isPast = eventDate < new Date()

                                return (
                                    <button
                                        key={event.id}
                                        onClick={() => handleEventClick(event)}
                                        className={cn(
                                            "w-full text-left p-2 sm:p-3 rounded-lg border-l-4 transition-all hover:shadow-md bg-card",
                                            isPast && 'opacity-60'
                                        )}
                                        style={{ borderLeftColor: event.color }}
                                    >
                                        <div className="flex items-start gap-2">
                                            {event.type === 'event' ? (
                                                <Radio className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 shrink-0" style={{ color: event.color }} />
                                            ) : (
                                                <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 shrink-0" style={{ color: event.color }} />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                    {event.title}
                                                </h3>
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                                                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                                                        {format(eventDate, 'dd MMM yyyy', { locale: es })}
                                                    </p>
                                                    <span className="text-xs text-gray-500 hidden sm:inline">•</span>
                                                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                                                        {event.time}
                                                    </p>
                                                </div>
                                                {event.assigneeName && (
                                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {event.type === 'event' ? 'Con' : 'Asignado a'}: {event.assigneeName}
                                                    </p>
                                                )}
                                                {event.fromDispatch && (
                                                    <span className="inline-block mt-1 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200">
                                                        Dispatch
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {events.length > 0 && (
                <Card className="p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                        Resumen del Mes
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                        <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{events.length}</div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Eventos</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                                {events.filter(e => e.priority === 'URGENT' || e.priority === 'CRITICAL').length}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Urgentes</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {events.filter(e => e.priority === 'HIGH').length}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Alta Prioridad</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                                {events.filter(e => {
                                    const eventDate = parseISO(e.date)
                                    return eventDate >= new Date()
                                }).length}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Pendientes</div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}
