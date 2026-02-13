import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { entradasApi, Entrada } from '@/services/taller-r1/entradas.service';
import { ubicacionesApi, Ubicacion } from '@/services/taller-r1/ubicaciones.service';
import { Loader2, Calendar, User, UserCheck, AlertCircle, FileText, Package, Wrench, MessageSquare, CheckCircle2, Image as ImageIcon, X, MapPin, Tag, Truck, ShoppingBag, QrCode, Move, Printer, PackageCheck, Star } from 'lucide-react';
import { EvaluacionModal } from '@/components/taller-r1/evaluaciones/EvaluacionModal';
import { generateQRLabel } from '@/lib/generateQRLabel';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import HistoryView from '@/components/taller-r1/evaluaciones/HistoryView';

interface EntradaDetailsModalProps {
    entradaId: string | null;
    open: boolean;
    onClose: () => void;
}

export function EntradaDetailsModal({ entradaId, open, onClose }: EntradaDetailsModalProps) {
    const [loading, setLoading] = useState(false);
    const [entrada, setEntrada] = useState<Entrada | null>(null);
    const [detalles, setDetalles] = useState<any[]>([]);
    const [accesorios, setAccesorios] = useState<any[]>([]);
    const [ubicarModalOpen, setUbicarModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ id: string, tipo: 'equipo' | 'accesorio' } | null>(null);

    // Estados para Ubicación logic
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [selectedUbicacion, setSelectedUbicacion] = useState<string>('');
    const [selectedRack, setSelectedRack] = useState<string>('');
    const [subUbicacionSugerida, setSubUbicacionSugerida] = useState<any>(null);
    const [availableSubLocations, setAvailableSubLocations] = useState<any[]>([]);
    const [loadingSubLocation, setLoadingSubLocation] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [showUbicarConfirm, setShowUbicarConfirm] = useState(false);
    const [isUbiking, setIsUbiking] = useState(false);
    const [evalModalOpen, setEvalModalOpen] = useState(false);
    const [evalItem, setEvalItem] = useState<any>(null);
    const { user } = useAuthStore();

    useEffect(() => {
        if (open && entradaId) {
            loadDetails(entradaId);
            loadUbicaciones();
        } else {
            setEntrada(null);
            setDetalles([]);
            setAccesorios([]);
            setUbicarModalOpen(false);
            setSelectedItem(null);
            resetUbicarState();
        }
    }, [open, entradaId]);

    const loadUbicaciones = async () => {
        try {
            const data = await ubicacionesApi.getAll();
            setUbicaciones(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading locations:', error);
        }
    };

    const resetUbicarState = () => {
        setSelectedItem(null);
        setSelectedUbicacion('');
        setSelectedRack('');
        setSubUbicacionSugerida(null);
        setAvailableSubLocations([]);
        setLoadingSubLocation(false);
    };

    const handleUbicarEquipos = () => {
        if (!entradaId) return;
        setShowUbicarConfirm(true);
    };

    const confirmUbicarEquipos = async () => {
        if (!entradaId) return;
        setShowUbicarConfirm(false);
        setIsUbiking(true);
        try {
            const userName = user ? `${user.firstName} ${user.lastName}` : (entrada?.usuario_asignado || 'Sistema');
            await entradasApi.ubicarEquipos(entradaId, userName);
            toast.success('Equipos ubicados correctamente en Almacén.');
            await loadDetails(entradaId);
            const entry = await entradasApi.getById(entradaId);
            setEntrada(entry);
        } catch (error) {
            console.error('Error ubking items:', error);
            toast.error('Error al ubicar equipos.');
        } finally {
            setIsUbiking(false);
        }
    };

    // Handler for selecting a location
    const handleUbicacionChange = async (ubicacionId: string) => {
        const item = getSelectedItemDetails();
        const locations = item ? ubicaciones.filter(u => {
            if (item.tipo === 'accesorio') {
                return u.Clase === 'Accesorio';
            } else {
                return u.Clase === item.clase || u.Clase === 'Todas las clases';
            }
        }) : ubicaciones;

        // Find if this location requires Rack (e.g. if it is an Accessory location)
        // Actually the logic is simpler: if selectedItem is accessory, we show Rack selector.

        setSelectedUbicacion(ubicacionId);
        setSubUbicacionSugerida(null);
        setAvailableSubLocations([]);

        // If it's an accessory and just changed location, we might wait for rack if it's required
        // But let's check availability anyway to show the list of sub-locations
        checkAvailability(ubicacionId, selectedRack || undefined);
    };

    const handleRackChange = (rack: string) => {
        setSelectedRack(rack);
        setSubUbicacionSugerida(null);
        setAvailableSubLocations([]);

        if (selectedUbicacion) {
            checkAvailability(selectedUbicacion, rack);
        }
    }

    const checkAvailability = async (ubicacionId: string, rack?: string) => {
        if (!ubicacionId || !entradaId) return;

        setLoadingSubLocation(true);
        try {
            const [suggested, all] = await Promise.all([
                ubicacionesApi.getNextSubLocation(ubicacionId, entradaId, rack),
                ubicacionesApi.getSubLocations(ubicacionId, rack)
            ]);

            // Natural sort on frontend as failsafe
            const sortedAll = Array.isArray(all) ? [...all].sort((a, b) =>
                (a.nombre || '').localeCompare(b.nombre || '', undefined, { numeric: true, sensitivity: 'base' })
            ) : [];

            setSubUbicacionSugerida(suggested);
            setAvailableSubLocations(sortedAll);
        } catch (error) {
            console.error('Error getting next sub-location:', error);
            toast.error('Error al obtener sub-ubicación disponible');
        } finally {
            setLoadingSubLocation(false);
        }
    }

    // Handler for saving location
    const handleSaveUbicacion = async () => {
        if (!selectedItem || !entradaId || !selectedUbicacion) return;

        try {
            const dataToUpdate = {
                id_ubicacion: selectedUbicacion,
                id_sub_ubicacion: subUbicacionSugerida?.id_sub_ubicacion || null,
                estado: 'En Espera',
            };

            if (selectedItem.tipo === 'equipo') {
                await entradasApi.updateDetalle(selectedItem.id, dataToUpdate);
            } else {
                const accessoryData = {
                    ubicacion: selectedUbicacion,
                    sub_ubicacion: subUbicacionSugerida?.id_sub_ubicacion || null,
                    estado: 'En Espera',
                    rack: selectedRack ? `Rack ${selectedRack}` : undefined
                };
                await entradasApi.updateAccesorio(selectedItem.id, accessoryData);
            }

            toast.success('Ubicación asignada correctamente');
            setUbicarModalOpen(false);
            loadDetails(entradaId); // Reload details to show new location
            resetUbicarState();
        } catch (error) {
            console.error('Error saving location:', error);
            toast.error('Error al guardar la ubicación');
        }
    };

    const getSelectedItemDetails = () => {
        if (!selectedItem) return null;
        if (selectedItem.tipo === 'equipo') {
            return detalles.find(d => d.id_detalles === selectedItem.id);
        }
        return accesorios.find(a => a.id_accesorio === selectedItem.id);
    };

    const getFilteredLocations = () => {
        const item = getSelectedItemDetails();
        if (!item) return ubicaciones;

        return ubicaciones.filter(u => {
            if (selectedItem?.tipo === 'accesorio') {
                return u.Clase === 'Accesorio';
            } else {
                // Equipment: Match Class OR "Todas las clases"
                return u.Clase === item.clase || u.Clase === 'Todas las clases';
            }
        });
    };

    const handleAttemptCloseUbicar = () => {
        if (selectedUbicacion) {
            setShowCloseConfirm(true);
        } else {
            setUbicarModalOpen(false);
            resetUbicarState();
        }
    };

    const confirmCloseUbicar = () => {
        setShowCloseConfirm(false);
        setUbicarModalOpen(false);
        resetUbicarState();
    };

    const loadDetails = async (id: string) => {
        try {
            setLoading(true);
            const [entradaData, detallesData, accesoriosData] = await Promise.all([
                entradasApi.getById(id),
                entradasApi.getDetalles(id),
                entradasApi.getAccesorios(id)
            ]);
            setEntrada(entradaData);
            setDetalles(Array.isArray(detallesData) ? detallesData : []);
            setAccesorios(Array.isArray(accesoriosData) ? accesoriosData : []);
        } catch (error) {
            console.error('Error loading entrada details:', error);
            toast.error('Error al cargar los detalles de la entrada');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateQR = async (item: any) => {
        try {
            await generateQRLabel({
                serial: item.serial_equipo || item.serial
            });
            toast.success('Etiqueta generada correctamente');
        } catch (error) {
            console.error('Error generating QR:', error);
            toast.error('Error al generar la etiqueta');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Por Ubicar': return 'bg-amber-50 text-amber-700 border-amber-100/50';
            case 'Cerrado': return 'bg-emerald-50 text-emerald-700 border-emerald-100/50';
            default: return 'bg-slate-50 text-slate-700 border-slate-100/50';
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
                <DialogContent className="max-w-[95vw] md:max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-50/95 backdrop-blur-xl border-slate-200/50 shadow-2xl rounded-[2.5rem]">
                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Header Premium */}
                        <div className="flex items-center justify-between p-8 border-b border-slate-200/50 bg-slate-50/50">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[2rem] bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200">
                                    <FileText className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="flex items-center gap-3 mb-1 text-3xl font-black text-slate-900 tracking-tighter">
                                        Folio <span className="text-slate-400">#{entrada?.folio || '...'}</span>
                                    </DialogTitle>
                                    <p className="text-slate-500 text-sm font-medium">Gestión integral de entrada al taller Raymond</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {entrada && entrada.prioridad !== 'Ubicado' && detalles.length > 0 && detalles.every(d => d.id_sub_ubicacion) && accesorios.every(a => a.sub_ubicacion) && (
                                    <button
                                        onClick={handleUbicarEquipos}
                                        disabled={isUbiking}
                                        className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 animate-in zoom-in-95 duration-300"
                                    >
                                        {isUbiking ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-5 h-5" />}
                                        Ubicar equipos
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all group active:scale-95"
                                >
                                    <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            <div className="p-10 space-y-12">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-6">
                                        <div className="relative">
                                            <Loader2 className="w-16 h-16 animate-spin text-slate-900 relative z-10" />
                                            <div className="absolute inset-0 w-16 h-16 rounded-full bg-slate-200 animate-ping opacity-25"></div>
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Sincronizando expedientes...</p>
                                    </div>
                                ) : entrada ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                        {/* Left Column: Info & Evidence */}
                                        <div className="lg:col-span-8 space-y-12">
                                            {/* Info Cards Grid */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                {[
                                                    { label: 'Cliente', value: entrada.rel_cliente?.nombre_cliente || entrada.cliente, icon: User },
                                                    { label: 'Registro', value: new Date(entrada.fecha_creacion).toLocaleDateString(), icon: Calendar },
                                                    { label: 'Encargado', value: entrada.usuario_asignado, icon: UserCheck },
                                                    { label: 'Factura', value: entrada.factura || 'Sin factura', icon: FileText },
                                                ].map((item, i) => (
                                                    <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-3 transition-all hover:shadow-md">
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                                                            <item.icon className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.value || '-'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Comentarios Section */}
                                            {entrada.comentario && (
                                                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                                        <MessageSquare className="w-4 h-4" /> Observaciones Generales
                                                    </p>
                                                    <p className="text-white/90 text-lg font-medium italic leading-relaxed">
                                                        "{entrada.comentario}"
                                                    </p>
                                                </div>
                                            )}

                                            {/* Evidencias Visuales */}
                                            {(entrada.evidencia_1 || entrada.evidencia_2 || entrada.evidencia_3) && (
                                                <section className="space-y-6">
                                                    <div className="flex items-center justify-between px-2">
                                                        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                                            <ImageIcon className="w-6 h-6 text-slate-400" />
                                                            Evidencias del Ingreso
                                                        </h3>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-6">
                                                        {[entrada.evidencia_1, entrada.evidencia_2, entrada.evidencia_3]
                                                            .filter(Boolean)
                                                            .map((evidencia, i) => (
                                                                <div key={i} className="group relative aspect-square bg-white rounded-[2.5rem] p-3 border border-slate-100 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden">
                                                                    <div className="w-full h-full rounded-[1.8rem] overflow-hidden">
                                                                        <img
                                                                            src={evidencia}
                                                                            alt={`Evidencia ${i + 1}`}
                                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                                        />
                                                                    </div>
                                                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                                                                        <a
                                                                            href={evidencia}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-500"
                                                                        >
                                                                            Ver Original
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </section>
                                            )}

                                            {/* Inventario de Equipos Section */}
                                            <section className="space-y-6">
                                                <div className="flex items-center justify-between px-2">
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                                        <Package className="w-6 h-6 text-slate-400" />
                                                        Inventario de Equipos ({detalles.length})
                                                    </h3>
                                                </div>
                                                <div className="space-y-4">
                                                    {detalles.map((detalle, idx) => (
                                                        <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:border-slate-300 transition-all group relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 group-hover:bg-slate-100/50 rounded-bl-[5rem] -mr-10 -mt-10 -z-0 transition-colors"></div>

                                                            <div className="relative z-10 space-y-8">
                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                                    <div className="flex items-start gap-6">
                                                                        {/* Imagen Principal Equipo */}
                                                                        <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-all">
                                                                            {detalle.evidencia_1 ? (
                                                                                <img src={detalle.evidencia_1} className="w-full h-full object-cover" alt={detalle.modelo} />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                                                    <Package className="w-10 h-10" />
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div>
                                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Modelo y Clase</p>
                                                                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                                                                                {detalle.modelo}
                                                                                <span className="text-xs font-black bg-slate-900 text-white px-3 py-1 rounded-xl uppercase tracking-widest shadow-lg shadow-slate-200 self-center">
                                                                                    {detalle.clase}
                                                                                </span>
                                                                            </h4>
                                                                            <p className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded w-fit mt-2 border border-slate-100 uppercase">Serial: {detalle.serial_equipo || detalle.serial}</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                                                <MapPin className="w-2.5 h-2.5" /> Ubicación
                                                                            </p>
                                                                            <p className="text-[11px] font-bold text-slate-700">{detalle.rel_ubicacion?.nombre_ubicacion || 'N/A'}</p>
                                                                            <p className="text-[9px] text-slate-400 font-medium">Sub: {detalle.rel_sub_ubicacion?.nombre || 'General'}</p>
                                                                        </div>
                                                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                                                <Tag className="w-2.5 h-2.5" /> Estatus
                                                                            </p>
                                                                            <p className="text-[11px] font-bold text-slate-700">{detalle.estado || 'Recibido'}</p>
                                                                            <p className="text-[9px] text-slate-400 font-medium">{detalle.calificacion || '-'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Acciones para el Equipo */}
                                                                <div className="flex flex-wrap gap-3 pt-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedItem({ id: detalle.id_detalles, tipo: 'equipo' });
                                                                            setUbicarModalOpen(true);
                                                                        }}
                                                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 active:scale-95"
                                                                    >
                                                                        <Move className="w-3.5 h-3.5" /> Ubicar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEvalItem({
                                                                                id: detalle.id_detalles,
                                                                                serial: detalle.serial_equipo || detalle.serial,
                                                                                modelo: detalle.modelo,
                                                                                tipo: 'equipo',
                                                                                clase: detalle.clase
                                                                            });
                                                                            setEvalModalOpen(true);
                                                                        }}
                                                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                                                    >
                                                                        <Star className="w-3.5 h-3.5" /> Calificar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleGenerateQR(detalle)}
                                                                        className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                                                    >
                                                                        <QrCode className="w-3.5 h-3.5" /> Generar QR
                                                                    </button>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                                                                    <div className="space-y-1">
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                            <Truck className="w-3 h-3" /> Origen
                                                                        </p>
                                                                        <p className="text-xs font-bold text-slate-600 truncate">{detalle.rel_serie_info?.LUGAR_DE_ENTRADA || '-'}</p>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                            <User className="w-3 h-3" /> Cliente Final
                                                                        </p>
                                                                        <p className="text-xs font-bold text-slate-600 truncate">{detalle.rel_serie_info?.CLIENTE || '-'}</p>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                            <ShoppingBag className="w-3 h-3" /> Unidad de Venta
                                                                        </p>
                                                                        <p className="text-xs font-bold text-slate-600 truncate">{detalle.rel_serie_info?.UNIDAD_DE_VENTA || '-'}</p>
                                                                    </div>
                                                                </div>

                                                                {detalle.comentarios && (
                                                                    <div className="bg-slate-50/50 p-4 rounded-2xl border-l-4 border-slate-900 italic">
                                                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                                                            "{detalle.comentarios}"
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {/* Historial Section */}
                                                                <div className="mt-8 pt-8 border-t border-slate-50">
                                                                    <HistoryView itemId={detalle.id_detalles} tipo="equipo" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>

                                            {/* Inventario de Accesorios Section */}
                                            {accesorios.length > 0 && (
                                                <section className="space-y-6 pt-6 border-t border-slate-100">
                                                    <div className="flex items-center justify-between px-2">
                                                        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                                            <Wrench className="w-6 h-6 text-slate-400" />
                                                            Accesorios Vinculados ({accesorios.length})
                                                        </h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {accesorios.map((acc, idx) => (
                                                            <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
                                                                <div className="absolute top-0 left-0 w-2 h-full bg-slate-100 group-hover:bg-slate-900 transition-colors"></div>
                                                                <div className="relative z-10 space-y-4">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex items-start gap-4">
                                                                            {/* Imagen Accesorio */}
                                                                            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                                                                                {acc.evidencia ? (
                                                                                    <img src={acc.evidencia} className="w-full h-full object-cover" alt={acc.modelo} />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                                                        <Wrench className="w-8 h-8" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{acc.tipo}</p>
                                                                                <p className="font-black text-slate-800 text-lg tracking-tight">{acc.modelo}</p>
                                                                                <p className="text-[10px] font-mono font-bold text-slate-400">SN: {acc.serial}</p>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-[9px] font-black bg-slate-50 text-slate-600 border border-slate-100 px-3 py-1 rounded-xl uppercase">
                                                                            {acc.estado_acc || acc.estado}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-4 pt-2">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <MapPin className="w-3 h-3 text-slate-300" />
                                                                            <span className="text-[10px] font-bold text-slate-500">{acc.rel_ubicacion?.nombre_ubicacion || 'Almacen Acc.'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Tag className="w-3 h-3 text-slate-300" />
                                                                            <span className="text-[10px] font-bold text-slate-500">{acc.rel_sub_ubicacion?.nombre || 'General'}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Acciones para Accesorio */}
                                                                    <div className="flex gap-2 pt-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedItem({ id: acc.id_accesorio, tipo: 'accesorio' });
                                                                                setUbicarModalOpen(true);
                                                                            }}
                                                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                                                        >
                                                                            <Move className="w-3 h-3" /> Ubicar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEvalItem({
                                                                                    id: acc.id_accesorio,
                                                                                    serial: acc.serial,
                                                                                    modelo: acc.modelo,
                                                                                    tipo: 'accesorio'
                                                                                });
                                                                                setEvalModalOpen(true);
                                                                            }}
                                                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                                                        >
                                                                            <Star className="w-3 h-3" /> Calificar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleGenerateQR(acc)}
                                                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white hover:bg-slate-50 border border-slate-100 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                                                        >
                                                                            <QrCode className="w-3 h-3" /> QR
                                                                        </button>
                                                                    </div>

                                                                    {/* Historial Section */}
                                                                    <div className="mt-4 pt-4 border-t border-slate-50">
                                                                        <HistoryView itemId={acc.id_accesorio} tipo="accesorio" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}
                                        </div>

                                        {/* Right Column: Signatures & Legal */}
                                        <div className="lg:col-span-4 space-y-12">
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 px-2">
                                                <CheckCircle2 className="w-6 h-6 text-slate-400" />
                                                Formalización
                                            </h3>

                                            <div className="space-y-6">
                                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-xl space-y-8 relative overflow-hidden">
                                                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-slate-50 rounded-tl-[8rem] -mr-12 -mb-12 -z-0 opacity-50"></div>

                                                    <div className="relative z-10 space-y-10">
                                                        {/* Firma Entrega */}
                                                        <div className="space-y-4 text-center">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">CUSTODIA / ENTREGA</p>
                                                            <div className="w-full aspect-[4/3] bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center p-6 group transition-all hover:bg-white hover:border-slate-300">
                                                                {entrada.firma_entrega ? (
                                                                    <img src={entrada.firma_entrega} className="max-h-full max-w-full object-contain mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity" alt="Firma Entrega" />
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                                                        <AlertCircle className="w-8 h-8" />
                                                                        <span className="text-[10px] font-bold uppercase">Sin captura</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-800 border-b-2 border-slate-100 inline-block pb-1 text-base">{entrada.nombre_entrega || '-'}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Personal Autorizado</p>
                                                            </div>
                                                        </div>

                                                        <div className="h-px bg-slate-100 mx-10"></div>

                                                        {/* Firma Recibo */}
                                                        <div className="space-y-4 text-center text-indigo-900">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">RECEPCIÓN ALMACÉN</p>
                                                            <div className="w-full aspect-[4/3] bg-indigo-50/30 rounded-[2rem] border-2 border-dashed border-indigo-100 flex items-center justify-center p-6 group transition-all hover:bg-white hover:border-indigo-200">
                                                                {entrada.firma_recibo ? (
                                                                    <img src={entrada.firma_recibo} className="max-h-full max-w-full object-contain mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity" alt="Firma Recibo" />
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                                                        <AlertCircle className="w-8 h-8" />
                                                                        <span className="text-[10px] font-bold uppercase">Captura pendiente</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-indigo-900 border-b-2 border-indigo-100 inline-block pb-1 text-base">{entrada.usuario_asignado || '-'}</p>
                                                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-1">Almacén Raymond</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 shadow-sm flex items-start gap-4">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
                                                        <AlertCircle className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mt-1">Aviso Legal</p>
                                                        <p className="text-[10px] text-amber-800/70 font-medium leading-relaxed mt-1">
                                                            Este expediente digital certifica la condición física de los activos al momento de su ingreso. Cualquier omisión en las evidencias invalida reclamaciones posteriores.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 p-12">
                                        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-8 border border-slate-100">
                                            <AlertCircle className="w-12 h-12 text-slate-200" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-400 tracking-tighter mb-2 uppercase italic">Folio no localizado</h3>
                                        <p className="text-sm font-medium opacity-60 max-w-[200px] text-center">Verifique el folio e intente nuevamente el acceso.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Ubicar */}
            <Dialog open={ubicarModalOpen} onOpenChange={(open) => {
                if (!open) handleAttemptCloseUbicar();
                else setUbicarModalOpen(true);
            }}>
                <DialogContent className="max-w-xl max-h-[90vh] p-0 overflow-y-auto bg-white rounded-[2.5rem] shadow-2xl border-slate-100 block">
                    <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-10 -mt-10"></div>
                        <DialogHeader>
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm shadow-inner">
                                <Move className="w-8 h-8 text-indigo-200" />
                            </div>
                            <DialogTitle className="text-3xl font-black tracking-tighter text-white">
                                Asignar Ubicación
                            </DialogTitle>
                            <DialogDescription className="text-indigo-200 font-medium text-lg">
                                {getSelectedItemDetails()?.modelo || 'Elemento'}
                                <span className="opacity-60 text-sm ml-2 font-normal">
                                    {getSelectedItemDetails()?.serial_equipo || getSelectedItemDetails()?.serial || 'SN: ---'}
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Info del Item */}
                        {getSelectedItemDetails() && (
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                    {selectedItem?.tipo === 'equipo' ? <Package className="w-6 h-6 text-slate-400" /> : <Wrench className="w-6 h-6 text-slate-400" />}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clase / Tipo</p>
                                    <p className="font-bold text-slate-700">
                                        {getSelectedItemDetails()?.clase || getSelectedItemDetails()?.tipo || 'General'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Selector de Ubicación */}
                        <div className="space-y-4">
                            <label className="text-sm font-black text-slate-700 uppercase tracking-wide">Seleccionar Zona</label>
                            <select
                                value={selectedUbicacion}
                                onChange={(e) => handleUbicacionChange(e.target.value)}
                                className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                            >
                                <option value="">-- Seleccionar --</option>
                                {getFilteredLocations()
                                    .map(u => (
                                        <option key={u.id_ubicacion} value={u.id_ubicacion}>
                                            {u.nombre_ubicacion} {u.Clase ? `(Clase ${u.Clase})` : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Selector de Rack (Solo Accesorios) */}
                        {selectedItem?.tipo === 'accesorio' && selectedUbicacion && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                                <label className="text-sm font-black text-slate-700 uppercase tracking-wide">Seleccionar Rack</label>
                                <select
                                    value={selectedRack}
                                    onChange={(e) => handleRackChange(e.target.value)}
                                    className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                >
                                    <option value="">-- Seleccionar Rack --</option>
                                    {Array.from({ length: 15 }, (_, i) => i + 1).map(num => (
                                        <option key={num} value={num}>Rack {num}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Resultado de Sub-Ubicación */}
                        <div className={`transition-all duration-300 ${selectedUbicacion ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 grayscale pointer-events-none'}`}>
                            <label className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 block">Ubicación Sugerida</label>

                            {loadingSubLocation ? (
                                <div className="h-24 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-3 text-slate-400 animate-pulse">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="font-bold text-xs uppercase tracking-widest">Buscando disponibilidad...</span>
                                </div>
                            ) : availableSubLocations.length > 0 ? (
                                <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                                    {subUbicacionSugerida ? 'Ubicación Sugerida' : 'Seleccionar Ubicación'}
                                                </p>
                                                <p className="text-xs text-slate-400 font-medium">
                                                    {subUbicacionSugerida ? 'Hemos encontrado un espacio libre' : 'Selecciona un espacio manualmente'}
                                                </p>
                                            </div>
                                        </div>
                                        {subUbicacionSugerida && (
                                            <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            </div>
                                        )}
                                    </div>

                                    <select
                                        value={subUbicacionSugerida?.id_sub_ubicacion || subUbicacionSugerida?.id_sububicacion || ''}
                                        onChange={(e) => {
                                            const selected = availableSubLocations.find(sub =>
                                                (sub.id_sub_ubicacion === e.target.value) || (sub.id_sububicacion === e.target.value)
                                            );
                                            setSubUbicacionSugerida(selected);
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
                                    >
                                        <option value="" disabled>-- Seleccionar Sub-ubicación --</option>
                                        {availableSubLocations.map((sub) => {
                                            const subId = sub.id_sub_ubicacion || sub.id_sububicacion;
                                            const isAccesoriosZone = selectedUbicacion === 'ba0cae1e';
                                            const isOccupied = sub.ubicacion_ocupada && !isAccesoriosZone;

                                            return (
                                                <option key={subId} value={subId} disabled={isOccupied}>
                                                    {sub.nombre} {sub.ubicacion_ocupada ? '(Ocupado)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            ) : selectedUbicacion ? (
                                <div className="p-6 bg-rose-50 rounded-[2rem] border border-rose-100 shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500 shrink-0 shadow-inner">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest mt-1">Zona Saturada</p>
                                        <p className="text-sm font-bold text-rose-700/80 leading-tight">Sin espacios disponibles</p>
                                        <p className="text-[10px] text-rose-600/60 font-medium mt-1">No se encontraron sub-ubicaciones libres en esta zona.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2 transition-all">
                                    <MapPin className="w-6 h-6 opacity-20" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Seleccione una zona para continuar</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={handleAttemptCloseUbicar}
                                className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveUbicacion}
                                disabled={!subUbicacionSugerida}
                                className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 disabled:shadow-none transition-all active:scale-[0.98]"
                            >
                                Confirmar Ubicación
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog >

            {/* Modal de Confirmación de Ubicación Masiva */}
            <Dialog open={showUbicarConfirm} onOpenChange={setShowUbicarConfirm}>
                <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2rem]">
                    <div className="bg-gradient-to-br from-indigo-700 to-indigo-800 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-10 -mt-10"></div>
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm shadow-inner">
                            <PackageCheck className="w-8 h-8 text-indigo-50" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tighter text-white">
                            ¿Ubicar todos los equipos?
                        </DialogTitle>
                        <DialogDescription className="text-indigo-50/80 font-medium text-sm mt-2">
                            Esta acción los marcará como <span className="text-white font-black italic">"Ingresado"</span> y ocupará sus posiciones en el almacén.
                        </DialogDescription>
                    </div>
                    <div className="p-8 flex gap-3 bg-slate-50/50">
                        <button
                            onClick={() => setShowUbicarConfirm(false)}
                            className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmUbicarEquipos}
                            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all active:scale-95"
                        >
                            Ubicar ahora
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmación de Cierre */}
            <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
                <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2rem]">
                    <div className="p-8 space-y-6">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="text-center space-y-2">
                            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">¿Descartar cambios?</DialogTitle>
                            <DialogDescription className="text-sm text-slate-500 font-medium">
                                Tienes una ubicación seleccionada que no ha sido guardada. Si sales ahora, perderás estos cambios.
                            </DialogDescription>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCloseConfirm(false)}
                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Continuar
                            </button>
                            <button
                                onClick={confirmCloseUbicar}
                                className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 transition-all"
                            >
                                Descartar
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <EvaluacionModal
                open={evalModalOpen}
                onClose={() => {
                    setEvalModalOpen(false);
                    setEvalItem(null);
                }}
                item={evalItem}
                onSuccess={() => loadDetails(entradaId!)}
            />
        </>
    );
}
