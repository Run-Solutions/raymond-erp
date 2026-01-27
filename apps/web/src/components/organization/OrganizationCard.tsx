'use client'

import { Building2, Users, FolderKanban, CheckCircle2, AlertCircle } from 'lucide-react'
import { useOrganization } from '@/hooks/useOrganization'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { formatDate } from '@/lib/utils'
import Loader from '../ui/loader'

interface OrganizationCardProps {
    showStats?: boolean
    showActions?: boolean
    className?: string
}

export default function OrganizationCard({
    showStats = true,
    showActions = false,
    className,
}: OrganizationCardProps) {
    const { organization, isLoading } = useOrganization()

    if (isLoading) {
        return (
            <Card className={className}>
                <div className="p-6">
                    <Loader size="md" text="Cargando organización..." />
                </div>
            </Card>
        )
    }

    if (!organization) {
        return (
            <Card className={className}>
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No hay organización disponible
                </div>
            </Card>
        )
    }

    const stats = organization.stats

    return (
        <Card className={className}>
            <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {organization.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {organization.slug}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {organization.isActive ? (
                            <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Activa
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Inactiva
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Stats */}
                {showStats && stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Usuarios</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {stats.users || 0}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Proyectos</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {stats.projects || 0}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Tareas</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {stats.tasks || 0}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Clientes</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {stats.clients || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Creada</span>
                        <span className="text-gray-900 dark:text-gray-100">
                            {formatDate(organization.createdAt)}
                        </span>
                    </div>
                    {organization.updatedAt && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Actualizada</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                {formatDate(organization.updatedAt)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}
