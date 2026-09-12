'use client'

import { useState, useEffect } from 'react'
import { Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import Loader from '@/components/ui/loader'
import {
    usePermissions,
    usePermissionResources,
    type Permission,
} from '@/hooks/usePermissions'
import { useAssignPermissions, type Role } from '@/hooks/useRoles'

interface RolePermissionsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    role: Role
}

export function RolePermissionsDialog({
    open,
    onOpenChange,
    role,
}: RolePermissionsDialogProps) {
    const { data: allPermissions = [], isLoading: permissionsLoading, error: permissionsError } = usePermissions()
    const { data: resources = [], isLoading: resourcesLoading, error: resourcesError } = usePermissionResources()
    const assignPermissions = useAssignPermissions()

    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedResource, setSelectedResource] = useState<string>('all')
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [hasInitializedCategories, setHasInitializedCategories] = useState(false)

    // Inicializar permisos seleccionados cuando se abre el diálogo
    useEffect(() => {
        if (open && role.permissions) {
            const currentPermissionIds = role.permissions.map(
                (rp) => rp.permission.id
            )
            setSelectedPermissions(currentPermissionIds)
        }
    }, [open, role])
    
    // Expandir todas las categorías cuando se cargan los recursos (solo una vez)
    useEffect(() => {
        if (open && resources.length > 0 && !hasInitializedCategories) {
            setExpandedCategories(new Set(resources))
            setHasInitializedCategories(true)
        }
    }, [open, resources.length, hasInitializedCategories])
    
    // Reset cuando se cierra el diálogo
    useEffect(() => {
        if (!open) {
            setHasInitializedCategories(false)
            setExpandedCategories(new Set())
        }
    }, [open])
    
    // Debug logging
    useEffect(() => {
        if (open) {
            console.log('RolePermissionsDialog opened:', {
                role: role?.name,
                allPermissions: allPermissions.length,
                resources: resources.length,
                permissionsLoading,
                resourcesLoading,
                permissionsError: permissionsError?.message,
                resourcesError: resourcesError?.message,
            })
        }
    }, [open, allPermissions.length, resources.length, permissionsLoading, resourcesLoading])

    const filteredPermissions = allPermissions.filter((permission) => {
        const matchesSearch =
            permission.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
            permission.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            permission.description?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesResource = selectedResource === 'all' || permission.resource === selectedResource
        return matchesSearch && matchesResource
    })

    const permissionsByResource = resources.reduce((acc, resource) => {
        acc[resource] = filteredPermissions.filter((p) => p.resource === resource)
        return acc
    }, {} as Record<string, Permission[]>)
    
    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev)
            if (newSet.has(category)) {
                newSet.delete(category)
            } else {
                newSet.add(category)
            }
            return newSet
        })
    }
    
    const expandAllCategories = () => {
        setExpandedCategories(new Set(resources))
    }
    
    const collapseAllCategories = () => {
        setExpandedCategories(new Set())
    }

    const handleTogglePermission = (permissionId: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        )
    }

    const handleSelectAll = (resource: string) => {
        const resourcePermissions = permissionsByResource[resource] || []
        const resourcePermissionIds = resourcePermissions.map((p) => p.id)
        const allSelected = resourcePermissionIds.every((id) =>
            selectedPermissions.includes(id)
        )

        if (allSelected) {
            // Deseleccionar todos de este recurso
            setSelectedPermissions((prev) =>
                prev.filter((id) => !resourcePermissionIds.includes(id))
            )
        } else {
            // Seleccionar todos de este recurso
            setSelectedPermissions((prev) => {
                const newSelection = [...prev]
                resourcePermissionIds.forEach((id) => {
                    if (!newSelection.includes(id)) {
                        newSelection.push(id)
                    }
                })
                return newSelection
            })
        }
    }

    const handleSave = () => {
        assignPermissions.mutate(
            {
                id: role.id,
                data: { permissionIds: selectedPermissions },
            },
            {
                onSuccess: () => {
                    onOpenChange(false)
                },
            }
        )
    }

    const selectedCount = selectedPermissions.length
    const totalCount = allPermissions.length

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Gestionar Permisos: {role.name}</DialogTitle>
                    <DialogDescription>
                        Selecciona los permisos que tendrá este rol
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Input
                                placeholder="Buscar permisos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-48">
                            <SearchableSelect
                                value={selectedResource}
                                onChange={setSelectedResource}
                                options={[
                                    { label: 'Todos los recursos', value: 'all' },
                                    ...resources.map((resource) => ({
                                        label: resource,
                                        value: resource,
                                    })),
                                ]}
                                placeholder="Todos los recursos"
                                searchPlaceholder="Buscar recurso..."
                                emptyMessage="Sin resultados"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                            {selectedCount} de {totalCount} permisos seleccionados
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPermissions([])}
                        >
                            Limpiar selección
                        </Button>
                    </div>

                    {permissionsLoading || resourcesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader size="md" text="Cargando permisos..." />
                        </div>
                    ) : permissionsError || resourcesError ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-red-600 dark:text-red-400 mb-2">
                                Error al cargar permisos
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {permissionsError?.message || resourcesError?.message || 'Error desconocido'}
                            </p>
                        </div>
                    ) : allPermissions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400">
                                No hay permisos disponibles
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Controles de expansión */}
                            <div className="flex items-center justify-between pb-2 border-b">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={expandAllCategories}
                                        className="text-xs"
                                    >
                                        Expandir todo
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={collapseAllCategories}
                                        className="text-xs"
                                    >
                                        Colapsar todo
                                    </Button>
                                </div>
                            </div>
                            
                            <ScrollArea className="h-[450px] pr-4">
                                <div className="space-y-3">
                                    {resources
                                        .filter(
                                            (resource) =>
                                                selectedResource === 'all' || resource === selectedResource
                                        )
                                        .map((resource) => {
                                            const resourcePermissions =
                                                permissionsByResource[resource] || []
                                            if (resourcePermissions.length === 0) return null

                                            const resourcePermissionIds = resourcePermissions.map(
                                                (p) => p.id
                                            )
                                            const allSelected = resourcePermissionIds.every((id) =>
                                                selectedPermissions.includes(id)
                                            )
                                            const someSelected = resourcePermissionIds.some((id) =>
                                                selectedPermissions.includes(id)
                                            )
                                            const isExpanded = expandedCategories.has(resource)

                                            return (
                                                <div 
                                                    key={resource} 
                                                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                                                >
                                                    {/* Categoría Header */}
                                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <Checkbox
                                                                    checked={allSelected}
                                                                    onCheckedChange={() =>
                                                                        handleSelectAll(resource)
                                                                    }
                                                                    className="data-[state=checked]:bg-blue-600"
                                                                />
                                                                <button
                                                                    onClick={() => toggleCategory(resource)}
                                                                    className="flex items-center gap-2 flex-1 text-left"
                                                                >
                                                                    <Label className="font-semibold text-base cursor-pointer flex items-center gap-2">
                                                                        <span className="capitalize">{resource}</span>
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            {resourcePermissions.length}
                                                                        </Badge>
                                                                        {someSelected && !allSelected && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {resourcePermissionIds.filter(id => selectedPermissions.includes(id)).length} seleccionados
                                                                            </Badge>
                                                                        )}
                                                                    </Label>
                                                                </button>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleCategory(resource)}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronDown className="w-4 h-4" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Permisos de la categoría */}
                                                    {isExpanded && (
                                                        <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
                                                            {resourcePermissions.map((permission) => {
                                                                const isSelected = selectedPermissions.includes(
                                                                    permission.id
                                                                )
                                                                return (
                                                                    <div
                                                                        key={permission.id}
                                                                        className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                                                    >
                                                                        <Checkbox
                                                                            id={permission.id}
                                                                            checked={isSelected}
                                                                            onCheckedChange={() =>
                                                                                handleTogglePermission(
                                                                                    permission.id
                                                                                )
                                                                            }
                                                                            className="mt-0.5"
                                                                        />
                                                                        <Label
                                                                            htmlFor={permission.id}
                                                                            className="flex-1 cursor-pointer"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-medium text-sm">
                                                                                    {permission.action}
                                                                                </span>
                                                                                {permission.description && (
                                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                                        - {permission.description}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </Label>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={assignPermissions.isPending}
                    >
                        {assignPermissions.isPending ? (
                            <>
                                <Loader size="sm" className="mr-2" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Guardar Permisos
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
