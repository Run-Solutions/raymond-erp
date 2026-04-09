'use client';

import { useState, useEffect } from 'react';
import renovadosService from '@/services/taller-r1/renovados.service';
import { toast } from 'sonner';
import { 
    QrCode, Printer, MapPin, 
    CheckCircle2, AlertCircle, Loader2,
    Search, LayoutGrid, List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

interface Estacion {
    id_estacion: string;
    nombre: string;
    ocupada: boolean;
    solicitudes?: any[];
}

export const EstacionesTab = () => {
    const [estaciones, setEstaciones] = useState<Estacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        loadEstaciones();
    }, []);

    const loadEstaciones = async () => {
        try {
            setLoading(true);
            const data = await renovadosService.getEstaciones();
            
            // Ordenamiento natural (1, 2, 3... 10, 11)
            const sortedData = [...data].sort((a, b) => 
                a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
            );
            
            setEstaciones(sortedData);
            
            // Generate QR codes
            const codes: Record<string, string> = {};
            for (const est of sortedData) {
                const url = await QRCode.toDataURL(est.id_estacion);
                codes[est.id_estacion] = url;
            }
            setQrCodes(codes);
        } catch (error) {
            toast.error('Error al cargar estaciones');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = (est: Estacion) => {
        const qr = qrCodes[est.id_estacion];
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir QR - ${est.nombre}</title>
                    <style>
                        body { 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            margin: 0; 
                            font-family: sans-serif; 
                        }
                        .container { 
                            text-align: center; 
                            border: 2px solid #eee; 
                            padding: 40px; 
                            border-radius: 20px; 
                        }
                        img { width: 300px; height: 300px; }
                        h1 { font-size: 40px; margin-top: 20px; font-weight: 900; }
                        p { color: #666; font-size: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <p>ESTACIÓN DE TALLER</p>
                        <img src="${qr}" />
                        <h1>${est.nombre}</h1>
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                            window.onafterprint = () => window.close();
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filtered = estaciones.filter(e => 
        e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.id_estacion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
                <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando estaciones...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar estación..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm focus:border-red-500 transition-all outline-none font-bold text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'grid' ? "bg-slate-100 text-red-600" : "text-slate-400"
                        )}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'list' ? "bg-slate-100 text-red-600" : "text-slate-400"
                        )}
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className={cn(
                "grid gap-6",
                viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
            )}>
                {filtered.map((est) => (
                    <div 
                        key={est.id_estacion}
                        className={cn(
                            "bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group transition-all hover:shadow-xl hover:shadow-slate-200/50",
                            est.ocupada && "border-amber-100 shadow-amber-50/50"
                        )}
                    >
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                    est.ocupada 
                                        ? "bg-amber-50 text-amber-600" 
                                        : "bg-emerald-50 text-emerald-600"
                                )}>
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handlePrint(est)}
                                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                        title="Imprimir QR"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{est.nombre}</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {est.ocupada ? (
                                        <>
                                            <AlertCircle className="w-3 h-3 text-amber-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Ocupada</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Disponible</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* QR Preview Overlay on Hover */}
                            <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-4">
                                <img 
                                    src={qrCodes[est.id_estacion]} 
                                    alt="QR" 
                                    className="w-16 h-16 opacity-30 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">ID Estación</span>
                                    <span className="text-xs font-black text-slate-900 font-mono">{est.id_estacion}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-slate-400 font-black text-xl italic">No se encontraron estaciones</p>
                </div>
            )}
        </div>
    );
};
