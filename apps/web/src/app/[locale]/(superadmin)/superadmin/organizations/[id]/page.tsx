'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { Building2, Users, FolderKanban, UsersRound, Package, ArrowLeft, Edit2, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react'
import { SuperadminService } from '@/services/superadmin.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useState } from 'react'
import { useOrganizationStore } from '@/store/organization.store'
import api from '@/lib/api'

export default function OrganizationDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const organizationId = params.id as string
    const queryClient = useQueryClient()
    const { switchOrganization, isSwitching } = useOrganizationStore()
    const [isSwitchingOrg, setIsSwitchingOrg] = useState(false)

    const { data: organization, isLoading } = useQuery({
        queryKey: ['superadmin', 'organizations', organizationId],
        queryFn: () => SuperadminService.getOrganizationDetails(organizationId),
        enabled: !!organizationId,
    })

    const toggleActive = useMutation({
        mutationFn: (isActive: boolean) =>
            SuperadminService.updateOrganization(organizationId, { is_active: isActive }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', organizationId] })
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations'] })
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'analytics'] })
            toast.success(`Organización ${organization?.is_active ? 'desactivada' : 'activada'} exitosamente`)
        },
        onError: () => {
            toast.error('Error al actualizar el estado de la organización')
        },
    })

    const separateData = useMutation({
        mutationFn: async () => {
            try {
                const response = await api.post(`/superadmin/organizations/${organizationId}/separate-data`, {
                    createTestData: true,
                    reassignSharedData: true,
                })
                return response.data
            } catch (error: any) {
                // Better error handling
                if (error?.response?.status === 404) {
                    throw new Error('Endpoint no encontrado. Por favor, reinicia el servidor API para registrar la nueva ruta.');
                }
                if (error?.response?.status === 500) {
                    const serverMessage = error?.response?.data?.message || 'Error interno del servidor';
                    throw new Error(`Error del servidor: ${serverMessage}`);
                }
                throw error;
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', organizationId] })
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations'] })
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'analytics'] })
            toast.success(data.message || 'Datos separados exitosamente')
        },
        onError: (error: any) => {
            const message = error?.message || error?.response?.data?.message || 'Error al separar datos de la organización'
            toast.error(message)
            // Error handled gracefully
        },
    })

    const deleteOrganization = useMutation({
        mutationFn: () => SuperadminService.deleteOrganization(organizationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations'] })
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'analytics'] })
            toast.success('Organización eliminada exitosamente')
            router.push('/superadmin/organizations')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Error al eliminar la organización')
        },
    })

    const handleDeleteOrganization = async () => {
        const confirmed = confirm(
            `⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE.\n\n` +
            `¿Estás seguro de que quieres eliminar la organización "${organization?.name}"?\n\n` +
            `Esto eliminará:\n` +
            `- Todos los usuarios (${organization?._count.users || 0})\n` +
            `- Todos los proyectos (${organization?._count.projects || 0})\n` +
            `- Todos los clientes (${organization?._count.clients || 0})\n` +
            `- Todos los proveedores (${organization?._count.suppliers || 0})\n` +
            `- Todos los datos financieros\n` +
            `- TODOS los datos relacionados\n\n` +
            `Escribe "ELIMINAR" para confirmar:`
        )

        if (!confirmed) return

        const confirmation = prompt('Escribe "ELIMINAR" para confirmar la eliminación:')
        if (confirmation !== 'ELIMINAR') {
            toast.info('Eliminación cancelada')
            return
        }

        deleteOrganization.mutate()
    }

    const handleSwitchOrganization = async () => {
        if (!confirm('¿Estás seguro de que quieres cambiar a esta organización? Todos los datos actuales se limpiarán.')) {
            return
        }

        setIsSwitchingOrg(true)
        try {
            queryClient.clear()
            const success = await switchOrganization(organizationId)
            if (success) {
                router.push('/dashboard')
            } else {
                toast.error('Error al cambiar de organización')
            }
        } catch (error) {
            // Error handled by toast notification
            toast.error('Error al cambiar de organización')
        } finally {
            setIsSwitchingOrg(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!organization) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Organización no encontrada</h3>
                    <Button onClick={() => router.push('/superadmin/organizations')}>
                        Volver a Organizaciones
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                </Button>
                <div className="flex items-start justify-between">
                    <div className="flex items-center">
                        <div className="bg-blue-100 p-3 rounded-lg mr-4">
                            <Building2 className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
                            <p className="text-gray-600 mt-1">{organization.slug}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span
                            className={`px-3 py-1 text-sm font-medium rounded-full flex items-center ${
                                organization.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                            }`}
                        >
                            {organization.is_active ? (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Activa
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Inactiva
                                </>
                            )}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => toggleActive.mutate(!organization.is_active)}
                            disabled={toggleActive.isPending}
                        >
                            {toggleActive.isPending
                                ? 'Actualizando...'
                                : organization.is_active
                                ? 'Desactivar'
                                : 'Activar'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => separateData.mutate()}
                            disabled={separateData.isPending}
                        >
                            {separateData.isPending ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Separando...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Separar Datos
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleSwitchOrganization}
                            disabled={isSwitching || isSwitchingOrg}
                        >
                            {(isSwitching || isSwitchingOrg) ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Cambiando...
                                </>
                            ) : (
                                <>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Cambiar a esta Org
                                </>
                            )}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteOrganization}
                            disabled={deleteOrganization.isPending}
                        >
                            {deleteOrganization.isPending ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Eliminando...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar Organización
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Usuarios</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{organization._count.users}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Proyectos</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{organization._count.projects}</p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-lg">
                            <FolderKanban className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Clientes</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{organization._count.clients}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                            <UsersRound className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Proveedores</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{organization._count.suppliers}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <Package className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Additional Stats */}
            {(organization._count.accounts_payable !== undefined || organization._count.accounts_receivable !== undefined) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {organization._count.accounts_payable !== undefined && (
                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Cuentas por Pagar</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {organization._count.accounts_payable}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}
                    {organization._count.accounts_receivable !== undefined && (
                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Cuentas por Cobrar</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {organization._count.accounts_receivable}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Organization Info */}
            <Card className="p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Información de la Organización</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">ID</p>
                        <p className="text-sm font-mono text-gray-900 mt-1">{organization.id}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Slug</p>
                        <p className="text-sm text-gray-900 mt-1">{organization.slug}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Fecha de Creación</p>
                        <p className="text-sm text-gray-900 mt-1">
                            {new Date(organization.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Última Actualización</p>
                        <p className="text-sm text-gray-900 mt-1">
                            {new Date(organization.updated_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Users List */}
            {organization.users && organization.users.length > 0 && (
                <Card className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Usuarios Recientes</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nombre</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rol</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {organization.users.map((user) => (
                                    <tr key={user.id} className="border-b">
                                        <td className="py-3 px-4 text-sm text-gray-900">
                                            {user.first_name} {user.last_name}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600">{user.roles?.name || 'N/A'}</td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    user.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {user.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}

