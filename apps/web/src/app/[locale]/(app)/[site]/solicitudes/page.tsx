'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { UserCheck, ShieldCheck, Mail, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Loader from '@/components/ui/loader'
import { 
    usePendingTallerUsuarios,
    useApproveTallerUsuario,
    useRejectTallerUsuario,
    type TallerUsuario 
} from '@/hooks/taller-r1/useTallerUsuarios'
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const ALLOWED_TALLER_ROLES = [
    'Administrador',
    'Almacenista',
    'Supervisor comercial',
    'Comercial',
    'Visitante'
]

const SITES = [
    { id: 'R1', name: 'Taller R1' },
    { id: 'R2', name: 'Naves R2' },
    { id: 'R3', name: 'Frontera R3' }
]

export default function SolicitudesPage() {
    const params = useParams()
    const { data: pendingUsuarios = [], isLoading: isLoadingPending } = usePendingTallerUsuarios()
    const approveUsuario = useApproveTallerUsuario()
    const rejectUsuario = useRejectTallerUsuario()

    const [selectedUsuario, setSelectedUsuario] = useState<TallerUsuario | null>(null)
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
    const [selectedRole, setSelectedRole] = useState('Visitante')
    const [selectedSites, setSelectedSites] = useState<string[]>(['R1'])
    
    // Rejection State
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
    const [usuarioToReject, setUsuarioToReject] = useState<TallerUsuario | null>(null)


    const handleApproveClick = (usuario: TallerUsuario) => {
        setSelectedUsuario(usuario)
        setSelectedRole('Visitante')
        setSelectedSites(['R1'])
        setIsApproveDialogOpen(true)
    }

    const toggleSite = (siteId: string) => {
        setSelectedSites(prev => 
            prev.includes(siteId) 
                ? (prev.length > 1 ? prev.filter(s => s !== siteId) : prev) 
                : [...prev, siteId]
        )
    }

    const onApprove = async () => {
        if (!selectedUsuario) return
        try {
            await approveUsuario.mutateAsync({
                id: selectedUsuario.IDUsuarios,
                data: {
                    Rol: selectedRole,
                    sitio: selectedSites.join(',')
                }
            })
            setIsApproveDialogOpen(false)
        } catch (error) {
            // Error handled by mutation
        }
    }

    const onReject = (usuario: TallerUsuario) => {
        setUsuarioToReject(usuario)
        setIsRejectDialogOpen(true)
    }

    const handleConfirmReject = async () => {
        if (!usuarioToReject) return
        try {
            await rejectUsuario.mutateAsync(usuarioToReject.IDUsuarios)
            setIsRejectDialogOpen(false)
            setUsuarioToReject(null)
            toast.success('Solicitud rechazada correctamente')
        } catch (error) {
            // Error handled by mutation
        }
    }

    if (isLoadingPending) {
        return (
            <div className="p-12 h-[60vh] flex items-center justify-center">
                <Loader size="lg" text="Cargando solicitudes..." />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase italic">
                        Solicitudes <span className="text-red-600">de Acceso</span>
                    </h1>
                    <p className="text-gray-500 font-medium tracking-wide">
                        Gestiona las solicitudes de nuevos usuarios para R1, R2 y R3
                    </p>
                </div>
            </div>

            {/* List */}
            {pendingUsuarios.length === 0 ? (
                <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-12 h-12 text-gray-200" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-300 uppercase tracking-widest italic">Sin Solicitudes</h3>
                    <p className="text-gray-400 text-sm mt-2 font-medium">Todas las solicitudes han sido procesadas correctamente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {pendingUsuarios.map((usuario) => (
                        <Card key={usuario.IDUsuarios} className="group bg-white rounded-[2.5rem] p-8 border-2 border-transparent hover:border-red-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl transition-all relative overflow-hidden backdrop-blur-sm h-full flex flex-col">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-600 border border-red-100 group-hover:rotate-6 transition-transform shadow-sm">
                                    <UserCheck className="w-10 h-10" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-2xl font-black text-gray-900 truncate leading-none mb-2">{usuario.Usuario}</h3>
                                    <Badge className="bg-amber-100 text-amber-700 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">Pendiente</Badge>
                                </div>
                            </div>

                            <div className="space-y-5 mb-10 flex-1">
                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center group-hover/item:bg-red-50 transition-colors">
                                        <Mail className="w-5 h-5 text-gray-400 group-hover/item:text-red-500" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Correo electrónico</span>
                                        <span className="text-gray-700 font-bold text-sm truncate">{usuario.Correo}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-auto">
                                <Button 
                                    onClick={() => handleApproveClick(usuario)}
                                    className="h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2 group/btn"
                                >
                                    <CheckCircle2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                    Aprobar
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={() => onReject(usuario)}
                                    className="h-14 border-2 border-red-100 text-red-600 hover:bg-red-50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn"
                                >
                                    <XCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                    Rechazar
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Approval Dialog */}
            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[3rem]">
                    <div className="p-10 space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center text-green-600 border border-green-100 rotate-3">
                                <ShieldCheck className="w-10 h-10" />
                            </div>
                            <div>
                                <DialogHeader>
                                    <DialogTitle className="text-3xl font-black text-gray-900 tracking-tight uppercase italic leading-none mb-2">
                                        Aprobar <span className="text-green-600">Acceso</span>
                                    </DialogTitle>
                                    <p className="text-gray-500 font-semibold text-sm">Configura los permisos para {selectedUsuario?.Usuario}</p>
                                </DialogHeader>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3 px-1">
                                <Label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Sitio(s) Asignado(s)</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    {SITES.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => toggleSite(s.id)}
                                            className={`py-4 rounded-2xl font-black text-xs uppercase transition-all ${
                                                selectedSites.includes(s.id)
                                                ? 'bg-red-600 text-white shadow-lg shadow-red-100 scale-105' 
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                            }`}
                                        >
                                            {s.id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 px-1">
                                <Label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Rol de Usuario</Label>
                                <select 
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full px-6 h-16 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-3xl text-gray-900 font-bold outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {ALLOWED_TALLER_ROLES.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsApproveDialogOpen(false)}
                                className="flex-1 h-16 border-2 border-gray-100 text-gray-400 hover:bg-gray-50 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={onApprove}
                                disabled={approveUsuario.isPending}
                                className="flex-1 h-16 bg-green-600 hover:bg-green-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100 transition-all active:scale-95"
                            >
                                {approveUsuario.isPending ? 'Procesando...' : 'Confirmar Acceso'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Rejection Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[3rem]">
                    <div className="p-10 space-y-8">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-600 border-4 border-white shadow-xl animate-bounce duration-[2000ms]">
                                <AlertCircle className="w-12 h-12" />
                            </div>
                            
                            <div className="space-y-2">
                                <DialogHeader>
                                    <DialogTitle className="text-3xl font-black text-gray-900 tracking-tight uppercase italic leading-none text-center">
                                        ¿Confirmar <span className="text-red-600">Rechazo</span>?
                                    </DialogTitle>
                                </DialogHeader>
                                <p className="text-gray-500 font-semibold text-sm px-4">
                                    Estás a punto de rechazar la solicitud de <span className="text-red-600 font-bold">{usuarioToReject?.Usuario}</span>. Esta acción no se puede deshacer y el usuario no podrá acceder al sistema.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleConfirmReject}
                                disabled={rejectUsuario.isPending}
                                className="h-16 bg-red-600 hover:bg-red-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                {rejectUsuario.isPending ? (
                                    'Procesando...'
                                ) : (
                                    <>
                                        <XCircle className="w-5 h-5" />
                                        Si, Rechazar Acceso
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setIsRejectDialogOpen(false)}
                                className="h-14 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-[1.5rem] font-bold text-xs uppercase tracking-widest transition-all"
                            >
                                No, Mantener Pendiente
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
