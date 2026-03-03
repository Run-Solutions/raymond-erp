'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, QrCode, Search, X, Camera,
  Package, MapPin, Wrench, FileSpreadsheet,
  CheckCircle2, Hash, Tag, Clock, Layers,
  FileText, ArrowRightLeft, Smartphone, ImageIcon, Monitor
} from 'lucide-react';
import api from '@/lib/api';

interface SearchResult {
  found: boolean;
  type?: 'equipo' | 'ubicacion' | 'accesorio' | 'cargue_masivo';
  data?: Record<string, any>;
}

const TYPE_CONFIG: Record<string, {
  label: string;
  gradient: string;
  softBg: string;
  softText: string;
  border: string;
  icon: React.ReactNode;
}> = {
  equipo: {
    label: 'Equipo', gradient: 'from-blue-600 to-blue-700',
    softBg: 'bg-blue-50', softText: 'text-blue-700', border: 'border-blue-200',
    icon: <Package className="w-6 h-6" />,
  },
  ubicacion: {
    label: 'Ubicación', gradient: 'from-emerald-600 to-emerald-700',
    softBg: 'bg-emerald-50', softText: 'text-emerald-700', border: 'border-emerald-200',
    icon: <MapPin className="w-6 h-6" />,
  },
  accesorio: {
    label: 'Accesorio', gradient: 'from-violet-600 to-violet-700',
    softBg: 'bg-violet-50', softText: 'text-violet-700', border: 'border-violet-200',
    icon: <Wrench className="w-6 h-6" />,
  },
  cargue_masivo: {
    label: 'Cargue Masivo', gradient: 'from-red-600 to-red-700',
    softBg: 'bg-red-50', softText: 'text-red-700', border: 'border-red-200',
    icon: <FileSpreadsheet className="w-6 h-6" />,
  },
};

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(key: string, value: any): string {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (key.includes('fecha') || key.includes('date')) {
    try {
      return new Date(value).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return String(value); }
  }
  return String(value);
}

function FieldIcon({ fieldKey }: { fieldKey: string }) {
  if (fieldKey.includes('serial') || fieldKey.includes('id')) return <Hash className="w-3.5 h-3.5" />;
  if (fieldKey.includes('fecha') || fieldKey.includes('date')) return <Clock className="w-3.5 h-3.5" />;
  if (fieldKey.includes('tipo') || fieldKey.includes('clase')) return <Tag className="w-3.5 h-3.5" />;
  if (fieldKey.includes('modelo')) return <Layers className="w-3.5 h-3.5" />;
  if (fieldKey.includes('rack') || fieldKey.includes('ubicacion')) return <MapPin className="w-3.5 h-3.5" />;
  if (fieldKey.includes('entrada') || fieldKey.includes('estado')) return <ArrowRightLeft className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
}

export default function DashboardR1() {
  const [isSearching, setIsSearching] = useState(false);
  const [resultData, setResultData] = useState<SearchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [scannerTab, setScannerTab] = useState<'camera' | 'file'>('camera');
  const isHandlingRef = useRef(false);
  const scannerRef = useRef<any>(null);

  const handleSearch = async (term: string) => {
    const q = term.trim();
    if (!q) return;
    try {
      setIsSearching(true);
      const res = await api.get(`/taller-r1/search?q=${encodeURIComponent(q)}`);
      const result: SearchResult = res.data?.data || res.data;
      if (result?.found) {
        setResultData(result);
        setIsModalOpen(true);
      } else {
        toast.error(`Sin resultados para: "${q}"`);
      }
    } catch {
      toast.error('Error de conexión al buscar.');
    } finally {
      setIsSearching(false);
    }
  };

  const onScanSuccess = (decodedText: string) => {
    if (isHandlingRef.current) return;
    isHandlingRef.current = true;
    setLastScanned(decodedText);
    toast.success(`QR leído: ${decodedText}`);
    handleSearch(decodedText).finally(() => {
      setTimeout(() => { isHandlingRef.current = false; }, 3000);
    });
  };

  const videoRef = useRef<HTMLDivElement>(null);
  const qrReaderRef = useRef<any>(null);

  const startCamera = async () => {
    try {
      // First set scannerStarted so the div renders, then initialize
      setScannerStarted(true);
    } catch (e) {
      console.error('[camera]', e);
      toast.error('Error al activar la cámara.');
    }
  };

  // When scannerStarted becomes true, the div is now in DOM — initialize scanner
  useEffect(() => {
    if (!scannerStarted) return;
    let qrReader: any = null;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        qrReader = new Html5Qrcode('qr-reader-camera');
        qrReaderRef.current = qrReader;

        // Get available cameras and pick back-facing if available
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          toast.error('No se encontró ninguna cámara en este dispositivo.');
          setScannerStarted(false);
          return;
        }
        // prefer rear camera or last one
        const backCamera = devices.find((d: any) =>
          /back|rear|environment|trasera/i.test(d.label)
        ) || devices[devices.length - 1];

        await qrReader.start(
          backCamera.id,
          { fps: 10, qrbox: { width: 230, height: 230 } },
          onScanSuccess,
          () => {} // ignore frame errors
        );
      } catch (e: any) {
        console.error('[camera init]', e);
        if (String(e).includes('Permission') || String(e).includes('NotAllowed')) {
          toast.error('Permiso de cámara denegado. Ve a Configuración del navegador y permite el acceso.');
        } else {
          toast.error(`Error de cámara: ${e?.message || e}`);
        }
        setScannerStarted(false);
      }
    };

    // Small delay to ensure div is painted
    const timer = setTimeout(init, 100);
    return () => {
      clearTimeout(timer);
      qrReader?.stop().catch(() => {});
    };
  }, [scannerStarted]);

  const stopCamera = async () => {
    try {
      await qrReaderRef.current?.stop();
      qrReaderRef.current = null;
    } catch {}
    setScannerStarted(false);
  };

  const handleFileQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const reader = new Html5Qrcode('qr-file-reader');
      const result = await reader.scanFile(file, true);
      setLastScanned(result);
      await handleSearch(result);
      await reader.clear();
    } catch {
      toast.error('No se pudo leer el QR de la imagen. Intenta con otra foto.');
    }
    e.target.value = '';
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      qrReaderRef.current?.stop().catch(() => {});
    };
  }, []);

  const closeModal = () => { setIsModalOpen(false); setResultData(null); };
  const typeInfo = resultData?.type ? TYPE_CONFIG[resultData.type] : null;
  const visibleEntries = resultData?.data
    ? Object.entries(resultData.data).filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto px-8 py-6 max-w-5xl w-full flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Dashboard Central</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Busca seriales manualmente o escanea un QR para obtener datos al instante.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
            <QrCode className="w-5 h-5 text-red-600" />
            <span className="text-red-700 font-bold text-sm">Scanner QR</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: Search + Tips */}
          <div className="space-y-5">
            {/* Search */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Search className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900">Búsqueda Manual</h2>
                  <p className="text-xs text-gray-500">Ingresa el serial del equipo o accesorio</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchInput)}
                  placeholder="Ej: RXI00577676..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-sm font-medium transition-all"
                />
                <button
                  onClick={() => handleSearch(searchInput)}
                  disabled={isSearching || !searchInput.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Camera options info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-xs font-black text-gray-500 mb-4 uppercase tracking-widest">Opciones de Cámara</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Monitor className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-blue-800">Cámara del PC / Laptop</p>
                    <p className="text-xs text-blue-600 mt-0.5">Haz clic en "Activar Cámara" y acepta los permisos del navegador.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
                  <Smartphone className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-violet-800">Cámara del Celular</p>
                    <p className="text-xs text-violet-600 mt-0.5">Abre esta misma URL en el navegador de tu celular (misma red WiFi). La cámara trasera se usará automáticamente.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <ImageIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Subir foto del QR</p>
                    <p className="text-xs text-amber-600 mt-0.5">Toma una foto del QR con el celular y súbela desde la pestaña "Imagen".</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Last scanned */}
            {lastScanned && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Último QR escaneado</p>
                  <p className="text-sm font-black text-emerald-800">{lastScanned}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: QR Scanner with tabs */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setScannerTab('camera')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors ${
                  scannerTab === 'camera'
                    ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Camera className="w-4 h-4" /> Cámara en Vivo
              </button>
              <button
                onClick={() => { setScannerTab('file'); stopCamera(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors ${
                  scannerTab === 'file'
                    ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ImageIcon className="w-4 h-4" /> Subir Imagen
              </button>
            </div>

            <div className="flex-1 p-5 flex flex-col">
              {/* Camera tab - div ALWAYS mounted to avoid timing issues */}
              {scannerTab === 'camera' && (
                <div className="flex flex-col h-full">
                  {/* The div must always be in DOM for html5-qrcode to attach to */}
                  <div
                    id="qr-reader-camera"
                    className={`w-full rounded-xl overflow-hidden ${scannerStarted ? '' : 'hidden'}`}
                  />

                  {!scannerStarted && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-8">
                      <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center">
                        <Camera className="w-12 h-12 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-gray-700 font-bold">Cámara no iniciada</p>
                        <p className="text-gray-400 text-sm mt-1">El navegador pedirá permiso para usar la cámara</p>
                      </div>
                      <button
                        onClick={startCamera}
                        className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                      >
                        <Camera className="w-5 h-5" />
                        Activar Cámara
                      </button>
                    </div>
                  )}

                  {scannerStarted && (
                    <button
                      onClick={stopCamera}
                      className="flex items-center justify-center gap-2 py-2 mt-3 text-gray-500 hover:text-red-600 text-sm font-bold transition-colors"
                    >
                      <X className="w-4 h-4" /> Detener Cámara
                    </button>
                  )}
                </div>
              )}

              {/* File/image tab */}
              {scannerTab === 'file' && (
                <div className="flex flex-col h-full items-center justify-center gap-5 py-6">
                  {/* Hidden reader div required by html5-qrcode */}
                  <div id="qr-file-reader" className="hidden" />

                  <div className="w-24 h-24 bg-amber-100 rounded-3xl flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-amber-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-gray-700 font-bold">Enviar foto del código QR</p>
                    <p className="text-gray-400 text-sm mt-1">Selecciona una imagen con el QR visible y claro</p>
                  </div>
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
                      <ImageIcon className="w-5 h-5" />
                      Seleccionar Imagen
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileQr}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-400 text-center max-w-[220px]">
                    También sirve para fotos tomadas con el celular. Asegúrate que el QR sea visible y nítido.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── MODAL RESULTADO ── */}
      {isModalOpen && resultData?.data && typeInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className={`bg-gradient-to-br ${typeInfo.gradient} p-6`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white">
                    {typeInfo.icon}
                  </div>
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Registro encontrado</p>
                    <h3 className="text-white text-2xl font-black tracking-tight leading-none mt-1">{typeInfo.label}</h3>
                  </div>
                </div>
                <button onClick={closeModal} className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {resultData.data.serial && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2">
                  <Hash className="w-4 h-4 text-white/80" />
                  <span className="text-white font-black text-sm tracking-wider">{resultData.data.serial}</span>
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="overflow-y-auto p-5 space-y-2" style={{ maxHeight: 'calc(90vh - 230px)' }}>
              {visibleEntries.map(([key, value]) => (
                <div key={key} className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border ${typeInfo.border} ${typeInfo.softBg}`}>
                  <div className={`flex items-center gap-2 ${typeInfo.softText}`}>
                    <FieldIcon fieldKey={key} />
                    <span className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{formatLabel(key)}</span>
                  </div>
                  <span className="text-gray-900 font-bold text-sm text-right break-all max-w-[55%]">
                    {formatValue(key, value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button onClick={closeModal} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
