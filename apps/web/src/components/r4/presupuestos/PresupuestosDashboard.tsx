import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import PresupuestosFilters from './PresupuestosFilters';
import SummaryCards from './SummaryCards';
import PresupuestosMasterTable from './PresupuestosMasterTable';
import PedidosDelMesTable from './PedidosDelMesTable';
import ObservacionesSection from './ObservacionesSection';
import EgresosDashboard from './EgresosDashboard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowDownRight, ArrowUpRight, ShieldCheck, DollarSign } from 'lucide-react';

interface PresupuestosDashboardProps {
    data: any;
    filters: any;
    setFilters: (filters: any) => void;
    onSearch: () => void;
    onReset?: () => void;
    appliedFilters?: any;
    activeMoneda: string;
    isSearching?: boolean;
    canEditFacturado?: boolean;
    onFacturadoSaved?: () => void;
    adminAdcScope?: 'todos' | 'mis_adcs';
    setAdminAdcScope?: (scope: 'todos' | 'mis_adcs') => void;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function PresupuestosDashboard({ 
    data, 
    filters, 
    setFilters, 
    onSearch, 
    onReset, 
    appliedFilters,
    activeMoneda, 
    isSearching,
    canEditFacturado,
    onFacturadoSaved,
    adminAdcScope,
    setAdminAdcScope,
}: PresupuestosDashboardProps) {
    const [activeTab, setActiveTab] = useState<'ingresos' | 'egresos'>('ingresos');

    if (!data || !data.stats) return null;

    const currentMoneda = activeMoneda || filters.moneda;
    const currentStats = currentMoneda === 'MXN' ? data.stats.MXN : data.stats.USD;

    const handleExport = () => {
        try {
            if (!data) return;
            const pedidos = Array.isArray(data.pedidos_del_mes) ? data.pedidos_del_mes : [];
            const maestra = Array.isArray(data.tabla_maestra) ? data.tabla_maestra : [];
            const applied = appliedFilters || filters || {};
            const stats = currentStats || {};
            const meses = Array.isArray(applied.month) ? applied.month : [];
            const mesesLabel = meses.length
                ? meses.map((m: string) => MONTH_NAMES[Number(m) - 1] || m).join(', ')
                : 'Todos';
            const scopeLabel = adminAdcScope === 'mis_adcs' ? 'Solo mis ADC' : 'Todos los ADC';

            const wb = XLSX.utils.book_new();

            // Hoja 1: Pedidos consolidados del mes (pedidos registrados + importes)
            const pedidosHeader = ['Cliente', 'Cuenta', 'Sitio', 'Folio OC / PO', 'Pedido TOTVS', 'Equipos', 'Moneda', 'Importe'];
            const pedidosRows = pedidos.map((r: any) => [
                r.cliente || '',
                r.cuenta || '',
                r.sitio || '',
                r.po && r.po !== '-' ? r.po : '',
                r.pedido_totvs && r.pedido_totvs !== '-' ? r.pedido_totvs : '',
                Number(r.cantidad_equipos || 0),
                r.moneda || currentMoneda || '',
                Number(r.importe || 0),
            ]);
            const totalesPorMoneda = pedidos.reduce((acc: Record<string, number>, r: any) => {
                const mon = String(r.moneda || currentMoneda || 'MXN').trim().toUpperCase() || 'MXN';
                acc[mon] = (acc[mon] || 0) + Number(r.importe || 0);
                return acc;
            }, {});
            const totalesRows = Object.entries(totalesPorMoneda).map(([mon, imp]) => [
                'TOTAL', '', '', '', '', '', mon, Number(imp),
            ]);

            const wsPedidos = XLSX.utils.aoa_to_sheet([pedidosHeader, ...pedidosRows, ['', '', '', '', '', '', '', ''], ...totalesRows]);
            wsPedidos['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, wsPedidos, 'Pedidos del Mes');

            // Hoja 2: Resumen consolidado por ADC y cuentas (información comercial)
            const maestraHeader = ['ADC / Ejecutivo', 'Cliente / Cuenta', 'Moneda', 'Presupuesto', 'Pedidos Enviados', 'Cumplimiento %', 'Equipos Detenidos', 'Pendiente Acumulado', 'Total a Facturar'];
            const maestraRows = maestra.map((r: any) => [
                r.adc || '',
                r.cliente || '',
                r.moneda || currentMoneda || '',
                Number(r.presupuesto || 0),
                Number(r.enviado || 0),
                Number(r.cumplimiento || 0),
                Number(r.equipos_detenidos || 0),
                Number(r.pendiente_acumulado || 0),
                Number(r.total_facturar || 0),
            ]);
            const wsMaestra = XLSX.utils.aoa_to_sheet([maestraHeader, ...maestraRows]);
            wsMaestra['!cols'] = [{ wch: 24 }, { wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, wsMaestra, 'Resumen por ADC');

            // Hoja 3: Resumen general (filtros aplicados y estadísticas) para la conciliación
            const totalPedidos = pedidos.reduce((sum: number, r: any) => sum + Number(r.importe || 0), 0);
            const resumenRows = [
                ['Reporte', 'Presupuestos - Pedidos consolidados'],
                ['Fecha de exportación', new Date().toLocaleString('es-MX')],
                ['Año', applied.year || ''],
                ['Meses', mesesLabel],
                ['Moneda', currentMoneda],
                ['Alcance ADC', scopeLabel],
                ['', ''],
                ['Concepto', 'Valor'],
                ['Presupuesto del mes', Number(stats.presupuesto_mes || 0)],
                ['Pedidos enviados', Number(stats.pedidos_enviados || 0)],
                ['Facturado', Number(stats.facturado || 0)],
                ['Faltante', Number(stats.faltante || 0)],
                ['Cumplimiento general (%)', Number(stats.cumplimiento_general || 0)],
                ['Equipos detenidos', Number(stats.equipos_detenidos || 0)],
                ['Total a facturar', Number(stats.total_a_facturar || 0)],
                ['Acumulado', Number(stats.acumulado || 0)],
                ['', ''],
                ['Órdenes consolidadas exportadas', pedidos.length],
                ['Monto total de pedidos exportado', Number(totalPedidos || 0)],
            ];
            const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
            wsResumen['!cols'] = [{ wch: 32 }, { wch: 24 }];
            XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

            const dateStamp = new Date().toISOString().slice(0, 10);
            const fileName = `Reporte_Pedidos_Consolidados_${applied.year || ''}_${dateStamp}`;
            const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            toast.success(`Reporte exportado: ${fileName}.xlsx`);
        } catch (err) {
            console.error('Error al exportar el reporte', err);
            toast.error('Error al exportar el reporte. Intenta nuevamente.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-full">
            
            {/* Filters Bar */}
            <PresupuestosFilters 
                filters={filters} 
                setFilters={setFilters} 
                onSearch={onSearch} 
                onReset={onReset} 
                onExport={handleExport}
                isSearching={isSearching} 
            />

            {/* Main Module Tabs Switcher: Ingresos vs Egresos */}
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'ingresos' | 'egresos')} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 w-full max-w-md grid grid-cols-2 mb-6 shadow-2xs">
                    <TabsTrigger 
                        value="ingresos" 
                        className="rounded-xl font-bold text-xs flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                    >
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                        Ingresos (Facturación)
                    </TabsTrigger>
                    <TabsTrigger 
                        value="egresos" 
                        className="rounded-xl font-bold text-xs flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                    >
                        <ArrowDownRight className="w-4 h-4 text-rose-600" />
                        Egresos (Pago a Terceros)
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Ingresos (Facturación & Rentas) */}
                <TabsContent value="ingresos" className="space-y-6 m-0">
                    <SummaryCards 
                        stats={currentStats} 
                        moneda={currentMoneda} 
                        tipoCambio={data.tipo_cambio}
                        canEditFacturado={canEditFacturado}
                        activeFilters={filters}
                        onFacturadoSaved={onFacturadoSaved}
                    />

                    {/* Master Consolidated Table */}
                    <PresupuestosMasterTable data={data.tabla_maestra || []} moneda={currentMoneda} />

                    {/* Secondary Row: Orders sent this month & Observaciones (apilados) */}
                    <div className="grid grid-cols-1 gap-6 items-start">
                        <PedidosDelMesTable 
                            title="Pedidos Enviados del Mes"
                            data={data.pedidos_del_mes} 
                            moneda={currentMoneda} 
                        />
                        <ObservacionesSection observaciones={data.observaciones} />
                    </div>
                </TabsContent>

                {/* Tab 2: Egresos (Pago a Terceros & SMP) */}
                <TabsContent value="egresos" className="m-0">
                    <EgresosDashboard data={data.egresos} moneda={currentMoneda} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
