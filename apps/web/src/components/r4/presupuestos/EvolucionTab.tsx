'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { r4Keys } from '@/hooks/useR4';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import TooltipInfo from '@/components/ui/TooltipInfo';
import dayjs from 'dayjs';

interface EvolucionTabProps {
    year: string;
    month: number;
    moneda: string;
    adc?: string;
    cliente_id?: string;
    sitio_id?: string;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const TIPO_EVENTO_LABEL: Record<string, string> = {
    INICIAL: 'Presupuesto inicial',
    ALTA_EQUIPO: 'Alta de equipo',
    RETIRO_EQUIPO: 'Retiro de equipo',
    CAMBIO_TARIFA: 'Cambio de tarifa',
    CAMBIO_ESTATUS: 'Cambio de estatus',
    CAMBIO_MONEDA: 'Cambio de moneda',
    OTRO: 'Ajuste / otro',
};

export default function EvolucionTab({ year, month, moneda, adc, cliente_id, sitio_id }: EvolucionTabProps) {
    const periodo = `${year}-${String(month).padStart(2, '0')}`;

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: [...r4Keys.presupuestos, 'historico', periodo, moneda, adc || '', cliente_id || '', sitio_id || ''],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('year', year);
            params.append('month', String(month));
            if (moneda) params.append('moneda', moneda);
            if (adc) params.append('adc', adc);
            if (cliente_id) params.append('cliente_id', cliente_id);
            if (sitio_id) params.append('sitio_id', sitio_id);
            const res = await api.get(`/r4/presupuestos/historico?${params.toString()}`);
            return res.data?.data || res.data;
        },
        enabled: !!year && !!month,
        placeholderData: (prev: any) => prev,
    });

    const resumen = data?.resumen || {};
    const baseline = data?.baseline || {};
    const eventos: any[] = Array.isArray(data?.eventos) ? data?.eventos : [];
    const variaciones: any[] = Array.isArray(data?.variaciones) ? data?.variaciones : [];
    const evolucionRaw: any[] = Array.isArray(data?.evolucion) ? data?.evolucion : [];
    const pedidosRaw: any[] = Array.isArray(data?.pedidos) ? data?.pedidos : [];

    const formatCurrency = (val: number) => {
        const n = Number(val || 0);
        if (n === 0) return '-';
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: moneda || 'MXN',
            maximumFractionDigits: n >= 10000 ? 0 : 2,
        }).format(n);
    };

    const kpiCurrency = (val: number) => (Number(val || 0) === 0 ? '$0' : formatCurrency(val));

    const formatSigned = (val: number) => {
        const n = Number(val || 0);
        return `${n > 0 ? '+' : ''}${formatCurrency(n)}`;
    };

    const formatCompact = (val: number) => {
        const n = Number(val || 0);
        const abs = Math.abs(n);
        if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
        return `${n}`;
    };

    const variacionColor = (v: number) => {
        if (v > 0) return 'text-emerald-600';
        if (v < 0) return 'text-red-500';
        return 'text-slate-500';
    };

    // Serie combinada para la gráfica: acumulado de presupuesto y de pedidos por fecha
    const chartData = useMemo(() => {
        const points = new Map<string, { fecha: string; label: string; presupuesto: number | null; pedidos: number | null }>();

        for (const e of evolucionRaw) {
            const key = dayjs(e.fecha).format('YYYY-MM-DD HH:mm');
            const label = dayjs(e.fecha).format('DD MMM');
            if (!points.has(key)) points.set(key, { fecha: key, label, presupuesto: null, pedidos: null });
            points.get(key)!.presupuesto = Number(e.monto || 0);
        }

        let acumPedidos = 0;
        const pedidosSorted = [...pedidosRaw].sort((a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf());
        for (const p of pedidosSorted) {
            acumPedidos += Number(p.monto || 0);
            const key = dayjs(p.fecha).format('YYYY-MM-DD HH:mm');
            const label = dayjs(p.fecha).format('DD MMM');
            if (!points.has(key)) points.set(key, { fecha: key, label, presupuesto: null, pedidos: null });
            points.get(key)!.pedidos = acumPedidos;
        }

        const arr = Array.from(points.values()).sort((a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf());
        let lastPresupuesto: number | null = null;
        for (const pt of arr) {
            if (pt.presupuesto === null) pt.presupuesto = lastPresupuesto;
            else lastPresupuesto = pt.presupuesto;
        }
        return arr;
    }, [evolucionRaw, pedidosRaw]);

    const inicial = Number(resumen.inicial || 0);
    const actual = Number(resumen.actual || 0);
    const variacionNeta = Number(resumen.variacion_neta || 0);
    const pedidosEnviados = Number(resumen.pedidos_enviados || 0);

    const kpis: Array<{
        label: string;
        value: string;
        title: string;
        tooltip: { text: string; formula: string };
        cardClass: string;
        labelClass: string;
        valueClass: string;
    }> = [
        {
            label: 'Presupuesto Inicial',
            value: kpiCurrency(inicial),
            title: baseline?.captured_at ? `Línea base ${dayjs(baseline.captured_at).format('DD/MM/YYYY HH:mm')}` : formatCurrency(inicial),
            tooltip: {
                text: 'Presupuesto estimado al inicio del periodo (línea base).',
                formula: '∑ (Rentas vigentes al crear la línea base)',
            },
            cardClass: 'border-slate-100 bg-white',
            labelClass: 'text-slate-400',
            valueClass: 'text-slate-900',
        },
        {
            label: 'Presupuesto Actual',
            value: kpiCurrency(actual),
            title: formatCurrency(actual),
            tooltip: {
                text: 'Presupuesto vigente tras los cambios registrados en el mes.',
                formula: 'Línea Base + ∑ Variaciones del Periodo',
            },
            cardClass: 'border-slate-100 bg-white',
            labelClass: 'text-slate-400',
            valueClass: 'text-slate-900',
        },
        {
            label: 'Variación del Mes',
            value: formatSigned(variacionNeta),
            title: `${inicial > 0 ? ((variacionNeta / inicial) * 100).toFixed(1) : '0.0'}% vs inicial · ${eventos.length} cambios`,
            tooltip: {
                text: 'Cambio neto del presupuesto durante el periodo.',
                formula: '∑ (Δ altas, retiros y cambios de tarifa / moneda)',
            },
            cardClass: variacionNeta < 0 ? 'border-red-200/80 bg-red-50/40' : 'border-emerald-200/80 bg-emerald-50/40',
            labelClass: variacionNeta < 0 ? 'text-red-700' : 'text-emerald-700',
            valueClass: variacionNeta < 0 ? 'text-red-600' : 'text-emerald-600',
        },
        {
            label: 'Pedidos Enviados',
            value: kpiCurrency(pedidosEnviados),
            title: formatCurrency(pedidosEnviados),
            tooltip: {
                text: 'Monto de órdenes de compra colocadas en el mes.',
                formula: '∑ (Órdenes Mensuales recibidas con PO en el mes)',
            },
            cardClass: 'border-slate-100 bg-white',
            labelClass: 'text-slate-400',
            valueClass: 'text-slate-900',
        },
    ];

    const totalVariacion = variaciones.reduce((s, v) => s + Number(v.delta || 0), 0);

    return (
        <div className="space-y-6">
            {/* Encabezado del periodo */}
            <div className="flex flex-row items-center justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Evolución del Presupuesto · {MONTH_NAMES[month - 1]} {year}
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Línea base del periodo y cambios registrados durante el mes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {baseline?.captured_at && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            Línea base: {dayjs(baseline.captured_at).format('DD/MM/YYYY HH:mm')}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                    >
                        <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin')} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Tarjetas KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {kpis.map((k) => (
                    <Card key={k.label} className={cn('shadow-sm p-3 rounded-2xl', k.cardClass)}>
                        <div className={cn('text-[10px] font-semibold uppercase tracking-wider truncate flex items-center justify-between', k.labelClass)}>
                            {k.label}
                            <TooltipInfo text={k.tooltip.text} formula={k.tooltip.formula} />
                        </div>
                        <div className={cn('text-sm font-bold mt-1 tabular-nums truncate', k.valueClass)} title={k.title}>
                            {k.value}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Trayectoria del periodo */}
            <Card className="shadow-sm border-slate-100 overflow-hidden bg-white rounded-2xl w-full">
                <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
                    <CardTitle className="text-sm font-semibold text-slate-800">Trayectoria del Periodo</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                    {isLoading && !data ? (
                        <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs">Cargando...</div>
                    ) : chartData.length <= 1 ? (
                        <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs text-center px-6">
                            Aún no hay cambios registrados en este periodo. La gráfica se alimentará conforme se
                            modifiquen equipos, tarifas o estatus durante el mes.
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                                    <YAxis tickFormatter={(v) => formatCompact(Number(v))} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={56} />
                                    <Tooltip
                                        formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                                        labelStyle={{ fontSize: 11, fontWeight: 600, color: '#334155' }}
                                        contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#64748B' }} />
                                    <Area type="stepAfter" dataKey="presupuesto" name="Presupuesto" stroke="#475569" strokeWidth={2} fill="#94A3B8" fillOpacity={0.15} connectNulls />
                                    <Area type="stepAfter" dataKey="pedidos" name="Pedidos enviados (acum.)" stroke="#0F766E" strokeWidth={2} fill="#0F766E" fillOpacity={0.1} connectNulls />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Variaciones por ADC/cliente */}
            <Card className="shadow-sm border-slate-100 overflow-hidden flex flex-col bg-white rounded-2xl w-full">
                <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-800">Variaciones por ADC y Cuentas</CardTitle>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {variaciones.length} {variaciones.length === 1 ? 'registro' : 'registros'}
                    </span>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                        <Table className="w-full text-xs">
                            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="py-2.5 px-4 font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap min-w-[150px]">ADC / Ejecutivo</TableHead>
                                    <TableHead className="py-2.5 px-4 font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap min-w-[160px]">Cliente / Cuenta</TableHead>
                                    <TableHead className="py-2.5 px-4 text-right font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap">Eventos</TableHead>
                                    <TableHead className="py-2.5 px-4 text-right font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap">Variación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {variaciones.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-slate-400 py-12">
                                            No hay variaciones registradas para este periodo
                                        </TableCell>
                                    </TableRow>
                                ) : variaciones.map((v, i) => (
                                    <TableRow key={`${v.adc}-${v.cliente}-${i}`} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100/60">
                                        <TableCell className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap max-w-[160px] truncate" title={v.adc}>{v.adc}</TableCell>
                                        <TableCell className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap max-w-[180px] truncate" title={v.cliente}>{v.cliente}</TableCell>
                                        <TableCell className="py-2.5 px-4 text-right font-normal text-slate-500 tabular-nums">{v.eventos}</TableCell>
                                        <TableCell className={cn('py-2.5 px-4 text-right font-bold tabular-nums', variacionColor(Number(v.delta)))}>
                                            {formatSigned(Number(v.delta))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            {variaciones.length > 0 && (
                                <tfoot className="bg-slate-50/90 font-semibold text-slate-800 border-t-2 border-slate-200">
                                    <tr>
                                        <TableCell colSpan={3} className="py-3 px-4 font-bold text-slate-900 uppercase text-xs">Total general</TableCell>
                                        <TableCell className={cn('py-3 px-4 text-right font-bold tabular-nums', variacionColor(totalVariacion))}>
                                            {formatSigned(totalVariacion)}
                                        </TableCell>
                                    </tr>
                                </tfoot>
                            )}
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Bitácora de cambios */}
            <Card className="shadow-sm border-slate-100 overflow-hidden flex flex-col bg-white rounded-2xl w-full">
                <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-800">Bitácora de Cambios</CardTitle>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {eventos.length} {eventos.length === 1 ? 'cambio' : 'cambios'}
                    </span>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                        <Table className="w-full text-xs">
                            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="py-2.5 px-4 font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap">Fecha</TableHead>
                                    <TableHead className="py-2.5 px-4 font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap">Cambio</TableHead>
                                    <TableHead className="py-2.5 px-4 font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap">Equipo</TableHead>
                                    <TableHead className="py-2.5 px-4 font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap">ADC / Cuenta</TableHead>
                                    <TableHead className="py-2.5 px-4 font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap">Usuario</TableHead>
                                    <TableHead className="py-2.5 px-4 text-right font-semibold text-slate-400 uppercase text-[11px] tracking-wider whitespace-nowrap">Impacto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {eventos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                                            Sin cambios registrados. La bitácora se alimenta de altas, retiros, cambios de tarifa y estatus
                                        </TableCell>
                                    </TableRow>
                                ) : [...eventos].reverse().map((e, i) => (
                                    <TableRow key={e.id || i} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100/60">
                                        <TableCell className="py-2.5 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                                            {dayjs(e.fecha).format('DD/MM/YY HH:mm')}
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4 whitespace-nowrap">
                                            <span className={cn(
                                                'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold',
                                                e.tipo_evento === 'ALTA_EQUIPO' ? 'bg-emerald-50 text-emerald-700' :
                                                e.tipo_evento === 'RETIRO_EQUIPO' ? 'bg-red-50 text-red-600' :
                                                e.tipo_evento === 'CAMBIO_ESTATUS' ? 'bg-amber-50 text-amber-600' :
                                                e.tipo_evento === 'CAMBIO_TARIFA' ? 'bg-slate-100 text-slate-600' :
                                                'bg-slate-100 text-slate-600'
                                            )}>
                                                {TIPO_EVENTO_LABEL[e.tipo_evento] || e.tipo_evento}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4 text-slate-600 font-medium whitespace-nowrap">{e.activo_serie || '-'}</TableCell>
                                        <TableCell className="py-2.5 px-4 text-slate-600 max-w-[200px]">
                                            <div className="font-medium truncate" title={e.adc || ''}>{e.adc || '-'}</div>
                                            {e.cliente && <div className="text-[11px] text-slate-400 truncate" title={e.cliente}>{e.cliente}</div>}
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{e.usuario_nombre || '-'}</TableCell>
                                        <TableCell className={cn('py-2.5 px-4 text-right font-bold whitespace-nowrap tabular-nums', variacionColor(Number(e.delta)))}>
                                            {formatSigned(Number(e.delta))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
