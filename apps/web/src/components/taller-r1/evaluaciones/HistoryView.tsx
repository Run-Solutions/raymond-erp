'use client';

import { useState, useEffect } from 'react';
import { evaluacionesApi } from '@/services/taller-r1/evaluaciones.service';
import {
    History,
    Calendar,
    Star,
    Zap,
    FileText,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoryViewProps {
    itemId: string;
    tipo: 'equipo' | 'accesorio';
}

export default function HistoryView({ itemId, tipo }: HistoryViewProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [itemId, tipo]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            if (tipo === 'equipo') {
                const data = await evaluacionesApi.getEquipoEvaluation(itemId);
                setHistory(data ? [data] : []); // For now assuming we only get latest or single
                // Actually the API return might be a list if updated to fetch all versions
            } else {
                const data = await evaluacionesApi.getChargeHistory(itemId);
                setHistory(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 gap-3 text-slate-400">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Cargando historial...</span>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 italic text-slate-400 font-medium">
                No hay historial registrado para este elemento.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 px-2 mb-2">
                <History className="text-slate-400" size={20} />
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    {tipo === 'equipo' ? 'Historial de Evaluaciones' : 'Historial de Cargas'}
                </h4>
            </div>

            <div className="space-y-3">
                {history.map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 group hover:border-indigo-200 transition-all">
                        <div className={`p-3 rounded-xl ${tipo === 'equipo' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {tipo === 'equipo' ? <Star size={18} /> : <Zap size={18} />}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-black text-slate-800">
                                    {tipo === 'equipo' ? `Evaluación ${item.porcentaje_total}%` : 'Carga de Batería'}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                    <Calendar size={12} />
                                    {format(new Date(item.fecha_creacion || item.fecha_carga), "d 'de' MMMM, yyyy", { locale: es })}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                {tipo === 'equipo'
                                    ? `Estado: ${item.estado_montacargas || 'N/A'}. Renovación: ${item.semanas_renovacion} semanas.`
                                    : item.comentarios || 'Sin observaciones adicionales.'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
