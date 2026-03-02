import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { EquipoUbicacion, equipoUbicacionApi } from '@/services/taller-r1/equipo-ubicacion.service';
import { ubicacionesApi, Ubicacion } from '@/services/taller-r1/ubicaciones.service';
import { useAuthTallerStore } from '@/store/auth-taller.store';
import { Truck, AlertCircle, X, Check, MapPin, Archive } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { DialogTitle } from '@radix-ui/react-dialog';

interface MovilizacionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    equipo: EquipoUbicacion | null;
    onSuccess: () => void;
}

export function MovilizacionModal({ open, onOpenChange, equipo, onSuccess }: MovilizacionModalProps) {
    const { user } = useAuthTallerStore();
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [subUbicaciones, setSubUbicaciones] = useState<any[]>([]);
    const [selectedUbicacion, setSelectedUbicacion] = useState<string>('');
    const [selectedSubUbicacion, setSelectedSubUbicacion] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);

    // Alert State
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);

    useEffect(() => {
        if (open) {
            loadUbicaciones();
            setSelectedUbicacion('');
            setSelectedSubUbicacion('');
            setSubUbicaciones([]);
            setShowConfirmCancel(false);
        }
    }, [open]);

    const loadUbicaciones = async () => {
        try {
            setLoadingData(true);
            const res = await ubicacionesApi.getAll();
            setUbicaciones(res);
        } catch (error) {
            toast.error('Error al cargar ubicaciones');
        } finally {
            setLoadingData(false);
        }
    };

    const handleUbicacionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedUbicacion(val);
        setSelectedSubUbicacion('');
        try {
            setLoadingData(true);
            const res = await ubicacionesApi.getSubLocations(val);
            const freeSubLocations = res.filter((sub: any) => !sub.ubicacion_ocupada);
            setSubUbicaciones(freeSubLocations);
        } catch (error) {
            toast.error('Error al cargar sub ubicaciones');
        } finally {
            setLoadingData(false);
        }
    };

    const handleMovilizar = async () => {
        if (!equipo || !selectedUbicacion || !selectedSubUbicacion) {
            toast.error('Selecciona una ubicación y sub ubicación de destino');
            return;
        }

        try {
            setLoading(true);
            const userName = user ? user.username : 'Usuario Web';

            await equipoUbicacionApi.movilizarEquipo({
                id_equipo_ubicacion: equipo.id_equipo_ubicacion,
                id_ubicacion_destino: selectedUbicacion,
                id_sub_ubicacion_destino: selectedSubUbicacion,
                usuario_movilizacion: userName
            });

            toast.success('Equipo movilizado con éxito');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al movilizar el equipo');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (selectedUbicacion || selectedSubUbicacion) {
            setShowConfirmCancel(true);
        } else {
            onOpenChange(false);
        }
    };

    if (!equipo) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={(openVal) => {
                if (!openVal) handleClose();
            }}>
                <DialogContent className="max-w-xl p-0 overflow-hidden bg-white rounded-3xl shadow-2xl border-0 h-auto max-h-[90vh] flex flex-col">
                    <VisuallyHidden>
                        <DialogTitle>Movilizar Equipo</DialogTitle>
                    </VisuallyHidden>

                    {showConfirmCancel ? (
                        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-white text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-[#D8262F] mx-auto shadow-inner">
                                <AlertCircle className="w-10 h-10" />
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">¿Descartar cambios?</h2>
                                <p className="text-base text-slate-500 font-medium">
                                    Has seleccionado piezas de destino y no ha sido guardada.
                                </p>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowConfirmCancel(false)}
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                                >
                                    Continuar Editando
                                </button>
                                <button
                                    onClick={() => {
                                        setShowConfirmCancel(false);
                                        onOpenChange(false);
                                    }}
                                    className="flex-1 py-4 bg-[#D8262F] hover:bg-[#b91c24] border border-transparent shadow-lg shadow-red-500/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                                >
                                    Sí, Descartar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header estético */}
                            <div className="shrink-0 bg-gradient-to-br from-red-600 to-red-800 px-8 py-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-inner">
                                        <Truck className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight">Movilizar Equipo</h2>
                                        <p className="text-red-100 font-medium text-sm mt-1">Trasladar inventario entre posiciones y locaciones</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/50">

                                {/* Read-Only Origin Card */}
                                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
                                        <MapPin className="w-3 h-3" /> Origen Actual
                                    </h3>

                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Módelo / Serie</p>
                                        <p className="text-sm font-black text-gray-900 mt-1 truncate" title={equipo.modelo}>{equipo.modelo}</p>
                                        <p className="font-black text-slate-800 text-lg tracking-tight">Serial: {equipo.serial_equipo}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Clase</p>
                                        <p className="text-sm font-black text-red-700 mt-1">{equipo.clase}</p>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-gray-50">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ubicación Actual</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-sm font-black text-gray-900 truncate" title={equipo.ubicacion}>{equipo.ubicacion}</p>
                                            <p className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                Posición {equipo.sub_ubicacion}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Destination Selectors */}
                                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-4 flex items-center gap-2">
                                        <Archive className="w-3 h-3" /> Nuevo Destino
                                    </h3>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Ubicación (Nave / Zona)</label>
                                            <select
                                                disabled={loadingData || loading}
                                                value={selectedUbicacion}
                                                onChange={handleUbicacionChange}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent block py-3 px-4 font-semibold outline-none transition-all disabled:opacity-60 cursor-pointer"
                                            >
                                                <option value="" disabled className="text-gray-400 font-normal">-- Seleccionar ubicación --</option>
                                                {ubicaciones
                                                    .filter(u => !u.Clase || u.Clase === 'Todas las clases' || u.Clase === equipo.clase)
                                                    .map((u) => (
                                                        <option key={u.id_ubicacion} value={u.id_ubicacion} className="font-semibold text-gray-900">
                                                            {u.nombre_ubicacion}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Posición (Sub-Ubicación Libre)</label>
                                            <select
                                                disabled={!selectedUbicacion || loadingData || loading}
                                                value={selectedSubUbicacion}
                                                onChange={(e) => setSelectedSubUbicacion(e.target.value)}
                                                className={`w-full bg-slate-50 border border-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent block py-3 px-4 font-semibold outline-none transition-all cursor-pointer ${!selectedUbicacion ? 'opacity-50 cursor-not-allowed' : 'text-red-700'}`}
                                            >
                                                <option value="" disabled className="text-gray-400 font-normal">
                                                    {subUbicaciones.length === 0 && selectedUbicacion && !loadingData
                                                        ? "⚠️ Sin espacios libres"
                                                        : "-- Seleccionar posición --"}
                                                </option>
                                                {subUbicaciones.map((sub) => (
                                                    <option key={sub.id_sub_ubicacion} value={sub.id_sub_ubicacion} className="font-bold text-red-900">
                                                        POSICIÓN {sub.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 justify-end items-center">
                                    <button
                                        onClick={handleClose}
                                        disabled={loading}
                                        className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm tracking-wide hover:bg-gray-50 hover:text-gray-900 transition-all focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleMovilizar}
                                        disabled={loading || !selectedUbicacion || !selectedSubUbicacion}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#D8262F] hover:bg-[#b91c24] disabled:bg-slate-300 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg disabled:shadow-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                Procesando...
                                            </span>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Confirmar Movimiento
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
