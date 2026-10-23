'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  Loader2,
  MapPin,
  Receipt,
  UserCheck,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface OcEditSerie {
  id: string;
  activo?: string | null;
  serie?: string | null;
  activo_modelo?: string | null;
  modelo?: string | null;
  clase?: string | null;
  tarifa?: number | null;
}

export interface OcEditGroup {
  id: string;
  periodo: string;
  po: string;
  pedido_totvs?: string | null;
  fecha_pedido_totvs?: string | null;
  fecha_oc?: string | null;
  cliente: string;
  sitio?: string | null;
  sitios?: string[];
  adc?: string | null;
  moneda: string;
  series: OcEditSerie[];
}

interface EditarOcModalProps {
  isOpen: boolean;
  group: OcEditGroup | null;
  onClose: () => void;
  onSuccess: (periodo: string) => void;
  currentColor?: string;
  targetOrdenId?: string | null;
}

const toDateInput = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const num = Number(raw);
  if (!Number.isNaN(num) && num > 30000 && num < 80000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + num * 86400000);
    return jsDate.toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const formatPeriodLabel = (periodo: string) => {
  if (!periodo) return '-';
  const [year, month] = periodo.split('-');
  const months: Record<string, string> = {
    '01': 'Enero',
    '02': 'Febrero',
    '03': 'Marzo',
    '04': 'Abril',
    '05': 'Mayo',
    '06': 'Junio',
    '07': 'Julio',
    '08': 'Agosto',
    '09': 'Septiembre',
    '10': 'Octubre',
    '11': 'Noviembre',
    '12': 'Diciembre',
  };
  return `${months[month] || month} ${year}`;
};

export default function EditarOcModal({
  isOpen,
  group,
  onClose,
  onSuccess,
  currentColor = '#E5222D',
  targetOrdenId,
}: EditarOcModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [po, setPo] = useState('');
  const [pedidoTotvs, setPedidoTotvs] = useState('');
  const [fechaPedidoTotvs, setFechaPedidoTotvs] = useState('');
  const [fechaOc, setFechaOc] = useState('');
  const [moneda, setMoneda] = useState('MXN');
  const [tarifas, setTarifas] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !group) return;
    setPo(group.po && group.po !== 'NO REGISTRADO' ? group.po : '');
    setPedidoTotvs(group.pedido_totvs && group.pedido_totvs !== '-' ? group.pedido_totvs : '');
    setFechaPedidoTotvs(toDateInput(group.fecha_pedido_totvs));
    setFechaOc(toDateInput(group.fecha_oc));
    setMoneda((group.moneda || 'MXN').toUpperCase() === 'USD' ? 'USD' : 'MXN');
    setTarifas(
      Object.fromEntries(
        (group.series || []).map((serie) => [
          serie.id,
          serie.tarifa === null || serie.tarifa === undefined ? '' : String(serie.tarifa),
        ]),
      ),
    );
  }, [isOpen, group]);

  const sourceSeries = useMemo(() => {
    if (!group) return [] as OcEditSerie[];
    if (targetOrdenId) {
      return (group.series || []).filter((serie: any) => serie.id === targetOrdenId);
    }
    return (group.series || []);
  }, [group, targetOrdenId]);

  const validSeries = useMemo(() => sourceSeries.filter((serie: any) => serie.id), [sourceSeries]);

  const total = useMemo(() => {
    return (validSeries || []).reduce((sum, serie) => {
      const value = Number(tarifas[serie.id]) || 0;
      return sum + value;
    }, 0);
  }, [validSeries, tarifas]);

  if (!isOpen || !group) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!po.trim()) {
      toast.error('Debe ingresar el folio de la Orden de Compra (OC)');
      return;
    }

    if (!validSeries.length) {
      toast.error('No hay órdenes válidas para actualizar');
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!group) return;
    try {
      setSubmitting(true);

      const payload = {
        orden_ids: validSeries.map((serie: any) => serie.id),
        periodo: group.periodo,
        po: po.trim(),
        pedido_totvs: pedidoTotvs.trim() || null,
        fecha_pedido_totvs: fechaPedidoTotvs || null,
        fecha_oc: fechaOc || null,
        moneda,
        tarifas: validSeries.map((serie: any) => ({
          orden_id: serie.id,
          tarifa: Math.max(0, Number(tarifas[serie.id]) || 0),
        })),
      };

      const response = await api.patch('/r4/ordenes/editar-oc', payload);
      toast.success(response.data?.message || 'OC actualizada correctamente');
      setConfirmOpen(false);
      onSuccess(group.periodo);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al actualizar la OC');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl bg-red-50 text-red-600"
              style={{ backgroundColor: `${currentColor}15`, color: currentColor }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Editar OC</h2>
                <p className="text-xs font-medium text-slate-500">
                  {formatPeriodLabel(group.periodo)} · {validSeries.length} equipo
                  {validSeries.length > 1 ? 's' : ''}
                </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
              <div className="flex items-start gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cliente</p>
                  <p className="font-bold text-slate-800 truncate">{group.cliente || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sitio</p>
                  <p className="font-bold text-slate-800 truncate">
                    {group.sitios && group.sitios.length > 0
                      ? group.sitios.join(', ')
                      : group.sitio || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 min-w-0">
                <UserCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ADC</p>
                  <p className="font-bold text-slate-800 truncate">{group.adc || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 min-w-0">
                <Receipt className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Periodo</p>
                  <p className="font-bold text-slate-800">{formatPeriodLabel(group.periodo)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Folio OC / PO *
                </label>
                <input
                  type="text"
                  value={po}
                  onChange={(event) => setPo(event.target.value)}
                  placeholder="Ej. OC-2026-AMZ-001"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Pedido TOTVS
                </label>
                <input
                  type="text"
                  value={pedidoTotvs}
                  onChange={(event) => setPedidoTotvs(event.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha Pedido TOTVS
                </label>
                <input
                  type="date"
                  value={fechaPedidoTotvs}
                  onChange={(event) => setFechaPedidoTotvs(event.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha OC
                </label>
                <input
                  type="date"
                  value={fechaOc}
                  onChange={(event) => setFechaOc(event.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Moneda de la OC
                </label>
                <select
                  value={moneda}
                  onChange={(event) => setMoneda(event.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                La <strong>moneda</strong> se guarda en la renta, por lo que el cambio
                aplica a todos los periodos de estas series. El folio, pedido, fechas y
                tarifas se aplican únicamente al periodo{' '}
                <strong>{formatPeriodLabel(group.periodo)}</strong>.
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-red-600" />
                  Tarifas por equipo
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  Total: ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {moneda}
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2.5 font-black">Serie</th>
                        <th className="px-4 py-2.5 font-black">Modelo</th>
                        <th className="px-4 py-2.5 font-black text-right">Tarifa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validSeries.map((serie) => (
                        <tr key={serie.id || `${serie.serie}-${serie.modelo}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                              {serie.serie || serie.activo || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 font-medium">
                            {serie.modelo || serie.activo_modelo || serie.clase || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-400">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!serie.id}
                                value={serie.id ? (tarifas[serie.id] ?? '') : ''}
                                onChange={(event) =>
                                  serie.id &&
                                  setTarifas((prev) => ({
                                    ...prev,
                                    [serie.id]: event.target.value,
                                  }))
                                }
                                className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right focus:bg-white focus:outline-none focus:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <span className="text-[10px] font-bold text-slate-400">{moneda}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: currentColor }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Guardando...' : 'Guardar cambios'}</span>
            </button>
          </div>
        </form>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar actualización de OC?</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizará la OC <span className="font-semibold text-slate-700">{po.trim()}</span> para <span className="font-semibold text-slate-700">{validSeries.length}</span> equipo{validSeries.length === 1 ? '' : 's'} del periodo <span className="font-semibold text-slate-700">{formatPeriodLabel(group.periodo)}</span>.<br />
              Se aplicarán los cambios a PO, Pedido TOTVS, Fecha OC/Fecha Pedido, moneda y tarifas únicamente en este periodo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
