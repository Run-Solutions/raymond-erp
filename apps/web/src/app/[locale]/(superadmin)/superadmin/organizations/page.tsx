'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Building2, Users, FolderKanban, UsersRound, Package, LogOut, Trash2 } from 'lucide-react'
import { SuperadminService } from '@/services/superadmin.service'
import { useOrganizationStore } from '@/store/organization.store'
import { toast } from 'sonner'

export default function OrganizationsListPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { switchOrganization, isSwitching } = useOrganizationStore()
    const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)

    const { data: organizations = [], isLoading } = useQuery({
        queryKey: ['superadmin', 'organizations'],
        queryFn: () => SuperadminService.getAllOrganizations(),
    })

    const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null)

    const deleteOrganization = useMutation({
        mutationFn: (organizationId: string) => SuperadminService.deleteOrganization(organizationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations'] })
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'analytics'] })
            toast.success('Organización eliminada exitosamente')
            setDeletingOrgId(null)
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Error al eliminar la organización')
            setDeletingOrgId(null)
        },
    })

    const handleDeleteOrganization = async (organizationId: string, organizationName: string) => {
        const confirmed = confirm(
            `⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE.\n\n` +
            `¿Estás seguro de que quieres eliminar la organización "${organizationName}"?\n\n` +
            `Esto eliminará:\n` +
            `- Todos los usuarios\n` +
            `- Todos los proyectos\n` +
            `- Todos los clientes y proveedores\n` +
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

        setDeletingOrgId(organizationId)
        deleteOrganization.mutate(organizationId)
    }

    const handleSwitchOrganization = async (organizationId: string) => {
        if (!confirm(`¿Estás seguro de que quieres cambiar a la organización? Todos los datos actuales se limpiarán.`)) {
            return
        }

        setSwitchingOrgId(organizationId)
        try {
            // CRITICAL: Clear all React Query cache before switching
            queryClient.clear()
            
            // Switch organization (this will reload the page)
            const success = await switchOrganization(organizationId)
            
            if (success) {
                // Navigate to dashboard after switch
                router.push('/dashboard')
            } else {
                alert('Error al cambiar de organización')
            }
        } catch (error) {
            // Error handled by toast notification
            alert('Error al cambiar de organización')
        } finally {
            setSwitchingOrgId(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
                    <p className="text-gray-600 mt-2">Manage all organizations in the system</p>
                </div>
                <a
                    href="/superadmin/organizations/new"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Create Organization
                </a>
            </div>

            {/* Organizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((org) => (
                    <div
                        key={org.id}
                        className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                                    <Building2 className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{org.name}</h3>
                                    <p className="text-sm text-gray-500">{org.slug}</p>
                                </div>
                            </div>
                            <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    org.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                }`}
                            >
                                {org.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center text-sm">
                                <Users className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-gray-600">
                                    {org._count.users} {org._count.users === 1 ? 'user' : 'users'}
                                </span>
                            </div>
                            <div className="flex items-center text-sm">
                                <FolderKanban className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-gray-600">
                                    {org._count.projects} {org._count.projects === 1 ? 'project' : 'projects'}
                                </span>
                            </div>
                            <div className="flex items-center text-sm">
                                <UsersRound className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-gray-600">
                                    {org._count.clients} {org._count.clients === 1 ? 'client' : 'clients'}
                                </span>
                            </div>
                            <div className="flex items-center text-sm">
                                <Package className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-gray-600">
                                    {org._count.suppliers} {org._count.suppliers === 1 ? 'supplier' : 'suppliers'}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <a
                                href={`/superadmin/organizations/${org.id}`}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                View Details
                            </a>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleDeleteOrganization(org.id, org.name)}
                                    disabled={deletingOrgId === org.id}
                                    className="flex items-center text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Eliminar organización"
                                >
                                    {deletingOrgId === org.id ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                                            Eliminando...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Eliminar
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleSwitchOrganization(org.id)}
                                    disabled={isSwitching || switchingOrgId === org.id || deletingOrgId === org.id}
                                    className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {(isSwitching && switchingOrgId === org.id) ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                                            Cambiando...
                                        </>
                                    ) : (
                                        <>
                                            <LogOut className="h-3 w-3 mr-1" />
                                            Cambiar a esta Org
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {organizations.length === 0 && (
                <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
                    <p className="text-gray-600 mb-4">Get started by creating your first organization</p>
                    <a
                        href="/superadmin/organizations/new"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Create Organization
                    </a>
                </div>
            )}
        </div>
    )
}
