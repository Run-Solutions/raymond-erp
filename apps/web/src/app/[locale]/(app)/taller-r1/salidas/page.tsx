'use client';

import { useState, useEffect } from 'react';
import { salidasApi, Salida } from '@/services/taller-r1/salidas.service';
import { toast } from 'sonner';
import { Plus, Download, Search, FileText, LayoutDashboard, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableList } from '@/components/shared/TableList';
import { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import NuevaSalidaModal from '@/components/taller-r1/salidas/NuevaSalidaModal';
import SalidaDetailsModal from '@/components/taller-r1/salidas/SalidaDetailsModal';

export default function SalidasPage() {
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [filteredSalidas, setFilteredSalidas] = useState<Salida[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todo' | 'por-entregar' | 'espera-remision' | 'entregado'>('todo');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSalidaId, setSelectedSalidaId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadSalidas();
  }, []);

  useEffect(() => {
    filterSalidas();
  }, [salidas, activeTab, searchTerm]);

  const loadSalidas = async () => {
    try {
      setLoading(true);
      const data = await salidasApi.getAll();
      setSalidas(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Error al cargar las salidas');
      setSalidas([]);
    } finally {
      setLoading(false);
    }
  };

  const filterSalidas = () => {
    if (!Array.isArray(salidas)) {
      setFilteredSalidas([]);
      return;
    }

    let filtered = [...salidas];

    // Filter by Tab
    if (activeTab === 'entregado') {
      filtered = filtered.filter(s => s.estado === 'Entregado');
    } else if (activeTab === 'por-entregar') {
      filtered = filtered.filter(s => s.estado === 'Por Entregar');
    } else if (activeTab === 'espera-remision') {
      filtered = filtered.filter(s => s.estado === 'En espera de remisión');
    }

    // Filter by Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.folio.toLowerCase().includes(lowerSearch) ||
        (s.cliente && s.cliente.toLowerCase().includes(lowerSearch)) ||
        (s.remision && s.remision.toLowerCase().includes(lowerSearch))
      );
    }

    setFilteredSalidas(filtered);
  };

  const handleExport = () => {
    try {
      const exportData = filteredSalidas.map(s => ({
        Folio: s.folio,
        Estado: s.estado,
        Cliente: s.cliente || '',
        Remisión: s.remision || 'N/A',
        Transporte: s.numero_transporte || '',
        Fecha: s.fecha_creacion ? new Date(s.fecha_creacion).toLocaleDateString() : '',
        Elemento: s.elemento || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Salidas');
      const fileName = `salidas_taller_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Excel exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar');
    }
  };

  const columns: ColumnDef<Salida>[] = [
    {
      accessorKey: 'folio',
      header: 'Folio',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-900 text-lg tracking-tight leading-none">
            {row.original.folio}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            {row.original.elemento || 'General'}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const estado = row.original.estado;
        const isEntregado = estado === 'Entregado';
        const isEnEspera = estado === 'En espera de remisión';

        return (
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm",
              isEntregado && "bg-green-50 text-green-700 border-green-100",
              isEnEspera && "bg-red-50 text-red-700 border-red-100 text-red-600 animate-pulse",
              !isEntregado && !isEnEspera && "bg-orange-50 text-orange-700 border-orange-100"
            )}>
              {estado}
            </span>
          </div>
        )
      }
    },
    {
      accessorKey: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700 text-sm leading-none">{row.original.cliente || '-'}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 hidden sm:block">
            Cliente Registrado
          </span>
        </div>
      )
    },
    {
      accessorKey: 'remision',
      header: 'Remisión / OC',
      cell: ({ row }) => (
        <span className={cn(
          "font-black tracking-tight",
          row.original.remision ? "text-slate-600" : "text-slate-300 italic text-xs font-bold"
        )}>
          {row.original.remision || 'Pendiente'}
        </span>
      )
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              setSelectedSalidaId(row.original.id_salida);
              setShowDetailsModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <FileText className="w-3.5 h-3.5" />
            Ver Detalles
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                Salidas <span className="text-red-600">R1</span>
              </h1>
            </div>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-14">
              Control de envíos y logística de taller
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-3 bg-white text-slate-700 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-widest shadow-sm"
            >
              <Download className="w-4 h-4 text-red-500" />
              Exportar
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200"
            >
              <Plus className="w-4 h-4 text-red-500" />
              Nueva Salida
            </button>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="bg-white p-2 rounded-[28px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center bg-slate-50 rounded-2xl p-1 w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'todo', label: 'Todo', icon: LayoutDashboard },
              { id: 'por-entregar', label: 'Por Entregar', icon: Clock },
              { id: 'espera-remision', label: 'En Espera', icon: AlertCircle },
              { id: 'entregado', label: 'Entregado', icon: CheckCircle2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-md shadow-slate-200/50 scale-[1.02]"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-red-500" : "text-slate-300")} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="BUSCAR FOLIO, CLIENTE O REMISIÓN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white border focus:border-red-500/50 rounded-2xl focus:outline-none transition-all text-[10px] font-black tracking-widest uppercase"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <TableList<Salida, any>
          isLoading={loading}
          data={filteredSalidas}
          hideToolbar={true}
          columns={columns}
        />
      </div>

      {/* Modals */}
      <NuevaSalidaModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadSalidas}
      />

      <SalidaDetailsModal
        id={selectedSalidaId}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedSalidaId(null);
        }}
        onRefresh={loadSalidas}
      />
    </div>
  );
}
