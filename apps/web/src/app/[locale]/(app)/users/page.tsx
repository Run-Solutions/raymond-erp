'use client'

import { useState } from 'react'
import { Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Loader from '@/components/ui/loader'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, type User, type CreateUserDto, type UpdateUserDto } from '@/hooks/useUsers'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useOrganizationStore } from '@/store/organization.store'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import api from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

interface Role {
    id: string
    name: string
}

export default function UsersPage() {
    const { user: currentUser } = useAuthStore()
    const { currentOrganization } = useOrganizationStore()
    const { data: users = [], isLoading } = useUsers()
    const createUser = useCreateUser()
    const updateUser = useUpdateUser()
    const deleteUser = useDeleteUser()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isCreateMode, setIsCreateMode] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Allowed roles for user creation/editing
    const ALLOWED_ROLES = [
        'Superadmin',
        'CEO',
        'CFO',
        'Contador Senior',
        'Gerente Operaciones',
        'Supervisor',
        'Project Manager',
        'Developer',
        'Operario',
    ]

    // Fetch roles and filter to only allowed ones
    const { data: allRoles = [] } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: async () => {
            const response = await api.get('/roles')
            const body = response.data
            if (Array.isArray(body)) return body
            if (body?.data && Array.isArray(body.data)) return body.data
            return []
        },
    })

    // Filter roles to only show allowed ones
    const roles = allRoles.filter(role => 
        ALLOWED_ROLES.some(allowed => 
            role.name.toLowerCase() === allowed.toLowerCase()
        )
    )

    // Check permissions - allow if user has users:create, users:update, or users:delete permissions
    // For now, using email check as fallback
    const canManageUsers = currentUser?.email === 'j.molina@runsolutions-services.com' ||
        (() => {
            const roleName = typeof currentUser?.role === 'string'
                ? currentUser.role
                : (currentUser?.role as any)?.name;
            return roleName && ['Superadmin', 'Admin', 'CEO', 'CFO', 'CTO', 'COO'].includes(roleName);
        })()

    const handleCreate = () => {
        setSelectedUser(null)
        setIsCreateMode(true)
        setIsDialogOpen(true)
    }

    const handleEdit = (user: User) => {
        setSelectedUser(user)
        setIsCreateMode(false)
        setIsDialogOpen(true)
    }

    const handleDelete = async (userId: string) => {
        if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return
        deleteUser.mutate(userId)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        
        const data: CreateUserDto | UpdateUserDto = {
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            email: formData.get('email') as string,
            roleId: formData.get('roleId') as string,
        }

        // Add password only for create
        if (isCreateMode) {
            (data as CreateUserDto).password = formData.get('password') as string
        }

        try {
            if (isCreateMode) {
                await createUser.mutateAsync(data as CreateUserDto)
            } else if (selectedUser) {
                await updateUser.mutateAsync({ id: selectedUser.id, data: data as UpdateUserDto })
            }
            setIsDialogOpen(false)
            setSelectedUser(null)
        } catch (error) {
            // Error handling is done in the hooks
        }
    }

    // Filter users by search query
    const filteredUsers = users.filter(user => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            user.firstName.toLowerCase().includes(query) ||
            user.lastName.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            (typeof user.role === 'object' ? user.role.name : user.role).toLowerCase().includes(query)
        )
    })

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Usuarios</h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Gestiona miembros del equipo y permisos</p>
                </div>
                {canManageUsers && (
                    <Button onClick={handleCreate} className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Usuario
                    </Button>
                )}
            </div>

            <Card className="p-3 sm:p-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar usuarios..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 sm:p-12">
                        <Loader size="lg" text="Cargando usuarios..." />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center">
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                            {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="lg:hidden space-y-3 p-4">
                            {filteredUsers.map((user) => {
                                return (
                                <Card key={user.id} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Avatar className="h-12 w-12 shrink-0">
                                                <AvatarImage src={user.avatarUrl || undefined} alt={user.firstName} />
                                                <AvatarFallback
                                                    className="text-white font-semibold text-base"
                                                    style={{
                                                        backgroundImage: currentOrganization?.primaryColor
                                                            ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-600)))`
                                                            : 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                                                    }}
                                                >
                                                    {getInitials(user.firstName, user.lastName, user.email)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {user.firstName} {user.lastName}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                    {user.email}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    }) : 'No disponible'}
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="secondary" className="text-xs font-medium">
                                                        {typeof user.role === 'object' ? user.role.name : user.role || 'Sin rol'}
                                                    </Badge>
                                                    <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                                                        {user.isActive ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        {canManageUsers && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="shrink-0">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(user.id)}
                                                        className="text-red-600"
                                                        disabled={user.id === currentUser?.id}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </Card>
                                )
                            })}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha de Creación</th>
                                        {canManageUsers && (
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredUsers.map((user) => {
                                        return (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={user.avatarUrl || undefined} alt={user.firstName} />
                                                        <AvatarFallback
                                                            className="text-white font-semibold text-sm"
                                                            style={{
                                                                backgroundImage: currentOrganization?.primaryColor
                                                                    ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-600)))`
                                                                    : 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                                                            }}
                                                        >
                                                            {getInitials(user.firstName, user.lastName, user.email)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                            {user.firstName} {user.lastName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="font-medium">
                                                    {typeof user.role === 'object' ? user.role.name : user.role || 'Sin rol'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={user.isActive ? "default" : "secondary"}>
                                                    {user.isActive ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                }) : 'No disponible'}
                                            </td>
                                            {canManageUsers && (
                                                <td className="px-6 py-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(user.id)}
                                                                className="text-red-600"
                                                                disabled={user.id === currentUser?.id}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            )}
                                        </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                    setSelectedUser(null)
                    setIsCreateMode(false)
                }
            }}>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {isCreateMode ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                        </DialogTitle>
                        <DialogDescription>
                            {isCreateMode 
                                ? 'Completa la información para crear un nuevo usuario'
                                : 'Modifica la información del usuario'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">Nombre *</Label>
                                    <Input 
                                        id="firstName" 
                                        name="firstName" 
                                        defaultValue={selectedUser?.firstName} 
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Apellido *</Label>
                                    <Input 
                                        id="lastName" 
                                        name="lastName" 
                                        defaultValue={selectedUser?.lastName} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    defaultValue={selectedUser?.email} 
                                    required 
                                />
                            </div>
                            {isCreateMode && (
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña *</Label>
                                    <Input 
                                        id="password" 
                                        name="password" 
                                        type="password" 
                                        minLength={8}
                                        required 
                                        placeholder="Mínimo 8 caracteres"
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="roleId">Rol *</Label>
                                <select
                                    id="roleId"
                                    name="roleId"
                                    defaultValue={typeof selectedUser?.role === 'object' ? selectedUser.role.id : undefined}
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Seleccionar rol</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                    setIsDialogOpen(false)
                                    setSelectedUser(null)
                                    setIsCreateMode(false)
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit"
                                disabled={createUser.isPending || updateUser.isPending}
                            >
                                {createUser.isPending || updateUser.isPending 
                                    ? 'Guardando...' 
                                    : isCreateMode 
                                        ? 'Crear Usuario' 
                                        : 'Guardar Cambios'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
