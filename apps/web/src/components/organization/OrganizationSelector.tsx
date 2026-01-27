'use client'

import { useState, useEffect } from 'react'
import { Building2, Check, ChevronDown, Loader2, Search } from 'lucide-react'
import { useOrganizationStore } from '@/store/organization.store'
import { useOrganizationSwitch } from '@/hooks/useOrganizationSwitch'
import { useUserOrganizations } from '@/hooks/useOrganization'
import { cn, truncate } from '@/lib/utils'
import { Avatar, AvatarFallback } from '../ui/avatar'
import Button from '../ui/button'

interface OrganizationSelectorProps {
    variant?: 'dropdown' | 'button' | 'compact'
    className?: string
    showSearch?: boolean
}

export default function OrganizationSelector({ 
    variant = 'dropdown',
    className,
    showSearch = true 
}: OrganizationSelectorProps) {
    const { currentOrganization, organizations } = useOrganizationStore()
    const { organizations: userOrgs, isLoading: isLoadingOrgs } = useUserOrganizations()
    const { switchTo, isSwitching } = useOrganizationSwitch()
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const allOrgs = organizations.length > 0 ? organizations : userOrgs
    const filteredOrgs = allOrgs.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleSwitch = async (orgId: string) => {
        if (orgId === currentOrganization?.id) {
            setIsOpen(false)
            return
        }
        
        const success = await switchTo(orgId)
        if (success) {
            setIsOpen(false)
        }
    }

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.organization-selector')) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    if (variant === 'button') {
        return (
            <Button
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className={cn("gap-2", className)}
            >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">
                    {currentOrganization?.name || 'Seleccionar organización'}
                </span>
                <ChevronDown className="w-4 h-4" />
            </Button>
        )
    }

    if (variant === 'compact') {
        return (
            <div className="relative organization-selector">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg",
                        "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                        "transition-colors",
                        className
                    )}
                >
                    <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {truncate(currentOrganization?.name || 'Org', 20)}
                    </span>
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                        <OrganizationDropdown
                            orgs={filteredOrgs}
                            currentOrgId={currentOrganization?.id}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            onSelect={handleSwitch}
                            isLoading={isLoadingOrgs || isSwitching}
                            showSearch={showSearch}
                        />
                    </div>
                )}
            </div>
        )
    }

    // Default dropdown variant
    return (
        <div className="relative organization-selector">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg",
                    "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                    "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                    "w-full text-left",
                    className
                )}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                            <Building2 className="w-4 h-4" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {currentOrganization?.name || 'Seleccionar organización'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {currentOrganization?.slug || 'N/A'}
                        </p>
                    </div>
                </div>
                <ChevronDown className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <OrganizationDropdown
                        orgs={filteredOrgs}
                        currentOrgId={currentOrganization?.id}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onSelect={handleSwitch}
                        isLoading={isLoadingOrgs || isSwitching}
                        showSearch={showSearch}
                    />
                </div>
            )}
        </div>
    )
}

interface OrganizationDropdownProps {
    orgs: any[]
    currentOrgId?: string
    searchQuery: string
    onSearchChange: (query: string) => void
    onSelect: (orgId: string) => void
    isLoading: boolean
    showSearch: boolean
}

function OrganizationDropdown({
    orgs,
    currentOrgId,
    searchQuery,
    onSearchChange,
    onSelect,
    isLoading,
    showSearch,
}: OrganizationDropdownProps) {
    if (isLoading && orgs.length === 0) {
        return (
            <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="p-2 max-h-96 overflow-y-auto">
            {showSearch && orgs.length > 3 && (
                <div className="mb-2 px-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar organización..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            )}

            {orgs.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No se encontraron organizaciones' : 'No hay organizaciones disponibles'}
                </div>
            ) : (
                <div className="space-y-1">
                    {orgs.map((org) => {
                        const isCurrent = org.id === currentOrgId
                        return (
                            <button
                                key={org.id}
                                onClick={() => onSelect(org.id)}
                                disabled={isCurrent || isLoading}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md",
                                    "text-left transition-colors",
                                    isCurrent
                                        ? "bg-blue-50 dark:bg-blue-900/20 cursor-default"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                                    isLoading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                                        <Building2 className="w-4 h-4" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {org.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {org.slug}
                                    </p>
                                </div>
                                {isCurrent && (
                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                )}
                                {isLoading && !isCurrent && (
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
