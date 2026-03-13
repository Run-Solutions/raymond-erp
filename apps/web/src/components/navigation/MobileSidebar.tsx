'use client'

import { useState, useEffect, useMemo } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { cn } from '@/lib/utils'
import { MODULES, APP_NAME } from '@/lib/constants'
import { ChevronDown, ChevronRight, Menu, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useOrganizationStore } from '@/store/organization.store'
import { useTranslations } from 'next-intl'
import { useEnabledModules } from '@/hooks/useOrganizationModules'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import Image from 'next/image'

export default function MobileSidebar() {
    const pathname = usePathname()
    const { user, signOut } = useAuthStore()
    const { currentOrganization } = useOrganizationStore()
    const [expandedSections, setExpandedSections] = useState<string[]>(['core', 'finance', 'admin', 'tools'])
    const [open, setOpen] = useState(false)
    const t = useTranslations('navigation')
    const { data: enabledModules } = useEnabledModules()

    // Create a Set of enabled module IDs for quick lookup
    const enabledModuleIds = useMemo(() => {
        if (!enabledModules || !Array.isArray(enabledModules) || enabledModules.length === 0) {
            // If no modules configured, show all modules
            return null
        }
        // Only include modules that are enabled
        return new Set(
            enabledModules
                .filter((m) => m.isEnabled)
                .map((m) => m.moduleId)
        )
    }, [enabledModules])

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        )
    }

    const canAccessModule = (module: typeof MODULES[0]) => {
        // STEP 1: Check if module is enabled in organization settings
        // CRITICAL: This applies to ALL users including SUPERADMIN
        if (enabledModuleIds !== null && !enabledModuleIds.has(module.id)) {
            return false
        }

        // STEP 2: Check role-based access (only for enabled modules)
        if (!module.requiredRole) return true
        if (!user) return false

        // STEP 3: SUPERADMIN has access to ALL ENABLED modules
        if (user.isSuperadmin) {
            return true;
        }

        // Handle both string role and object role (from relation)
        const userRole = typeof user.role === 'object' ? (user.role as any).name : user.role

        // SUPERADMIN role has access to all enabled modules
        if (userRole === 'Superadmin' || userRole === 'Super Admin' || userRole?.toUpperCase() === 'SUPERADMIN') {
            return true;
        }

        // STEP 4: Check if user's role is in the required roles list
        return module.requiredRole.includes(userRole)
    }

    const modulesByCategory = {
        core: MODULES.filter(m => m.category === 'core' && canAccessModule(m)),
        finance: MODULES.filter(m => m.category === 'finance' && canAccessModule(m)),
        admin: MODULES.filter(m => m.category === 'admin' && canAccessModule(m)),
        tools: MODULES.filter(m => m.category === 'tools' && canAccessModule(m)),
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-white hover:bg-gray-800 hover:text-white"
                    aria-label="Abrir menú"
                >
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent
                side="left"
                hideCloseButton
                className="w-[300px] sm:w-[400px] p-0 sm:p-0 border-r text-gray-100"
                style={{
                    backgroundImage: currentOrganization?.primaryColor
                        ? `linear-gradient(to bottom, hsl(var(--primary) / 0.95), hsl(var(--primary) / 0.98), hsl(var(--primary-900) / 1))`
                        : 'linear-gradient(to bottom, rgb(17 24 39), rgb(17 24 39), rgb(0 0 0))',
                    borderRightColor: currentOrganization?.primaryColor
                        ? `hsl(var(--primary) / 0.3)`
                        : 'rgb(31 41 55)'
                }}
            >
                <SheetHeader className="p-4 border-b border-gray-800 text-left">
                    <SheetTitle className="flex items-center gap-3 text-white min-w-0">
                        <div className="relative w-10 h-10 flex-shrink-0 rounded-full bg-white/95 backdrop-blur-sm p-1.5 overflow-hidden">
                            <div
                                className="relative w-full h-full flex items-center justify-center"
                                style={{ transform: `scale(${currentOrganization?.logoZoom || 1.0})` }}
                            >
                                <Image
                                    src={currentOrganization?.logoUrl || "/raymond-black.jpeg"}
                                    alt={currentOrganization?.name || "RAYMOND"}
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-bold text-base sm:text-lg tracking-tight truncate" title={currentOrganization?.name || APP_NAME}>
                                {currentOrganization?.name || APP_NAME}
                            </span>
                            <span className="text-xs text-gray-400 truncate">RAYMOND v3.0.3</span>
                        </div>
                    </SheetTitle>
                </SheetHeader>

                <nav className="flex-1 overflow-y-auto p-3 space-y-1 h-[calc(100vh-8rem)] sidebar-scrollbar">
                    {Object.entries(modulesByCategory).map(([category, modules]) => {
                        if (modules.length === 0) return null
                        const isExpanded = expandedSections.includes(category)

                        return (
                            <div key={category} className="space-y-1">
                                <button
                                    onClick={() => toggleSection(category)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200"
                                    style={{
                                        color: currentOrganization?.accentColor
                                            ? `hsl(var(--accent))`
                                            : 'rgb(156 163 175)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (currentOrganization?.accentColor) {
                                            e.currentTarget.style.color = `hsl(var(--accent-foreground))`;
                                            e.currentTarget.style.backgroundColor = `hsl(var(--accent) / 0.1)`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (currentOrganization?.accentColor) {
                                            e.currentTarget.style.color = `hsl(var(--accent))`;
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    <span>{t(`categories.${category}`)}</span>
                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                </button>

                                {isExpanded && modules.map((module) => {
                                    const Icon = module.icon
                                    const isActive = pathname === module.path || pathname.startsWith(module.path + '/')

                                    return (
                                        <Link
                                            key={module.id}
                                            href={module.path}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group',
                                                isActive
                                                    ? 'text-white font-medium shadow-lg'
                                                    : 'text-gray-300 hover:text-white'
                                            )}
                                            style={isActive ? {
                                                background: currentOrganization?.primaryColor
                                                    ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-600)))`
                                                    : '#2563eb'
                                            } : undefined}
                                            onMouseEnter={(e) => {
                                                if (!isActive && currentOrganization?.primaryColor) {
                                                    e.currentTarget.style.backgroundColor = `hsl(var(--primary) / 0.1)`;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            <span className="text-sm font-medium truncate">{t(module.id)}</span>
                                            {isActive && (
                                                <div
                                                    className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse"
                                                    style={{
                                                        backgroundColor: currentOrganization?.accentColor || '#60a5fa'
                                                    }}
                                                />
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        )
                    })}
                </nav>

                {user && (
                    <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800 p-4 bg-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {typeof user.role === 'object' ? (user.role as any).name : user.role}
                                </p>
                            </div>

                            <button
                                onClick={() => signOut()}
                                title="Cerrar sesión"
                                className="p-2 rounded-lg transition-all duration-200 hover:bg-white/10 text-gray-400 hover:text-white"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
