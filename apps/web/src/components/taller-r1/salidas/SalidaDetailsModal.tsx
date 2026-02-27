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

const OBLIGATORY_PHOTOS = [
    { key: 'foto_llave', label: 'Llave' },
    { key: 'foto_kit_tapon', label: 'Kit Tapón' },
    { key: 'foto_compartimento_baterias', label: 'Compartimento Baterías' },
    { key: 'foto_compartimento_operador', label: 'Compartimento Operador' },
    { key: 'foto_pernos_horquillas', label: 'Pernos Horquillas' },
    { key: 'foto_frente_equipo', label: 'Frente del Equipo' },
    { key: 'foto_posterior_equipo', label: 'Posterior equipo' },
];

const OPTIONAL_PHOTOS = [
    { key: 'foto_lineas_vida', label: 'Líneas de vida' },
    { key: 'foto_clamp_opc', label: 'Clamp OPC' },
    { key: 'foto_kit_aceite', label: 'Kit de aceite' },
];

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
    const [checklistModalFor, setChecklistModalFor] = useState<string | null>(null);
    const [itemToRemove, setItemToRemove] = useState<{ id: string, type: 'equipo' | 'accesorio' } | null>(null);
    const [confirmingAction, setConfirmingAction] = useState<'delete_salida' | 'cerrar_folio' | null>(null);

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

        setActionLoading(true);
        try {
            await salidasApi.cerrarFolio(id);
            toast.success('Folio cerrado correctamente');
            loadSalida();
            onRefresh();
            setConfirmingAction(null);
        } catch (error) {
            toast.error('Error al cerrar folio');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;

        setActionLoading(true);
        try {
            await salidasApi.delete(id);
            toast.success('Salida eliminada correctamente');
            onRefresh();
            setConfirmingAction(null);
            onClose();
        } catch (error) {
            toast.error('Error al eliminar salida');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveItem = async () => {
        if (!id || !itemToRemove) return;
        const { id: itemId, type } = itemToRemove;

        setActionLoading(true);
        try {
            if (type === 'equipo') {
                await salidasApi.removeDetalle(id, itemId);
            } else {
                await salidasApi.removeAccesorio(id, itemId);
            }
            toast.success(`${type === 'equipo' ? 'Equipo' : 'Accesorio'} eliminado de la salida`);
            await loadSalida();
            onRefresh();
        } catch (error) {
            toast.error(`Error al quitar el ${type}`);
            console.error(error);
        } finally {
            setActionLoading(false);
            setItemToRemove(null);
        }
    };

    const getImageUrl = (path: string) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('data:')) return path;
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
                                {salida?.razon_social || salida?.cliente || 'Sin Cliente'}
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
                                Elementos en esta Salida ({(salida?.detalles?.length || 0) + (salida?.accesorios?.length || 0)})
                            </h3>

                            <div className="grid grid-cols-1 gap-3">
                                {/* Equipos */}
                                {salida?.detalles?.filter(d => d.serial_equipos || d.id_equipo || d.cantidad_salida > 0).map((item, idx) => (
                                    <div key={`eq-${idx}`} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-red-500">
                                                <Box className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 tracking-tight leading-none mb-1">{item.serial_equipos || 'Sin Serial'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {item.tipo_salida} • {(item as any).nombre_ubicacion || item.id_ubicacion} {(item as any).nombre_sub_ubicacion || item.id_sub_ubicacion}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black rounded uppercase tracking-wider">EQUIPO</span>
                                            <div className="flex gap-2">
                                                {(item.foto_llave || item.foto_kit_tapon || item.foto_compartimento_baterias) && (
                                                    <button
                                                        onClick={() => setChecklistModalFor(item.id_detalle)}
                                                        className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                                                    >
                                                        Ver Checklist
                                                    </button>
                                                )}
                                                {salida?.estado !== 'Entregado' && (
                                                    <button
                                                        onClick={() => setItemToRemove({ id: item.id_detalle, type: 'equipo' })}
                                                        className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Quitar equipo de la salida"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
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
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded uppercase tracking-wider">ACCESORIO</span>
                                            {salida?.estado !== 'Entregado' && (
                                                <button
                                                    onClick={() => setItemToRemove({ id: item.id_accesorio, type: 'accesorio' })}
                                                    className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Quitar accesorio de la salida"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
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
                                    onClick={() => setConfirmingAction('cerrar_folio')}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-500/20 font-black text-xs uppercase tracking-widest"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Cerrar Folio (Entregar)
                                </button>
                            )}

                            {salida?.estado !== 'Entregado' && (
                                <button
                                    onClick={() => setConfirmingAction('delete_salida')}
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

            {/* NESTED MODAL FOR CHECKLIST VIEWER */}
            {checklistModalFor && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                    Checklist Fotográfico
                                </h4>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1 ml-4">
                                    Registro fotográfico de salida del equipo
                                </p>
                            </div>
                            <button onClick={() => setChecklistModalFor(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50/30">
                            {/* OBLIGATORY PHOTOS */}
                            <div>
                                <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Fotografías Obligatorias
                                </h5>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {OBLIGATORY_PHOTOS.map(photo => {
                                        const item = salida?.detalles?.find(i => i.id_detalle === checklistModalFor);
                                        const photoData = item?.[photo.key];
                                        return (
                                            <div key={photo.key} className="flex flex-col gap-2">
                                                <div className={cn(
                                                    "relative flex flex-col items-center justify-center w-full aspect-square border border-slate-200 rounded-2xl overflow-hidden shadow-sm group",
                                                    !photoData && "bg-slate-50 opacity-50"
                                                )}>
                                                    {photoData ? (
                                                        <>
                                                            <img src={getImageUrl(photoData)!} alt={photo.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                            <a href={getImageUrl(photoData)!} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                                                                <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <div className="text-slate-300 flex flex-col items-center">
                                                            <X className="w-6 h-6 mb-1" />
                                                            <span className="text-[8px] font-bold uppercase">Sin Foto</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-600 text-center uppercase leading-tight tracking-wider">{photo.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* OPTIONAL PHOTOS */}
                            <div>
                                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Box className="w-4 h-4 text-slate-400" />
                                    Fotografías Opcionales
                                </h5>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {OPTIONAL_PHOTOS.map(photo => {
                                        const item = salida?.detalles?.find(i => i.id_detalle === checklistModalFor);
                                        const photoData = item?.[photo.key];
                                        if (!photoData) return null; // Only render provided optional photos

                                        return (
                                            <div key={photo.key} className="flex flex-col gap-2">
                                                <div className="relative flex flex-col items-center justify-center w-full aspect-square border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
                                                    <img src={getImageUrl(photoData)!} alt={photo.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    <a href={getImageUrl(photoData)!} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                                                        <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 text-center uppercase leading-tight tracking-wider">{photo.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Item Confirmation Modal */}
            {itemToRemove && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-4">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 mb-2">
                                Quitar {itemToRemove.type === 'equipo' ? 'Equipo' : 'Accesorio'}
                            </h4>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                ¿Estás seguro de que deseas quitar este {itemToRemove.type} de la salida?
                                Esta acción lo desvinculará de la salida actual.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setItemToRemove(null)}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2.5 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors uppercase tracking-wider text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRemoveItem}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all uppercase tracking-wider text-xs shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                            >
                                {actionLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>Quitar Elemento</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* General Action Confirmation Modal (Delete / Close) */}
            {confirmingAction && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-6">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
                                confirmingAction === 'delete_salida' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                            )}>
                                {confirmingAction === 'delete_salida' ? <Trash2 className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                            </div>
                            <h4 className="text-xl font-black text-slate-900 mb-2">
                                {confirmingAction === 'delete_salida' ? 'Eliminar Salida' : 'Completar Salida'}
                            </h4>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                {confirmingAction === 'delete_salida'
                                    ? '¿Estás seguro de eliminar esta salida? Esta acción borrará el registro y no se puede deshacer.'
                                    : '¿Estás seguro de cerrar este folio? Todos los equipos y accesorios asociados cambiarán su estado a RETIRADOS y la salida no podrá modificarse.'}
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setConfirmingAction(null)}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2.5 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors uppercase tracking-wider text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmingAction === 'delete_salida' ? handleDelete : handleCerrarFolio}
                                disabled={actionLoading}
                                className={cn(
                                    "flex-1 px-4 py-2.5 text-white font-black rounded-xl transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2",
                                    confirmingAction === 'delete_salida'
                                        ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200'
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                                )}
                            >
                                {actionLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>{confirmingAction === 'delete_salida' ? 'Eliminar' : 'Confirmar'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
