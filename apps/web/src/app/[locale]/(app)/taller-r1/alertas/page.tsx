'use client';
import { useState, useEffect } from 'react';
import { Flame, Calendar, MapPin, Zap, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { accesoriosApi, Accesorio } from '@/services/taller-r1/accesorios.service';
import { toast } from 'sonner';

import { evaluacionesApi } from '@/services/taller-r1/evaluaciones.service';

export default function AlertasBateriasPage() {
    const [baterias, setBaterias] = useState<Accesorio[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAlertas = async () => {
        try {
            setLoading(true);
            const data = await accesoriosApi.getAlertasBaterias();
            setBaterias(data);
        } catch (error) {
            console.error('Error fetching battery alerts:', error);
            toast.error('Error al cargar las alertas de baterías');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAlertas();
    }, []);

    const handleRegistrarCarga = async (id: string) => {
        try {
            await evaluacionesApi.registerCharge(id, 'Carga directa desde panel de alertas');
            const today = new Date().toISOString().split('T')[0];
            toast.success('Carga registrada correctamente', {
                description: `Nueva fecha de carga: ${today}`,
                icon: <Zap className="w-4 h-4 text-emerald-500" />
            });
            loadAlertas();
        } catch (error) {
            console.error('Error updating battery charge:', error);
            toast.error('Ocurrió un error al registrar la carga');
        }
    };

    const calculateDaysInactive = (dateString?: string | Date) => {
        if (!dateString) return 'Desconocido';
        const lastChargeDate = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastChargeDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <div className="flex-1 bg-gray-50/50 min-h-screen">
            <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                <Flame className="w-5 h-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Alertas de Baterías</h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Baterías que no han sido cargadas en 30 días o más.</p>
                    </div>
                    <button
                        onClick={loadAlertas}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-pulse h-48">
                                <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : baterias.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">¡Todo al día!</h3>
                        <p className="text-gray-500 font-medium max-w-md">No hay baterías que requieran recarga en este momento. Todas las baterías han sido cargadas en los últimos 30 días.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {baterias.map((bateria) => (
                            <div key={bateria.id_accesorio} className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                                <AlertTriangle className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-black text-orange-500 uppercase tracking-wider px-2 py-1 bg-orange-50 rounded-md">Atención Requerida</span>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-black text-gray-900 mb-1">{bateria.modelo || 'Sin Modelo'}</h3>
                                    <p className="text-sm font-bold text-gray-400 font-mono bg-gray-50 inline-block px-2 py-0.5 rounded-md mb-4">{bateria.serial || 'S/N'}</p>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                                <Calendar className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Última Carga</p>
                                                <p className="font-bold text-gray-700">
                                                    {bateria.fecha_ultima_carga ? new Date(bateria.fecha_ultima_carga).toLocaleDateString() : 'Desconocida'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                                <Flame className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Tiempo Inactivo</p>
                                                <p className="font-black text-red-600">
                                                    {calculateDaysInactive(bateria.fecha_ultima_carga)} días
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                                <MapPin className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Ubicación</p>
                                                <p className="font-bold text-gray-700">{bateria.ubicacion || 'No asignada'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRegistrarCarga(bateria.id_accesorio)}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Registrar Carga Hoy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
