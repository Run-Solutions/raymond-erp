import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    Clock,
    Receipt,
    DollarSign,
    Users,
    Shield,
    Building2,
    Settings,
    FileText,
    BarChart3,
    Bell,
    Calendar,
    Zap,
    BookOpen,
    Target,
    TrendingUp,
    UserCheck,
    Truck,
    CreditCard,
    Banknote,
    Repeat,
    FileSpreadsheet,
    ShoppingCart,
    Radio
} from 'lucide-react'

export interface Module {
    id: string
    name: string
    path: string
    icon: any
    description: string
    category: 'core' | 'finance' | 'admin' | 'tools'
    requiredRole?: string[]
    requiredPermission?: string
}

export const MODULES: Module[] = [
    // Core Modules - Ordered as requested
    // 1. Panel (Dashboard)
    {
        id: 'dashboard',
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        description: 'Overview and analytics',
        category: 'core',
    },
    // 2. Clientes
    {
        id: 'clients',
        name: 'Clients',
        path: '/clients',
        icon: UserCheck,
        description: 'Client management',
        category: 'core',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones', 'Supervisor'],
    },
    // 3. Proveedores
    {
        id: 'suppliers',
        name: 'Suppliers',
        path: '/suppliers',
        icon: Truck,
        description: 'Supplier management',
        category: 'core',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones', 'Supervisor'],
    },
    // 4. Proyectos
    {
        id: 'projects',
        name: 'Projects',
        path: '/projects',
        icon: FolderKanban,
        description: 'Manage projects',
        category: 'core',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones', 'Supervisor', 'Project Manager'],
    },
    // 5. Sprints
    {
        id: 'sprints',
        name: 'Sprints',
        path: '/sprints',
        icon: Zap,
        description: 'Sprint planning',
        category: 'core',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones', 'Supervisor', 'Project Manager', 'Developer', 'Operario'],
    },
    // 6. Tareas
    {
        id: 'tasks',
        name: 'Tasks',
        path: '/tasks',
        icon: CheckSquare,
        description: 'Task management',
        category: 'core',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones', 'Supervisor', 'Project Manager', 'Developer', 'Operario'],
    },
    // 7. Command Center
    {
        id: 'command-center',
        name: 'Command Center',
        path: '/command-center',
        icon: Radio,
        description: 'Executive dispatch system',
        category: 'core',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'CTO', 'COO', 'CCO', 'Gerente Operaciones', 'Supervisor', 'Project Manager', 'PM'],
    },
    // Other Core Modules
    {
        id: 'time-tracking',
        name: 'Time Tracking',
        path: '/time-tracking',
        icon: Clock,
        description: 'Track time entries',
        category: 'core',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones', 'Supervisor', 'Project Manager', 'Developer', 'Operario'],
    },
    {
        id: 'expenses',
        name: 'Expenses',
        path: '/expenses',
        icon: Receipt,
        description: 'Expense management',
        category: 'core',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones'],
    },

    // Finance Modules (Protected)
    {
        id: 'finance-dashboard',
        name: 'Finance Dashboard',
        path: '/finance/dashboard',
        icon: TrendingUp,
        description: 'Financial overview',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones', 'Supervisor'],
    },
    {
        id: 'finance-accounts',
        name: 'Chart of Accounts',
        path: '/finance/accounts',
        icon: BookOpen,
        description: 'Manage accounts',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones'],
    },
    {
        id: 'finance-journal',
        name: 'Journal Entries',
        path: '/finance/journal',
        icon: FileText,
        description: 'Journal entries',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior'],
    },
    {
        id: 'finance-ar',
        name: 'Accounts Receivable',
        path: '/finance/ar',
        icon: CreditCard,
        description: 'Accounts receivable',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones'],
    },
    {
        id: 'finance-ap',
        name: 'Accounts Payable',
        path: '/finance/ap',
        icon: Banknote,
        description: 'Accounts payable',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones'],
    },
    {
        id: 'finance-fixed-costs',
        name: 'Fixed Costs',
        path: '/finance/fixed-costs',
        icon: Repeat,
        description: 'Fixed costs',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones'],
    },
    {
        id: 'finance-invoices',
        name: 'Invoices',
        path: '/finance/invoices',
        icon: FileSpreadsheet,
        description: 'Invoices',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones'],
    },
    {
        id: 'finance-purchase-orders',
        name: 'Purchase Orders',
        path: '/finance/purchase-orders',
        icon: ShoppingCart,
        description: 'Purchase orders management',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones'],
    },
    {
        id: 'finance-reports',
        name: 'Financial Reports',
        path: '/finance/reports',
        icon: BarChart3,
        description: 'Financial reports',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones', 'Supervisor'],
    },
    {
        id: 'finance-flow-recoveries',
        name: 'Flow Recoveries',
        path: '/finance/flow-recoveries',
        icon: TrendingUp,
        description: 'Money flow recovery tracking',
        category: 'finance',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones'],
    },

    // Admin Modules - EXCLUSIVE FOR CEO
    {
        id: 'users',
        name: 'Users',
        path: '/users',
        icon: Users,
        description: 'User management',
        category: 'admin',
        requiredRole: ['Admin', 'Superadmin', 'CEO'],
    },
    {
        id: 'roles',
        name: 'Roles & Permissions',
        path: '/roles',
        icon: Shield,
        description: 'Role management',
        category: 'admin',
        requiredRole: ['Admin', 'Superadmin', 'CEO'],
    },
    {
        id: 'organization',
        name: 'Organization',
        path: '/organization',
        icon: Building2,
        description: 'Organization settings',
        category: 'admin',
        requiredRole: ['Admin', 'Superadmin', 'CEO'],
    },
    {
        id: 'audit',
        name: 'Audit Logs',
        path: '/audit',
        icon: FileText,
        description: 'System audit logs',
        category: 'admin',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior'],
    },
    {
        id: 'modules-management',
        name: 'Modules Management',
        path: '/admin/modules',
        icon: Settings,
        description: 'Control module visibility',
        category: 'admin',
        requiredRole: ['Super Admin', 'Superadmin'],
    },

    // Tools
    {
        id: 'analytics',
        name: 'Analytics',
        path: '/analytics',
        icon: BarChart3,
        description: 'Custom analytics',
        category: 'tools',
        requiredRole: ['Admin', 'Superadmin', 'CEO', 'CFO', 'Contador Senior', 'Gerente Operaciones', 'Supervisor'],
    },
    {
        id: 'notifications',
        name: 'Notifications',
        path: '/notifications',
        icon: Bell,
        description: 'Notification center',
        category: 'tools',
    },
    {
        id: 'calendar',
        name: 'Calendar',
        path: '/calendar',
        icon: Calendar,
        description: 'Calendar and events',
        category: 'tools',
    },
    {
        id: 'settings',
        name: 'Settings',
        path: '/settings',
        icon: Settings,
        description: 'User settings',
        category: 'tools',
    },
]

export const STATUS_COLORS = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    ON_HOLD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
}

export const PRIORITY_COLORS = {
    LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export const APP_NAME = 'RAYMOND Enterprise 2.0'
export const APP_DESCRIPTION = 'Enterprise Resource Planning System'
export const APP_VERSION = '2.0.0'

export const checkModuleAccess = (moduleId: string, user: any): boolean => {
    if (!user) return false

    // CRITICAL: Superadmin users have access to ALL modules
    if (user.isSuperadmin) {
        return true;
    }

    const module = MODULES.find(m => m.id === moduleId)
    if (!module) return true // If module not found in config, assume public or handle elsewhere
    if (!module.requiredRole) return true

    const userRole = typeof user.role === 'object' ? (user.role as any).name : user.role

    // SUPERADMIN has access to all modules
    if (userRole === 'Superadmin' || userRole === 'Super Admin' || userRole?.toUpperCase() === 'SUPERADMIN') {
        return true;
    }

    return module.requiredRole.includes(userRole)
}
