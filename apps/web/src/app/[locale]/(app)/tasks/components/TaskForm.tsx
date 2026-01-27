'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Task, Project, User } from '@/types'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Button from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    CalendarIcon,
    Save,
    X,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn, getInitials } from '@/lib/utils'
import PriorityIndicator from '@/components/shared/PriorityIndicator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface TaskFormProps {
    initialData?: Task | null
    projects: Project[]
    users: User[]
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
    isSubmitting?: boolean
    userRole?: string
}

const statusOptions = [
    { value: 'BACKLOG', label: 'Backlog', icon: '📋', color: 'text-gray-600' },
    { value: 'TODO', label: 'To Do', icon: '📝', color: 'text-blue-600' },
    { value: 'IN_PROGRESS', label: 'In Progress', icon: '⚡', color: 'text-yellow-600' },
    { value: 'REVIEW', label: 'Review', icon: '👀', color: 'text-purple-600' },
    { value: 'DONE', label: 'Done', icon: '✅', color: 'text-green-600' },
]

const priorityOptions = [
    { value: 'LOW', label: 'Low', description: 'Can wait' },
    { value: 'MEDIUM', label: 'Medium', description: 'Normal priority' },
    { value: 'HIGH', label: 'High', description: 'Important' },
    { value: 'URGENT', label: 'Urgent', description: 'Needs attention' },
    { value: 'CRITICAL', label: 'Critical', description: 'Critical priority' },
]

export function TaskForm({
    initialData,
    projects,
    users,
    onSubmit,
    onCancel,
    isSubmitting = false,
    userRole,
}: TaskFormProps) {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            title: '',
            description: '',
            status: 'TODO',
            priority: 'MEDIUM',
            projectId: '',
            sprintId: 'none',
            assigneeId: '',
            dueDate: undefined as Date | undefined,
            driveLink: '',
            initialComment: '',
        },
    })

    const [sprints, setSprints] = React.useState<any[]>([])
    const [loadingSprints, setLoadingSprints] = React.useState(false)

    useEffect(() => {
        if (initialData) {
            const formData = {
                title: initialData.title,
                description: initialData.description || '',
                status: initialData.status,
                priority: initialData.priority,
                projectId: initialData.projectId,
                sprintId: initialData.sprintId || 'none',
                assigneeId: initialData.assigneeId || '',
                dueDate: initialData.dueDate ? new Date(initialData.dueDate) : undefined,
                driveLink: initialData.driveLink || '',
                initialComment: '',
            }

            reset(formData)

            // Explicitly set Select values to ensure they update
            setTimeout(() => {
                setValue('projectId', formData.projectId, { shouldValidate: true })
                setValue('status', formData.status)
                setValue('priority', formData.priority)
                setValue('sprintId', formData.sprintId)
                setValue('assigneeId', formData.assigneeId)
            }, 0)
        } else {
            reset({
                title: '',
                description: '',
                status: 'TODO',
                priority: 'MEDIUM',
                projectId: '',
                sprintId: 'none',
                assigneeId: '',
                dueDate: undefined,
                driveLink: '',
                initialComment: '',
            })
        }
    }, [initialData, reset, setValue])

    const selectedProjectId = watch('projectId')
    const selectedProject = projects.find(p => p.id === selectedProjectId)

    // Fetch sprints when project changes
    useEffect(() => {
        const fetchSprints = async () => {
            if (!selectedProjectId) {
                setSprints([])
                return
            }

            try {
                setLoadingSprints(true)
                // Assuming api is available via import. If not, we might need to use fetch or axios directly or pass a fetcher.
                // Given the context, I'll assume standard fetch or a global api instance is available.
                // Checking previous files, 'api' is imported from '@/lib/api'.
                const { default: api } = await import('@/lib/api')
                const res = await api.get(`/sprints?projectId=${selectedProjectId}`)

                // Safely extract array
                let allSprints: any[] = []
                if (Array.isArray(res.data)) {
                    allSprints = res.data
                } else if (res.data && Array.isArray(res.data.data)) {
                    allSprints = res.data.data
                } else if (res.data && typeof res.data === 'object') {
                    // Try to find an array property if the structure is different
                    const possibleArray = Object.values(res.data).find(val => Array.isArray(val))
                    if (possibleArray) {
                        allSprints = possibleArray as any[]
                    }
                }

                // Filter sprints: Show Active AND Future sprints (sprints that haven't ended yet)
                // OR if editing, include the currently assigned sprint even if it's past
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                const availableSprints = allSprints.filter((s: any) => {
                    if (!s || !s.startDate || !s.endDate) return false
                    const end = new Date(s.endDate)
                    end.setHours(23, 59, 59, 999)

                    // Show if sprint ends today or in the future
                    const isAvailable = end >= today
                    const isCurrent = initialData?.sprintId === s.id

                    return isAvailable || isCurrent
                })

                // Sort by start date
                availableSprints.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

                setSprints(availableSprints)
            } catch (error) {
                console.error('Failed to fetch sprints:', error)
                setSprints([])
            } finally {
                setLoadingSprints(false)
            }
        }

        fetchSprints()
    }, [selectedProjectId, initialData?.sprintId])

    const isDev = !!userRole && !['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'PROJECT_MANAGER', 'PROJECT MANAGER', 'MANAGER', 'CEO', 'GERENTE OPERACIONES', 'SUPERVISOR'].includes(userRole.toUpperCase())

    const handleFormSubmit = (data: any) => {
        // Transform 'none' sprintId to null/undefined
        const submitData = {
            ...data,
            sprintId: data.sprintId === 'none' ? null : data.sprintId
        }
        onSubmit(submitData)
    }

    const selectedPriority = watch('priority') as Task['priority']
    const selectedStatus = watch('status')
    const selectedAssigneeId = watch('assigneeId')
    const selectedAssignee = users.find((u) => u.id === selectedAssigneeId)
    const selectedSprintId = watch('sprintId')

    // Filter users based on selected project
    const assignableUsers = React.useMemo(() => {
        if (!selectedProjectId || !selectedProject) return users

        const members = selectedProject.members || []
        const owners = selectedProject.owners || []
        // Include single owner if not in owners array
        const owner = selectedProject.owner && !owners.some(o => o.id === selectedProject.owner?.id)
            ? [selectedProject.owner]
            : []

        const all = [...members, ...owners, ...owner]
        // Deduplicate by ID
        const unique = Array.from(new Map(all.map(u => [u.id, u])).values())

        return unique
    }, [selectedProjectId, selectedProject, users])

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Title */}
                <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Task Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="title"
                        placeholder="e.g., Implement new authentication flow"
                        className="h-10 text-sm border-gray-200 dark:border-gray-800 focus:ring-gray-900 dark:focus:ring-gray-100"
                        {...register('title', { required: 'Title is required' })}
                    />
                    {errors.title && (
                        <span className="text-xs text-red-500">{errors.title.message as string}</span>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description
                    </Label>
                    <textarea
                        id="description"
                        placeholder="Detailed description of the task..."
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none"
                        {...register('description')}
                    />
                </div>

                {/* Project & Status Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="projectId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Project <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={selectedProjectId}
                            onValueChange={(value) => setValue('projectId', value)}
                        >
                            <SelectTrigger className="h-10 border-gray-200 dark:border-gray-800">
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Status
                        </Label>
                        <Select
                            value={selectedStatus}
                            onValueChange={(value) => setValue('status', value)}
                        >
                            <SelectTrigger className="h-10 border-gray-200 dark:border-gray-800">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-medium", option.color)}>{option.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Sprint & Priority Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="sprintId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Sprint (Optional)
                        </Label>
                        <Select
                            value={selectedSprintId}
                            onValueChange={(value) => setValue('sprintId', value)}
                            disabled={!selectedProjectId || loadingSprints}
                        >
                            <SelectTrigger className="h-10 border-gray-200 dark:border-gray-800">
                                <SelectValue placeholder={loadingSprints ? "Loading..." : "Select sprint"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Sprint</SelectItem>
                                {sprints.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name} ({format(new Date(s.endDate), 'MMM d')})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Priority
                        </Label>
                        <Select
                            value={selectedPriority}
                            onValueChange={(value) => setValue('priority', value)}
                        >
                            <SelectTrigger className="h-10 border-gray-200 dark:border-gray-800">
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                {priorityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            <PriorityIndicator priority={option.value as 'CRITICAL' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'} />
                                            <span>{option.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Due Date & Assignee Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Due Date
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "h-10 w-full justify-start text-left font-normal border-gray-200 dark:border-gray-800",
                                        !watch('dueDate') && "text-muted-foreground"
                                    )}
                                    disabled={isDev && !!initialData}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {watch('dueDate') ? format(watch('dueDate')!, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={watch('dueDate')}
                                    onSelect={(date) => setValue('dueDate', date)}
                                    initialFocus
                                    className="rounded-md border shadow-sm"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="assignee" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Assignee
                        </Label>
                        <Select
                            value={selectedAssigneeId || 'unassigned'}
                            onValueChange={(value) => setValue('assigneeId', value === 'unassigned' ? '' : value)}
                        >
                            <SelectTrigger className="h-10 border-gray-200 dark:border-gray-800">
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {assignableUsers.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={u.avatarUrl || undefined} />
                                                <AvatarFallback>
                                                    {getInitials(u.firstName, u.lastName, u.email)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>{u.firstName || ''} {u.lastName || ''}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {selectedAssignee && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={selectedAssignee.avatarUrl || undefined} />
                            <AvatarFallback>
                                {getInitials(selectedAssignee.firstName, selectedAssignee.lastName, selectedAssignee.email)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium">
                                {selectedAssignee.firstName || ''} {selectedAssignee.lastName || ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {selectedAssignee.email || ''}
                            </p>
                        </div>
                    </div>
                )}

                {/* Drive Link */}
                <div className="space-y-2">
                    <Label htmlFor="driveLink" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Drive Link (Optional)
                    </Label>
                    <Input
                        id="driveLink"
                        type="url"
                        placeholder="https://drive.google.com/..."
                        className="h-10 text-sm border-gray-200 dark:border-gray-800 focus:ring-gray-900 dark:focus:ring-gray-100"
                        {...register('driveLink')}
                    />
                </div>

                {/* Initial Comment - Only show when creating new task */}
                {!initialData && (
                    <div className="space-y-2">
                        <Label htmlFor="initialComment" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Initial Comment (Optional)
                        </Label>
                        <textarea
                            id="initialComment"
                            placeholder="Add a comment about this task..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none"
                            {...register('initialComment')}
                        />
                    </div>
                )}
            </div>

            <Separator />

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 p-6 bg-gray-50 dark:bg-gray-900/50">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="h-10"
                >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {initialData ? 'Update Task' : 'Create Task'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
