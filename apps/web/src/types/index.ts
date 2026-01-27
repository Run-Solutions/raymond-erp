export interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string | { id: string; name: string;[key: string]: any }
    organizationId: string
    avatarUrl?: string | null
    isActive?: boolean
    createdAt?: string
    updatedAt?: string
}

export interface Organization {
    id: string
    name: string
    slug: string
    isActive?: boolean
    logoUrl?: string | null
    logoZoom?: number | null
    primaryColor?: string | null
    secondaryColor?: string | null
    accentColor?: string | null
    createdAt: string
    updatedAt: string
}

export interface Project {
    id: string
    name: string
    description: string
    status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
    startDate: string
    endDate?: string
    ownerId: string
    organizationId: string
    clientId?: string
    client?: {
        id: string
        nombre: string
        email?: string
        telefono?: string
        contacto?: string
        avatarUrl?: string
    }
    phaseId?: string
    phase?: {
        id: string
        name: string
        color?: string
    }
    amountWithoutTax?: number
    amountWithTax?: number
    owner?: User
    owners?: User[]
    members?: User[]
    _count?: {
        tasks: number
        sprints: number
    }
}

export interface Sprint {
    id: string
    name: string
    goal?: string
    startDate: string
    endDate: string
    projectId: string
    organizationId: string
    project?: {
        id: string
        name: string
        status?: string
        ownerId?: string
        owners?: User[]
        members?: User[]
    }
    members?: User[]
    tasks?: Task[]
    _count?: {
        tasks: number
    }
    createdAt?: string
    updatedAt?: string
}

export interface Task {
    id: string
    title: string
    description?: string
    status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'IN_REVIEW'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL'
    projectId: string
    sprintId?: string
    assigneeId?: string
    reporterId?: string
    createdById: string
    dueDate?: string
    estimatedHours?: number
    actualHours?: number
    driveLink?: string
    project?: Project
    sprint?: Sprint
    assignee?: User
    reporter?: User
    createdAt?: string
    updatedAt?: string
}

export interface TimeEntry {
    id: string
    description: string
    hours: number
    date: string
    userId: string
    projectId?: string
    taskId?: string
    user?: User
    project?: Project
    task?: Task
}

export interface Expense {
    id: string
    description: string
    amount: number
    category: string
    currency: string
    date: string
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED'
    userId: string
    projectId?: string
    user?: User
    project?: {
        id: string
        name: string
    }
    receiptUrl?: string
    approvedBy?: string
    approvedAt?: string
    reimbursedAt?: string
    createdAt?: string
    updatedAt?: string
}

export interface Role {
    id: string
    name: string
    description: string
    isSystem: boolean
    organizationId: string
    permissions?: Permission[]
    _count?: {
        users: number
    }
}

export interface Permission {
    id: string
    name: string
    description: string
    resource: string
    action: string
}

export interface AuditLog {
    id: string
    action: string
    resource: string
    resourceId?: string
    userId: string | null
    organizationId: string
    metadata?: any
    createdAt: string
    ipAddress?: string | null
    userAgent?: string | null
    status: 'SUCCESS' | 'FAILED'
    user?: {
        id: string
        firstName: string
        lastName: string
        email: string
    } | null
}

export interface DashboardStats {
    projects: {
        total: number
        active: number
        completed: number
    }
    tasks: {
        total: number
        todo: number
        inProgress: number
        done: number
    }
    users: {
        total: number
        active: number
    }
    timeTracking: {
        todayHours: number
        weekHours: number
        monthHours: number
    }
    expenses: {
        pending: number
        approved: number
        totalAmount: number
    }
    finance?: {
        revenue: number
        expenses: number
        profit: number
        accounts: number
    }
}

export interface TaskDashboardStats {
    totalTasks: number
    tasksByStatus: Record<string, number>
    tasksByPriority: Record<string, number>
    overdueTasks: number
}

export interface PurchaseOrder {
    id: string
    folio: string
    description: string
    amount: number
    includesVAT: boolean
    subtotal: number
    vat: number
    total: number
    comments?: string
    supplierId?: string
    supplier?: {
        id: string
        nombre: string
        rfc?: string
    }
    projectId?: string
    project?: {
        id: string
        name: string
    }
    status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
    createdById: string
    createdBy?: User
    authorizedById?: string
    authorizedBy?: User
    authorizedAt?: string
    minPaymentDate: string
    maxPaymentDate: string
    pdfUrl?: string
    organizationId: string
    createdAt?: string
    updatedAt?: string
}

export interface ApiResponse<T> {
    success: boolean
    data: T
    message?: string
    timestamp: string
    path: string
}

export interface PaginatedResponse<T> {
    success: boolean
    data: T[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
    timestamp: string
    path: string
}
