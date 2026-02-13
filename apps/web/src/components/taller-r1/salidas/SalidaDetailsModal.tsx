'use client';

import { useState, useEffect } from 'react';
import {
    X,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Truck,
    Box,
    FileText,
    Calendar,
    User,
    ExternalLink,
    Edit2,
    Save
} from 'lucide-react';
import { toast } from 'sonner';
import { salidasApi, Salida } from '@/services/taller-r1/salidas.service';
import { cn } from '@/lib/utils';

interface SalidaDetailsModalProps {
    id: string | null;
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function SalidaDetailsModal({ id, isOpen, onClose, onRefresh }: SalidaDetailsModalProps) {
    const [salida, setSalida] = useState<Salida | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditingRemision, setIsEditingRemision] = useState(false);
    const [newRemision, setNewRemision] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (id && isOpen) {
            loadSalida();
        }
    }, [id, isOpen]);

    const loadSalida = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await salidasApi.getById(id);
            setSalida(data);
            setNewRemision(data.remision || '');
        } catch (error) {
            toast.error('Error al cargar detalles de la salida');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRemision = async () => {
        if (!id || !newRemision) {
            toast.error('Ingresa un número de remisión');
            return;
        }

        setActionLoading(true);
        try {
            await salidasApi.updateRemision(id, newRemision);
            toast.success('Remisión actualizada y estado cambiado a Por Entregar');
            setIsEditingRemision(false);
            loadSalida();
            onRefresh();
        } catch (error) {
            toast.error('Error al actualizar remisión');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCerrarFolio = async () => {
        if (!id) return;
        if (!confirm('¿Estás seguro de cerrar este folio? Se marcarán todos los equipos y accesorios como RETIRADOS.')) return;

        setActionLoading(true);
        try {
            await salidasApi.cerrarFolio(id);
            toast.success('Folio cerrado correctamente');
            loadSalida();
            onRefresh();
        } catch (error) {
            toast.error('Error al cerrar folio');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        if (!confirm('¿Estás seguro de eliminar esta salida? Esta acción no se puede deshacer.')) return;

        setActionLoading(true);
        try {
            await salidasApi.delete(id);
            toast.success('Salida eliminada correctamente');
            onRefresh();
            onClose();
        } catch (error) {
            toast.error('Error al eliminar salida');
        } finally {
            setActionLoading(false);
        }
    };

    const getImageUrl = (path: string) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const REMOTE_SERVER = '143.198.60.56';
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `http://${REMOTE_SERVER}/${cleanPath}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20">

                {/* Loading Overlay */}
                {(loading || actionLoading) && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-900 font-black text-xs uppercase tracking-widest">
                                {loading ? 'Cargando detalles...' : 'Procesando...'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                                Folio <span className="text-slate-400">#{salida?.folio || '...'}</span>
                            </h2>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                salida?.estado === 'Entregado' && "bg-green-50 text-green-700 border-green-100",
                                salida?.estado === 'En espera de remisión' && "bg-red-50 text-red-700 border-red-100",
                                salida?.estado === 'Por Entregar' && "bg-orange-50 text-orange-700 border-orange-100"
                            )}>
                                {salida?.estado}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {salida?.fecha_creacion ? new Date(salida.fecha_creacion).toLocaleDateString() : '---'}
                            </div>
                            <span className="text-slate-200">|</span>
                            <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                {salida?.cliente || 'Sin Cliente'}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white grid grid-cols-12 gap-8">

                    {/* Left Column: Details */}
                    <div className="col-span-8 space-y-8">

                        {/* Remision / OC Section */}
                        <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-red-500" />
                                    Información de Remisión / OC
                                </h3>
                                {salida?.estado === 'En espera de remisión' && !isEditingRemision && (
                                    <button
                                        onClick={() => setIsEditingRemision(true)}
                                        className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 px-2 py-1 rounded-lg transition-all"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                        Editar
                                    </button>
                                )}
                            </div>

                            {isEditingRemision ? (
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nuevo Número de Remisión</label>
                                        <input
                                            type="text"
                                            value={newRemision}
                                            onChange={(e) => setNewRemision(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-bold"
                                            placeholder="Ej: R-12345"
                                        />
                                    </div>
                                    <button
                                        onClick={handleUpdateRemision}
                                        className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20"
                                    >
                                        <Save className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setIsEditingRemision(false)}
                                        className="p-3 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Remisión / OC</p>
                                        <p className="font-black text-slate-900 tracking-tight">{salida?.remision || 'PENDIENTE'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pedido de Venta</p>
                                        <p className="font-black text-slate-900 tracking-tight">{salida?.pedido || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Transporte</p>
                                        <p className="font-black text-slate-900 tracking-tight">{salida?.numero_transporte || 'N/A'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Items Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                                <Box className="w-4 h-4 text-red-500" />
                                Elementos en esta Salida ({salida?.detalles?.length || 0 + (salida?.accesorios?.length || 0)})
                            </h3>

                            <div className="grid grid-cols-1 gap-3">
                                {/* Equipos */}
                                {salida?.detalles?.filter(d => d.id_equipo).map((item, idx) => (
                                    <div key={`eq-${idx}`} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-red-500">
                                                <Box className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 tracking-tight leading-none mb-1">{item.serial_equipos || 'Sin Serial'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {item.tipo_salida} • {item.id_ubicacion} {item.id_sub_ubicacion}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black rounded uppercase tracking-wider">EQUIPO</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Accesorios */}
                                {salida?.accesorios?.map((item, idx) => (
                                    <div key={`acc-${idx}`} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-500">
                                                <Box className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 tracking-tight leading-none mb-1">{item.serial || 'Sin Serial'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {item.modelo} • {item.voltaje}V
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded uppercase tracking-wider">ACCESORIO</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="col-span-4 space-y-6">

                        {/* Evidence Section */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Evidencia</h3>
                            <div className="aspect-square w-full bg-slate-100 rounded-[24px] overflow-hidden border border-slate-200">
                                {salida?.evidencia ? (
                                    <img
                                        src={getImageUrl(salida.evidencia)!}
                                        className="w-full h-full object-cover"
                                        alt="Evidencia"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                        <FileText className="w-12 h-12 mb-2" />
                                        <span className="font-bold text-xs">Sin evidencia</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Observations Section */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Observaciones</h3>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[100px]">
                                <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">
                                    {salida?.observaciones || 'Sin observaciones registradas.'}
                                </p>
                            </div>
                        </div>

                        {/* Actions Section */}
                        <div className="pt-6 border-t border-slate-100 space-y-3">

                            {salida?.estado === 'Por Entregar' && (
                                <button
                                    onClick={handleCerrarFolio}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-500/20 font-black text-xs uppercase tracking-widest"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Cerrar Folio (Entregar)
                                </button>
                            )}

                            {salida?.estado !== 'Entregado' && (
                                <button
                                    onClick={handleDelete}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-red-600 border border-red-100 rounded-2xl hover:bg-red-50 transition-all font-black text-xs uppercase tracking-widest"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Eliminar Salida
                                </button>
                            )}

                            <div className="p-4 bg-slate-900 rounded-2xl text-white">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Estatus del Proceso</p>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        salida?.estado === 'Entregado' ? "bg-green-500" : "bg-red-500 animate-pulse"
                                    )} />
                                    <span className="font-bold text-[10px] tracking-tight">
                                        {salida?.estado === 'Entregado' ? 'OPERACIÓN COMPLETADA' : 'OPERACIÓN EN CURSO'}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    );
}
