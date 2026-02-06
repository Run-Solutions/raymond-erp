import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { entradasApi, Entrada } from '@/services/taller-r1/entradas.service';
import { Loader2, Calendar, User, UserCheck, AlertCircle, FileText, Package, Wrench, MessageSquare, CheckCircle2, Image as ImageIcon, X, MapPin, Tag, Truck, ShoppingBag, QrCode, Move, Printer } from 'lucide-react';
import { generateQRLabel } from '@/lib/generateQRLabel';
import { toast } from 'sonner';

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

    useEffect(() => {
        if (open && entradaId) {
            loadDetails(entradaId);
        } else {
            setEntrada(null);
            setDetalles([]);
            setAccesorios([]);
            setUbicarModalOpen(false);
            setSelectedItem(null);
        }
    }, [open, entradaId]);

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
                        <div className="flex items-center justify-between p-8 border-b border-slate-200/50 bg-white/50 backdrop-blur-md">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[2rem] bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200">
                                    <FileText className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                                            Folio <span className="text-slate-400">#{entrada?.folio || '...'}</span>
                                        </h2>
                                        <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(entrada?.estado || '')}`}>
                                            {entrada?.estado || 'Cargando'}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-sm font-medium">Gestión integral de entrada al taller Raymond</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all group active:scale-95"
                            >
                                <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            </button>
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
                                                                            onClick={() => handleGenerateQR(acc)}
                                                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white hover:bg-slate-50 border border-slate-100 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                                                        >
                                                                            <QrCode className="w-3 h-3" /> QR
                                                                        </button>
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
                                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Aviso Legal</p>
                                                        <p className="text-[10px] text-amber-800/70 font-medium leading-relaxed mt-1">
                                                            Este expediente digital certifica la condición física de los activos al momento de su ingreso. Cualquier omisión en las evidencias invalida reclamaciones posteriores.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                                        <AlertCircle className="w-32 h-32 mb-8 opacity-5 animate-pulse" />
                                        <h3 className="text-2xl font-black text-slate-400 tracking-tighter mb-2">Folio no localizado</h3>
                                        <p className="text-sm font-medium opacity-60">Verifique el folio e intente nuevamente el acceso.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Ubicar (Placeholder) */}
            <Dialog open={ubicarModalOpen} onOpenChange={setUbicarModalOpen}>
                <DialogContent className="max-w-xl p-10 bg-white rounded-[2.5rem] shadow-2xl border-slate-100">
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Move className="w-10 h-10 text-indigo-600" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">
                                Ubicar {selectedItem?.tipo === 'equipo' ? 'Equipo' : 'Accesorio'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium">
                                Gestión de ubicación física en almacén para el ítem {selectedItem?.id}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="bg-slate-50 p-8 rounded-[2rem] border border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Próximamente...</p>
                            <p className="text-slate-400 text-[10px] mt-2">Aquí aparecerá el selector de Rack y Nivel.</p>
                        </div>

                        <button
                            onClick={() => setUbicarModalOpen(false)}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                        >
                            Entendido
                        </button>
                    </div>
                </DialogContent>
            </Dialog >
        </>
    );
}
