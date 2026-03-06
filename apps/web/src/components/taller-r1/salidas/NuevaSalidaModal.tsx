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
import { clientesApi, Cliente } from '@/services/taller-r1/clientes.service';
import { cn } from '@/lib/utils';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuthTallerStore } from '@/store/auth-taller.store';

const OBLIGATORY_PHOTOS = [
    { key: 'foto_llave', label: 'Llave' },
    { key: 'foto_kit_tapon', label: 'Kit Tapón' },
    { key: 'foto_compartimento_baterias', label: 'Compartimento Baterías' },
    { key: 'foto_compartimento_operador', label: 'Compartimento Operador' },
    { key: 'foto_pernos_horquillas', label: 'Pernos Horquillas' },
    { key: 'foto_frente_equipo', label: 'Frente del Equipo' },
    { key: 'foto_posterior_equipo', label: 'Posterior equipo' },
];

const OPTIONAL_PHOTOS = [
    { key: 'foto_lineas_vida', label: 'Líneas de vida' },
    { key: 'foto_clamp_opc', label: 'Clamp OPC' },
    { key: 'foto_kit_aceite', label: 'Kit de aceite' },
];

const CHECKLIST_CATEGORIES = [
    {
        name: '1 - OPERACIONAL',
        type: 'ok_no_ok',
        items: [
            { id: 'op_velocidades', label: 'A - Todas las Velocidades Adelante/Reversa' },
            { id: 'op_levante', label: 'B - Función de levante de horquillas' },
            { id: 'op_auxiliares', label: 'C - Opera Todas las Funciones Auxiliares' },
            { id: 'op_carro_ajustado', label: 'D - DR- CARRO AJUSTADO' }
        ]
    },
    {
        name: '2 - ESTRUCTURAL',
        type: 'nueva_buen_estado',
        items: [
            { id: 'est_ruedas', label: 'A - RUEDAS' },
            { id: 'est_cils_levante', label: 'B - CILS. LEVANTE' },
            { id: 'est_transmision', label: 'C - TRANSMISION' },
            { id: 'est_carro', label: 'D - CARRO' },
            { id: 'est_traccion', label: 'E - U.de TRACCION' },
            { id: 'est_tapas_bateria', label: 'F - TAPAS DE BATERIA Y RODILLOS' },
            { id: 'est_pintura', label: 'G - PINTURA' },
            { id: 'est_tapas_plasticas', label: 'H - TAPAS Y MOLDURAS PLASTICAS' }
        ]
    },
    {
        name: '3 - ELECTRONICA',
        type: 'nueva_buen_estado',
        items: [
            { id: 'elec_motores', label: 'A - MOTORES DE LEVANTE/ TRACCION/ AUX' },
            { id: 'elec_direccion', label: 'B - MOTOR DE DIRECCION' },
            { id: 'elec_palanca', label: 'C - PALANCA DE CONTROL' },
            { id: 'elec_tarjeta', label: 'D - TARJETA VEHICULE MANAGER' },
            { id: 'elec_ampl_traccion', label: 'E - AMPLIFICADOR TRACCION' },
            { id: 'elec_ampl_levante', label: 'F - AMPLIFICADOR LEVANTE' },
            { id: 'elec_monitor', label: 'G - MONITOR' }
        ]
    },
    {
        name: '3.- OPCIONES DE SEGURIDAD',
        type: 'nueva_buen_estado',
        items: [
            { id: 'seg_torreta', label: 'A - TORRETA' },
            { id: 'seg_luces_trabajo', label: 'B - LUCES DE TRABAJO' },
            { id: 'seg_alarma_reversa', label: 'C - ALARMA DE REVERSA' },
            { id: 'seg_poste_guarda', label: 'D - POSTE DE GUARDA TRASERO' },
            { id: 'seg_sensor_compart_operador', label: 'F - SENSOR COMPART OPERADOR' },
            { id: 'seg_guarda_carga', label: 'G - GUARDA DE CARGA' },
            { id: 'seg_medidor_altura', label: 'H - MEDIDOR DE ALTURA/INCLINACION' },
            { id: 'seg_encendido_keyless', label: 'I - ENCENDIDO KEYLESS' },
            { id: 'seg_luces_rojas', label: 'J - LUCES ROJAS' },
            { id: 'seg_luces_azules', label: 'K - LUCES AZULES' },
            { id: 'seg_battery_roller', label: 'L - BATTERY ROLLER' },
            { id: 'seg_arnes', label: 'M - ARNES Y LINEA DE VIDA (OPC)' },
            { id: 'seg_pallet_clamp', label: 'N - PALLET CLAMP (OPC)' },
            { id: 'seg_extensiones_plataforma', label: 'O - EXTENSIONES DE PLATAFORMA' },
            { id: 'seg_sensor_sidegates', label: 'P - SENSOR SIDEGATES' },
            { id: 'seg_claxon', label: 'Q - CLAXÓN' }
        ]
    },
    {
        name: 'OTROS',
        type: 'nueva_buen_estado',
        items: [
            { id: 'otros_llaves', label: 'A - Juego de Llaves' },
            { id: 'otros_tapones_hidraulico', label: 'B - Tapones en Hidraulico' }
        ]
    }
];

interface NuevaSalidaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function NuevaSalidaModal({ isOpen, onClose, onSuccess }: NuevaSalidaModalProps) {
    const selectedSite = useAuthTallerStore(state => state.selectedSite);
    const [loading, setLoading] = useState(false);
    const [nextFolio, setNextFolio] = useState<string>('');
    const [availableEquipos, setAvailableEquipos] = useState<any[]>([]);
    const [availableAccesorios, setAvailableAccesorios] = useState<any[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [searchTermManual, setSearchTermManual] = useState('');

    // UI State for single-page layout
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [addingType, setAddingType] = useState<'Equipos' | 'Accesorios' | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [checklistModalFor, setChecklistModalFor] = useState<string | null>(null);
    const [confirmingItem, setConfirmingItem] = useState<any | null>(null);
    const [checklistValues, setChecklistValues] = useState<Record<string, string>>({});
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
    const [triedToSubmit, setTriedToSubmit] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<any | null>(null);

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
            loadClientes();
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
                destino: 'Distribuidor', // Default destination as requested
                tipo_documento: 'Remision',
            });
            setSelectedItems([]);
            setObservations('');
            setEvidencia('');
            setChecklistValues({});
            setConfirmingItem(null);
            setLoading(false);
            setIsAddingItem(false);
            setShowScanner(false);
            setScanning(false);
            setChecklistModalFor(null);
            setTriedToSubmit(false);
            setItemToDelete(null);
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

    const loadClientes = async () => {
        try {
            const res = await clientesApi.getAll();
            setClientes(Array.isArray(res) ? res : []);
        } catch (error) {
            console.error('Error loading clientes:', error);
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
                    setSelectedItems([...selectedItems, {
                        ...item,
                        _type: type,
                        checklist: type === 'equipo' ? {} : undefined
                    }]);
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
        const itemId = item.id_detalles || item.id_equipo || item.id_accesorio;
        if (selectedItems.find(i => (i.id_detalles || i.id_equipo || i.id_accesorio) === itemId)) {
            toast.warning('Este elemento ya ha sido agregado');
            return;
        }
        const type = addingType === 'Equipos' ? 'equipo' : 'accesorio';
        setSelectedItems([...selectedItems, {
            ...item,
            _type: type,
            checklist_entrega: type === 'equipo' ? item.checklist_entrega : undefined,
            photos: item.photos || {}
        }]);
        setConfirmingItem(null);
        setIsAddingItem(false);
        setAddingType(null);
        setChecklistValues({});
        toast.success(`${addingType === 'Equipos' ? 'Equipo' : 'Accesorio'} añadido a la salida`);
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

    const handleChecklistPhotoUpload = (itemId: string, photoKey: string, file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            setSelectedItems(selectedItems.map(item => {
                if ((item.id_detalles || item.id_accesorio) === itemId) {
                    return {
                        ...item,
                        checklist: {
                            ...item.checklist,
                            [photoKey]: reader.result as string
                        }
                    };
                }
                return item;
            }));
        };
        reader.readAsDataURL(file);
    };

    const isChecklistComplete = (item: any) => {
        // Solo R1 requiere checklist obligatorio
        if (selectedSite?.toLowerCase() !== 'r1' && selectedSite) return true;

        if (item._type !== 'equipo') return true;
        if (!item.photos) return false;

        for (const photo of OBLIGATORY_PHOTOS) {
            if (!item.photos[photo.key]) return false;
        }

        // Ensure checklist_entrega exists and has some data
        if (!item.checklist_entrega || Object.keys(item.checklist_entrega).length === 0) return false;

        return true;
    };

    const handleSave = async () => {
        if (selectedItems.length === 0) {
            toast.error('Debes seleccionar al menos un elemento');
            return;
        }

        const missingChecklists = selectedItems.filter(i => !isChecklistComplete(i));
        if (missingChecklists.length > 0) {
            toast.error('Faltan fotos obligatorias en el checklist de uno o más equipos');
            return;
        }

        // Strict Form Validation
        if (!basicInfo.numero_transporte) {
            toast.error('El Número de Transporte (Placas) es obligatorio');
            return;
        }
        if (!basicInfo.pedido_venta) {
            toast.error('El Pedido de Venta (Folio de venta) es obligatorio');
            return;
        }
        if (!basicInfo.cliente) {
            toast.error('Debes seleccionar un Cliente');
            return;
        }
        if (!basicInfo.destino) {
            toast.error('Debes seleccionar un Destino');
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
                        id_equipo: item.id_detalles || item.id_equipo,
                        id_equipo_ubicacion: item.id_equipo_ubicacion,
                        tipo_salida: 'Embarque', // Default
                        serial_equipos: item.serial_equipo,
                        id_ubicacion: item.id_ubicacion,
                        id_sub_ubicacion: item.id_sub_ubicacion,
                        checklist_entrega: item.checklist_entrega,
                        ...item.photos // Spread the photo keys
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

            toast.success(`Salida ${newSalida.folio} registrada correctamente`);
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                                Nueva Salida
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Salida Taller {selectedSite?.toUpperCase() || 'R1'}
                        </h2>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Unified Content Container */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar scroll-smooth">

                    {/* Folio Banner */}
                    <div className="mb-8 p-8 bg-slate-900 rounded-[2.5rem] flex items-center justify-center border border-slate-800 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent" />
                        <div className="flex flex-col items-center gap-2 z-10">
                            <span className="text-5xl font-black text-white tracking-[0.2em] drop-shadow-xl uppercase italic">
                                {nextFolio || '...'}
                            </span>
                            <div className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-bold text-white uppercase tracking-[0.4em]">
                                {new Date().toLocaleDateString()}
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-8 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                            Folio de Salida {selectedSite?.toUpperCase() || 'R1'}
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 px-1">Tipo de Documento</label>
                                                <select
                                                    value={basicInfo.tipo_documento}
                                                    onChange={(e) => setBasicInfo({ ...basicInfo, tipo_documento: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900 appearance-none"
                                                >
                                                    <option value="Remision">Remisión</option>
                                                    <option value="Orden de compra">Orden de compra</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 px-1">Número de Folio</label>
                                                <input
                                                    type="text"
                                                    value={basicInfo.numero_remision}
                                                    onChange={(e) => setBasicInfo({ ...basicInfo, numero_remision: e.target.value })}
                                                    placeholder="Ej: R-45920"
                                                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:col-span-1">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1 flex items-center gap-1.5">
                                            <Truck className="w-3 h-3 text-red-500" />
                                            Número de Transporte <span className="text-red-500 ml-1">*</span>
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
                                            Pedido de Venta <span className="text-red-500 ml-1">*</span>
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
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1">
                                            Cliente <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <select
                                            value={basicInfo.cliente || ''}
                                            onChange={(e) => setBasicInfo({ ...basicInfo, cliente: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900 appearance-none"
                                        >
                                            <option value="">Seleccione un cliente...</option>
                                            {clientes.map(c => (
                                                <option key={c.id_cliente} value={c.id_cliente}>
                                                    {c.nombre_cliente}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1">
                                            Destino <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <select
                                            value={basicInfo.destino || 'Distribuidor'}
                                            onChange={(e) => setBasicInfo({ ...basicInfo, destino: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-900 appearance-none"
                                        >
                                            <option value="Distribuidor">Distribuidor</option>
                                            <option value="R2">R2</option>
                                        </select>
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
                                        onClick={() => { setAddingType('Equipos'); setIsAddingItem(true); setSearchTermManual(''); }}
                                        className="h-10 px-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-slate-200"
                                    >
                                        <Box className="w-3.5 h-3.5" /> Equipo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAddingType('Accesorios'); setIsAddingItem(true); setSearchTermManual(''); }}
                                        className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Accesorio
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
                                                        <div className="flex items-center justify-end gap-2">
                                                            {item._type === 'equipo' && (
                                                                <div className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                                                                    isChecklistComplete(item) ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100"
                                                                )}>
                                                                    {isChecklistComplete(item) ? 'Checklist Completo ✓' : 'Faltan Datos/Fotos ⚠'}
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => setItemToDelete(item)}
                                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
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

                {/* SECTION: Evidence & Observations moved to footer or separate section if needed, but keeping it inside main scroll */}

                {/* NESTED MODAL FOR ADDING ITEMS WITH PREVIEW AND CHECKLIST */}
                {isAddingItem && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[3rem] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-100 animate-in zoom-in-95 duration-300 overflow-hidden">
                            {/* Header */}
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                <div>
                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                        <div className="w-2 h-8 bg-red-600 rounded-full" />
                                        Añadir {addingType === 'Equipos' ? 'Equipo Montacargas' : 'Accesorio'}
                                    </h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-5 mt-1">Suministros y Activos {useAuthTallerStore.getState().selectedSite || 'R1'}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirmingItem) {
                                            setShowCloseConfirmation(true);
                                        } else {
                                            setIsAddingItem(false);
                                            setShowScanner(false);
                                            setConfirmingItem(null);
                                        }
                                    }}
                                    className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                                {/* Search & interactive list section (Visible if not confirming) */}
                                {!confirmingItem && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="flex flex-col md:flex-row gap-4">
                                            {/* QR Scanner Trigger */}
                                            <button
                                                onClick={() => setShowScanner(!showScanner)}
                                                className={cn(
                                                    "flex items-center justify-center gap-3 p-6 rounded-[2rem] transition-all shadow-xl font-black text-xs uppercase tracking-widest border-2",
                                                    showScanner
                                                        ? "bg-red-50 border-red-200 text-red-600 shadow-red-100"
                                                        : "bg-red-600 border-red-600 text-white shadow-red-200 hover:bg-red-700"
                                                )}
                                            >
                                                <QrCode className="w-5 h-5" />
                                                {showScanner ? 'Cerrar Escáner' : 'Escáner QR'}
                                            </button>

                                            {/* Interactive Search Bar */}
                                            <div className="relative flex-1 group">
                                                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                                    <Search className="w-5 h-5 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={searchTermManual}
                                                    onChange={(e) => setSearchTermManual(e.target.value)}
                                                    onFocus={() => {
                                                        // Ensure list is shown or handled
                                                    }}
                                                    placeholder={`Escribir serie de ${addingType === 'Equipos' ? 'equipo' : 'accesorio'}...`}
                                                    className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-black text-sm text-slate-900 placeholder:text-slate-300 uppercase tracking-widest"
                                                />

                                                {/* Floating Counter */}
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                    {(Array.isArray(addingType === 'Equipos' ? availableEquipos : availableAccesorios)
                                                        ? (addingType === 'Equipos' ? availableEquipos : availableAccesorios)
                                                        : []).filter(item => {
                                                            if (!searchTermManual) return true;
                                                            const serial = (item.serial_equipo || item.serial || '').toLowerCase();
                                                            return serial.includes(searchTermManual.toLowerCase());
                                                        }).length} Disponibles
                                                </div>
                                            </div>
                                        </div>

                                        {showScanner && (
                                            <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-slate-900 shadow-2xl animate-in zoom-in duration-500 max-w-sm mx-auto aspect-square">
                                                <Scanner
                                                    onScan={(result: any[]) => handleScan(result)}
                                                    onError={() => toast.error('Error con la cámara')}
                                                    styles={{ container: { width: '100%', height: '100%' } }}
                                                />
                                                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                                                    <div className="w-full h-full border-2 border-dashed border-red-500 rounded-2xl animate-pulse" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Result List (Interactive "tira" results) */}
                                        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {(Array.isArray(addingType === 'Equipos' ? availableEquipos : availableAccesorios)
                                                ? (addingType === 'Equipos' ? availableEquipos : availableAccesorios)
                                                : [])
                                                .filter(item => {
                                                    if (!searchTermManual) return true;
                                                    const serial = (item.serial_equipo || item.serial || '').toLowerCase();
                                                    return serial.includes(searchTermManual.toLowerCase());
                                                })
                                                .map((item, index) => (
                                                    <button
                                                        key={`${item.id_detalles || item.id_accesorio}-${index}`}
                                                        onClick={() => {
                                                            setConfirmingItem(item);
                                                            setTriedToSubmit(false);
                                                            if (addingType === 'Equipos') {
                                                                const initialChecklist: Record<string, string> = {};
                                                                CHECKLIST_CATEGORIES.forEach(cat => {
                                                                    cat.items.forEach(check => {
                                                                        initialChecklist[check.id] = ''; // Start empty/off as requested
                                                                    });
                                                                });
                                                                setChecklistValues(initialChecklist);
                                                            }
                                                        }}
                                                        className="w-full px-8 py-5 flex items-center justify-between hover:bg-red-50 border-l-4 border-transparent hover:border-red-600 transition-all group"
                                                    >
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl group-hover:bg-white transition-colors">
                                                                {addingType === 'Equipos' ? <Box className="w-5 h-5 text-slate-400 group-hover:text-red-500" /> : <Plus className="w-5 h-5 text-slate-400 group-hover:text-red-500" />}
                                                            </div>
                                                            <div className="text-left">
                                                                <h5 className="font-black text-slate-900 uppercase tracking-wider text-sm">{item.serial_equipo || item.serial}</h5>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.modelo || 'S/M'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            <div className="hidden sm:block text-right">
                                                                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                                    {item.nombre_ubicacion || item.id_ubicacion || item.ubicacion || 'ALMACÉN'}
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                                                        </div>
                                                    </button>
                                                ))}

                                            {/* Empty State in List */}
                                            {(Array.isArray(addingType === 'Equipos' ? availableEquipos : availableAccesorios)
                                                ? (addingType === 'Equipos' ? availableEquipos : availableAccesorios)
                                                : []).filter(item => {
                                                    if (!searchTermManual) return true;
                                                    const serial = (item.serial_equipo || item.serial || '').toLowerCase();
                                                    return serial.includes(searchTermManual.toLowerCase());
                                                }).length === 0 && (
                                                    <div className="p-12 text-center flex flex-col items-center justify-center text-slate-300">
                                                        <Search className="w-8 h-8 mb-3 opacity-20" />
                                                        <p className="font-black text-[10px] uppercase tracking-[0.2em]">No se encontraron resultados</p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                )}

                                {/* Confirmation Section (Preview + Checklist + Photos) */}
                                {confirmingItem && (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                        {/* Preview Card */}
                                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/20 rounded-full -mr-32 -mt-32 blur-[80px]" />
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-6 mb-8">
                                                    <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl">
                                                        <Box className="w-8 h-8 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black uppercase tracking-tight">Previsualización del activo</h4>
                                                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Verificación mandatoria por normativa {selectedSite?.toUpperCase() || 'R1'}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                                    <div className="space-y-1">
                                                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Número de Serie</p>
                                                        <p className="text-2xl font-black font-mono tracking-wider">{confirmingItem.serial_equipo || confirmingItem.serial}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Modelo / Clase</p>
                                                        <p className="text-2xl font-black uppercase">{confirmingItem.modelo || 'N/A'}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Ubicación Actual</p>
                                                        <p className="text-xl font-black text-red-400 uppercase tracking-tight italic">{confirmingItem.nombre_ubicacion || confirmingItem.id_ubicacion || confirmingItem.ubicacion || 'PISO'}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Estado</p>
                                                        <div className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-black uppercase tracking-widest w-fit mt-1">
                                                            {confirmingItem.estado || confirmingItem.estado_acc || 'LISTO'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {(() => {
                                            if ((selectedSite?.toLowerCase() === 'r1' || !selectedSite) && addingType === 'Equipos') {
                                                return (
                                                    <div className="space-y-10">
                                                        {/* Category Checklist */}
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-2 h-10 bg-red-600 rounded-full" />
                                                                <div>
                                                                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-wide">Checklist Detallado</h4>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado funcional y estético</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 gap-8">
                                                                {CHECKLIST_CATEGORIES.map((cat, catIdx) => (
                                                                    <div key={catIdx} className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                                                                        <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                                                            {cat.name}
                                                                        </h5>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                                                            {cat.items.map((check) => (
                                                                                <div key={check.id} className={cn(
                                                                                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 group p-2 rounded-2xl transition-all border border-transparent",
                                                                                    triedToSubmit && !checklistValues[check.id] && "bg-red-50 border-red-200 shadow-sm animate-in fade-in duration-300"
                                                                                )}>
                                                                                    <span className="text-[11px] font-black text-slate-700 leading-snug uppercase tracking-tight group-hover:text-slate-900 transition-colors pl-2">{check.label}</span>
                                                                                    <div className="flex bg-white p-1 rounded-2xl shadow-inner border border-slate-100 shrink-0 self-end sm:self-center">
                                                                                        {cat.type === 'ok_no_ok' ? (
                                                                                            <>
                                                                                                <button
                                                                                                    onClick={() => setChecklistValues(prev => ({ ...prev, [check.id]: 'OK' }))}
                                                                                                    className={cn(
                                                                                                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                                                        checklistValues[check.id] === 'OK' ? "bg-green-600 text-white shadow-xl shadow-green-200" : "text-slate-300 hover:text-slate-500"
                                                                                                    )}
                                                                                                >
                                                                                                    OK
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => setChecklistValues(prev => ({ ...prev, [check.id]: 'NO OK' }))}
                                                                                                    className={cn(
                                                                                                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                                                        checklistValues[check.id] === 'NO OK' ? "bg-red-600 text-white shadow-xl shadow-red-200" : "text-slate-300 hover:text-slate-500"
                                                                                                    )}
                                                                                                >
                                                                                                    NO OK
                                                                                                </button>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <button
                                                                                                    onClick={() => setChecklistValues(prev => ({ ...prev, [check.id]: 'NUEVAS' }))}
                                                                                                    className={cn(
                                                                                                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                                                        checklistValues[check.id] === 'NUEVAS' ? "bg-blue-600 text-white shadow-xl shadow-blue-200" : "text-slate-300 hover:text-slate-500"
                                                                                                    )}
                                                                                                >
                                                                                                    NUEVAS
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => setChecklistValues(prev => ({ ...prev, [check.id]: 'EN BUEN ESTADO' }))}
                                                                                                    className={cn(
                                                                                                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                                                        checklistValues[check.id] === 'EN BUEN ESTADO' ? "bg-red-600 text-white shadow-xl shadow-red-200" : "text-slate-300 hover:text-slate-500"
                                                                                                    )}
                                                                                                >
                                                                                                    BUEN ESTADO
                                                                                                </button>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Photos Grid */}
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-2 h-10 bg-red-600 rounded-full" />
                                                                <div>
                                                                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-wide">Evidencia Fotográfica Obligatoria</h4>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Debes capturar las 7 perspectivas requeridas</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                                                                {OBLIGATORY_PHOTOS.map((photo) => {
                                                                    const isUploaded = !!(confirmingItem as any).tempPhotos?.[photo.key];
                                                                    return (
                                                                        <div key={photo.key} className="space-y-3">
                                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 truncate">{photo.label}</p>
                                                                            <label className={cn(
                                                                                "aspect-[4/3] rounded-[2rem] flex flex-col items-center justify-center gap-3 border-4 border-dashed transition-all cursor-pointer overflow-hidden relative group shadow-sm",
                                                                                isUploaded ? "border-emerald-400 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:border-red-400 hover:bg-white"
                                                                            )}>
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    capture="environment"
                                                                                    className="hidden"
                                                                                    onChange={async (e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (file) {
                                                                                            const reader = new FileReader();
                                                                                            reader.onloadend = () => {
                                                                                                const base64 = reader.result as string;
                                                                                                setConfirmingItem((prev: any) => ({
                                                                                                    ...prev,
                                                                                                    tempPhotos: { ...(prev.tempPhotos || {}), [photo.key]: base64 }
                                                                                                }));
                                                                                            };
                                                                                            reader.readAsDataURL(file);
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                {isUploaded ? (
                                                                                    <>
                                                                                        <img src={(confirmingItem as any).tempPhotos?.[photo.key]} className="absolute inset-0 w-full h-full object-cover brightness-95 group-hover:brightness-50 transition-all" />
                                                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                                                                            <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 text-white">
                                                                                                <Upload className="w-6 h-6" />
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-2xl shadow-xl shadow-emerald-200">
                                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-200 group-hover:text-red-500 group-hover:bg-red-50 transition-all shadow-sm">
                                                                                            <Upload className="w-6 h-6" />
                                                                                        </div>
                                                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-red-600 transition-colors">CAPTURAR</span>
                                                                                    </>
                                                                                )}
                                                                            </label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Optional Photos Section */}
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-2 h-10 bg-slate-200 rounded-full" />
                                                                <div>
                                                                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-wide">Imágenes Opcionales</h4>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evidencia adicional relevante</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                                                                {OPTIONAL_PHOTOS.map((photo) => {
                                                                    const isUploaded = !!(confirmingItem as any).tempPhotos?.[photo.key];
                                                                    return (
                                                                        <div key={photo.key} className="space-y-3">
                                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 truncate">{photo.label}</p>
                                                                            <label className={cn(
                                                                                "aspect-[4/3] rounded-[2rem] flex flex-col items-center justify-center gap-3 border-4 border-dashed transition-all cursor-pointer overflow-hidden relative group shadow-sm",
                                                                                isUploaded ? "border-slate-400 bg-slate-50" : "border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-white"
                                                                            )}>
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    capture="environment"
                                                                                    className="hidden"
                                                                                    onChange={async (e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (file) {
                                                                                            const reader = new FileReader();
                                                                                            reader.onloadend = () => {
                                                                                                const base64 = reader.result as string;
                                                                                                setConfirmingItem((prev: any) => ({
                                                                                                    ...prev,
                                                                                                    tempPhotos: { ...(prev.tempPhotos || {}), [photo.key]: base64 }
                                                                                                }));
                                                                                            };
                                                                                            reader.readAsDataURL(file);
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                {isUploaded ? (
                                                                                    <>
                                                                                        <img src={(confirmingItem as any).tempPhotos?.[photo.key]} className="absolute inset-0 w-full h-full object-cover brightness-95 group-hover:brightness-50 transition-all" />
                                                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                                                                            <Upload className="w-6 h-6 text-white" />
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <Upload className="w-6 h-6 text-slate-200 group-hover:text-slate-400 transition-all" />
                                                                                )}
                                                                            </label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* Confirmation Exit Modal */}
                                        {showCloseConfirmation && (
                                            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                                                <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                                                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                                                        <AlertCircle className="w-8 h-8" />
                                                    </div>
                                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">¿Cancelar Selección?</h4>
                                                    <p className="text-sm text-slate-400 font-bold mb-8 leading-relaxed">
                                                        Se perderá el checklist y las imágenes capturadas para este equipo.
                                                    </p>
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => setShowCloseConfirmation(false)}
                                                            className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
                                                        >
                                                            Continuar
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowCloseConfirmation(false);
                                                                setConfirmingItem(null);
                                                                setIsAddingItem(false);
                                                            }}
                                                            className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                                        >
                                                            Sí, Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t-2 border-slate-50">
                                            <button
                                                onClick={() => {
                                                    if (confirmingItem) {
                                                        setShowCloseConfirmation(true);
                                                    } else {
                                                        setConfirmingItem(null);
                                                    }
                                                }}
                                                className="flex-1 h-16 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] border border-slate-100"
                                            >
                                                Volver al Listado
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const isR1 = selectedSite?.toLowerCase() === 'r1' || !selectedSite;

                                                    if (addingType === 'Equipos' && isR1) {
                                                        // Validate Checklist
                                                        const missingItems = [];
                                                        CHECKLIST_CATEGORIES.forEach(cat => {
                                                            cat.items.forEach(item => {
                                                                if (!checklistValues[item.id]) {
                                                                    missingItems.push(item.label);
                                                                }
                                                            });
                                                        });

                                                        if (missingItems.length > 0) {
                                                            setTriedToSubmit(true);
                                                            toast.error('Debes completar todo el checklist antes de añadir');
                                                            return;
                                                        }

                                                        const missingPhotos = OBLIGATORY_PHOTOS.filter(p => !(confirmingItem as any).tempPhotos?.[p.key]);
                                                        if (missingPhotos.length > 0) {
                                                            toast.error(`Faltan fotos reglamentarias: ${missingPhotos.map(p => p.label).join(', ')}`);
                                                            return;
                                                        }
                                                    }

                                                    handleAddItem({
                                                        ...confirmingItem,
                                                        checklist_entrega: checklistValues,
                                                        photos: (confirmingItem as any).tempPhotos || {}
                                                    });
                                                }}
                                                className="flex-[2] h-16 bg-red-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-red-200 flex items-center justify-center gap-4"
                                            >
                                                <CheckCircle2 className="w-6 h-6" /> Confirmar e Integrar a Salida
                                            </button>
                                        </div>
                                    </div>
                                )
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Deletion Modal */}
                {itemToDelete && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">¿Quitar Elemento?</h4>
                            <p className="text-sm text-slate-400 font-bold mb-8 leading-relaxed">
                                Estás por remover <span className="text-slate-900">{itemToDelete.serial_equipo || itemToDelete.serial}</span> del listado de salida.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setItemToDelete(null)}
                                    className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        const id = itemToDelete.id_detalles || itemToDelete.id_accesorio;
                                        setSelectedItems(selectedItems.filter(i => (i.id_detalles || i.id_accesorio) !== id));
                                        setItemToDelete(null);
                                        toast.success('Elemento removido');
                                    }}
                                    className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                >
                                    Sí, Quitar
                                </button>
                            </div>
                        </div>
                    </div>
                )}



                {/* Main Modal Footer */}
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
