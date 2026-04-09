'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, User, Search, MapPin, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { auditoriaApi } from '@/services/taller-r1/auditoria.service';
import { ubicacionesApi } from '@/services/taller-r1/ubicaciones.service';
import { useAuthTallerStore } from '@/store/auth-taller.store';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { es } from 'date-fns/locale';

interface NuevaAuditoriaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (id_auditoria: string) => void;
}

export default function NuevaAuditoriaModal({ isOpen, onClose, onSuccess }: NuevaAuditoriaModalProps) {
    const selectedSite = useAuthTallerStore(state => state.selectedSite);
    const user = useAuthTallerStore(state => state.user);
    const [loading, setLoading] = useState(false);
    const [ubicaciones, setUbicaciones] = useState<any[]>([]);
    
    const [comentarios, setComentarios] = useState('');
    const [idUbicacion, setIdUbicacion] = useState('');

    // Extraer de forma segura el nombre del usuario
    const userName = user?.username || (user as any)?.nombre || 'Auditor';

    useEffect(() => {
        if (isOpen && selectedSite) {
            loadUbicaciones();
            setComentarios('');
            setIdUbicacion('');
        }
    }, [isOpen, selectedSite]);

    const loadUbicaciones = async () => {
        try {
            const data = await ubicacionesApi.getAll(selectedSite || undefined);
            setUbicaciones(data || []);
        } catch (error) {
            console.error('Error loading ubicaciones:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSite || !user) return;

        setLoading(true);
        try {
            const res = await auditoriaApi.create(selectedSite as string, {
                fecha_auditoria: new Date(),
                usuario_auditor: userName,
                comentarios: comentarios,
                id_ubicacion: idUbicacion || undefined
            });
            
            toast.success('Auditoría iniciada correctamente');
            onSuccess(res.id_auditoria);
        } catch (error: any) {
            console.error('Error creating auditoria:', error);
            toast.error(error?.response?.data?.message || 'Error al iniciar la auditoría');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                                Nuevo
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Iniciar Auditoría
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1 flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-red-500" />
                                    Fecha
                                </label>
                                <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-500 opacity-80 uppercase tracking-widest text-xs">
                                    {format(new Date(), 'dd/MMM/yyyy', { locale: es })}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1 flex items-center gap-1.5">
                                    <User className="w-3 h-3 text-red-500" />
                                    Auditor
                                </label>
                                <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-500 opacity-80 uppercase tracking-widest text-xs truncate">
                                    {userName}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                Ubicación a Auditar (Opcional)
                            </label>
                            <select
                                value={idUbicacion}
                                onChange={(e) => setIdUbicacion(e.target.value)}
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-sm text-slate-900 appearance-none shadow-sm"
                            >
                                <option value="">Toda la nave ({selectedSite?.toUpperCase()})</option>
                                {ubicaciones.map((ubi) => (
                                    <option key={ubi.id_ubicacion} value={ubi.id_ubicacion}>
                                        {ubi.nombre_ubicacion}
                                    </option>
                                ))}
                            </select>
                            <p className="px-2 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Si seleccionas una ubicación, el reporte te mostrará qué faltó escanear de esta zona.
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1 flex items-center gap-1.5">
                                <Search className="w-3 h-3 text-slate-500" />
                                Comentarios Adicionales
                            </label>
                            <textarea
                                value={comentarios}
                                onChange={(e) => setComentarios(e.target.value)}
                                rows={3}
                                placeholder="Ej. Revisión trimestral, inventario de fin de año..."
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900 resize-none shadow-sm text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/20 active:scale-[0.98] transition-all font-black uppercase text-xs tracking-[0.2em] disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Crear e Iniciar Escáner
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
