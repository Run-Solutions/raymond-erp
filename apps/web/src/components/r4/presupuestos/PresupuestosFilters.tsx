import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Download, Search, Loader2, RotateCcw } from 'lucide-react';
import dayjs from 'dayjs';
import { MultiSelect } from '@/components/ui/multi-select';

interface FiltersProps {
    filters: any;
    setFilters: (filters: any) => void;
    onSearch?: () => void;
    onReset?: () => void;
    isSearching?: boolean;
}

export default function PresupuestosFilters({ filters, setFilters, onSearch, onReset, isSearching }: FiltersProps) {
    const years = Array.from({ length: 5 }, (_, i) => (dayjs().year() - 2 + i).toString());
    const months = [
        { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
        { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
        { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
        { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
    ];

    const handleChange = (key: string, value: any) => {
        setFilters((prev: any) => ({ ...prev, [key]: value }));
    };

    return (
        <Card className="shadow-sm border-slate-100 bg-white mb-6">
            <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                    
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Año</Label>
                        <SearchableSelect
                            options={years.map((y) => ({ label: y, value: y }))}
                            value={filters.year}
                            onChange={(val) => handleChange('year', val)}
                            placeholder="Año"
                            searchPlaceholder="Buscar año..."
                            emptyMessage="Sin resultados"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Meses</Label>
                        <MultiSelect 
                            options={months}
                            selected={filters.month || []}
                            onChange={(val) => handleChange('month', val)}
                            placeholder="Meses"
                            searchPlaceholder="Buscar mes..."
                            emptyMessage="Sin resultados"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Moneda</Label>
                        <SearchableSelect
                            options={[
                                { label: 'MXN', value: 'MXN' },
                                { label: 'USD', value: 'USD' },
                            ]}
                            value={filters.moneda}
                            onChange={(val) => handleChange('moneda', val)}
                            placeholder="Moneda"
                            searchPlaceholder="Buscar moneda..."
                            emptyMessage="Sin resultados"
                        />
                    </div>

                    <div className="flex items-center gap-2 lg:col-span-3 justify-end">
                        {onReset && (
                            <Button
                                variant="outline"
                                onClick={onReset}
                                title="Restaurar filtros iniciales"
                                className="border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restaurar
                            </Button>
                        )}
                        {onSearch && (
                            <Button 
                                onClick={onSearch}
                                disabled={isSearching}
                                className="flex-1 lg:flex-initial bg-slate-900 text-white hover:bg-slate-800 font-bold px-6"
                            >
                                {isSearching ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                                        Buscando...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4 mr-2" />
                                        Buscar
                                    </>
                                )}
                            </Button>
                        )}
                        <Button 
                            variant="outline" 
                            className="flex-1 lg:flex-initial border-slate-200 text-slate-700 hover:bg-slate-50"
                            onClick={() => alert('Generando reporte PDF/Excel...')}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar Reporte
                        </Button>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
