'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, LayoutGrid, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthTallerStore } from '@/store/auth-taller.store';
import { auditoriaApi } from '@/services/taller-r1/auditoria.service';
import NuevaAuditoriaModal from '@/components/taller-r1/auditoria/NuevaAuditoriaModal';
import EscanearAuditoriaModal from '@/components/taller-r1/auditoria/EscanearAuditoriaModal';
import AuditoriaDetailsModal from '@/components/taller-r1/auditoria/AuditoriaDetailsModal';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AuditoriaPage() {
    const selectedSite = useAuthTallerStore(state => state.selectedSite);
    const router = useRouter();
    const [auditorias, setAuditorias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination logic
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Modals
    const [isNuevaOpen, setIsNuevaOpen] = useState(false);
    const [scanAuditoriaId, setScanAuditoriaId] = useState<string | null>(null);
    const [detailsAuditoriaId, setDetailsAuditoriaId] = useState<string | null>(null);

    useEffect(() => {
        // Redirigir si no es R2 o R3
        if (selectedSite && !['r2', 'r3'].includes(selectedSite.toLowerCase())) {
            router.push(`/${selectedSite}/dashboard`);
        } else {
            loadAuditorias();
        }
    }, [selectedSite]);

    const loadAuditorias = async () => {
        if (!selectedSite) return;
        setLoading(true);
        try {
            const data = await auditoriaApi.getAll(selectedSite);
            setAuditorias(Array.isArray(data) ? data : (data?.data || []));
        } catch (error) {
            console.error('Error loading auditorias:', error);
            setAuditorias([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAuditoriaCreated = (id_auditoria: string) => {
        setIsNuevaOpen(false);
        setScanAuditoriaId(id_auditoria);
        loadAuditorias();
    };

    const handleScanClose = () => {
        setScanAuditoriaId(null);
        loadAuditorias();
    };

    // Calculate current page data
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentAuditorias = auditorias.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(auditorias.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, []);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50 relative">
            {/* Header Rediseñado */}
            <div className="flex-none p-4 sm:p-8 space-y-6 sm:space-y-8 z-10 sticky top-0 bg-slate-50/80 backdrop-blur-xl border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-8 bg-red-600 rounded-full" />
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none group flex items-center gap-3">
                                Auditoría Interna
                            </h1>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 mt-1 px-1">
                            Control Operacional y Verificación Físico
                        </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                        <button
                            onClick={() => setIsNuevaOpen(true)}
                            className="bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-500/20 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest px-6 py-4 rounded-3xl flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Crear Auditoría</span>
                        </button>
                    </div>
                </div>

                {/* Removed Search Bar */}
                <div />
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar pb-24">
                {loading ? (
                     <div className="h-full flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
                    </div>
                ) : auditorias.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                        <Calendar className="w-16 h-16 mb-2" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-center">No hay auditorías registradas</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                            {currentAuditorias.map((aud) => (
                             <div
                                key={aud.id_auditoria}
                                onClick={() => setDetailsAuditoriaId(aud.id_auditoria)}
                                className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col relative overflow-hidden"
                            >
                                {/* Decorative border strip */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="flex items-start justify-between mb-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900">{format(new Date(aud.fecha_auditoria), 'dd MMM yyyy', { locale: es })}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(aud.fecha_auditoria), 'HH:mm')}</p>
                                        </div>
                                     </div>
                                </div>

                                <div className="space-y-4 mb-4 flex-1">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">{aud.usuario_auditor}</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 line-clamp-2">
                                        {aud.comentarios || 'Sin comentarios registrados'}
                                    </p>
                                </div>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                     {isToday(new Date(aud.fecha_auditoria)) ? (
                                         <button
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 setScanAuditoriaId(aud.id_auditoria);
                                             }}
                                             className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors"
                                         >
                                             REANUDAR ESCANEO
                                         </button>
                                     ) : (
                                         <span /> // Placeholder to keep layout justified
                                     )}
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ver Reporte →</span>
                                </div>
                            </div>
                        ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-8 pb-10">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Anterior
                                </button>
                                <span className="text-xs font-bold text-slate-500">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <NuevaAuditoriaModal 
                isOpen={isNuevaOpen} 
                onClose={() => setIsNuevaOpen(false)} 
                onSuccess={handleAuditoriaCreated} 
            />

            <EscanearAuditoriaModal 
                isOpen={!!scanAuditoriaId} 
                idAuditoria={scanAuditoriaId} 
                onClose={handleScanClose} 
            />

            <AuditoriaDetailsModal 
                isOpen={!!detailsAuditoriaId} 
                id_auditoria={detailsAuditoriaId} 
                onClose={() => setDetailsAuditoriaId(null)} 
            />
        </div>
    );
}
