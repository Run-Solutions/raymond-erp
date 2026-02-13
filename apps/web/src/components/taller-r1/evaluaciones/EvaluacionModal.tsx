import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    CheckCircle2,
    Image as ImageIcon,
    Save,
    X,
    Star,
    Zap,
    ShieldCheck,
    Settings,
    Circle,
    Loader2,
    Check
} from 'lucide-react';
import { evaluacionesApi } from '@/services/taller-r1/evaluaciones.service';
import { toast } from 'sonner';

interface EvaluacionModalProps {
    open: boolean;
    onClose: () => void;
    item: {
        id: string; // id_detalles or id_accesorio
        serial: string;
        modelo: string;
        tipo: 'equipo' | 'accesorio';
        clase?: string;
    } | null;
    onSuccess?: () => void;
}

const CRITERIOS_EQUIPO = [
    { id: 'frente', label: 'Frente' },
    { id: 'manejo', label: 'Zona de manejo' },
    { id: 'columnas', label: 'Columnas' },
    { id: 'ruedas', label: 'Ruedas' },
    { id: 'otros', label: 'Otros' }
];

export function EvaluacionModal({ open, onClose, item, onSuccess }: EvaluacionModalProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [scores, setScores] = useState<Record<string, string>>({}); // 0-10 strings
    const [photos, setPhotos] = useState<Record<string, string>>({}); // Base64 or URLs
    const [porcentaje, setPorcentaje] = useState('');
    const [semanas, setSemanas] = useState('');
    const [estadoMontacargas, setEstadoMontacargas] = useState('');

    // Accessory states
    const [voltaje, setVoltaje] = useState('');
    const [condiciones, setCondiciones] = useState('');
    const [clasificacion, setClasificacion] = useState('');

    useEffect(() => {
        if (open && item) {
            loadExistingEvaluation();
        } else {
            resetForm();
        }
    }, [open, item]);

    const resetForm = () => {
        setScores({});
        setPhotos({});
        setPorcentaje('');
        setSemanas('');
        setEstadoMontacargas('');
        setVoltaje('');
        setCondiciones('');
        setClasificacion('');
    };

    const loadExistingEvaluation = async () => {
        if (!item) return;
        setLoading(true);
        try {
            let data;
            if (item.tipo === 'equipo') {
                data = await evaluacionesApi.getEquipoEvaluation(item.id);
                if (data) {
                    setScores(data.puntajes || {});
                    setPhotos(data.fotos || {});
                    setPorcentaje(data.porcentaje_total !== null ? String(data.porcentaje_total) : '');
                    setSemanas(data.semanas_renovacion !== null ? String(data.semanas_renovacion) : '');
                    setEstadoMontacargas(data.estado_montacargas || '');
                }
            } else {
                data = await evaluacionesApi.getAccesorioEvaluation(item.id);
                if (data) {
                    setVoltaje(data.voltaje !== null ? String(data.voltaje) : '');
                    setCondiciones(data.condiciones || '');
                    setClasificacion(data.clasificacion || '');
                }
            }
        } catch (error) {
            console.error('Error loading evaluation:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = (criterioId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotos(prev => ({ ...prev, [criterioId]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!item) return;
        setSaving(true);
        try {
            if (item.tipo === 'equipo') {
                await evaluacionesApi.saveEquipoEvaluation({
                    id_detalle: item.id,
                    puntajes: scores,
                    fotos: photos,
                    porcentaje_total: porcentaje ? parseFloat(porcentaje) : undefined,
                    semanas_renovacion: semanas ? parseInt(semanas) : undefined,
                    estado_montacargas: estadoMontacargas
                });
            } else {
                await evaluacionesApi.saveAccesorioEvaluation({
                    id_accesorio: item.id,
                    voltaje: voltaje ? parseFloat(voltaje) : undefined,
                    condiciones,
                    clasificacion
                });
            }
            toast.success('Calificación guardada correctamente.');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error saving evaluation:', error);
            toast.error('Error al guardar la calificación.');
        } finally {
            setSaving(false);
        }
    };

    if (!item) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2.5rem]">
                {/* Header Section */}
                <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                        <CheckCircle2 size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider">
                                R1 Evaluación
                            </span>
                            <span className="text-indigo-100/60 text-xs font-mono">{item.serial}</span>
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tighter text-white">
                            Calificación de {item.tipo === 'equipo' ? 'Equipo' : 'Accesorio'}
                        </DialogTitle>
                        <DialogDescription className="text-indigo-100/80 font-medium text-sm mt-2">
                            {item.modelo} {item.clase ? `· ${item.clase}` : ''}
                        </DialogDescription>
                    </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-8 bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4 text-slate-400">
                            <Loader2 className="animate-spin" size={40} />
                            <p className="font-medium animate-pulse">Cargando datos previos...</p>
                        </div>
                    ) : item.tipo === 'equipo' ? (
                        <div className="space-y-8">
                            {/* Checklist Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {CRITERIOS_EQUIPO.map(crit => (
                                    <div key={crit.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 group transition-all hover:shadow-md">
                                        <div className="flex items-center justify-between mb-4">
                                            <Label className="text-sm font-bold text-slate-700">{crit.label}</Label>
                                            <div className="flex items-center gap-2">
                                                <div className="relative w-16">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="10"
                                                        placeholder="0-10"
                                                        className="h-10 text-center font-bold bg-slate-50 rounded-xl border-none focus-visible:ring-2 focus-visible:ring-indigo-500 pr-2"
                                                        value={scores[crit.id] || ''}
                                                        onChange={(e) => setScores(prev => ({ ...prev, [crit.id]: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative group/photo">
                                            {photos[crit.id] ? (
                                                <div className="relative h-32 rounded-2xl overflow-hidden shadow-inner group-hover/photo:opacity-90 transition-opacity">
                                                    <img src={photos[crit.id]} alt={crit.id} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => setPhotos(prev => {
                                                            const n = { ...prev };
                                                            delete n[crit.id];
                                                            return n;
                                                        })}
                                                        className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-full shadow-lg opacity-0 group-hover/photo:opacity-100 transition-opacity translate-x-2 group-hover/photo:translate-x-0"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all text-slate-400 hover:text-indigo-500">
                                                    <ImageIcon size={24} className="mb-2 opacity-50" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Tomar Foto</span>
                                                    <input
                                                        type="file"
                                                        capture="environment"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handlePhotoUpload(crit.id, e)}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Summary Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-500 px-1">Porcentaje (%)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0-100"
                                        className="h-14 bg-white rounded-2xl border-slate-200 font-black text-xl text-indigo-600 px-4 focus-visible:ring-indigo-500 shadow-sm"
                                        value={porcentaje}
                                        onChange={(e) => setPorcentaje(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-500 px-1">Semanas Renovación</Label>
                                    <Input
                                        type="number"
                                        placeholder="Weeks"
                                        className="h-14 bg-white rounded-2xl border-slate-200 font-black text-xl text-indigo-600 px-4 focus-visible:ring-indigo-500 shadow-sm"
                                        value={semanas}
                                        onChange={(e) => setSemanas(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-500 px-1">Estado</Label>
                                    <select
                                        className="w-full h-14 bg-white rounded-2xl border border-slate-200 font-bold px-4 focus-visible:ring-indigo-500 shadow-sm appearance-none"
                                        value={estadoMontacargas}
                                        onChange={(e) => setEstadoMontacargas(e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Nuevo">Nuevo</option>
                                        <option value="Renovación">Renovación</option>
                                        <option value="Venta as is">Venta as is</option>
                                        <option value="Chatarra">Chatarra</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Accessory Section */}
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-500 px-1">Voltaje (Parámetro Real)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Volts"
                                            className="h-14 bg-slate-50/50 rounded-2xl border-none font-black text-xl px-6 focus-visible:ring-indigo-500"
                                            value={voltaje}
                                            onChange={(e) => setVoltaje(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-500 px-1">Clasificación</Label>
                                        <div className="flex gap-2">
                                            {['Buena', 'Carga', 'Chatarra'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setClasificacion(c)}
                                                    className={`flex-1 h-14 rounded-2xl font-bold text-xs transition-all ${clasificacion === c
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                        : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-500 px-1">Condiciones / Parámetros</Label>
                                    <Textarea
                                        placeholder="Descripción detallada de las condiciones..."
                                        className="min-h-[120px] bg-slate-50/50 rounded-3xl border-none p-6 font-medium focus-visible:ring-indigo-500"
                                        value={condiciones}
                                        onChange={(e) => setCondiciones(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex items-start gap-4 mx-2">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                                    <Zap size={20} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-indigo-900 leading-none">Aviso de Clasificación</h4>
                                    <p className="text-xs font-bold text-indigo-700 leading-relaxed">
                                        Si se clasifica como <span className="underline">Chatarra</span> o <span className="underline">Carga</span>, el sistema registrará la salida hacia la ubicación correspondiente automáticamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 flex gap-3 bg-slate-50">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 h-14 rounded-2xl border-none bg-white font-black text-slate-600 hover:bg-slate-100 shadow-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        disabled={saving}
                        onClick={handleSave}
                        className="flex-[2] h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-black shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="animate-spin mr-2" />
                        ) : (
                            <Save className="mr-2" />
                        )}
                        Guardar Calificación
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
