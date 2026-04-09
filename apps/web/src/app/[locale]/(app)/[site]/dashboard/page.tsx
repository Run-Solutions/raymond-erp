'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, QrCode, Search, X, Camera,
  Package, MapPin, Wrench, FileSpreadsheet,
  CheckCircle2, Hash, Tag, Clock, Layers,
  FileText, ArrowRightLeft, Smartphone, ImageIcon, Monitor,
  Activity, ArrowUpRight, CopyCheck
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthTallerStore } from '@/store/auth-taller.store';
import { dashboardApi } from '@/services/taller-r1/dashboard.service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePendingTallerUsuarios } from '@/hooks/taller-r1/useTallerUsuarios';
import { useAuthStore } from '@/store/auth.store';
import { UserCheck, ShieldAlert, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
    softBg: 'bg-violet-50', softText: 'text-violet-700', border: 'none',
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

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

export default function DashboardPage() {
  const selectedSite = useAuthTallerStore(state => state.selectedSite) || 'r1';
  const { user } = useAuthStore();
  
  // Solicitudes Alert Data
  const { data: pendingUsuarios = [] } = usePendingTallerUsuarios();
  const isAdmin = user?.email === 'j.molina@runsolutions-services.com' ||
    (() => {
        const roleName = typeof user?.role === 'string'
            ? user.role
            : (user?.role as any)?.name;
        return roleName && ['Superadmin', 'Admin', 'Administrador'].includes(roleName);
    })();


  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Search/Scan State
  const [isSearching, setIsSearching] = useState(false);
  const [resultData, setResultData] = useState<SearchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [scannerTab, setScannerTab] = useState<'camera' | 'file'>('camera');

  const isHandlingRef = useRef(false);
  const qrReaderRef = useRef<any>(null);

  useEffect(() => {
    loadStats();
  }, [selectedSite]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await dashboardApi.getStats(selectedSite);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSearch = async (term: string) => {
    const q = term.trim();
    if (!q) return;
    try {
      setIsSearching(true);
      // Ensure we hit the general search endpoint but force the tenant via header
      const res = await api.get(`/taller-r1/search?q=${encodeURIComponent(q)}`, {
        headers: { 'x-site-id': selectedSite }
      });
      const result: SearchResult = res.data?.data || res.data;
      if (result?.found) {
        setResultData(result);
        setIsModalOpen(true);
      } else {
        toast.error(`Sin resultados para: "${q}" en la base de datos de ${selectedSite.toUpperCase()}.`);
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

  const startCamera = async () => {
    try {
      setScannerStarted(true);
    } catch (e) {
      console.error('[camera]', e);
      toast.error('Error al activar la cámara.');
    }
  };

  useEffect(() => {
    if (!scannerStarted) return;
    let qrReader: any = null;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        qrReader = new Html5Qrcode('qr-reader-camera');
        qrReaderRef.current = qrReader;

        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          toast.error('No se encontró ninguna cámara en este dispositivo.');
          setScannerStarted(false);
          return;
        }

        const backCamera = devices.find((d: any) =>
          /back|rear|environment|trasera/i.test(d.label)
        ) || devices[devices.length - 1];

        await qrReader.start(
          backCamera.id,
          { fps: 10, qrbox: { width: 230, height: 230 } },
          onScanSuccess,
          () => { } // ignore frame errors
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

    const timer = setTimeout(init, 100);
    return () => {
      clearTimeout(timer);
      qrReader?.stop().catch(() => { });
    };
  }, [scannerStarted]);

  const stopCamera = async () => {
    try {
      await qrReaderRef.current?.stop();
      qrReaderRef.current = null;
    } catch { }
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

  useEffect(() => {
    return () => {
      qrReaderRef.current?.stop().catch(() => { });
    };
  }, []);

  const closeModal = () => { setIsModalOpen(false); setResultData(null); };
  const typeInfo = resultData?.type ? TYPE_CONFIG[resultData.type] : null;

  const data = resultData?.data || {};
  const EXCLUDED_KEYS = [
    'id_detalles', 'id_entrada', 'id_equipo', 'id_sub_ubicacion', 'id_ubicacion',
    'id_accesorio', 'id_equipo_ubicacion', 'id_solicitud', 'pdf', 'evidencia',
    'comentario', 'QR_Link', 'status_totvs', 'semanas_renovacion', 'stock',
    'usuario_entrada', 'usuario_salida', 'vendedor'
  ];

  const getSections = () => {
    if (!resultData?.data) return [];

    const general = [];
    const ubicacion = [];
    const almacen = [];

    const entries = Object.entries(data).filter(([k, v]) =>
      !EXCLUDED_KEYS.some(ex => k.startsWith(ex)) &&
      v !== null && v !== undefined && v !== '' && typeof v !== 'object'
    );

    for (const [key, value] of entries) {
      if (key.includes('ubicacion') || key.includes('rack')) {
        ubicacion.push({ key, value });
      } else if (key.includes('fecha') || key.includes('tiempo') || key.includes('permanencia')) {
        almacen.push({ key, value });
      } else {
        general.push({ key, value });
      }
    }

    return [
      { id: 'general', title: 'Información General', items: general, icon: <Package className="w-4 h-4" /> },
      { id: 'ubicacion', title: 'Ubicación y Logística', items: ubicacion, icon: <MapPin className="w-4 h-4" /> },
      { id: 'almacen', title: 'Almacén y Tiempo', items: almacen, icon: <Clock className="w-4 h-4" /> },
    ].filter(s => s.items.length > 0);
  };

  const sections = getSections();
  const visibleEntriesFallback = Object.entries(data).filter(([k, v]) =>
    !EXCLUDED_KEYS.some(ex => k.startsWith(ex)) &&
    v !== null && v !== undefined && v !== '' && typeof v !== 'object'
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Abstract Background for Aesthetic */}
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-red-600/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-red-100/50 blur-[120px] pointer-events-none mix-blend-multiply" />

      {/* Solicitudes Alert Banner - Subtle Version */}
      {isAdmin && pendingUsuarios.length > 0 && (
        <div className="relative z-20 px-6 sm:px-10 pt-6 -mb-2 w-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="group relative flex items-center justify-between p-4 px-6 bg-white border border-red-100 rounded-3xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 transition-transform group-hover:scale-105">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  <span className="text-red-600">{pendingUsuarios.length} solicitudes</span> de acceso pendientes
                </h2>
                <div className="hidden sm:block w-1 h-1 bg-slate-300 rounded-full" />
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Acción requerida por administración
                </p>
              </div>
            </div>

            <Link 
              href={`/es/${selectedSite}/solicitudes`}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              Revisar
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}


      {/* Header */}
      <div className="relative z-10 px-6 sm:px-10 pt-10 pb-6 w-full max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2.5 h-8 bg-red-600 rounded-full" />
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Centro de Control</h1>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
              Panorama General &middot; {selectedSite.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-6 sm:px-10 pb-20 flex flex-col gap-8">

        {/* KPI Cards section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: 'Equipos Registrados', value: stats?.overview?.total_equipos, icon: <Package className="w-5 h-5 text-blue-500" />, load: loadingStats, color: 'blue' },
            { label: 'Entradas Por Ubicar', value: stats?.overview?.entradas_activas, icon: <ArrowUpRight className="w-5 h-5 text-emerald-500" />, load: loadingStats, color: 'emerald' },
            { label: 'Salidas en Proceso', value: stats?.overview?.salidas_activas, icon: <Activity className="w-5 h-5 text-amber-500" />, load: loadingStats, color: 'amber' },
            { label: 'Accesorios Ingresados', value: stats?.overview?.total_accesorios, icon: <Wrench className="w-5 h-5 text-violet-500" />, load: loadingStats, color: 'violet' }
          ].map((kpi, idx) => (
            <div key={idx} className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-${kpi.color}-50 border border-transparent group-hover:scale-110 transition-transform`}>
                  {kpi.icon}
                </div>
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</h3>
              {kpi.load ? (
                <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                <p className="text-3xl font-black text-slate-900">{kpi.value || 0}</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Charts and Activities */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Row: Status Chart */}
            <div className="w-full">

              {/* Equipment Status Donut */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-[2.5rem] p-6 sm:p-8 flex flex-col h-full">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Entradas vs Salidas (Actividad - 10 Días)
                </h3>
                <div className="flex-1 flex items-center justify-center min-h-[300px]">
                  {loadingStats ? (
                    <div className="flex items-center justify-center w-full h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                    </div>
                  ) : (stats?.daily_flow?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                      <BarChart
                        data={stats.daily_flow}
                        margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                          itemStyle={{ color: '#0f172a' }}
                          cursor={{ fill: '#f1f5f9' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} />
                        <Bar dataKey="Entradas" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="Salidas" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-slate-400 font-bold text-sm">
                      No hay datos suficientes
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Search & Scanner */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden h-fit">
            <div className="p-6 sm:p-8 bg-slate-900 border-b border-slate-800 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-3xl rounded-full" />
              <h2 className="text-xl font-black flex items-center gap-3">
                <QrCode className="w-6 h-6 text-red-500" /> Búsqueda Rápida
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-2">Introduce un serial o escanea un código QR</p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Search Input */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-600 transition-colors" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchInput)}
                  placeholder="Ej: RXI005..."
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-sm shadow-sm"
                />
                <button
                  onClick={() => handleSearch(searchInput)}
                  disabled={isSearching || !searchInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-1.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-xs"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-slate-300">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] uppercase font-black tracking-widest">o usa escáner</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* QR Scanner Block */}
              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-2 relative overflow-hidden">
                <div className="flex gap-2 mb-2 p-1 bg-slate-200/50 rounded-2xl">
                  <button
                    onClick={() => setScannerTab('camera')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${scannerTab === 'camera' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <Camera className="w-3.5 h-3.5" /> Cámara
                  </button>
                  <button
                    onClick={() => { setScannerTab('file'); stopCamera(); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${scannerTab === 'file' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Foto
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden relative min-h-[220px] flex flex-col justify-center items-center">
                  {scannerTab === 'camera' ? (
                    <div className="w-full flex-1 flex flex-col relative">
                      <div id="qr-reader-camera" className={`w-full overflow-hidden ${scannerStarted ? 'block' : 'hidden'}`} />
                      {!scannerStarted && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-10 bg-slate-50">
                          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <Camera className="w-6 h-6" />
                          </div>
                          <button onClick={startCamera} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                            Activar Cámara
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <label className="cursor-pointer w-full">
                        <div className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-900/20 active:scale-95">
                          Elegir Foto
                        </div>
                        <input type="file" accept="image/*" onChange={handleFileQr} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {lastScanned && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3 animate-in fade-in" onClick={() => handleSearch(lastScanned)}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 truncate">
                    <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest leading-none mb-0.5">Último Escaneo</p>
                    <p className="text-xs font-black text-emerald-900 truncate cursor-pointer hover:underline">{lastScanned}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL RESULTADO REDISEÑADO ── */}
      {isModalOpen && resultData?.data && typeInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20" style={{ maxHeight: '90vh' }}>
            <div className={`bg-gradient-to-br ${typeInfo.gradient} p-8 sm:p-10 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />

              <div className="relative flex justify-between items-start">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                    {typeInfo.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,1)] animate-pulse" />
                      <p className="text-white/90 text-[10px] font-black uppercase tracking-[0.2em]">Registro Localizado</p>
                    </div>
                    <h3 className="text-white text-3xl sm:text-4xl font-black tracking-tight">{typeInfo.label}</h3>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-12 h-12 bg-black/20 hover:bg-black/30 text-white rounded-2xl flex items-center justify-center transition-all hover:rotate-90 hover:scale-105"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {resultData.data.serial && (
                <div className="mt-8 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-2xl text-white shadow-lg">
                    <Hash className="w-4 h-4 opacity-70" />
                    <span className="font-black text-sm tracking-widest">{resultData.data.serial}</span>
                  </div>
                  {resultData.data.estado && (
                    <div className="bg-white text-slate-900 px-5 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg">
                      {resultData.data.estado}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-slate-50/50 custom-scrollbar">
              {sections.length > 0 ? sections.map((section) => (
                <div key={section.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      {section.icon}
                    </div>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{section.title}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                    {section.items.map(({ key, value }, i) => (
                      <div key={key} className={`p-4 sm:p-6 flex flex-col gap-1 hover:bg-slate-50 transition-colors ${(i % 2 === 0) ? 'border-b border-slate-100 sm:border-b-0' : ''}`}>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {formatLabel(key)}
                        </span>
                        <span className="text-sm font-bold text-slate-900 break-words">
                          {formatValue(key, value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 gap-4 grid grid-cols-1 sm:grid-cols-2">
                  {visibleEntriesFallback.map(([key, value]: [string, any]) => (
                    <div key={key} className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-1">
                      <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{formatLabel(key)}</span>
                      <span className="text-sm font-bold text-slate-900 break-words">{formatValue(key, value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
