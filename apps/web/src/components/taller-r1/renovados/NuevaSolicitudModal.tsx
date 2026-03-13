'use client';

import { useState, useEffect } from 'react';
import renovadosService, { CreateRenovadoDto } from '@/services/taller-r1/renovados.service';
import { equipoUbicacionApi, EquipoUbicacion } from '@/services/taller-r1/equipo-ubicacion.service';
import { clientesApi } from '@/services/taller-r1/clientes.service';
import { toast } from 'sonner';
import { X, Calendar, User, Search, Package, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const NuevaSolicitudModal = ({ open, onClose, onSuccess }: Props) => {
    const [loading, setLoading] = useState(false);
    const [equipos, setEquipos] = useState<EquipoUbicacion[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<CreateRenovadoDto>({
        serial_equipo: '',
        fecha_target: '',
        cliente: '',
        adc: '',
        meses_fuera: '1-3',
        tecnico_responsable: '',
    });

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        try {
            const [allEquipos, allClientes] = await Promise.all([
                equipoUbicacionApi.getAll(),
                clientesApi.getAll()
            ]);
            // Solo equipos en stock y que no estén ya en renovación (aunque el backend valida esto también)
            setEquipos(allEquipos.filter((e: any) => e.stock === 'SI' && e.estado !== 'Renovación'));
            setClientes(allClientes);
        } catch (error) {
            toast.error('Error al cargar datos para la solicitud');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.serial_equipo || !formData.fecha_target || !formData.meses_fuera) {
            toast.error('Por favor completa los campos obligatorios');
            return;
        }

        try {
            setLoading(true);
            await renovadosService.create(formData);
            toast.success('Solicitud de renovado creada correctamente');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                serial_equipo: '',
                fecha_target: '',
                cliente: '',
                adc: '',
                meses_fuera: '1-3',
                tecnico_responsable: '',
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al crear la solicitud');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const filteredEquipos = equipos.filter(e =>
        e.serial_equipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 rounded-t-[2.5rem]">
                    <div>
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] block mb-1">RENOVADOS</span>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nueva Solicitud</h2>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-red-500 shadow-sm border border-transparent hover:border-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                    {/* Selección de Equipo */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Equipo en Stock <span className="text-red-500">*</span></label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por serie o modelo..."
                                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-red-500 transition-all outline-none font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredEquipos.map((e) => (
                                <button
                                    key={e.id_equipo_ubicacion}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, serial_equipo: e.serial_equipo || '' })}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                        formData.serial_equipo === e.serial_equipo
                                            ? "bg-red-50 border-red-200 shadow-sm"
                                            : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", formData.serial_equipo === e.serial_equipo ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400")}>
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">{e.serial_equipo}</p>
                                            <p className="text-xs font-bold text-slate-400">{e.modelo} - {e.clase}</p>
                                        </div>
                                    </div>
                                    {formData.serial_equipo === e.serial_equipo && <CheckCircle2 className="w-5 h-5 text-red-600" />}
                                </button>
                            ))}
                            {filteredEquipos.length === 0 && (
                                <p className="text-center py-4 text-slate-400 font-bold text-xs uppercase italic">No se encontraron equipos en stock</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fecha Target */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Target <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-red-500 transition-all outline-none font-bold"
                                    value={typeof formData.fecha_target === 'string' ? formData.fecha_target : ''}
                                    onChange={(e) => setFormData({ ...formData, fecha_target: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Meses Fuera */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Meses Fuera <span className="text-red-500">*</span></label>
                            <select
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-red-500 transition-all outline-none font-bold appearance-none"
                                value={formData.meses_fuera}
                                onChange={(e) => setFormData({ ...formData, meses_fuera: e.target.value })}
                            >
                                <option value="1-3">1–3 meses</option>
                                <option value="4-6">4–6 meses</option>
                                <option value="6-12">6–12 meses</option>
                                <option value="12+">12+ meses</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cliente */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente</label>
                            <select
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-red-500 transition-all outline-none font-bold appearance-none"
                                value={formData.cliente}
                                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                            >
                                <option value="">Seleccionar cliente...</option>
                                {clientes.map(c => (
                                    <option key={c.id_cliente} value={c.nombre_cliente}>{c.nombre_cliente}</option>
                                ))}
                            </select>
                        </div>

                        {/* ADC */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ADC</label>
                            <input
                                type="text"
                                placeholder="Nombre del ADC"
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-red-500 transition-all outline-none font-bold"
                                value={formData.adc}
                                onChange={(e) => setFormData({ ...formData, adc: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Técnico Responsable */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Técnico Responsable</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Nombre del técnico"
                                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-red-500 transition-all outline-none font-bold"
                                value={formData.tecnico_responsable}
                                onChange={(e) => setFormData({ ...formData, tecnico_responsable: e.target.value })}
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 rounded-b-[2.5rem] flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-4 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.serial_equipo}
                        className="flex items-center gap-3 px-10 py-4 bg-red-600 text-white rounded-[1.25rem] hover:bg-red-700 transition-all shadow-xl shadow-red-200 font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                Generar Orden
                                <CheckCircle2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
