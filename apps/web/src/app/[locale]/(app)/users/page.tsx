'use client'

import { useState } from 'react'
import { Plus, Search, Edit, Trash2, Shield, Lock, Unlock, KeyRound, X, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Loader from '@/components/ui/loader'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, type User, type CreateUserDto, type UpdateUserDto } from '@/hooks/useUsers'
import { getInitials, cn } from '@/lib/utils'
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

// Reusing R1 detail modal wrapper style and layout for viewing individual users
function UserDetailModal({
    user,
    isOpen,
    onClose,
    onEdit,
    onToggleActive,
    canManage
}: {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    onToggleActive: () => void;
    canManage: boolean;
}) {
    if (!user) return null;

    const roleName = typeof user.role === 'object' ? user.role.name : user.role || 'Sin rol';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-[#1a1c23] border border-gray-800 rounded-2xl shadow-2xl h-[90vh] flex flex-col sm:h-auto sm:max-h-[85vh]">
                {/* Header background pattern */}
                <div className="absolute inset-0 h-40 bg-gradient-to-br from-red-600/20 via-red-900/10 to-transparent opacity-50" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full mix-blend-screen" />

                {/* Navbar/Header */}
                <div className="relative px-6 py-4 flex items-center justify-between border-b border-gray-800/60 bg-[#1a1c23]/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-xl">
                            <Shield className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight leading-none">
                                Ficha de Usuario
                            </h2>
                            <p className="text-sm font-medium text-gray-400 mt-1">
                                {user.id.substring(0, 8)}...
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto relative z-10 p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Columna Izquierda: Perfil y Estado */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Tarjeta de Perfil */}
                            <div className="bg-[#22252e] rounded-2xl p-6 border border-gray-800/60 flex flex-col items-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <Avatar className="h-28 w-28 ring-4 ring-[#1a1c23] shadow-xl mb-4 relative z-10">
                                    <AvatarImage src={user.avatarUrl || undefined} alt={user.firstName} />
                                    <AvatarFallback className="text-white font-bold text-3xl bg-gradient-to-br from-red-500 to-red-700">
                                        {getInitials(user.firstName, user.lastName, user.email)}
                                    </AvatarFallback>
                                </Avatar>

                                <h3 className="text-xl font-black tracking-tight text-white text-center">
                                    {user.firstName} {user.lastName}
                                </h3>
                                <p className="text-sm text-gray-400 font-medium text-center mt-1">
                                    {user.email}
                                </p>

                                <div className="flex gap-2 mt-4 relative z-10">
                                    <Badge variant="outline" className={`px-3 py-1 text-xs uppercase font-black tracking-wider border-0 ${user.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {user.isActive ? 'Activo' : 'Bloqueado'}
                                    </Badge>
                                    <Badge variant="outline" className="px-3 py-1 text-xs uppercase font-black tracking-wider border-0 bg-white/5 text-gray-300">
                                        {roleName}
                                    </Badge>
                                </div>
                            </div>

                            {/* Acciones */}
                            {canManage && (
                                <div className="bg-[#22252e] rounded-2xl p-5 border border-gray-800/60 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">Acciones</h4>

                                    <button
                                        onClick={onEdit}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/20"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Modificar Datos
                                    </button>

                                    <button
                                        onClick={onToggleActive}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${user.isActive
                                            ? 'bg-[#1a1c23] hover:bg-red-500/10 text-gray-300 hover:text-red-400 border border-gray-800 hover:border-red-500/30'
                                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                            }`}
                                    >
                                        {user.isActive ? (
                                            <>
                                                <Lock className="w-4 h-4" /> Bloquear Acceso
                                            </>
                                        ) : (
                                            <>
                                                <Unlock className="w-4 h-4" /> Desbloquear Acceso
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Columna Derecha: Detalles */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Información detallada */}
                            <div className="bg-[#22252e] rounded-2xl p-6 border border-gray-800/60">
                                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                                    Detalles de la Cuenta
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Nombre Completo</p>
                                        <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Correo Electrónico</p>
                                        <p className="text-sm font-medium text-white break-all">{user.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Rol Asignado</p>
                                        <p className="text-sm font-medium text-white">{roleName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Ubicación / Sede</p>
                                        <div className="flex items-center gap-2">
                                            {user.ubicacion ? (
                                                <>
                                                    <span className="w-2 h-2 rounded-full bg-red-400" />
                                                    <p className="text-sm font-bold text-white uppercase tracking-wider">{user.ubicacion}</p>
                                                </>
                                            ) : (
                                                <p className="text-sm font-medium text-gray-500">Global</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

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

    // View Detail Modal state
    const [viewUser, setViewUser] = useState<User | null>(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)

    // Form states
    const [showConfirmCancel, setShowConfirmCancel] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [passwordInput, setPasswordInput] = useState('')

    // Fetch allowed roles list
    const ALLOWED_ROLES = [
        'Administrador',
        'Almacenista',
        'Vendedor',
        'Comercial',
        'Supervisor Comercial'
    ]

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
        setIsViewModalOpen(false) // Close view modal if opened from there
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
            // Update local view user if it's currently open
            if (viewUser && viewUser.id === user.id) {
                setViewUser({ ...viewUser, isActive: !user.isActive })
            }
        } catch (error) {
            console.error(error);
        }
    }

    const handleCardClick = (user: User) => {
        setViewUser(user);
        setIsViewModalOpen(true);
    }

    const requestClose = () => setShowConfirmCancel(true);
    const confirmClose = () => {
        setShowConfirmCancel(false);
        setIsDialogOpen(false);
        setSelectedUser(null);
    }
    const cancelClose = () => setShowConfirmCancel(false);

    const validatePassword = (password: string) => {
        if (!password) return true;
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
            // Handled by react-query hooks
        }
    }

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
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl shadow-sm text-sm font-medium focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
                    />
                </div>
                {canManageUsers && (
                    <Button
                        onClick={handleCreate}
                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white rounded-2xl px-6 h-12 shadow-lg shadow-red-500/20 transition-all font-bold group"
                    >
                        <Plus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                        Añadir Usuario
                    </Button>
                )}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="p-8 sm:p-12">
                    <Loader size="lg" text="Cargando usuarios..." />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <Shield className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium text-lg">
                        {searchQuery ? 'No se encontraron resultados' : 'Sin usuarios'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredUsers.map((user) => {
                        const roleName = typeof user.role === 'object' ? user.role.name : user.role || 'Sin rol';

                        return (
                            <button
                                key={user.id}
                                onClick={() => handleCardClick(user)}
                                className={cn(
                                    "flex flex-col text-left bg-white rounded-3xl p-6 border-2 transition-all duration-300 relative overflow-hidden group w-full",
                                    user.isActive
                                        ? "border-gray-100 hover:border-red-200 hover:shadow-[0_8px_30px_rgb(220,38,38,0.12)] hover:-translate-y-1"
                                        : "border-gray-100 opacity-60 hover:opacity-100 grayscale-[0.5]"
                                )}
                            >
                                {/* Decorative gradient for active users */}
                                {user.isActive && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
                                )}

                                <div className="flex items-start justify-between w-full mb-5 relative z-10">
                                    <Avatar className="h-16 w-16 ring-4 ring-white shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md">
                                        <AvatarImage src={user.avatarUrl || undefined} alt={user.firstName} />
                                        <AvatarFallback className={cn("text-white font-black text-xl",
                                            user.isActive ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gray-400"
                                        )}>
                                            {getInitials(user.firstName, user.lastName, user.email)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <Badge variant="outline" className={cn(
                                            "border-0 px-2.5 py-1 text-[10px] uppercase font-black tracking-widest",
                                            user.isActive
                                                ? "bg-emerald-50 text-emerald-600"
                                                : "bg-gray-100 text-gray-500"
                                        )}>
                                            {user.isActive ? 'Activo' : 'Bloqueado'}
                                        </Badge>
                                        <Badge variant="outline" className="border-gray-200 text-gray-600 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-white">
                                            {roleName}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="mt-auto relative z-10 w-full">
                                    <h3 className={cn("font-black text-xl tracking-tight truncate", user.isActive ? "text-slate-800" : "text-slate-500 line-through")}>
                                        {user.firstName} {user.lastName}
                                    </h3>
                                    <p className="text-sm font-medium text-slate-500 truncate mt-1">
                                        {user.email}
                                    </p>
                                    {user.ubicacion && (
                                        <div className="flex items-center gap-1.5 mt-4">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-red-500 transition-colors">
                                                {user.ubicacion}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* View Detail Modal */}
            <UserDetailModal
                user={viewUser}
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                onEdit={() => viewUser && handleEdit(viewUser)}
                onToggleActive={() => viewUser && handleToggleActive(viewUser)}
                canManage={canManageUsers}
            />

            {/* Create/Edit Dark Modal Form */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open && !showConfirmCancel) requestClose();
            }}>
                <DialogContent className="max-w-xl p-0 overflow-hidden bg-[#1a1c23] border border-gray-800 rounded-3xl shadow-2xl flex flex-col sm:h-auto sm:max-h-[85vh]">

                    {showConfirmCancel && (
                        <div className="absolute inset-0 bg-[#1a1c23]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tight mb-2">¿Descartar cambios?</h3>
                            <p className="text-sm text-gray-400 font-medium mb-8 max-w-xs">
                                Los datos que has ingresado no se guardarán.
                            </p>
                            <div className="flex gap-3 w-full max-w-sm">
                                <button
                                    type="button"
                                    onClick={cancelClose}
                                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    Seguir Editando
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmClose}
                                    className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-900/20 transition-all"
                                >
                                    Descartar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-6 border-b border-gray-800/60 bg-[#1a1c23] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 blur-[60px] rounded-full mix-blend-screen -translate-y-1/2" />
                        <DialogTitle className="text-2xl font-black text-white tracking-tight relative z-10">
                            {isCreateMode ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-gray-400 mt-1 relative z-10">
                            {isCreateMode
                                ? 'Ingresa los datos del nuevo miembro para el entorno global.'
                                : 'Modifica la información o permisos del usuario.'}
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nombre</Label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    defaultValue={selectedUser?.firstName}
                                    required
                                    className="bg-[#22252e] border-gray-800/60 focus:bg-[#2a2d38] focus:border-red-500/50 text-white h-12 rounded-xl shadow-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Apellido</Label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    defaultValue={selectedUser?.lastName}
                                    required
                                    className="bg-[#22252e] border-gray-800/60 focus:bg-[#2a2d38] focus:border-red-500/50 text-white h-12 rounded-xl shadow-none"
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
                                className="bg-[#22252e] border-gray-800/60 focus:bg-[#2a2d38] focus:border-red-500/50 text-white h-12 rounded-xl shadow-none"
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
                                className={cn("bg-[#22252e] border-gray-800/60 focus:bg-[#2a2d38] focus:border-red-500/50 text-white h-12 rounded-xl shadow-none placeholder:text-gray-600",
                                    passwordError && 'border-red-500/50 focus:border-red-500'
                                )}
                            />
                            {passwordError && (
                                <p className="text-xs font-bold text-red-500 mt-1">{passwordError}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Rol Global *</Label>
                                <select
                                    id="roleId"
                                    name="roleId"
                                    defaultValue={typeof selectedUser?.role === 'object' ? selectedUser.role.id : undefined}
                                    required
                                    className="flex w-full bg-[#22252e] border border-gray-800/60 focus:bg-[#2a2d38] focus:border-red-500/50 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 h-12 rounded-xl transition-colors"
                                >
                                    <option value="" className="bg-[#22252e] text-gray-400">Seleccionar rol</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id} className="bg-[#22252e] text-white py-2">
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
                                    className="flex w-full bg-[#22252e] border border-gray-800/60 focus:bg-[#2a2d38] focus:border-red-500/50 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 h-12 rounded-xl transition-colors"
                                >
                                    <option value="" className="bg-[#22252e] text-gray-400">Sin ubicación / Global</option>
                                    {UBICACIONES.map((ub) => (
                                        <option key={ub} value={ub} className="bg-[#22252e] text-white">
                                            {ub}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6 pt-6 border-t border-gray-800/60 sticky bottom-0">
                            <button
                                type="button"
                                onClick={requestClose}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={createUser.isPending || updateUser.isPending || !!passwordError}
                                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-900/20 transition-all disabled:opacity-70 disabled:shadow-none"
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
