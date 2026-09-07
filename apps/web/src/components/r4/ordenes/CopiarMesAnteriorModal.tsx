'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Loader2, AlertCircle, Calendar, ArrowRight, Building2, Search, Check, ChevronsUpDown, MapPin, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface CopiarMesAnteriorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPeriod?: string;
  currentColor?: string;
}

interface AvailableOc {
  po: string;
  count: number;
  sitios: string[];
}

export default function CopiarMesAnteriorModal({
  isOpen,
  onClose,
  onSuccess,
  currentPeriod = '2026-09',
  currentColor = '#E5222D'
}: CopiarMesAnteriorModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [periodoOrigen, setPeriodoOrigen] = useState('2026-08');
  const [periodoDestino, setPeriodoDestino] = useState(currentPeriod);
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('ALL');
  const [openClientePopover, setOpenClientePopover] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [nuevoPedidoTotvs, setNuevoPedidoTotvs] = useState('');
  const [fechaPedidoTotvs, setFechaPedidoTotvs] = useState('');

  // Selective Sites State
  const [sitioSelectionMode, setSitioSelectionMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [selectedSitioIds, setSelectedSitioIds] = useState<string[]>([]);

  // Selective OCs / POs State
  const [availableOcs, setAvailableOcs] = useState<AvailableOc[]>([]);
  const [loadingOcs, setLoadingOcs] = useState(false);
  const [ocSelectionMode, setOcSelectionMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [selectedPos, setSelectedPos] = useState<string[]>([]);
  const [ocSearchTerm, setOcSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNuevoPedidoTotvs('');
      setFechaPedidoTotvs('');
      setPeriodoDestino(currentPeriod);
      setSitioSelectionMode('ALL');
      setSelectedSitioIds([]);
      setOcSelectionMode('ALL');
      setSelectedPos([]);
      setOcSearchTerm('');
      // Auto-compute 1 month before
      const parts = currentPeriod.split('-');
      if (parts.length === 2) {
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        if (m === 0) {
          m = 12;
          y -= 1;
        }
        setPeriodoOrigen(`${y}-${String(m).padStart(2, '0')}`);
      }
      loadClientes();
    }
  }, [isOpen, currentPeriod]);

  const loadClientes = async () => {
    try {
      const res = await api.get('/r4/clientes');
      setClientes(res.data?.data || res.data || []);
    } catch (e) {}
  };

  // Load available OCs from the origin period when period, client, or custom sites change
  const loadAvailableOcs = useCallback(async () => {
    if (!periodoOrigen) return;
    try {
      setLoadingOcs(true);
      const params: any = { periodo: periodoOrigen };
      if (selectedClienteId !== 'ALL') {
        params.cliente_id = selectedClienteId;
      }
      if (selectedClienteId !== 'ALL' && sitioSelectionMode === 'CUSTOM' && selectedSitioIds.length > 0) {
        params.sitio_ids = selectedSitioIds.join(',');
      }

      const res = await api.get('/r4/ordenes/ocs-origen', { params });
      const ocs: AvailableOc[] = res.data?.data || [];
      setAvailableOcs(ocs);

      // If in custom mode, clean up any selected POs that are no longer in availableOcs
      setSelectedPos(prev => {
        const availableSet = new Set(ocs.map(o => o.po));
        const filtered = prev.filter(p => availableSet.has(p));
        return filtered.length > 0 ? filtered : ocs.map(o => o.po);
      });
    } catch (e) {
      setAvailableOcs([]);
    } finally {
      setLoadingOcs(false);
    }
  }, [periodoOrigen, selectedClienteId, sitioSelectionMode, selectedSitioIds]);

  useEffect(() => {
    if (isOpen) {
      loadAvailableOcs();
    }
  }, [isOpen, loadAvailableOcs]);

  const selectedClienteObj = clientes.find((c: any) => c.id === selectedClienteId);
  const availableSitios: any[] = selectedClienteObj?.sitios || [];

  const selectedLabel = selectedClienteId === 'ALL'
    ? `Todas las cuentas con órdenes activas (${clientes.length})`
    : (selectedClienteObj?.razonSocial || selectedClienteObj?.razon_social || 'Cliente seleccionado');

  const filteredClientes = clientes.filter((c: any) => {
    const name = (c.razonSocial || c.razon_social || '').toLowerCase();
    return name.includes(clienteSearchTerm.toLowerCase());
  }).sort((a: any, b: any) => (a.razonSocial || a.razon_social || '').localeCompare(b.razonSocial || b.razon_social || ''));

  const toggleSitio = (sitioId: string) => {
    setSelectedSitioIds(prev =>
      prev.includes(sitioId) ? prev.filter(id => id !== sitioId) : [...prev, sitioId]
    );
  };

  const selectAllSitios = () => {
    setSelectedSitioIds(availableSitios.map((s: any) => s.id));
  };

  const clearAllSitios = () => {
    setSelectedSitioIds([]);
  };

  const togglePo = (po: string) => {
    setSelectedPos(prev =>
      prev.includes(po) ? prev.filter(p => p !== po) : [...prev, po]
    );
  };

  const selectAllPos = () => {
    setSelectedPos(availableOcs.map(o => o.po));
  };

  const clearAllPos = () => {
    setSelectedPos([]);
  };

  const filteredOcs = availableOcs.filter(o =>
    o.po.toLowerCase().includes(ocSearchTerm.toLowerCase()) ||
    o.sitios.some(s => s.toLowerCase().includes(ocSearchTerm.toLowerCase()))
  );

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodoOrigen || !periodoDestino) {
      toast.error('Debe seleccionar los periodos origen y destino');
      return;
    }
    if (periodoOrigen === periodoDestino) {
      toast.error('El periodo origen y destino no pueden ser iguales');
      return;
    }
    if (selectedClienteId !== 'ALL' && sitioSelectionMode === 'CUSTOM' && selectedSitioIds.length === 0) {
      toast.error('Debes seleccionar al menos un sitio para replicar');
      return;
    }
    if (ocSelectionMode === 'CUSTOM' && selectedPos.length === 0) {
      toast.error('Debes seleccionar al menos una Orden de Compra (OC) para replicar');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/r4/ordenes/copiar-mes-anterior', {
        periodo_origen: periodoOrigen,
        periodo_destino: periodoDestino,
        cliente_id: selectedClienteId !== 'ALL' ? selectedClienteId : undefined,
        sitio_ids: (selectedClienteId !== 'ALL' && sitioSelectionMode === 'CUSTOM') ? selectedSitioIds : undefined,
        pos: (ocSelectionMode === 'CUSTOM') ? selectedPos : undefined,
        pedido_totvs: nuevoPedidoTotvs.trim() || undefined,
        fecha_pedido_totvs: fechaPedidoTotvs || undefined
      });

      toast.success(res.data?.message || 'Órdenes copiadas con éxito');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al copiar órdenes del mes anterior');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl sm:max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Replicar OCs del Mes Anterior</h2>
              <p className="text-xs font-medium text-slate-500">Clona las órdenes de compra activas al nuevo periodo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleCopy} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Periods Comparison Box */}
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
            <div className="text-center flex-1">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">Periodo Origen</span>
              <input
                type="month"
                value={periodoOrigen}
                onChange={(e) => setPeriodoOrigen(e.target.value)}
                className="px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none text-center shadow-xs"
                required
              />
            </div>

            <div className="p-2 bg-white rounded-full shadow-xs text-blue-600">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="text-center flex-1">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">Periodo Destino</span>
              <input
                type="month"
                value={periodoDestino}
                onChange={(e) => setPeriodoDestino(e.target.value)}
                className="px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none text-center shadow-xs"
                required
              />
            </div>
          </div>

          {/* Scope: Styled Cliente Popover */}
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
              Aplicar a Cuenta / Cliente
            </label>
            <Popover open={openClientePopover} onOpenChange={setOpenClientePopover}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full h-11 px-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 flex justify-between items-center focus:outline-none focus:border-red-500 transition-colors shadow-2xs"
                >
                  <span className="truncate">{selectedLabel}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40 text-slate-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[550px] p-2 z-[99999] rounded-2xl shadow-xl border border-slate-100" align="start">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={clienteSearchTerm}
                    onChange={(e) => setClienteSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClienteId('ALL');
                      setOpenClientePopover(false);
                      setClienteSearchTerm('');
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-colors flex items-center justify-between font-bold ${
                      selectedClienteId === 'ALL' ? 'bg-red-50 text-red-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Todas las cuentas ({clientes.length})</span>
                    {selectedClienteId === 'ALL' && <Check className="w-4 h-4 text-red-600 shrink-0" />}
                  </button>
                  {filteredClientes.map((c: any) => {
                    const isSelected = selectedClienteId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClienteId(c.id);
                          setOpenClientePopover(false);
                          setClienteSearchTerm('');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-colors flex items-center justify-between font-medium ${
                          isSelected ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{c.razonSocial || c.razon_social}</span>
                        {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selective Sitios Section */}
          {selectedClienteId !== 'ALL' && availableSitios.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  Sitios a Replicar
                </label>
                <div className="flex items-center gap-1 p-0.5 bg-slate-200/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSitioSelectionMode('ALL')}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                      sitioSelectionMode === 'ALL'
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Todos ({availableSitios.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSitioSelectionMode('CUSTOM');
                      if (selectedSitioIds.length === 0) {
                        setSelectedSitioIds(availableSitios.map((s: any) => s.id));
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                      sitioSelectionMode === 'CUSTOM'
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Elegir Sitios
                  </button>
                </div>
              </div>

              {sitioSelectionMode === 'CUSTOM' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">
                      Seleccionados: <strong className="text-slate-800 font-bold">{selectedSitioIds.length}</strong> de {availableSitios.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllSitios}
                        className="text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        Marcar todos
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={clearAllSitios}
                        className="text-slate-500 hover:underline font-bold cursor-pointer"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[140px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {availableSitios.map((sitio: any) => {
                      const isChecked = selectedSitioIds.includes(sitio.id);
                      const sNombre = (sitio.nombre || '').trim();
                      const sCuenta = (sitio.cuenta && sitio.cuenta !== '-' ? sitio.cuenta : '').trim();
                      const siteLabel = (sCuenta && sNombre && sCuenta.toUpperCase() !== sNombre.toUpperCase())
                        ? `${sCuenta.toUpperCase()} / ${sNombre.toUpperCase()}`
                        : (sCuenta || sNombre || 'Sitio sin nombre');

                      return (
                        <div
                          key={sitio.id}
                          onClick={() => toggleSitio(sitio.id)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none",
                            isChecked
                              ? "bg-white border-blue-400 text-blue-900 shadow-xs"
                              : "bg-slate-100/50 border-slate-200 text-slate-600 hover:bg-white"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                              isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                            )}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate font-bold">{siteLabel}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selective OCs Section */}
          {availableOcs.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Filtrar por OC
                </label>
                <div className="flex items-center gap-1 p-0.5 bg-slate-200/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOcSelectionMode('ALL')}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                      ocSelectionMode === 'ALL'
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Todas ({availableOcs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOcSelectionMode('CUSTOM');
                      if (selectedPos.length === 0) {
                        setSelectedPos(availableOcs.map(o => o.po));
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                      ocSelectionMode === 'CUSTOM'
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Elegir OCs
                  </button>
                </div>
              </div>

              {ocSelectionMode === 'CUSTOM' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">
                      Seleccionadas: <strong className="text-slate-800 font-bold">{selectedPos.length}</strong> de {availableOcs.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllPos}
                        className="text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        Marcar todas
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={clearAllPos}
                        className="text-slate-500 hover:underline font-bold cursor-pointer"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>

                  {availableOcs.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por folio de OC o sitio..."
                        value={ocSearchTerm}
                        onChange={(e) => setOcSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div className="max-h-[150px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {filteredOcs.map((item) => {
                      const isChecked = selectedPos.includes(item.po);
                      return (
                        <div
                          key={item.po}
                          onClick={() => togglePo(item.po)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none",
                            isChecked
                              ? "bg-white border-blue-400 text-blue-900 shadow-xs"
                              : "bg-slate-100/50 border-slate-200 text-slate-600 hover:bg-white"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                              isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                            )}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="font-bold text-slate-800 truncate">{item.po}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                              {item.count} {item.count === 1 ? 'serie' : 'series'}
                            </span>
                          </div>

                          {item.sitios.length > 0 && (
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {item.sitios.slice(0, 2).map((s, idx) => (
                                <span key={idx} className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                                  {s}
                                </span>
                              ))}
                              {item.sitios.length > 2 && (
                                <span className="text-[9px] font-bold text-slate-400">
                                  +{item.sitios.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nuevo Pedido TOTVS (Opcional) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Nuevo Pedido TOTVS <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={nuevoPedidoTotvs}
                onChange={e => setNuevoPedidoTotvs(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Fecha Registro TOTVS <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="date"
                value={fechaPedidoTotvs}
                onChange={e => setFechaPedidoTotvs(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all"
              />
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Las órdenes ya existentes en el periodo destino <strong>no se sobreescribirán</strong>. Si ingresas un nuevo Pedido TOTVS, se asignará a todas las órdenes replicadas.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: currentColor }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Replicar Órdenes</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
