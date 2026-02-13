'use client';

import { useState, useEffect } from 'react';
import { entradasApi, Entrada } from '@/services/taller-r1/entradas.service';
import { TableList } from '@/components/shared/TableList';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Download, Search, Edit, Trash2, FileText, Eye, Calendar, Package, Wrench, LayoutDashboard, Clock, CheckCircle2 } from 'lucide-react';
import { EntradaDetailsModal } from './EntradaDetailsModal';
import { EntradaDetalleModal } from '@/components/taller-r1/entradas/EntradaDetalleModal';
import { NuevaEntradaModal } from '@/components/taller-r1/entradas/NuevaEntradaModal';
import MantenimientoList from '@/components/taller-r1/mantenimiento/MantenimientoList';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

export default function EntradasPage() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [filteredEntradas, setFilteredEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todo' | 'por-ubicar' | 'cerrado' | 'mantenimiento'>('todo');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [viewingEntradaId, setViewingEntradaId] = useState<string | null>(null);
  const [editingEntrada, setEditingEntrada] = useState<Entrada | null>(null);

  useEffect(() => {
    loadEntradas();
  }, []);

  useEffect(() => {
    filterEntradas();
  }, [entradas, activeTab, searchTerm]);

  const loadEntradas = async () => {
    try {
      setLoading(true);
      const data = await entradasApi.getAll();
      setEntradas(data);
    } catch (error) {
      toast.error('Error al cargar las entradas');
    } finally {
      setLoading(false);
    }
  };

  const getFolioNumber = (folio: string) => {
    const match = folio.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const filterEntradas = () => {
    let filtered = [...entradas];

    if (activeTab === 'por-ubicar') {
      filtered = filtered.filter(e => e.estado === 'Por Ubicar');
    } else if (activeTab === 'cerrado') {
      filtered = filtered.filter(e => e.estado === 'Cerrado');
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.folio.toLowerCase().includes(lowerSearch) ||
        (e.usuario_asignado && e.usuario_asignado.toLowerCase().includes(lowerSearch)) ||
        (e.cliente && e.cliente.toLowerCase().includes(lowerSearch)) ||
        (e.rel_cliente?.nombre_cliente && e.rel_cliente.nombre_cliente.toLowerCase().includes(lowerSearch))
      );
    }

    filtered.sort((a, b) => {
      const numA = getFolioNumber(a.folio);
      const numB = getFolioNumber(b.folio);
      if (numA !== numB) return numB - numA;
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });

    setFilteredEntradas(filtered);
  };

  const handleExport = () => {
    try {
      const exportData = filteredEntradas.map(e => ({
        Folio: e.folio,
        'Usuario Asignado': e.usuario_asignado || '',
        'Fecha de Creación': new Date(e.fecha_creacion).toLocaleDateString(),
        Estado: e.estado,
        Cliente: e.cliente || e.rel_cliente?.nombre_cliente || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Entradas');
      const fileName = `entradas_taller_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Archivo exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar');
    }
  };

  const columns: ColumnDef<any>[] = [
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
      accessorKey: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700 text-sm">
            {row.original.rel_cliente?.nombre_cliente || row.original.cliente || '-'}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Solicitante</span>
        </div>
      )
    },
    {
      header: 'Ítems',
      cell: ({ row }) => {
        const equipos = row.original._count?.entrada_detalle || 0;
        const accesorios = row.original._count?.entrada_accesorios || 0;
        return (
          <div className="flex gap-2">
            {equipos > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-wider">
                <Package className="w-3 h-3" /> {equipos} EQ
              </span>
            )}
            {accesorios > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg border border-purple-100 uppercase tracking-wider">
                <Wrench className="w-3 h-3" /> {accesorios} ACC
              </span>
            )}
            {equipos === 0 && accesorios === 0 && (
              <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">Sin ítems</span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => (
        <span className={cn(
          "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border shadow-sm",
          row.original.estado === 'Por Ubicar'
            ? 'bg-amber-50 text-amber-600 border-amber-100'
            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
        )}>
          {row.original.estado}
        </span>
      )
    },
    {
      id: 'acciones',
      header: () => <div className="text-right pr-4">Opciones</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setViewingEntradaId(row.original.id_entrada)}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setEditingEntrada(row.original);
              setShowModal(true);
            }}
            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={async () => {
              if (confirm('¿Está seguro de eliminar esta entrada?')) {
                try {
                  await entradasApi.delete(row.original.id_entrada);
                  toast.success('Entrada eliminada correctly');
                  loadEntradas();
                } catch (error) {
                  toast.error('Error al eliminar');
                }
              }
            }}
            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
          >
            <Trash2 className="w-5 h-5" />
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
                Entradas <span className="text-red-600">R1</span>
              </h1>
            </div>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-14">
              Gestión técnica de recepción y almacén
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
              onClick={() => {
                setEditingEntrada(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200"
            >
              <Plus className="w-4 h-4 text-red-500" />
              Nueva Entrada
            </button>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="bg-white p-2 rounded-[28px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center bg-slate-50 rounded-2xl p-1 w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'todo', label: 'Todo', icon: LayoutDashboard },
              { id: 'por-ubicar', label: 'Pendientes', icon: Clock },
              { id: 'cerrado', label: 'Finalizadas', icon: CheckCircle2 },
              { id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
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
              placeholder="BUSCAR FOLIO, CLIENTE O USUARIO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white border focus:border-red-500/50 rounded-2xl focus:outline-none transition-all text-[10px] font-black tracking-widest uppercase"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className={cn(
        "animate-in fade-in slide-in-from-bottom-4 duration-700",
        activeTab === 'mantenimiento' && "hidden"
      )}>
        <TableList<any, any>
          isLoading={loading}
          data={filteredEntradas}
          hideToolbar={true}
          columns={columns}
          emptyMessage="No se encontraron registros de entrada"
        />
      </div>

      {activeTab === 'mantenimiento' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <MantenimientoList />
        </div>
      )}

      {/* Modals */}
      <NuevaEntradaModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEntrada(null);
        }}
        onSuccess={() => {
          loadEntradas();
          setEditingEntrada(null);
        }}
        editingEntrada={editingEntrada}
      />

      <EntradaDetalleModal
        entradaId={editingEntrada?.id_entrada || null}
        open={showDetalleModal}
        onClose={() => {
          setShowDetalleModal(false);
          setEditingEntrada(null);
        }}
        onSuccess={loadEntradas}
      />

      <EntradaDetailsModal
        entradaId={viewingEntradaId}
        open={!!viewingEntradaId}
        onClose={() => setViewingEntradaId(null)}
      />
    </div>
  );
}
