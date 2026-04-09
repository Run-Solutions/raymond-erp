'use client';

import { useState, useEffect } from 'react';
import renovadosService, { RenovadoSolicitud, RenovadoFase, RenovadoIncidencia } from '@/services/taller-r1/renovados.service';
import { toast } from 'sonner';
import {
    X, Clock, CheckCircle2, AlertCircle, Wrench, Play, Pause,
    Plus, Trash2, QrCode, User, Package, Calendar, Settings,
    AlertTriangle, Hammer, Paintbrush, Zap, ArrowRight, Flame,
    UserCircle2, MessageSquare, Camera, History, ChevronRight
} from 'lucide-react';
import { useTallerUsuarios } from '@/hooks/taller-r1/useTallerUsuarios';
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
    const { data: usuarios = [] } = useTallerUsuarios();
    const [solicitud, setSolicitud] = useState<RenovadoSolicitud | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fases' | 'refacciones' | 'incidencias' | 'historial'>('fases');
    const [showScanner, setShowScanner] = useState(false);
    const [scanningFaseId, setScanningFaseId] = useState<string | null>(null);
    const [techLogs, setTechLogs] = useState<any[]>([]);

    // States for new items
    const [newRefaccion, setNewRefaccion] = useState({ area: '', descripcion: '', cantidad: 1 });
    const [newIncidencia, setNewIncidencia] = useState({ tipo: 'SIN INCIDENCIAS', comentarios: '' });
    const [showChangeTech, setShowChangeTech] = useState(false);
    const [newTechData, setNewTechData] = useState({ tecnicoNuevo: '', motivo: '' });
    
    // States for evidence
    const [evidenceData, setEvidenceData] = useState<{comentarios: string, fotos: string[]}>({ comentarios: '', fotos: [] });
    const [showNextPhaseSelector, setShowNextPhaseSelector] = useState<string | null>(null);

    useEffect(() => {
        if (open && idSolicitud) {
            loadDetalle();
        }
    }, [open, idSolicitud]);

    const loadDetalle = async () => {
        try {
            setLoading(true);
            const [data, logs] = await Promise.all([
                renovadosService.findOne(idSolicitud!),
                renovadosService.getTechnicianLogs(idSolicitud!)
            ]);
            setSolicitud(data);
            setTechLogs(logs);
        } catch (error) {
            toast.error('Error al cargar el detalle de la solicitud');
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

    const handleCompleteFase = async (faseId: string, nextPhase?: string) => {
        try {
            // Guardar evidencia si hay
            if (evidenceData.comentarios || evidenceData.fotos.length > 0) {
                await renovadosService.updateFaseEvidence(faseId, evidenceData);
            }
            
            await renovadosService.completeFase(faseId, nextPhase);
            toast.success('Fase completada');
            setEvidenceData({ comentarios: '', fotos: [] });
            setShowNextPhaseSelector(null);
            loadDetalle();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al completar la fase');
        }
    };

    const handleChangeTech = async () => {
        if (!newTechData.tecnicoNuevo || !newTechData.motivo) return;
        try {
            await renovadosService.changeTechnician(idSolicitud!, {
                ...newTechData,
                usuarioQueCambia: 'Admin' // TODO: Get from useAuthStore
            });
            toast.success('Técnico actualizado');
            setShowChangeTech(false);
            setNewTechData({ tecnicoNuevo: '', motivo: '' });
            loadDetalle();
        } catch (error) {
            toast.error('Error al cambiar técnico');
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
            setNewIncidencia({ tipo: 'SIN INCIDENCIAS', comentarios: '' });
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
            toast.success('Proceso de taller finalizado correctamente');
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
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full flex flex-col h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-red-600 shadow-sm border border-slate-100">
                            <Settings className="w-8 h-8 animate-spin-slow" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Orden de Taller (R1)</span>
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">{solicitud?.estado}</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{solicitud?.serial_equipo}</h2>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                    <User className="w-3.5 h-3.5 text-red-500" />
                                    {solicitud?.tecnico_responsable || 'Sin asignar'}
                                    <button 
                                        onClick={() => setShowChangeTech(true)}
                                        className="ml-2 p-1 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                    >
                                        <History className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                                    {getProfundidad(solicitud?.meses_fuera || '')}
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
                        { id: 'historial', label: 'Bitácora Técnicos', icon: History },
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {solicitud?.fases?.map((fase, idx) => (
                                        <div
                                            key={fase.id_fase}
                                            className={cn(
                                                "p-6 rounded-[2.5rem] border transition-all relative overflow-hidden group flex flex-col justify-between",
                                                fase.completado
                                                    ? "bg-emerald-50/20 border-emerald-100"
                                                    : fase.fecha_inicio
                                                        ? "bg-amber-50/30 border-amber-200 shadow-md ring-2 ring-amber-200 ring-offset-4"
                                                        : "bg-white border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div>
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

                                                {/* Evidencia (si está en proceso) */}
                                                {fase.fecha_inicio && !fase.completado && (
                                                    <div className="mb-4 space-y-3 p-4 bg-white/70 rounded-2xl border border-amber-100">
                                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Evidencia Sugerida</p>
                                                        <textarea 
                                                            className="w-full text-xs font-bold p-0 bg-transparent border-none outline-none resize-none placeholder:text-slate-300 h-16"
                                                            placeholder="Comentarios de la fase..."
                                                            value={evidenceData.comentarios}
                                                            onChange={(e) => setEvidenceData({...evidenceData, comentarios: e.target.value})}
                                                        />
                                                        <div className="flex gap-2">
                                                            <button className="p-2 bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors border border-slate-100 shadow-sm">
                                                                <Camera className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Evidencia guardada */}
                                                {fase.completado && (fase.comentarios || (fase.fotos && (fase.fotos as any).length > 0)) && (
                                                    <div className="mb-4 p-3 bg-white/40 rounded-2xl border border-emerald-100/50">
                                                        {fase.comentarios && <p className="text-xs font-bold text-slate-600 line-clamp-2 italic">"{fase.comentarios}"</p>}
                                                        {fase.fotos && (fase.fotos as any).length > 0 && <p className="text-[8px] font-black text-emerald-500 mt-1 uppercase tracking-widest">Fotos adjuntas</p>}
                                                    </div>
                                                )}
                                            </div>

                                            {!fase.completado && (
                                                <div className="pt-2 border-t border-slate-100/50">
                                                    {fase.fecha_inicio ? (
                                                        <div className="space-y-2">
                                                            {showNextPhaseSelector === fase.id_fase ? (
                                                                <div className="bg-slate-900 rounded-2xl p-4 animate-in slide-in-from-bottom-2 duration-300">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">¿A qué fase pasamos?</p>
                                                                    <div className="grid grid-cols-1 gap-1.5">
                                                                        {['Mantenimiento', 'Montaje', 'Pintura', 'Detallado', 'Pruebas', 'Finalizar'].map(n => (
                                                                            <button 
                                                                                key={n}
                                                                                onClick={() => handleCompleteFase(fase.id_fase, n === 'Finalizar' ? undefined : n)}
                                                                                className="w-full text-left px-3 py-2 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-between group/sel"
                                                                            >
                                                                                {n}
                                                                                <ChevronRight className="w-3 h-3 opacity-0 group-hover/sel:opacity-100 group-hover/sel:translate-x-1 transition-all" />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => setShowNextPhaseSelector(null)}
                                                                        className="w-full mt-3 text-red-400 text-[10px] font-black uppercase text-center hover:text-red-300 transition-colors"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setShowNextPhaseSelector(fase.id_fase)}
                                                                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
                                                                >
                                                                    Finalizar Fase <CheckCircle2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setScanningFaseId(fase.id_fase); setShowScanner(true); }}
                                                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all group/btn"
                                                        >
                                                            Escáner Estación <QrCode className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
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

                                    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
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
                                    <div className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">Tipo de Paro</label>
                                            <select
                                                className="w-full px-4 py-3 bg-white border border-red-100 rounded-xl font-bold text-sm outline-none focus:border-red-500"
                                                value={newIncidencia.tipo}
                                                onChange={(e) => setNewIncidencia({ ...newIncidencia, tipo: e.target.value })}
                                            >
                                                <option value="SIN INCIDENCIAS">SIN INCIDENCIAS</option>
                                                <option value="ESTACION LIBRE">ESTACION LIBRE</option>
                                                <option value="SOPORTE REFACCIONES">SOPORTE REFACCIONES</option>
                                                <option value="SOPORTE TECNICO">SOPORTE TECNICO</option>
                                                <option value="REPARACION MAYOR">REPARACION MAYOR</option>
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
                                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">Horas: {inc.horas_laborales}h</span>
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

                            {activeTab === 'historial' && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                                            <History className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 text-sm">Cambios de Técnico</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historial completo de asignaciones</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {techLogs.map((log, idx) => (
                                            <div key={log.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-start gap-4 hover:border-red-100 transition-all group shadow-sm">
                                                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:text-red-500 transition-colors">
                                                    {techLogs.length - idx}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-400 line-through text-xs font-bold">{log.tecnico_anterior || 'Inicio'}</span>
                                                            <ArrowRight className="w-3 h-3 text-red-500" />
                                                            <span className="text-slate-900 font-black text-sm">{log.tecnico_nuevo}</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400">{format(new Date(log.fecha), 'dd MMM, HH:mm', { locale: es })}</span>
                                                    </div>
                                                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                                        <p className="text-xs font-bold text-slate-600"><span className="text-slate-400 uppercase text-[9px] mr-1">Motivo:</span> {log.motivo}</p>
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                        <UserCircle2 className="w-3 h-3" /> Cambiado por {log.usuario_que_cambia}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {techLogs.length === 0 && (
                                            <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] italic">No hay cambios registrados</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Progreso</p>
                            <p className="text-xs font-black text-slate-900">{solicitud?.fases?.filter(f => f.completado).length}/{solicitud?.fases?.length} Fases</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleFinalize}
                            disabled={solicitud?.estado === 'Finalizado' || !solicitud?.fases?.every(f => f.completado)}
                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl hover:bg-emerald-600 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-slate-200"
                        >
                            {solicitud?.estado === 'Finalizado' ? 'Orden Cerrada' : 'Finalizar y Liberar'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Overlays */}
                {showChangeTech && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-8 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
                            <div className="text-center">
                                <UserCircle2 className="w-12 h-12 text-red-500 mx-auto mb-2" />
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Re-asignar Técnico</h3>
                                <p className="text-sm text-slate-500 font-medium">Este cambio quedará registrado en el historial</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nuevo Responsable</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-red-500"
                                        value={newTechData.tecnicoNuevo}
                                        onChange={(e) => setNewTechData({...newTechData, tecnicoNuevo: e.target.value})}
                                    >
                                        <option value="">Seleccionar técnico...</option>
                                        {usuarios.map(u => (
                                            <option key={u.IDUsuarios} value={u.Usuario}>{u.Usuario}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo del Cambio</label>
                                    <textarea 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-red-500 h-20 resize-none"
                                        placeholder="Ej: Cambio de turno, enfermedad, especialidad..."
                                        value={newTechData.motivo}
                                        onChange={(e) => setNewTechData({...newTechData, motivo: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setShowChangeTech(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleChangeTech}
                                    disabled={!newTechData.tecnicoNuevo || !newTechData.motivo}
                                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showScanner && (
                    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                        <button onClick={() => setShowScanner(false)} className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                            <X className="w-8 h-8" />
                        </button>
                        <div className="text-center mb-8">
                            <h3 className="text-white text-3xl font-black tracking-tight mb-2">Escáner de Estación</h3>
                            <p className="text-white/60 font-bold uppercase tracking-widest text-xs">Escanea el QR de la estación para validar el inicio</p>
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
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
};
