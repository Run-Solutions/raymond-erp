'use client';

import { useState, useEffect } from 'react';
import renovadosService, { RenovadoSolicitud, RenovadoFase, RenovadoIncidencia } from '@/services/taller-r1/renovados.service';
import { toast } from 'sonner';
import {
    X, Clock, CheckCircle2, AlertCircle, Wrench, Play, Pause,
    Plus, Trash2, QrCode, User, Package, Calendar, Settings,
    AlertTriangle, Hammer, Paintbrush, Zap, ArrowRight, Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Scanner } from '@yudiel/react-qr-scanner';

interface Props {
    idSolicitud: string | null;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const DetalleRenovadoModal = ({ idSolicitud, open, onClose, onSuccess }: Props) => {
    const [solicitud, setSolicitud] = useState<RenovadoSolicitud | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fases' | 'refacciones' | 'incidencias'>('fases');
    const [showScanner, setShowScanner] = useState(false);
    const [scanningFaseId, setScanningFaseId] = useState<string | null>(null);

    // States for new items
    const [newRefaccion, setNewRefaccion] = useState({ area: '', descripcion: '', cantidad: 1 });
    const [newIncidencia, setNewIncidencia] = useState({ tipo: 'En espera de refacciones', comentarios: '' });

    useEffect(() => {
        if (open && idSolicitud) {
            loadDetalle();
        }
    }, [open, idSolicitud]);

    const loadDetalle = async () => {
        try {
            setLoading(true);
            const data = await renovadosService.findOne(idSolicitud!);
            setSolicitud(data);
        } catch (error) {
            toast.error('Error al cargar el detalle del renovado');
        } finally {
            setLoading(false);
        }
    };

    const handleStartFase = async (faseId: string, tecnico: string) => {
        try {
            await renovadosService.startFase(faseId, tecnico);
            toast.success('Fase iniciada correctamente');
            loadDetalle();
            setShowScanner(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al iniciar la fase');
        }
    };

    const handleCompleteFase = async (faseId: string) => {
        try {
            await renovadosService.completeFase(faseId);
            toast.success('Fase completada');
            loadDetalle();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al completar la fase');
        }
    };

    const handleAddRefaccion = async () => {
        if (!newRefaccion.area || !newRefaccion.descripcion) return;
        try {
            await renovadosService.addRefaccion(idSolicitud!, newRefaccion);
            toast.success('Refacción agregada');
            setNewRefaccion({ area: '', descripcion: '', cantidad: 1 });
            loadDetalle();
        } catch (error) {
            toast.error('Error al agregar refacción');
        }
    };

    const handleCreateIncidencia = async () => {
        try {
            await renovadosService.createIncidencia(idSolicitud!, newIncidencia);
            toast.success('Incidencia registrada');
            setNewIncidencia({ tipo: 'En espera de refacciones', comentarios: '' });
            loadDetalle();
        } catch (error) {
            toast.error('Error al registrar incidencia');
        }
    };

    const handleCloseIncidencia = async (id: string) => {
        try {
            await renovadosService.closeIncidencia(id);
            toast.success('Incidencia cerrada');
            loadDetalle();
        } catch (error) {
            toast.error('Error al cerrar incidencia');
        }
    };

    const handleFinalize = async () => {
        if (!solicitud?.fases?.every(f => f.completado)) {
            toast.warning('Aún hay fases pendientes por completar');
            return;
        }
        try {
            await renovadosService.finalize(idSolicitud!);
            toast.success('Proceso de renovado finalizado correctamente');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Error al finalizar el proceso');
        }
    };

    if (!open) return null;

    const getProfundidad = (meses: string) => {
        switch (meses) {
            case '1-3': return 'Básica';
            case '4-6': return 'Intermedia';
            case '6-12': return 'Profunda';
            case '12+': return 'Total';
            default: return 'N/A';
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full flex flex-col h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 rounded-t-[2.5rem]">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-red-600 shadow-sm border border-slate-100">
                            <Settings className="w-8 h-8 animate-spin-slow" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Orden de Renovado</span>
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">{solicitud?.estado}</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{solicitud?.serial_equipo}</h2>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                    <User className="w-3.5 h-3.5" />
                                    {solicitud?.tecnico_responsable || 'Sin asignar'}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                                    Profundidad: {getProfundidad(solicitud?.meses_fuera || '')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-red-500 shadow-sm border border-transparent hover:border-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="px-8 pt-4 flex gap-4 border-b border-slate-50">
                    {[
                        { id: 'fases', label: 'Evolución de Fases', icon: Zap },
                        { id: 'refacciones', label: 'Lista de Refacciones', icon: Wrench },
                        { id: 'incidencias', label: 'Incidencias (Paros)', icon: AlertTriangle },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "pb-4 px-4 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all relative",
                                activeTab === tab.id ? "text-red-600" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 rounded-t-full" />}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'fases' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {solicitud?.fases?.map((fase, idx) => (
                                        <div
                                            key={fase.id_fase}
                                            className={cn(
                                                "p-6 rounded-[2rem] border transition-all relative overflow-hidden group",
                                                fase.completado
                                                    ? "bg-emerald-50/30 border-emerald-100"
                                                    : fase.fecha_inicio
                                                        ? "bg-amber-50/50 border-amber-200 shadow-md ring-2 ring-amber-200 ring-offset-2"
                                                        : "bg-white border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Fase {idx + 1}</span>
                                                {fase.completado ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                ) : fase.fecha_inicio ? (
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[8px] font-black uppercase animate-pulse">
                                                        <Clock className="w-3 h-3" />
                                                        En Proceso
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 border-2 border-slate-100 rounded-full" />
                                                )}
                                            </div>
                                            <h4 className="font-black text-slate-800 mb-2">{fase.nombre_fase}</h4>

                                            {fase.fecha_inicio && (
                                                <div className="space-y-1 mb-4">
                                                    <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                        <User className="w-3 h-3" /> {fase.tecnico}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> {format(new Date(fase.fecha_inicio), 'dd/MM HH:mm')}
                                                    </p>
                                                </div>
                                            )}

                                            {!fase.completado && (
                                                <div className="pt-2 border-t border-slate-100/50">
                                                    {fase.fecha_inicio ? (
                                                        <button
                                                            onClick={() => handleCompleteFase(fase.id_fase)}
                                                            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
                                                        >
                                                            Finalizar Fase <CheckCircle2 className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setScanningFaseId(fase.id_fase); setShowScanner(true); }}
                                                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all group/btn"
                                                        >
                                                            Scanner Estación <QrCode className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {fase.completado && (
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase text-emerald-600 pt-2 opacity-60">
                                                    <span>Horas: {fase.horas_registradas}h</span>
                                                    <span>Completado</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'refacciones' && (
                                <div className="space-y-8">
                                    {/* Formulario */}
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Área</label>
                                            <select
                                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-red-500"
                                                value={newRefaccion.area}
                                                onChange={(e) => setNewRefaccion({ ...newRefaccion, area: e.target.value })}
                                            >
                                                <option value="">Seleccionar área...</option>
                                                <option value="Motores">Motores</option>
                                                <option value="Electrónica">Electrónica</option>
                                                <option value="Hidráulica">Hidráulica</option>
                                                <option value="Pintura">Pintura</option>
                                                <option value="Estructural">Estructural</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Refacción</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-red-500"
                                                placeholder="Ej: Kit de carbones motor tracción"
                                                value={newRefaccion.descripcion}
                                                onChange={(e) => setNewRefaccion({ ...newRefaccion, descripcion: e.target.value })}
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddRefaccion}
                                            className="py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 flex items-center justify-center gap-2 hover:bg-red-700 transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> Agregar
                                        </button>
                                    </div>

                                    {/* Tabla */}
                                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
                                        <table className="w-full border-collapse">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Área</th>
                                                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Refacción</th>
                                                    <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Cant.</th>
                                                    <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {solicitud?.refacciones?.map(r => (
                                                    <tr key={r.id_refaccion} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-black text-xs text-slate-900 uppercase">{r.area}</td>
                                                        <td className="px-6 py-4 font-bold text-xs text-slate-600">{r.descripcion}</td>
                                                        <td className="px-6 py-4 text-center font-black text-xs text-slate-900">{r.cantidad}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase">{r.status}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(solicitud?.refacciones?.length || 0) === 0 && (
                                                    <tr><td colSpan={4} className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] italic">No hay refacciones solicitadas</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'incidencias' && (
                                <div className="space-y-8">
                                    {/* Formulario Incidencia */}
                                    <div className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">Tipo de Paro</label>
                                            <select
                                                className="w-full px-4 py-3 bg-white border border-red-100 rounded-xl font-bold text-sm outline-none focus:border-red-500"
                                                value={newIncidencia.tipo}
                                                onChange={(e) => setNewIncidencia({ ...newIncidencia, tipo: e.target.value })}
                                            >
                                                <option value="En espera de refacciones">En espera de refacciones</option>
                                                <option value="Soporte técnico">Soporte técnico</option>
                                                <option value="Correctivo mayor">Correctivo mayor</option>
                                                <option value="Correctivo externo">Correctivo externo</option>
                                                <option value="Actividades logísticas">Actividades logísticas</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">Descripción del problema</label>
                                            <textarea
                                                className="w-full px-4 py-3 bg-white border border-red-100 rounded-xl font-bold text-sm outline-none focus:border-red-500 custom-scrollbar h-[60px]"
                                                placeholder="Describa el motivo del retraso..."
                                                value={newIncidencia.comentarios}
                                                onChange={(e) => setNewIncidencia({ ...newIncidencia, comentarios: e.target.value })}
                                            />
                                        </div>
                                        <button
                                            onClick={handleCreateIncidencia}
                                            className="mt-6 py-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 flex items-center justify-center gap-2 hover:bg-red-700 transition-all"
                                        >
                                            <AlertTriangle className="w-4 h-4" /> Reportar Paro
                                        </button>
                                    </div>

                                    {/* Listado Incidencias */}
                                    <div className="space-y-4">
                                        {solicitud?.incidencias?.map(inc => (
                                            <div key={inc.id_incidencia} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm relative overflow-hidden group">
                                                <div className={cn("absolute top-0 left-0 w-1.5 h-full", inc.fecha_fin ? "bg-emerald-400" : "bg-red-500")} />
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", inc.fecha_fin ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500 animate-pulse")}>
                                                        {inc.fecha_fin ? <CheckCircle2 /> : <Pause />}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-black text-slate-800 text-sm">{inc.tipo}</h5>
                                                        <p className="text-xs font-bold text-slate-400">{inc.comentarios || 'Sin detalles'}</p>
                                                        <span className="text-[9px] font-black text-slate-300 uppercase mt-1 block">Iniciado: {format(new Date(inc.fecha_inicio), 'dd/MM HH:mm')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {inc.fecha_fin ? (
                                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">Horas paradas: {inc.horas_laborales}h</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCloseIncidencia(inc.id_incidencia)}
                                                            className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                                                        >
                                                            Finalizar Paro
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {(solicitud?.incidencias?.length || 0) === 0 && (
                                            <div className="text-center py-20 text-slate-200">
                                                <CheckCircle2 className="w-16 h-16 mx-auto mb-2 opacity-20" />
                                                <p className="font-black uppercase tracking-widest text-xs">Sin incidencias reportadas</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-[2.5rem]">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fases</p>
                            <p className="text-xs font-black text-slate-900">{solicitud?.fases?.filter(f => f.completado).length}/{solicitud?.fases?.length}</p>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Paros</p>
                            <p className="text-xs font-black text-slate-900">{solicitud?.incidencias?.filter(i => !i.fecha_fin).length} Activos</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleFinalize}
                            disabled={solicitud?.estado === 'Finalizado' || !solicitud?.fases?.every(f => f.completado)}
                            className="px-10 py-4 bg-slate-900 text-white rounded-[1.25rem] hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {solicitud?.estado === 'Finalizado' ? 'Orden Cerrada' : 'Cerrar Orden y Liberar Equipo'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* QR Scanner Overlay */}
                {showScanner && (
                    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                        <button
                            onClick={() => setShowScanner(false)}
                            className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <div className="text-center mb-8">
                            <h3 className="text-white text-3xl font-black tracking-tight mb-2">Escanear Estación</h3>
                            <p className="text-white/60 font-bold uppercase tracking-widest text-xs">Apunta el código QR de la estación para iniciar la fase</p>
                        </div>
                        <div className="w-full max-w-md aspect-square rounded-[3rem] overflow-hidden border-4 border-red-600 shadow-[0_0_50px_rgba(239,68,68,0.4)] relative">
                            <Scanner
                                onScan={(detectedCodes) => {
                                    if (detectedCodes.length > 0) {
                                        handleStartFase(scanningFaseId!, detectedCodes[0].rawValue);
                                    }
                                }}
                                allowMultiple={false}
                            />
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-600/50 animate-[scan_2s_infinite]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-150px); opacity: 0; }
          50% { transform: translateY(150px); opacity: 1; }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};
