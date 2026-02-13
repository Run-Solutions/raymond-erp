'use client';

import { useState, useEffect } from 'react';
import {
    X,
    ChevronRight,
    ChevronLeft,
    QrCode,
    Search,
    Trash2,
    Upload,
    Plus,
    Box,
    Truck,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { salidasApi, CreateSalidaDto, CreateDetalleDto, CreateAccesorioDto } from '@/services/taller-r1/salidas.service';
import { cn } from '@/lib/utils';
import { Scanner } from '@yudiel/react-qr-scanner';

interface NuevaSalidaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function NuevaSalidaModal({ isOpen, onClose, onSuccess }: NuevaSalidaModalProps) {
    const [loading, setLoading] = useState(false);
    const [nextFolio, setNextFolio] = useState<string>('');
    const [availableEquipos, setAvailableEquipos] = useState<any[]>([]);
    const [availableAccesorios, setAvailableAccesorios] = useState<any[]>([]);

    // UI State for single-page layout
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [addingType, setAddingType] = useState<'Equipos' | 'Accesorios' | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [scanning, setScanning] = useState(false);

    const [basicInfo, setBasicInfo] = useState<CreateSalidaDto>({
        tiene_remision: false,
        numero_remision: '',
        numero_transporte: '',
        pedido_venta: '',
        cliente: '',
        tipo_elemento: 'Equipos', // Default selection mode
        razon_social: '',
        direccion_cliente: '',
        rfc: '',
        contacto: '',
        telefono: '',
    });

    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [observations, setObservations] = useState('');
    const [evidencia, setEvidencia] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            loadAvailableItems();
            loadNextFolio();
            // Reset states when modal opens
            setBasicInfo({
                tiene_remision: false,
                numero_remision: '',
                numero_transporte: '',
                pedido_venta: '',
                cliente: '',
                tipo_elemento: 'Equipos',
                razon_social: '',
                direccion_cliente: '',
                rfc: '',
                contacto: '',
                telefono: '',
            });
            setSelectedItems([]);
            setObservations('');
            setEvidencia('');
            setLoading(false);
            setIsAddingItem(false);
            setShowScanner(false);
            setScanning(false);
        }
    }, [isOpen]);

    const loadNextFolio = async () => {
        try {
            const res = await salidasApi.getNextFolio();
            setNextFolio(res.folio);
        } catch (error) {
            console.error('Error loading next folio:', error);
        }
    };

    const loadAvailableItems = async () => {
        try {
            const [equipos, accesorios] = await Promise.all([
                salidasApi.getAvailableEquipos(),
                salidasApi.getAvailableAccesorios()
            ]);
            setAvailableEquipos(Array.isArray(equipos) ? equipos : []);
            setAvailableAccesorios(Array.isArray(accesorios) ? accesorios : []);
        } catch (error) {
            console.error('Error loading available items:', error);
        }
    };

    const handleScan = async (result: any) => {
        if (!result) return;
        const serial = result[0].rawValue;
        setScanning(true);

        try {
            const response = await salidasApi.scanSerial(serial);
            if (response && response.data) {
                const item = response.data;
                const type = response.type; // 'equipo' or 'accesorio' from backend scanSerial

                // Add to selected items if not already there
                const idField = type === 'equipo' ? 'id_detalles' : 'id_accesorio';
                if (selectedItems.find(i => (i.id_detalles || i.id_accesorio) === (item.id_detalles || item.id_accesorio))) {
                    toast.warning('Este elemento ya ha sido agregado');
                } else {
                    setSelectedItems([...selectedItems, { ...item, _type: type }]);
                    toast.success('Elemento agregado');
                    setShowScanner(false);
                    setIsAddingItem(false); // Close nested modal after successful scan
                }
            }
        } catch (error) {
            toast.error('No se encontró el elemento o no está en estado Ingresado');
        } finally {
            setScanning(false);
        }
    };

    const handleAddItem = (item: any) => {
        const itemId = item.id_detalles || item.id_accesorio;
        if (selectedItems.find(i => (i.id_detalles || i.id_accesorio) === itemId)) {
            toast.warning('Este elemento ya ha sido agregado');
            return;
        }
        setSelectedItems([...selectedItems, { ...item, _type: addingType === 'Equipos' ? 'equipo' : 'accesorio' }]);
        toast.success('Elemento agregado');
    };



    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setEvidencia(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (selectedItems.length === 0) {
            toast.error('Debes seleccionar al menos un elemento');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Salida
            const salidaData: CreateSalidaDto = {
                ...basicInfo,
                observaciones: observations,
                evidencia,
            };
            const newSalida = await salidasApi.create(salidaData);

            // 2. Add Items
            for (const item of selectedItems) {
                if (item._type === 'equipo') {
                    const detalleData: CreateDetalleDto = {
                        id_equipo: item.id_detalles,
                        tipo_salida: 'Embarque', // Default
                        serial_equipos: item.serial_equipo,
                        id_ubicacion: item.id_ubicacion,
                        id_sub_ubicacion: item.id_sub_ubicacion,
                    };
                    await salidasApi.addDetalle(newSalida.id_salida, detalleData);
                } else {
                    const accData: CreateAccesorioDto = {
                        id_accesorio: item.id_accesorio,
                        modelo: item.modelo,
                        serial: item.serial,
                        voltaje: item.voltaje,
                    };
                    await salidasApi.addAccesorio(newSalida.id_salida, accData);
                }
            }

            toast.success('Salida registrada correctamente');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Error al registrar la salida');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="relative bg-white w-full sm:max-w-4xl max-h-screen sm:max-h-[92vh] flex flex-col sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                                Nueva Salida
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registro de Egreso R1</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            Salida de Taller
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Unified Content Container */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar scroll-smooth">

                    {/* Folio Banner */}
                    <div className="mb-8 p-8 bg-slate-900 rounded-[2.5rem] flex items-center justify-center border border-slate-800 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent" />
                        <span className="text-5xl font-black text-white tracking-[0.2em] z-10 drop-shadow-xl uppercase italic">
                            {nextFolio || '...'}
                        </span>
                        <div className="absolute bottom-4 right-8 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                            Folio de Salida R1
                        </div>
                    </div>

                    <div className="space-y-10 pb-20">
                        {/* SECTION 1: Business Info & Remission */}
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2 mb-6">
                                <Box className="w-5 h-5 text-red-600" />
                                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Información del Cliente y Egreso</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100">
                                <div className="space-y-6 col-span-2 md:col-span-1">
                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div>
                                            <h4 className="font-bold text-slate-900">¿Tiene remisión u orden?</h4>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Define si requiere número de folio externo</p>
                                        </div>
                                        <button
                                            onClick={() => setBasicInfo({ ...basicInfo, tiene_remision: !basicInfo.tiene_remision })}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                                basicInfo.tiene_remision ? "bg-red-600" : "bg-slate-200"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                                                    basicInfo.tiene_remision ? "translate-x-6" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                    </div>

                                    {basicInfo.tiene_remision && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 px-1">Número de Remisión / OC</label>
                                            <input
                                                type="text"
                                                value={basicInfo.numero_remision}
                                                onChange={(e) => setBasicInfo({ ...basicInfo, numero_remision: e.target.value })}
                                                placeholder="Ej: R-45920"
                                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:col-span-1">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1 flex items-center gap-1.5">
                                            <Truck className="w-3 h-3 text-red-500" />
                                            Número de Transporte
                                        </label>
                                        <input
                                            type="text"
                                            value={basicInfo.numero_transporte}
                                            onChange={(e) => setBasicInfo({ ...basicInfo, numero_transporte: e.target.value })}
                                            placeholder="Placas o folio"
                                            className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1 flex items-center gap-1.5">
                                            <Search className="w-3 h-3 text-red-500" />
                                            Pedido de Venta
                                        </label>
                                        <input
                                            type="text"
                                            value={basicInfo.pedido_venta || ''}
                                            onChange={(e) => setBasicInfo({ ...basicInfo, pedido_venta: e.target.value })}
                                            placeholder="Folio de venta"
                                            className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1">Cliente</label>
                                        <input
                                            type="text"
                                            value={basicInfo.cliente || ''}
                                            onChange={(e) => setBasicInfo({ ...basicInfo, cliente: e.target.value })}
                                            placeholder="Nombre del cliente"
                                            className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 2: Items Selection (Inline List like Entradas) */}
                        <section className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-red-600" />
                                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Elementos de Salida</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setAddingType('Equipos'); setIsAddingItem(true); }}
                                        className="h-10 px-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-slate-200"
                                    >
                                        <Box className="w-3.5 h-3.5" /> + Equipo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAddingType('Accesorios'); setIsAddingItem(true); }}
                                        className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> + Accesorio
                                    </button>
                                </div>
                            </div>

                            {selectedItems.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50">
                                    <Box className="w-12 h-12 mb-4 text-slate-200" />
                                    <p className="font-black text-sm uppercase tracking-widest">No hay elementos seleccionados</p>
                                    <p className="text-[10px] mt-1 font-bold">Añade montacargas o consumibles para la salida</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo / Ubicación</th>
                                                <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedItems.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-all">
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                                            item._type === 'equipo' ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                                        )}>
                                                            {item._type === 'equipo' ? 'EQUIPO' : 'ACCESORIO'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-black text-slate-900 tracking-tight">
                                                        <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
                                                            {item.serial_equipo || item.serial}
                                                        </code>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700 text-xs">{item.modelo}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.id_ubicacion || item.ubicacion || 'Sin Ubicación'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => {
                                                                const id = item.id_detalles || item.id_accesorio;
                                                                setSelectedItems(selectedItems.filter(i => (i.id_detalles || i.id_accesorio) !== id));
                                                            }}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* SECTION 3: Evidence & Observations */}
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                            <div className="flex items-center gap-2 mb-6">
                                <Plus className="w-5 h-5 text-red-600" />
                                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Notas y Evidencias</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Observaciones Generales</label>
                                    <textarea
                                        value={observations}
                                        onChange={(e) => setObservations(e.target.value)}
                                        rows={6}
                                        placeholder="Detalles adicionales, estado de la carga, personal de transporte..."
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900 resize-none shadow-sm"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Evidencia Fotográfica (Remisión/Carga)</label>
                                    <label className={cn(
                                        "relative flex flex-col items-center justify-center w-full h-[180px] border-4 border-dashed rounded-[2.5rem] transition-all cursor-pointer group",
                                        evidencia ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                                    )}>
                                        {evidencia ? (
                                            <>
                                                <img
                                                    src={evidencia}
                                                    alt="Evidencia"
                                                    className="absolute inset-0 w-full h-full object-cover rounded-[2.25rem] brightness-75 group-hover:brightness-50 transition-all"
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all font-black uppercase text-xs tracking-widest">
                                                    <Upload className="w-8 h-8 mb-2" />
                                                    Cambiar Foto
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300">
                                                    <Upload className="w-8 h-8" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presiona para cargar</span>
                                            </div>
                                        )}
                                        <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* NESTED MODAL FOR ADDING ITEMS */}
                {isAddingItem && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                                    Añadir {addingType}
                                </h4>
                                <button onClick={() => { setIsAddingItem(false); setShowScanner(false); }} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowScanner(true)}
                                        className="flex-1 flex items-center justify-center gap-3 p-6 bg-red-600 text-white rounded-[24px] hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 font-black text-sm uppercase tracking-widest"
                                    >
                                        <QrCode className="w-6 h-6" />
                                        Escanear QR
                                    </button>
                                </div>

                                {showScanner && (
                                    <div className="relative rounded-[32px] overflow-hidden border-4 border-slate-900 shadow-2xl animate-in zoom-in duration-300">
                                        <Scanner
                                            onScan={(result: any[]) => {
                                                handleScan(result);
                                                // The handleScan function will close the modal if successful
                                            }}
                                            onError={(error: any) => toast.error('Error con la cámara')}
                                            styles={{ container: { width: '100%', height: '300px' } }}
                                        />
                                        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                                            <div className="w-48 h-48 border-2 border-red-500 rounded-3xl animate-pulse" />
                                        </div>
                                        <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"><X className="w-4 h-4" /></button>
                                        {scanning && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-white font-black text-xs uppercase tracking-widest">Buscando elemento...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="relative group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                                    <select
                                        className="w-full pl-14 pr-6 py-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-black text-slate-900 appearance-none text-sm uppercase"
                                        onChange={(e) => {
                                            const currentList = addingType === 'Equipos' ? availableEquipos : availableAccesorios;
                                            const item = (currentList || []).find(i => (i.id_detalles || i.id_accesorio) === e.target.value);
                                            if (item) {
                                                handleAddItem(item);
                                                setIsAddingItem(false); // Close on selection
                                                setShowScanner(false); // Also hide scanner if it was open
                                            }
                                        }}
                                        value=""
                                    >
                                        <option value="" disabled>Selección manual de {addingType}...</option>
                                        {(Array.isArray(addingType === 'Equipos' ? availableEquipos : availableAccesorios)
                                            ? (addingType === 'Equipos' ? availableEquipos : availableAccesorios)
                                            : []).map(item => (
                                                <option key={item.id_detalles || item.id_accesorio} value={item.id_detalles || item.id_accesorio}>
                                                    {item.serial_equipo || item.serial} - {item.modelo} - [{item.estado || item.estado_acc}]
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer (Simplified) */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4 shrink-0 mt-auto">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-white text-slate-400 hover:text-slate-600 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || selectedItems.length === 0}
                        className="flex items-center gap-3 px-10 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Registrando...
                            </>
                        ) : (
                            <>
                                Registrar Salida
                                <CheckCircle2 className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
