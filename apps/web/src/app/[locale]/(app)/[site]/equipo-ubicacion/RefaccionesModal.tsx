import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { equipoUbicacionApi, EquipoUbicacion } from '@/services/taller-r1/equipo-ubicacion.service';
import { Plus, CheckCircle2, Wrench, Package, List, Sparkles } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

export const RefaccionesModal = ({ open, onOpenChange, equipo }: { open: boolean, onOpenChange: (open: boolean) => void, equipo: EquipoUbicacion | null }) => {
    const [refacciones, setRefacciones] = useState<any[]>([]);
    const [costos, setCostos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form
    const [selectedId, setSelectedId] = useState<string>('');
    const [cantidad, setCantidad] = useState<number>(1);

    // New Refaccion Form
    const [showNew, setShowNew] = useState(false);
    const [newRef, setNewRef] = useState({ refaccion: '', descripcion: '', precio: '' });

    useEffect(() => {
        if (open && equipo) {
            loadCatalogo();
            loadCostos();
        } else {
            // Reset state
            setRefacciones([]);
            setCostos([]);
            setSelectedId('');
            setCantidad(1);
            setShowNew(false);
        }
    }, [open, equipo]);

    const loadCatalogo = async () => {
        const data = await equipoUbicacionApi.getRefaccionesCatalogo();
        setRefacciones(data || []);
    };

    const loadCostos = async () => {
        if (!equipo) return;
        const data = await equipoUbicacionApi.getCostosRefacciones(equipo.id_equipo_ubicacion);
        setCostos(data || []);
    };

    const handleCreateCatalogo = async () => {
        if (!newRef.refaccion || !newRef.descripcion || !newRef.precio) {
            toast.error('Complete los datos de la nueva refacción');
            return;
        }

        try {
            setLoading(true);
            const created = await equipoUbicacionApi.createRefaccionCatalogo({
                refaccion: newRef.refaccion,
                descripcion: newRef.descripcion,
                precio: parseFloat(newRef.precio)
            });
            toast.success('Refacción creada en catálogo');
            setShowNew(false);
            setNewRef({ refaccion: '', descripcion: '', precio: '' });
            await loadCatalogo();
            setSelectedId(created.id_refaccion.toString());
        } catch (error) {
            toast.error('Error al crear refacción');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCosto = async () => {
        if (!selectedId || cantidad < 1) return;
        const ref = refacciones.find(r => r.id_refaccion.toString() === selectedId);
        if (!ref) return;

        try {
            setLoading(true);
            const promises = [];
            for (let i = 0; i < cantidad; i++) {
                promises.push(
                    equipoUbicacionApi.addCostoRefaccion(equipo!.id_equipo_ubicacion, {
                        id_refaccion: ref.id_refaccion,
                        precio: Number(ref.precio)
                    })
                );
            }
            await Promise.all(promises);
            toast.success('Costos agregados correctamente');
            setSelectedId('');
            setCantidad(1);
            await loadCostos();
        } catch (error) {
            toast.error('Error al agregar costos');
        } finally {
            setLoading(false);
        }
    };

    const totalCostos = costos.reduce((sum, item) => sum + Number(item.precio || 0), 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 bg-white sm:rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                <VisuallyHidden>
                    <DialogHeader>
                        <DialogTitle>Refacciones del Equipo</DialogTitle>
                        <DialogDescription>
                            Agregar refacciones y costos al proceso de renovación
                        </DialogDescription>
                    </DialogHeader>
                </VisuallyHidden>

                {/* Header Style */}
                <div className="bg-slate-50 border-b border-slate-100 p-8 flex items-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-red-600 shadow-sm border border-slate-100">
                        <Wrench className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Gestión de Refacciones</span>
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">
                                Total: ${totalCostos?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
                            {equipo?.serial_equipo || 'Equipo'}
                        </h2>
                    </div>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Add Form */}
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4">
                        {!showNew ? (
                            <>
                                <div className="md:col-span-8 space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Seleccionar del Catálogo</label>
                                    <select
                                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white font-bold text-sm text-slate-700 outline-none focus:border-red-500 shadow-sm"
                                        value={selectedId}
                                        onChange={(e) => {
                                            if (e.target.value === 'NEW') setShowNew(true);
                                            else setSelectedId(e.target.value);
                                        }}
                                    >
                                        <option value="">Seleccione una refacción...</option>
                                        {refacciones.map((r) => (
                                            <option key={r.id_refaccion} value={r.id_refaccion}>
                                                {r.refaccion} - {r.descripcion} (${Number(r.precio).toFixed(2)})
                                            </option>
                                        ))}
                                        <option value="NEW" className="font-bold text-red-600 border-t border-slate-100 mt-2">
                                            + CREAR NUEVA REFACCIÓN
                                        </option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Cantidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white font-bold text-sm text-slate-700 outline-none focus:border-red-500 shadow-sm"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-end">
                                    <button
                                        disabled={!selectedId || loading}
                                        onClick={handleAddCosto}
                                        className="w-full py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg hover:shadow-red-500/25 disabled:opacity-50"
                                    >
                                        Añadir
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 rounded-xl shadow-xs border border-red-50">
                                <div className="md:col-span-12 flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> Nueva Refacción
                                    </h4>
                                    <button onClick={() => setShowNew(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline">Cancelar</button>
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <input
                                        placeholder="Nombre (Ej: Bateria)"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs"
                                        value={newRef.refaccion}
                                        onChange={(e) => setNewRef({ ...newRef, refaccion: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <input
                                        placeholder="Descripción"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs"
                                        value={newRef.descripcion}
                                        onChange={(e) => setNewRef({ ...newRef, descripcion: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <input
                                        placeholder="Precio"
                                        type="number"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs"
                                        value={newRef.precio}
                                        onChange={(e) => setNewRef({ ...newRef, precio: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-end">
                                    <button
                                        disabled={loading}
                                        onClick={handleCreateCatalogo}
                                        className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-md"
                                    >
                                        Crear
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Costos Registrados */}
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <List className="w-4 h-4" /> Cargados a Este Equipo
                        </h4>
                        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Refacción</th>
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Descripción</th>
                                        <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Costo (U)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {costos.map((c) => (
                                        <tr key={c.id_costos_refacciones} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-black text-sm text-slate-800">
                                                {c.refaccion?.refaccion || 'Desconocido'}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-xs text-slate-500">
                                                {c.refaccion?.descripcion || '---'}
                                            </td>
                                            <td className="px-6 py-4 font-black text-sm text-slate-900 text-right">
                                                ${Number(c.precio).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {costos.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="py-12 text-center text-slate-300">
                                                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                <p className="font-bold text-xs uppercase italic tracking-widest">No hay refacciones ingresadas</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 10px;
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    );
};
