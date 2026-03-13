'use client';

import React, { useState, useEffect } from 'react';
import { evaluacionesApi } from '@/services/taller-r1/evaluaciones.service';
import { accesoriosApi, Accesorio } from '@/services/taller-r1/accesorios.service';
import { EvaluacionModal } from '@/components/taller-r1/evaluaciones/EvaluacionModal';
import { toast } from 'sonner';
import {
  ClipboardCheck, Clock, CheckCircle2, Search, Zap, Forklift, MapPin, Wrench, LayoutGrid, CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MAIN_TABS = ['Equipos', 'Accesorios'];
const ACC_TABS = ['Pendientes de evaluación', 'Evaluados'];

export default function EvaluacionesPage() {
  const [activeMainTab, setActiveMainTab] = useState('Equipos');
  const [activeAccTab, setActiveAccTab] = useState('Pendientes de evaluación');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [equiposData, setEquiposData] = useState<any[]>([]);
  const [accesoriosData, setAccesoriosData] = useState<Accesorio[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [equiposRes, accesoriosRes] = await Promise.all([
        evaluacionesApi.getAllEquiposEvaluations(),
        accesoriosApi.getAll()
      ]);
      setEquiposData(equiposRes || []);
      setAccesoriosData(accesoriosRes || []);
    } catch (error) {
      console.error('Error cargando datos de evaluaciones:', error);
      toast.error('Error al cargar la información');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEvaluation = (item: any, type: 'equipo' | 'accesorio') => {
    if (type === 'equipo') {
        const detail = item.entrada_detalle;
        setSelectedItem({
            id: detail?.id_detalles || item.id_detalle,
            serial: detail?.serial_equipo || 'N/A',
            modelo: detail?.modelo || 'Desconocido',
            tipo: 'equipo',
            evaluationId: item.id_evaluacion
        });
    } else {
        setSelectedItem({
            id: item.id_accesorio,
            serial: item.serial || 'N/A',
            modelo: item.modelo || 'Desconocido',
            tipo: 'accesorio'
        });
    }
    setIsModalOpen(true);
  };

  // ----- Filtrado de Equipos -----
  const filteredEquipos = equiposData.filter(evaluacion => {
    const detail = evaluacion.entrada_detalle;
    const searchLow = searchTerm.toLowerCase();
    return (
        detail?.serial_equipo?.toLowerCase().includes(searchLow) ||
        detail?.modelo?.toLowerCase().includes(searchLow) ||
        detail?.entradas?.folio?.toLowerCase().includes(searchLow)
    );
  });

  // ----- Filtrado de Accesorios -----
  const filteredAccesorios = accesoriosData.filter(acc => {
    let stateMatch = false;
    if (activeAccTab === 'Pendientes de evaluación') {
        stateMatch = acc.estado_acc !== 'Evaluado';
    } else {
        stateMatch = acc.estado_acc === 'Evaluado';
    }

    const searchLow = searchTerm.toLowerCase();
    const isSearchMatch = 
        acc.serial?.toLowerCase().includes(searchLow) || 
        acc.modelo?.toLowerCase().includes(searchLow) ||
        acc.tipo?.toLowerCase().includes(searchLow);

    return stateMatch && isSearchMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-12">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <ClipboardCheck className="w-10 h-10 text-red-600" />
                Evaluaciones
              </h1>
              <p className="text-gray-500 mt-2 font-medium">
                Historial técnico de equipos y accesorios en proceso de evaluación.
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                <p className="text-red-800 font-bold text-sm">
                    {activeMainTab === 'Equipos' ? filteredEquipos.length : filteredAccesorios.length} Registros
                </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8 space-y-8">
        {/* Controles: Pestañas principales y Búsqueda */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex bg-gray-100 p-1.5 rounded-xl w-full md:w-auto">
              {MAIN_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveMainTab(tab); setSearchTerm(''); }}
                  className={cn(
                    'flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all',
                    activeMainTab === tab 
                      ? 'bg-white text-red-600 shadow-sm border border-red-100' 
                      : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  {tab === 'Equipos' ? <Forklift className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder={`Buscar en ${activeMainTab.toLowerCase()}... (Serie o Modelo)`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-bold text-gray-900"
                />
            </div>
        </div>

        {/* Sub-pestañas para Accesorios */}
        {activeMainTab === 'Accesorios' && (
            <div className="flex gap-2">
                {ACC_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveAccTab(tab)}
                        className={cn(
                            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border',
                            activeAccTab === tab
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                        )}
                    >
                        {tab === 'Evaluados' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        {tab}
                    </button>
                ))}
            </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {isLoading ? (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        ) : (
            <div className="mt-6">
                {activeMainTab === 'Equipos' ? (
                    filteredEquipos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredEquipos.map((evaluacion) => (
                                <div 
                                    key={evaluacion.id_evaluacion}
                                    onClick={() => handleOpenEvaluation(evaluacion, 'equipo')}
                                    className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                {evaluacion.entrada_detalle?.entradas?.folio || 'Sin Folio'}
                                            </p>
                                            <h3 className="text-lg font-black text-slate-900 leading-tight">
                                                {evaluacion.entrada_detalle?.serial_equipo || 'S/N'}
                                            </h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100 group-hover:bg-red-600 group-hover:border-red-600 transition-colors">
                                            <ClipboardCheck className="w-5 h-5 text-red-600 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                            <Forklift className="w-4 h-4 text-slate-400" />
                                            {evaluacion.entrada_detalle?.modelo || 'Modelo Desconocido'}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                            <CalendarDays className="w-4 h-4 text-slate-400" />
                                            {format(new Date(evaluacion.fecha_creacion), "d 'de' MMMM, yyyy", { locale: es })}
                                        </div>
                                        <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Estado</span>
                                                <span className="text-xs font-bold text-slate-700">
                                                    {evaluacion.entrada_detalle?.calificacion || 'En proceso'}
                                                </span>
                                            </div>
                                            <span className={cn(
                                                "px-3 py-1 rounded-lg text-xs font-black",
                                                evaluacion.porcentaje_total && evaluacion.porcentaje_total >= 80 ? "bg-emerald-50 text-emerald-700" :
                                                evaluacion.porcentaje_total && evaluacion.porcentaje_total >= 50 ? "bg-amber-50 text-amber-700" :
                                                "bg-rose-50 text-rose-700"
                                            )}>
                                                {evaluacion.porcentaje_total !== null ? `${evaluacion.porcentaje_total}%` : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No se encontraron evaluaciones de equipos." />
                    )
                ) : (
                    filteredAccesorios.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAccesorios.map((acc) => (
                                <div 
                                    key={acc.id_accesorio}
                                    onClick={() => handleOpenEvaluation(acc, 'accesorio')}
                                    className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                {acc.tipo}
                                            </p>
                                            <h3 className="text-lg font-black text-slate-900 leading-tight">
                                                {acc.serial || 'S/N'}
                                            </h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:border-slate-900 transition-colors">
                                            <Wrench className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                            <Zap className="w-4 h-4 text-slate-400" />
                                            {acc.modelo || 'Modelo Desconocido'}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                            <MapPin className="w-4 h-4 text-slate-400" />
                                            {acc.rel_ubicacion?.nombre_ubicacion || acc.ubicacion || 'Sin Ubicación'}
                                        </div>
                                        <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado</span>
                                            <span className={cn(
                                                "px-3 py-1 rounded-lg text-xs font-black",
                                                acc.estado_acc === 'Evaluado' ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
                                            )}>
                                                {acc.estado_acc || 'Por Evaluar'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message={`No hay accesorios en estado '${activeAccTab}'.`} />
                    )
                )}
            </div>
        )}
      </div>

      {isModalOpen && selectedItem && (
        <EvaluacionModal
          open={isModalOpen}
          item={selectedItem}
          evaluationId={selectedItem.evaluationId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <LayoutGrid className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No hay resultados</h3>
            <p className="text-gray-500">{message}</p>
        </div>
    );
}
