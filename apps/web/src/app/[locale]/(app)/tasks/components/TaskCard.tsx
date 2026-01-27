'use client'

import React from 'react'
import { Task } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { format, isPast, differenceInDays } from 'date-fns'
import { cn, getInitials } from '@/lib/utils'
import PriorityIndicator from '@/components/shared/PriorityIndicator'

interface TaskCardProps {
    task: Task
    onClick: (task: Task) => void
    onDragStart?: (e: React.DragEvent, taskId: string) => void
    onDragEnd: () => void
    isDragging?: boolean
    className?: string
}

export function TaskCard({ task, onClick, onDragStart, onDragEnd, isDragging, className }: TaskCardProps) {
    const getTaskUrgency = (task: Task) => {
        if (!task.dueDate) return null
        const daysUntilDue = differenceInDays(new Date(task.dueDate), new Date())
        const isOverdue = isPast(new Date(task.dueDate))

        if (isOverdue) return 'overdue'
        if (daysUntilDue <= 1) return 'urgent'
        if (daysUntilDue <= 3) return 'soon'
        return 'normal'
    }

    const urgency = getTaskUrgency(task)

    return (
        <Card
            className={cn(
                'group cursor-pointer transition-all duration-200',
                'hover:shadow-md hover:border-primary/50',
                'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
                isDragging && 'opacity-50 rotate-2 scale-95',
                urgency === 'overdue' && 'border-l-4 border-l-red-500',
                urgency === 'urgent' && 'border-l-4 border-l-orange-500',
                'mb-2',
                className
            )}
            onClick={() => onClick(task)}
            draggable={!!onDragStart}
            onDragStart={onDragStart ? (e) => onDragStart(e, task.id) : undefined}
            onDragEnd={onDragEnd}
        >
            <CardContent className="p-3 space-y-2">
                {/* Header: Priority & Title */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {task.title}
                        </h4>
                    </div>
                    <PriorityIndicator priority={task.priority} size="sm" showLabel={false} />
                </div>

                {/* Footer: Assignee & Dates */}
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                        {task.assignee ? (
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={task.assignee.avatarUrl || undefined} />
                                <AvatarFallback className="text-[9px]">
                                    {getInitials(task.assignee.firstName, task.assignee.lastName, task.assignee.email)}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <span className="text-[9px] text-gray-400">?</span>
                            </div>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[80px]">
                            {task.assignee ? task.assignee.firstName : 'Unassigned'}
                        </span>
                    </div>

                    <div className="flex flex-col items-end gap-0.5">
                        {task.dueDate && (
                            <div className={cn(
                                "flex items-center gap-1 text-[10px]",
                                urgency === 'overdue' ? "text-red-600 font-medium" : "text-gray-500"
                            )}>
                                <Calendar className="w-3 h-3" />
                                {format(new Date(task.dueDate), 'MMM d')}
                            </div>
                        )}
                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(task.createdAt || new Date()), 'MMM d')}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
