'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import Button from '@/components/ui/button'
import { Building2, Users, FolderKanban, Edit2, Save, X, RefreshCw } from 'lucide-react'
import { useOrganization } from '@/hooks/useOrganization'
import { useOrganizationStore } from '@/store/organization.store'
import OrganizationCard from '@/components/organization/OrganizationCard'
import OrganizationSelector from '@/components/organization/OrganizationSelector'
import { formatDate } from '@/lib/utils'
import Loader from '@/components/ui/loader'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BrandingSettings from './components/BrandingSettings'
import BrandingShowcase from './components/BrandingShowcase'

export default function OrganizationPage() {
    const { organization, isLoading, refresh } = useOrganization()
    const { updateOrganization, isLoading: isUpdating } = useOrganizationStore()
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        name: organization?.name || '',
        slug: organization?.slug || '',
    })

    // Update form data when organization changes
    useEffect(() => {
        if (organization) {
            setFormData({
                name: organization.name,
                slug: organization.slug,
            })
        }
    }, [organization])

    const handleSave = async () => {
        if (!organization) return

        const success = await updateOrganization({
            name: formData.name !== organization.name ? formData.name : undefined,
            slug: formData.slug !== organization.slug ? formData.slug : undefined,
        })

        if (success) {
            setIsEditing(false)
            await refresh()
            toast.success('Organización actualizada exitosamente')
        } else {
            toast.error('Error al actualizar la organización')
        }
    }

    const handleCancel = () => {
        setFormData({
            name: organization?.name || '',
            slug: organization?.slug || '',
        })
        setIsEditing(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader size="lg" text="Cargando organización..." />
            </div>
        )
    }

    if (!organization) {
        return (
            <div className="space-y-6">
                <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        No hay organización disponible
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        No se pudo cargar la información de la organización
                    </p>
                    <Button onClick={() => refresh()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reintentar
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Organización
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Gestiona la configuración y detalles de tu organización
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => refresh()}
                        disabled={isLoading}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualizar
                    </Button>
                    {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                disabled={isUpdating}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isUpdating}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Guardar
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Organization Selector */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cambiar de organización
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Selecciona una organización diferente si perteneces a varias
                        </p>
                    </div>
                    <OrganizationSelector variant="button" />
                </div>
            </Card>

            {/* Organization Card */}
            <OrganizationCard showStats={true} />

            {/* NEW: Branding Settings - FIRST for CEO visibility */}
            <BrandingSettings />

            {/* Branding Showcase - Preview of all branded components */}
            <BrandingShowcase />

            {/* Organization Details Form */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Detalles de la Organización
                </h2>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre de la Organización</Label>
                        {isEditing ? (
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-2"
                                disabled={isUpdating}
                            />
                        ) : (
                            <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">
                                {organization.name}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="slug">Slug</Label>
                        {isEditing ? (
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="mt-2"
                                disabled={isUpdating}
                                placeholder="organizacion-ejemplo"
                            />
                        ) : (
                            <p className="mt-2 text-sm text-gray-900 dark:text-gray-100 font-mono">
                                {organization.slug}
                            </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            El slug se usa para identificadores únicos y URLs
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <Label>Estado</Label>
                            <p className="mt-2 text-sm">
                                {organization.isActive ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                                        Activa
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                        <span className="w-2 h-2 bg-gray-500 rounded-full" />
                                        Inactiva
                                    </span>
                                )}
                            </p>
                        </div>

                        <div>
                            <Label>Fecha de Creación</Label>
                            <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">
                                {formatDate(organization.createdAt, 'long')}
                            </p>
                        </div>

                        {organization.updatedAt && (
                            <div>
                                <Label>Última Actualización</Label>
                                <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">
                                    {formatDate(organization.updatedAt, 'long')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Quick Stats */}
            {organization.stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Usuarios</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {organization.stats.users || 0}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                <FolderKanban className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Proyectos</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {organization.stats.projects || 0}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                <FolderKanban className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tareas</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {organization.stats.tasks || 0}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                                <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Clientes</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {organization.stats.clients || 0}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
