'use client'

import { Building2 } from 'lucide-react'
import { useOrganization } from '@/hooks/useOrganization'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Badge } from '../ui/badge'

interface OrganizationBadgeProps {
    variant?: 'default' | 'compact' | 'minimal'
    showIcon?: boolean
    showSlug?: boolean
    className?: string
}

export default function OrganizationBadge({
    variant = 'default',
    showIcon = true,
    showSlug = false,
    className,
}: OrganizationBadgeProps) {
    const { organization, isLoading } = useOrganization()

    if (isLoading || !organization) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
        )
    }

    if (variant === 'minimal') {
        return (
            <div className={cn("flex items-center gap-1.5", className)}>
                {showIcon && (
                    <Building2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                )}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {organization.name}
                </span>
            </div>
        )
    }

    if (variant === 'compact') {
        return (
            <Badge variant="outline" className={cn("gap-1.5", className)}>
                {showIcon && (
                    <Building2 className="w-3 h-3" />
                )}
                <span className="text-xs">{organization.name}</span>
            </Badge>
        )
    }

    return (
        <div className={cn("flex items-center gap-2 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800", className)}>
            <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs">
                    <Building2 className="w-3 h-3" />
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {organization.name}
                </span>
                {showSlug && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {organization.slug}
                    </span>
                )}
            </div>
        </div>
    )
}
