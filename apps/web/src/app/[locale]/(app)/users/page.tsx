'use client'

import { useState } from 'react'
import { Plus, Search, Edit, Trash2, Shield, Lock, Unlock, KeyRound, X, AlertCircle } from 'lucide-react'
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

interface Role {
    id: string
    name: string
}

const UBICACIONES = ['R1', 'R2', 'R3', 'Taller'];

export default function UsersPage() {
    const { user: currentUser } = useAuthStore()
    const { currentOrganization } = useOrganizationStore()
    const { data: users = [], isLoading } = useUsers()
    const createUser = useCreateUser()
    const updateUser = useUpdateUser()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isCreateMode, setIsCreateMode] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Custom states for the modified UI
    const [showConfirmCancel, setShowConfirmCancel] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [passwordInput, setPasswordInput] = useState('')

    // Allowed roles for user creation/editing
    const ALLOWED_ROLES = [
        'Administrador',
        'Almacenista',
        'Vendedor',
        'Comercial',
        'Supervisor Comercial'
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

    const roles = allRoles.filter(role =>
        ALLOWED_ROLES.some(allowed =>
            role.name.toLowerCase() === allowed.toLowerCase()
        )
    )

    // Check permissions - only admins can manage users
    const canManageUsers = currentUser?.email === 'j.molina@runsolutions-services.com' ||
        (() => {
            const roleName = typeof currentUser?.role === 'string'
                ? currentUser.role
                : (currentUser?.role as any)?.name;
            return roleName && ['Superadmin', 'Admin', 'Administrador'].includes(roleName);
        })()

    const handleCreate = () => {
        setSelectedUser(null)
        setIsCreateMode(true)
        setPasswordError('')
        setPasswordInput('')
        setShowConfirmCancel(false)
        setIsDialogOpen(true)
    }

    const handleEdit = (user: User) => {
        setSelectedUser(user)
        setIsCreateMode(false)
        setPasswordError('')
        setPasswordInput('')
        setShowConfirmCancel(false)
        setIsDialogOpen(true)
    }

    const handleToggleActive = async (user: User) => {
        if (!canManageUsers) return;
        try {
            await updateUser.mutateAsync({
                id: user.id,
                data: { isActive: !user.isActive }
            });
        } catch (error) {
            console.error(error);
        }
    }

    // Handlers to close with confirmation
    const requestClose = () => {
        setShowConfirmCancel(true);
    }

    const confirmClose = () => {
        setShowConfirmCancel(false);
        setIsDialogOpen(false);
        setSelectedUser(null);
    }

    const cancelClose = () => {
        setShowConfirmCancel(false);
    }

    const validatePassword = (password: string) => {
        if (!password) return true; // Optional on edit
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        if (!hasUpperCase || !hasNumber || password.length < 8) {
            return false;
        }
        return true;
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPasswordInput(val);

        if (val.length > 0) {
            if (!validatePassword(val)) {
                setPasswordError("Mínimo 8 caracteres, 1 mayúscula y 1 número");
            } else {
                setPasswordError("");
            }
        } else {
            setPasswordError("");
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const password = passwordInput;

        if (password) {
            if (!validatePassword(password)) {
                setPasswordError("Mínimo 8 caracteres, 1 mayúscula y 1 número");
                return;
            } else {
                setPasswordError('');
            }
        } else if (isCreateMode) {
            setPasswordError("La contraseña es requerida.");
            return;
        }

        const data: CreateUserDto | UpdateUserDto = {
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            email: formData.get('email') as string,
            roleId: formData.get('roleId') as string,
            ubicacion: formData.get('ubicacion') as string || undefined,
        }

        // Add password only if provided
        if (password) {
            (data as CreateUserDto).password = password
        }

        try {
            if (isCreateMode) {
                await createUser.mutateAsync(data as CreateUserDto)
            } else if (selectedUser) {
                await updateUser.mutateAsync({ id: selectedUser.id, data: data as UpdateUserDto })
            }
            setIsDialogOpen(false)
            setSelectedUser(null)
            setPasswordInput('')
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
            (typeof user.role === 'object' ? user.role.name : user.role).toLowerCase().includes(query) ||
            (user.ubicacion && user.ubicacion.toLowerCase().includes(query))
        )
    })

    return (
        <div className="space-y-4 sm:space-y-6 lg:p-6 p-4 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, correo, rol o ubicación..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border-none rounded-2xl shadow-sm text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-shadow transition-colors outline-none"
                    />
                </div>
                {canManageUsers && (
                    <Button onClick={handleCreate} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 h-12 shadow-md shadow-blue-500/20 transition-all font-bold">
                        <Plus className="w-5 h-5 mr-2" />
                        Crear Nuevo Usuario
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="p-8 sm:p-12">
                    <Loader size="lg" text="Cargando usuarios..." />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">
                        {searchQuery ? 'No se encontraron usuarios que coincidan con la búsqueda' : 'No hay usuarios registrados'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredUsers.map((user) => {
                        const roleName = typeof user.role === 'object' ? user.role.name : user.role || 'Sin rol';
                        const isAdmin = ['Superadmin', 'Admin', 'Administrador'].includes(roleName);

                        return (
                            <div key={user.id} className={`bg-white rounded-2xl p-5 shadow-sm border transition-all flex flex-col ${user.isActive ? 'border-gray-100 hover:border-blue-100 hover:shadow-md' : 'border-gray-200 opacity-80'}`}>
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <Avatar className="h-14 w-14 shrink-0 ring-4 ring-white shadow-sm">
                                        <AvatarImage src={user.avatarUrl || undefined} alt={user.firstName} />
                                        <AvatarFallback
                                            className="text-white font-bold text-lg"
                                            style={{
                                                backgroundImage: currentOrganization?.primaryColor
                                                    ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-600)))`
                                                    : 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                                            }}
                                        >
                                            {getInitials(user.firstName, user.lastName, user.email)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex flex-col items-end gap-1.5 mt-1">
                                        <Badge variant={user.isActive ? "default" : "secondary"} className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md ${user.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100' : 'bg-gray-200 text-gray-500'}`}>
                                            {user.isActive ? 'Activo' : 'Bloqueado'}
                                        </Badge>
                                        <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider rounded-md border text-center whitespace-nowrap ${isAdmin ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-gray-200 text-gray-600'}`}>
                                            {roleName}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 mb-5">
                                    <h3 className={`font-black tracking-tight text-xl truncate ${user.isActive ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                                        {user.firstName} {user.lastName}
                                    </h3>
                                    <p className="text-sm font-medium text-gray-500 truncate mt-0.5">
                                        {user.email}
                                    </p>
                                    {user.ubicacion && (
                                        <div className="flex items-center gap-1.5 mt-3 text-gray-400">
                                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{user.ubicacion}</p>
                                        </div>
                                    )}
                                </div>

                                {canManageUsers && (
                                    <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            disabled={user.id === currentUser?.id}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                                ${user.isActive
                                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`
                                            }
                                        >
                                            {user.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                            {user.isActive ? 'Bloquear' : 'Desbloquear'}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Editar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open && !showConfirmCancel) requestClose();
            }}>
                <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2rem] gap-0">

                    {showConfirmCancel && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">¿Descartar cambios?</h3>
                            <p className="text-sm text-slate-500 font-medium mb-8 max-w-xs">
                                Todos los datos no guardados se perderán permanentemente.
                            </p>
                            <div className="flex gap-3 w-full max-w-sm">
                                <button
                                    type="button"
                                    onClick={cancelClose}
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    Seguir Editando
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmClose}
                                    className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 transition-all"
                                >
                                    Sí, Descartar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                        <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
                            {isCreateMode ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-gray-500 mt-1">
                            {isCreateMode
                                ? 'Ingresa los datos del nuevo miembro del equipo.'
                                : 'Modifica la información o permisos del usuario.'}
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nombre</Label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    defaultValue={selectedUser?.firstName}
                                    required
                                    className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl shadow-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Apellido</Label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    defaultValue={selectedUser?.lastName}
                                    required
                                    className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl shadow-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Correo Electrónico</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                defaultValue={selectedUser?.email}
                                required
                                className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl shadow-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                {isCreateMode ? 'Contraseña' : 'Nueva Contraseña (Opcional)'}
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="text"
                                required={isCreateMode}
                                value={passwordInput}
                                onChange={handlePasswordChange}
                                placeholder="8+ caracteres, 1 mayúscula, 1 número"
                                className={`bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl shadow-none ${passwordError ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                            />
                            {passwordError && (
                                <p className="text-xs font-bold text-red-500 mt-1">{passwordError}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Rol *</Label>
                                <select
                                    id="roleId"
                                    name="roleId"
                                    defaultValue={typeof selectedUser?.role === 'object' ? selectedUser.role.id : undefined}
                                    required
                                    className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                                >
                                    <option value="">Seleccionar rol</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Ubicación</Label>
                                <select
                                    id="ubicacion"
                                    name="ubicacion"
                                    defaultValue={selectedUser?.ubicacion || ''}
                                    className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                                >
                                    <option value="">Sin ubicación general</option>
                                    {UBICACIONES.map((ub) => (
                                        <option key={ub} value={ub}>
                                            {ub}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-4 pt-4">
                            <button
                                type="button"
                                onClick={requestClose}
                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={createUser.isPending || updateUser.isPending || !!passwordError}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all disabled:opacity-70 disabled:shadow-none"
                            >
                                {createUser.isPending || updateUser.isPending
                                    ? 'Guardando...'
                                    : 'Guardar Usuario'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
