'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, ChevronRight, User, Hash, FileCheck, MessageSquare, Image, Calendar, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { entradasApi, CreateEntradaDto } from '@/services/taller-r1/entradas.service';
import { modelosApi, Modelo } from '@/services/taller-r1/modelos.service';
import api from '@/lib/api-taller'; // Using tallerApi to fetch clients
import { createWorker } from 'tesseract.js';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuthTallerStore } from '@/store/auth-taller.store';


interface NuevaEntradaModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (newEntrada: any) => void;
    editingEntrada?: any;
}

interface Cliente {
    id_cliente: string;
    nombre_cliente: string;
    rfc?: string;
    region?: string;
    telefono?: string;
}

const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('data:image')) return path;
    if (path.startsWith('http')) return path;

    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api').replace('/api', '');
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/${cleanPath}`;
};

export function NuevaEntradaModal({ open, onClose, onSuccess, editingEntrada }: NuevaEntradaModalProps) {
    const { selectedSite, user } = useAuthTallerStore();
    const [loading, setLoading] = useState(false);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [formData, setFormData] = useState<Partial<CreateEntradaDto>>({
        folio: '',
        factura: '',
        cliente: '',
        fecha_creacion: new Date(),
        elemento: 'Equipo',
        comentario_1: '',
        comentario_2: '',
        comentario_3: '',
        evidencia_1: '',
        evidencia_2: '',
        evidencia_3: '',
        estado: selectedSite === 'r3' ? 'Por Ubicar' : 'Recibido – En espera evaluación',
        prioridad: 'Media',
        distribuidor: '',
        cliente_origen: '',
        adc: '',
        usuario_asignado: '',
    });

    const [items, setItems] = useState<any[]>([]);
    const [filteredModelos, setFilteredModelos] = useState<Modelo[]>([]);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [addingType, setAddingType] = useState<'Equipo' | 'Accesorio' | null>(null);
    const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
    const [showConfirmItem, setShowConfirmItem] = useState(false);
    const [showConfirmDiscard, setShowConfirmDiscard] = useState<any>(null); // 'item' | 'main' | null
    const [showConfirmDeleteItemIdx, setShowConfirmDeleteItemIdx] = useState<number | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [itemFormData, setItemFormData] = useState<any>({
        serial_equipo: '',
        tipo_entrada: 'Distribuidor',
        estado: 'Por Ubicar',
        calificacion: '',
        tipo: '',
        clase: '',
        modelo: '',
        serial: '',
        estado_acc: 'Revisar',
        fecha_ingreso: new Date(),
        evidencias: {}, // For multiple evidences
        comentarios: {}, // For multiple comments
        tarjeta_informacion: '',
        ocr_result: '',
        evidencia: '' // Legacy/Single
    });

    const [files, setFiles] = useState<{ [key: string]: string }>({});
    const [fileNames, setFileNames] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const init = async () => {
            if (open) {
                if (editingEntrada) {
                    setFormData({
                        ...editingEntrada,
                        fecha_creacion: new Date(editingEntrada.fecha_creacion)
                    });

                    try {
                        let existingItems = [];
                        if (editingEntrada.elemento === 'Equipo') {
                            existingItems = await entradasApi.getDetalles(editingEntrada.id_entrada);
                        } else if (editingEntrada.elemento === 'Accesorio') {
                            existingItems = await entradasApi.getAccesorios(editingEntrada.id_entrada);
                        }
                        setItems(existingItems);
                    } catch (error) {
                        console.error('Error fetching existing items:', error);
                    }
                }

                // Always load initial data (like clients) whether editing or not
                await loadInitialData();
            } else {
                resetForm();
            }
        };
        init();
    }, [open, editingEntrada]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [folio, clientesRes] = await Promise.all([
                entradasApi.getNextFolio(),
                api.get('/taller-r1/clientes').catch(err => {
                    console.error('Error loading clients:', err);
                    return { data: [] }; // Fallback to empty array
                })
            ]);

            setFormData(prev => ({ ...prev, folio }));
            const actualClientes = clientesRes.data?.data || clientesRes.data || [];
            setClientes(actualClientes);

            if (!actualClientes || actualClientes.length === 0) {
                toast.warning('No se pudieron cargar los clientes. Verifica la conexión con el servidor.');
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error('Error al cargar datos iniciales');
            setClientes([]); // Ensure clientes is always an array
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                setFiles(prev => ({ ...prev, [fieldName]: base64 }));
                setFileNames(prev => ({ ...prev, [fieldName]: file.name }));
                setFormData(prev => ({ ...prev, [fieldName]: base64 }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!formData.factura) {
            toast.error('El número de factura de embarque es obligatorio');
            return;
        }

        if (!formData.cliente) {
            toast.error('El cliente es obligatorio');
            return;
        }

        // Show signature modal instead of saving directly
        setShowSignatureModal(true);
    };

    const handleFinalSave = async (overrideSignature?: string) => {
        // Final Save (called after signatures are captured)
        try {
            setLoading(true);
            let createdEntrada;

            // Explicitly construct payload to match 'entradas' Prisma schema
            // Map firma_usuario (frontend) -> firma_recibo (db)
            const entradaPayload: any = {
                folio: formData.folio,
                factura: formData.factura,
                cliente: formData.cliente,
                fecha_creacion: formData.fecha_creacion,
                elemento: formData.elemento,
                comentario: formData.comentario,
                comentario_1: formData.comentario_1,
                comentario_2: formData.comentario_2,
                // comentario_3 does not exist in DB
                evidencia_1: formData.evidencia_1,
                evidencia_2: formData.evidencia_2,
                evidencia_3: formData.evidencia_3,
                estado: formData.estado,
                prioridad: formData.prioridad,
                firma_entrega: undefined,
                nombre_entrega: undefined,
                firma_recibo: overrideSignature || (formData as any).firma_usuario,
                distribuidor: formData.distribuidor,
                cliente_origen: formData.cliente_origen,
                usuario_asignado: user?.id,
                usuario_encargado: user?.id,
                fecha_asignacion: formData.fecha_creacion,
                adc: formData.adc,
            };

            // Append Note 3 if exists
            const rawFormData = formData as any;
            if (rawFormData.comentario_3) {
                if (entradaPayload.comentario) entradaPayload.comentario += ` | Nota 3: ${rawFormData.comentario_3}`;
                else entradaPayload.comentario = `Nota 3: ${rawFormData.comentario_3}`;
            }

            if (editingEntrada?.id_entrada) {
                createdEntrada = await entradasApi.update(editingEntrada.id_entrada, entradaPayload);
            } else {
                createdEntrada = await entradasApi.create(entradaPayload as CreateEntradaDto);
            }

            // Save ONLY NEW details (those without an ID)
            const entradaId = createdEntrada.id_entrada;
            const newItems = items.filter(item => !item.id_detalles && !item.id_accesorio);

            for (const item of newItems) {
                if (item.serial_equipo) { // Discriminator for Equipo
                    const detailPayload = {
                        id_entrada: entradaId,
                        id_equipo: item.id_equipo,
                        serial_equipo: item.serial_equipo,
                        clase: item.clase,
                        modelo: item.modelo,
                        estado: item.estado,
                        fecha: item.fecha_ingreso || new Date(),
                        tipo_entrada: item.tipo_entrada,
                        evidencia_1: item.evidencias?.evidencia_1,
                        evidencia_2: item.evidencias?.evidencia_2,
                        evidencia_3: item.evidencias?.evidencia_3,
                        evidencia_4: item.tarjeta_informacion,
                        comentario_1: item.comentarios?.comentario_1,
                        comentario_2: item.comentarios?.comentario_2,
                    };
                    await entradasApi.createDetalle(entradaId, detailPayload);
                } else {
                    const accesorioPayload = {
                        id_entrada: entradaId,
                        tipo: item.tipo,
                        modelo: item.modelo,
                        serial: item.serial,
                        estado_acc: item.estado_acc || item.estado,
                        fecha_ingreso: item.fecha_ingreso || new Date(),
                        evidencia: item.evidencia
                    };
                    await entradasApi.createAccesorio(entradaId, accesorioPayload);
                }
            }


            toast.success('Entrada y registros guardados correctamente');
            onSuccess(createdEntrada);
            onClose();
        } catch (error) {
            console.error('Error saving entry:', error);
            toast.error('Error al guardar la entrada y sus registros');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            folio: '',
            factura: '',
            cliente: '',
            fecha_creacion: new Date(),
            elemento: 'Equipo',
            comentario_1: '',
            comentario_2: '',
            comentario_3: '',
            evidencia_1: '',
            evidencia_2: '',
            evidencia_3: '',
            estado: selectedSite === 'r3' ? 'Por Ubicar' : 'Recibido – En espera evaluación',
            prioridad: 'Media',
            distribuidor: '',
            cliente_origen: '',
            adc: '',
            usuario_asignado: '',
        });
        setItems([]);
        setFiles({});
        setFileNames({});
    };

    const clearItemForm = () => {
        setItemFormData({
            serial_equipo: '',
            tipo_entrada: 'Distribuidor',
            estado: 'Por Ubicar',
            calificacion: '',
            tipo: '',
            clase: '',
            modelo: '',
            serial: '',
            estado_acc: 'Revisar',
            fecha_ingreso: new Date(),
            evidencias: {},
            comentarios: {},
            tarjeta_informacion: '',
            ocr_result: '',
            evidencia: ''
        });
    };

    // UseEffect to filter models when adding item
    useEffect(() => {
        const fetchFilteredModelos = async () => {
            const filterValue = addingType === 'Accesorio' ? itemFormData.tipo :
                (itemFormData.clase === 'Todas las clases' ? undefined : itemFormData.clase);

            if ((addingType === 'Accesorio' && itemFormData.tipo) ||
                (addingType === 'Equipo' && itemFormData.clase)) {
                const modelos = await modelosApi.getAll(filterValue);
                setFilteredModelos(modelos);
            } else if (addingType === 'Equipo' && itemFormData.clase === 'Todas las clases') {
                const modelos = await modelosApi.getAll();
                setFilteredModelos(modelos);
            } else {
                setFilteredModelos([]);
            }
        };
        fetchFilteredModelos();
    }, [addingType, itemFormData.tipo, itemFormData.clase]);

    // UseEffect to sync dates
    useEffect(() => {
        if (isAddingItem && addingType === 'Accesorio' && formData.fecha_creacion) {
            setItemFormData((prev: any) => ({ ...prev, fecha_ingreso: formData.fecha_creacion }));
        }
    }, [isAddingItem, addingType, formData.fecha_creacion]);

    // Helper for advanced OCR pre-processing (Grayscale + Binarization)
    const preprocessImage = (base64: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(base64); return; }
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const val = avg > 120 ? 255 : 0; // Threshold
                    data[i] = data[i + 1] = data[i + 2] = val;
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.src = base64;
        });
    };

    const handleOCR = async (base64: string) => {
        try {
            setOcrLoading(true);
            const processed = await preprocessImage(base64);
            const worker = await createWorker('eng+spa');

            await worker.setParameters({
                tessedit_pageseg_mode: '6' as any, // Assume single block
            });

            const { data: { text } } = await worker.recognize(processed);
            await worker.terminate();

            const textNoSpaces = text.replace(/\s+/g, '');
            const specificMatch = textNoSpaces.match(/\d{3}-\d{2}-\d+/);

            let extracted = '';
            let rawResult = text.trim();

            if (specificMatch) {
                extracted = specificMatch[0];
            } else {
                const cleanedText = text.replace(/[|!\[\](){}]/g, '').replace(/[\n\r]+/g, ' ').trim();
                const serialMatch = cleanedText.match(/(?:Serie|S\/N|Serial|SER|S\.N|SN|Num|No|Nro)[\s:]*([A-Z0-9-]+)/i);
                extracted = serialMatch ? serialMatch[1].trim() : '';
            }

            setItemFormData((prev: any) => ({
                ...prev,
                ocr_result: rawResult,
                serial_equipo: prev.clase && !prev.serial_equipo ? (extracted || prev.serial_equipo) : prev.serial_equipo,
                serial: !prev.serial ? (extracted || prev.serial) : prev.serial
            }));

            if (extracted) {
                toast.success('Serial detectado con éxito');
            } else {
                toast.success('Texto extraído (Revisar)');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            toast.error('No se pudo procesar la tarjeta');
        } finally {
            setOcrLoading(false);
        }
    };

    const handleItemFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: string = 'evidencia') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;

                if (field === 'tarjeta_informacion') {
                    setItemFormData((prev: any) => ({ ...prev, [field]: base64 }));
                    handleOCR(base64);
                } else if (field.startsWith('evidencia_')) {
                    setItemFormData((prev: any) => ({
                        ...prev,
                        evidencias: { ...prev.evidencias, [field]: base64 }
                    }));
                } else {
                    setItemFormData((prev: any) => ({ ...prev, [field]: base64 }));
                }
                toast.success('Archivo cargado');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddItem = (confirmed: boolean = false) => {
        const serial = itemFormData.serial_equipo || itemFormData.serial || 'N/A';

        if (!confirmed) {
            if (addingType === 'Equipo') {
                if (!itemFormData.serial_equipo) {
                    toast.error('El serial del equipo es obligatorio');
                    return;
                }
                if (!itemFormData.clase) {
                    toast.error('La clase del equipo es obligatoria');
                    return;
                }
                if (!itemFormData.modelo) {
                    toast.error('El modelo del equipo es obligatorio');
                    return;
                }

            } else if (addingType === 'Accesorio') {
                if (!itemFormData.tipo) {
                    toast.error('El tipo de accesorio es obligatorio');
                    return;
                }
                if (!itemFormData.modelo) {
                    toast.error('El modelo del accesorio es obligatorio');
                    return;
                }
                if (!itemFormData.serial) {
                    toast.error('El número de serie es obligatorio');
                    return;
                }

            }
            setShowConfirmItem(true);
            return;
        }

        setShowConfirmItem(false);
        const itemWithMeta = { ...itemFormData, _uiType: addingType };

        if (editingItemIdx !== null) {
            const newItems = [...items];
            newItems[editingItemIdx] = itemWithMeta;
            setItems(newItems);
            setEditingItemIdx(null);
        } else {
            setItems([...items, itemWithMeta]);
        }

        setIsAddingItem(false);
        setAddingType(null);
        clearItemForm();
    };

    const handleEditItem = (idx: number) => {
        const item = items[idx];
        setItemFormData(item);
        setEditingItemIdx(idx);
        setAddingType(item._uiType || (item.serial_equipo ? 'Equipo' : 'Accesorio'));
        setIsAddingItem(true);
    };

    const handleRemoveItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const handleClose = (confirmed: boolean = false) => {
        const hasMainChanges = formData.factura || formData.cliente || items.length > 0;

        if (!confirmed && hasMainChanges) {
            setShowConfirmDiscard('main');
            return;
        }

        setShowConfirmDiscard(null);
        resetForm(); // Reset everything
        onClose();
    };

    const handleCloseItem = (confirmed: boolean = false) => {
        const hasItemChanges = itemFormData.serial_equipo || itemFormData.serial || itemFormData.tipo || itemFormData.clase || itemFormData.modelo;

        if (!confirmed && hasItemChanges) {
            setShowConfirmDiscard('item');
            return;
        }

        clearItemForm(); // Call existing reset item function
        setShowConfirmDiscard(null);
        setIsAddingItem(false);
        setAddingType(null);
        setEditingItemIdx(null);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => handleClose()} />

            <div className="relative bg-white w-full sm:max-w-4xl max-h-screen sm:max-h-[92vh] flex flex-col sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                                {selectedSite === 'r3' ? 'Ingreso a R3' : 'Nueva Entrada'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {editingEntrada ? 'Edición de Registro' : 'Registro de Ingreso'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            {editingEntrada ? 'Editar Entrada' : (selectedSite === 'r3' ? 'Entrada Taller R3' : 'Entrada Taller R1')}
                        </h2>
                    </div>
                    <button
                        onClick={() => handleClose()}
                        className="p-3 text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Unified Content */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar scroll-smooth">
                    {/* Folio Banner */}
                    {!editingEntrada && (
                        <div className="mb-8 p-8 bg-slate-900 rounded-[2.5rem] flex items-center justify-center border border-slate-800 shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent" />
                            <span className="text-5xl font-black text-white tracking-[0.2em] z-10 drop-shadow-xl">
                                {formData.folio}
                            </span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Seccion 1: Identificacion */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <Hash className="w-5 h-5 text-red-600" />
                                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Identificación y Cliente</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Factura */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1">
                                        Factura de Embarque <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.factura || ''}
                                        onChange={(e) => setFormData({ ...formData, factura: e.target.value })}
                                        placeholder="Ej: FAC-12345"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all outline-none font-medium"
                                        required
                                    />
                                </div>

                                {/* Fecha */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" /> Fecha de Registro
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.fecha_creacion?.toLocaleString() || ''}
                                        readOnly
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 font-medium cursor-default focus:outline-none"
                                    />
                                </div>

                                {/* Cliente */}
                                <div className="md:col-span-1 space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1">Cliente <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.cliente || ''}
                                        onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                                        className="w-full appearance-none px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all outline-none font-medium text-slate-700"
                                    >
                                        <option value="">Seleccione un cliente...</option>
                                        {Array.isArray(clientes) && clientes.map((c) => (
                                            <option key={c.id_cliente} value={c.id_cliente}>
                                                {c.nombre_cliente}
                                            </option>
                                        ))}
                                    </select>

                                    {formData.cliente && (
                                        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 animate-in fade-in slide-in-from-top-2">
                                            {(() => {
                                                const sel = clientes.find(c => c.id_cliente === formData.cliente);
                                                return sel ? (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500 font-bold">RFC:</span>
                                                            <span className="text-slate-900 font-black">{sel.rfc || 'N/D'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500 font-bold">Teléfono:</span>
                                                            <span className="text-slate-900 font-black">{sel.telefono || 'N/D'}</span>
                                                        </div>
                                                    </>
                                                ) : <span className="text-slate-500 font-bold">Cargando detalles...</span>;
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Distribuidor, Origen, ADC hidden for R3 or entirely */}
                            {selectedSite !== 'r3' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 ml-1">Distribuidor</label>
                                        <input
                                            type="text"
                                            value={formData.distribuidor || ''}
                                            onChange={(e) => setFormData({ ...formData, distribuidor: e.target.value })}
                                            placeholder="Nombre del distribuidor"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-red-500 outline-none font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 ml-1">Cliente de Origen</label>
                                        <input
                                            type="text"
                                            value={formData.cliente_origen || ''}
                                            onChange={(e) => setFormData({ ...formData, cliente_origen: e.target.value })}
                                            placeholder="Cliente de origen"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-red-500 outline-none font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 ml-1">ADC</label>
                                        <input
                                            type="text"
                                            value={formData.adc || ''}
                                            onChange={(e) => setFormData({ ...formData, adc: e.target.value })}
                                            placeholder="Folio ADC"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-red-500 outline-none font-medium"
                                        />
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Seccion 2: Equipos y Accesorios (Inline) */}
                        <section className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <FileCheck className="w-5 h-5 text-red-600" />
                                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Equipos y Accesorios</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setAddingType('Equipo'); setIsAddingItem(true); }}
                                        className="h-10 px-4 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Equipo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAddingType('Accesorio'); setIsAddingItem(true); }}
                                        className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Accesorio
                                    </button>
                                </div>
                            </div>

                            {items.length === 0 ? (
                                <div className="py-10 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                                    <p className="font-bold text-sm">No hay registros añadidos aún</p>
                                    <p className="text-[10px] mt-1">Utilice los botones de arriba para agregar equipos o accesorios</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                                <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50">
                                                    <td className="px-6 py-3 font-bold text-slate-900">
                                                        {item._uiType || (item.serial_equipo ? 'Equipo' : 'Accesorio')}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                                {item.serial_equipo || item.serial || item.modelo || 'N/A'}
                                                            </code>
                                                            {item.evidencia && <Image className="w-3.5 h-3.5 text-emerald-500" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${(item.estado || item.estado_acc) === 'Bueno' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            (item.estado || item.estado_acc) === 'Malo' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                'bg-amber-50 text-amber-600 border-amber-100'
                                                            }`}>
                                                            {item.estado || item.estado_acc}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button type="button" onClick={() => handleEditItem(idx)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                                                            <button type="button" onClick={() => setShowConfirmDeleteItemIdx(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* Seccion 3: Comentarios y Evidencias */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <MessageSquare className="w-5 h-5 text-red-600" />
                                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Detalles Adicionales</h3>
                            </div>

                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="flex gap-4 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 items-center">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-5 h-5 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[8px] font-black">{i}</span>
                                                Comentario de Hallazgo
                                            </label>
                                            <textarea
                                                value={(formData as any)[`comentario_${i}`] || ''}
                                                onChange={(e) => setFormData({ ...formData, [`comentario_${i}`]: e.target.value })}
                                                rows={1}
                                                placeholder={`Detalle del hallazgo ${i}...`}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-red-500 transition-all outline-none font-medium text-sm"
                                            />
                                        </div>
                                        <div className="w-24 shrink-0 flex flex-col items-center">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Evidencia</label>
                                            <label className={`w-full aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${(formData as any)[`evidencia_${i}`] ? 'border-emerald-200' : 'bg-white border-slate-200 text-slate-300 hover:border-slate-400'}`}>
                                                {(formData as any)[`evidencia_${i}`] ? (
                                                    <img
                                                        src={getImageUrl((formData as any)[`evidencia_${i}`])}
                                                        className="w-full h-full object-contain bg-slate-900"
                                                        alt="Evidencia"
                                                    />
                                                ) : (
                                                    <Camera className="w-6 h-6" />
                                                )}
                                                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, `evidencia_${i}`)} />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => handleClose()}
                        className="flex items-center gap-2 px-8 py-4 bg-white text-slate-400 hover:text-slate-600 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading || items.length === 0}
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-10 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                Finalizar y Guardar
                                <CheckCircle2 className="w-5 h-5 ml-1" />
                            </>
                        )}
                    </button>
                </div>

                {/* Nested Modal Overlay for Items */}
                {isAddingItem && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                                    {editingItemIdx !== null ? 'Editar' : 'Añadir'} {addingType}
                                </h4>
                                <button onClick={() => handleCloseItem()} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                                {addingType === 'Equipo' ? (
                                    <>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clase <span className="text-red-500">*</span></label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {['Clase I', 'Clase II', 'Clase III', 'Todas las clases'].map((c) => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => setItemFormData({ ...itemFormData, clase: c, modelo: '' })}
                                                        className={`py-3 px-2 rounded-2xl border-2 font-bold text-[10px] uppercase transition-all ${itemFormData.clase === c ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                                    >
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo <span className="text-red-500">*</span></label>
                                                <select
                                                    value={itemFormData.modelo}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, modelo: e.target.value })}
                                                    disabled={!itemFormData.clase}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-500 transition-all outline-none disabled:opacity-50"
                                                >
                                                    <option value="">Seleccionar Modelo...</option>
                                                    {filteredModelos.map((m) => (
                                                        <option key={m.id_modelo} value={m.modelo}>
                                                            {m.modelo}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tarjeta de Información (OCR)</label>
                                                <label className={`flex items-center gap-2 px-4 py-3 rounded-2xl cursor-pointer border-2 border-dashed transition-all overflow-hidden ${itemFormData.tarjeta_informacion ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-400'}`}>
                                                    {ocrLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : itemFormData.tarjeta_informacion ? (
                                                        <img src={getImageUrl(itemFormData.tarjeta_informacion)} className="w-5 h-5 rounded object-contain bg-slate-900 border border-red-200" alt="Card" />
                                                    ) : (
                                                        <Camera className="w-4 h-4" />
                                                    )}
                                                    <span className="text-[10px] font-bold uppercase truncate">{ocrLoading ? 'Procesando...' : (itemFormData.tarjeta_informacion ? 'Tarjeta Cargada' : 'Escanear Tarjeta')}</span>
                                                    <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => handleItemFileChange(e, 'tarjeta_informacion')} />
                                                </label>
                                            </div>
                                        </div>

                                        {itemFormData.ocr_result && (
                                            <div className="mt-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner space-y-3">
                                                {itemFormData.tarjeta_informacion && (
                                                    <div className="relative group">
                                                        <img
                                                            src={getImageUrl(itemFormData.tarjeta_informacion)}
                                                            className="w-full h-32 object-contain bg-slate-900 rounded-xl"
                                                            alt="Captured Card"
                                                        />
                                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-[8px] text-white font-bold tracking-widest uppercase">Imagen Original</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                        Resultado Completo del Escaneo:
                                                    </div>
                                                    <textarea
                                                        readOnly
                                                        value={itemFormData.ocr_result}
                                                        className="w-full bg-transparent text-slate-200 text-xs font-mono leading-relaxed outline-none resize-none custom-scrollbar"
                                                        rows={Math.min(6, itemFormData.ocr_result.split(' ').length / 5 + 1)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Origen <span className="text-red-500">*</span></label>
                                                <select
                                                    value={itemFormData.tipo_entrada || 'Distribuidor'}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, tipo_entrada: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-500 transition-all outline-none font-bold text-slate-700"
                                                >
                                                    <option value="Distribuidor">Distribuidor</option>
                                                    <option value="Planta">Planta</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Serie <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={itemFormData.serial_equipo}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, serial_equipo: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-500 transition-all outline-none font-black text-lg tracking-wider"
                                                    placeholder="S/N..."
                                                />
                                            </div>
                                        </div>

                                        {/* 3 Evidencias and 3 Comments for Equipment */}
                                        <div className="mt-6 space-y-4">
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Evidencias y Hallazgos</p>
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                                    <div className="flex-1 space-y-1">
                                                        <textarea
                                                            placeholder={`Comentario de Hallazgo ${i}...`}
                                                            value={(itemFormData.comentarios || {})[`comentario_${i}`] || ''}
                                                            onChange={(e) => setItemFormData({
                                                                ...itemFormData,
                                                                comentarios: { ...(itemFormData.comentarios || {}), [`comentario_${i}`]: e.target.value }
                                                            })}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-red-400 min-h-[60px]"
                                                        />
                                                    </div>
                                                    <div className="w-24">
                                                        <label className={`w-full aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${(itemFormData.evidencias || {})[`evidencia_${i}`] ? 'border-emerald-200' : 'bg-white border-slate-200 text-slate-300'}`}>
                                                            {(itemFormData.evidencias || {})[`evidencia_${i}`] ? (
                                                                <img src={getImageUrl((itemFormData.evidencias || {})[`evidencia_${i}`])} className="w-full h-full object-contain bg-slate-900" alt={`Evidencia ${i}`} />
                                                            ) : (
                                                                <>
                                                                    <Camera className="w-5 h-5" />
                                                                    <span className="text-[8px] font-bold mt-1 uppercase text-center">Foto</span>
                                                                </>
                                                            )}
                                                            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => handleItemFileChange(e, `evidencia_${i}`)} />
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Accesorio <span className="text-red-500">*</span></label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Bateria', 'Cargador', 'Patin', 'Otros'].map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setItemFormData({ ...itemFormData, tipo: t, modelo: '' })}
                                                        className={`py-4 px-2 rounded-2xl border-2 font-bold text-xs uppercase transition-all ${itemFormData.tipo === t ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                                    >
                                                        {t === 'Bateria' ? 'Batería' : t === 'Patin' ? 'Patín' : t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo <span className="text-red-500">*</span></label>
                                                <select
                                                    value={itemFormData.modelo}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, modelo: e.target.value })}
                                                    disabled={!itemFormData.tipo}
                                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-500 transition-all outline-none disabled:opacity-50 font-bold"
                                                >
                                                    <option value="">Seleccionar Modelo...</option>
                                                    {filteredModelos.map((m) => (
                                                        <option key={m.id_modelo} value={m.modelo}>
                                                            {m.modelo}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Serie <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={itemFormData.serial}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, serial: e.target.value })}
                                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-500 transition-all outline-none font-bold placeholder:text-slate-300"
                                                    placeholder="Ej: SN-90210"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-6">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Evidencia del Accesorio</label>
                                            <label className={`mt-1 flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden relative ${itemFormData.evidencia ? 'border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-400'}`}>
                                                {itemFormData.evidencia ? (
                                                    <>
                                                        <img
                                                            src={getImageUrl(itemFormData.evidencia)}
                                                            className="absolute inset-0 w-full h-full object-contain bg-slate-900"
                                                            alt="Evidencia"
                                                        />
                                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex flex-col items-center justify-center">
                                                            <Camera className="w-8 h-8 text-white mb-2" />
                                                            <span className="text-xs text-white font-black uppercase tracking-tight">Cambiar Foto</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <Camera className="w-10 h-10 mb-2 opacity-50" />
                                                        <span className="text-sm font-black uppercase">Tomar Foto de Evidencia</span>
                                                        <span className="text-[10px] opacity-60 mt-1">Especial para uso en dispositivos móviles</span>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => handleItemFileChange(e, 'evidencia')} />
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-50 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
                                <button type="button" onClick={() => handleCloseItem()} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                                <button type="button" onClick={() => handleAddItem()} className="px-6 py-2.5 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">Guardar Item</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Save Item Modal */}
                {showConfirmItem && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h5 className="text-xl font-black text-slate-900 mb-2">Confirmar Registro</h5>
                            <p className="text-slate-500 text-sm mb-6">¿Estás seguro de guardar este {addingType?.toLowerCase()} con serial <span className="font-black text-slate-900 underline decoration-slate-300">{itemFormData.serial_equipo || itemFormData.serial || 'N/A'}</span>?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowConfirmItem(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Regresar</button>
                                <button onClick={() => handleAddItem(true)} className="flex-1 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-lg">Sí, Guardar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Discard Modal */}
                {showConfirmDiscard && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h5 className="text-xl font-black text-slate-900 mb-2">Descartar Cambios</h5>
                            <p className="text-slate-500 text-sm mb-6">Tienes cambios sin guardar. ¿Estás seguro que deseas descartar toda la información?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowConfirmDiscard(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">No, Volver</button>
                                <button onClick={() => showConfirmDiscard === 'item' ? handleCloseItem(true) : handleClose(true)} className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all shadow-lg">Sí, Descartar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Delete Item Modal */}
                {showConfirmDeleteItemIdx !== null && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h5 className="text-xl font-black text-slate-900 mb-2">¿Eliminar Ítem?</h5>
                            <p className="text-slate-500 text-sm mb-6">¿Estás seguro que deseas eliminar <span className="font-black text-slate-900">{items[showConfirmDeleteItemIdx]?.serial || items[showConfirmDeleteItemIdx]?.serial_equipo || 'este registro'}</span> de la lista?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowConfirmDeleteItemIdx(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                                <button onClick={() => { handleRemoveItem(showConfirmDeleteItemIdx); setShowConfirmDeleteItemIdx(null); }} className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all shadow-lg">Sí, Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Signature Capture Modal */}
                {showSignatureModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full p-8 border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <h5 className="text-2xl font-black text-slate-900 mb-6 text-center">Firmas de Autorización</h5>

                            {/* User Signature */}
                            <div className="mb-6">
                                <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-1">
                                    Firma del Usuario <span className="text-red-500">*</span>
                                </label>
                                <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                                    <canvas
                                        ref={(el) => {
                                            if (el && !el.dataset.initialized) {
                                                el.width = el.offsetWidth;
                                                el.height = 200;
                                                el.dataset.initialized = 'true';
                                                const ctx = el.getContext('2d');
                                                if (ctx) {
                                                    let drawing = false;
                                                    el.addEventListener('mousedown', () => drawing = true);
                                                    el.addEventListener('mouseup', () => drawing = false);
                                                    el.addEventListener('mousemove', (e) => {
                                                        if (!drawing) return;
                                                        const rect = el.getBoundingClientRect();
                                                        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                                                        ctx.stroke();
                                                    });
                                                    el.addEventListener('touchstart', (e) => { drawing = true; e.preventDefault(); });
                                                    el.addEventListener('touchend', () => drawing = false);
                                                    el.addEventListener('touchmove', (e) => {
                                                        if (!drawing) return;
                                                        const rect = el.getBoundingClientRect();
                                                        const touch = e.touches[0];
                                                        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                                                        ctx.stroke();
                                                        e.preventDefault();
                                                    });
                                                    ctx.lineWidth = 2;
                                                    ctx.lineCap = 'round';
                                                    ctx.strokeStyle = '#000';
                                                }
                                            }
                                        }}
                                        className="w-full h-[200px] cursor-crosshair"
                                        id="userSignatureCanvas"
                                    />
                                </div>
                            </div>



                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSignatureModal(false)}
                                    className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        // Get canvas data
                                        const userCanvas = document.getElementById('userSignatureCanvas') as HTMLCanvasElement;
                                        const userSignature = userCanvas?.toDataURL('image/png');

                                        // Store signatures in formData
                                        setFormData(prev => ({
                                            ...prev,
                                            firma_usuario: userSignature
                                        }));

                                        setShowSignatureModal(false);
                                        handleFinalSave(userSignature);
                                    }}
                                    className="flex-1 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                                >
                                    Confirmar y Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
