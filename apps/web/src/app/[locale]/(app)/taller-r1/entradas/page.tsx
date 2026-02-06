'use client';

import { useState, useEffect, useRef } from 'react';
import { entradasApi, Entrada, CreateEntradaDto } from '@/services/taller-r1/entradas.service';
import { TableList } from '@/components/shared/TableList';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Download, Search, Edit, Trash2, X, Upload, Calendar, FileText, Eye, User, Package, Wrench } from 'lucide-react';
import { EntradaDetailsModal } from './EntradaDetailsModal';
import { EntradaDetalleModal } from '@/components/taller-r1/entradas/EntradaDetalleModal';
import { NuevaEntradaModal } from '@/components/taller-r1/entradas/NuevaEntradaModal';
import * as XLSX from 'xlsx';

interface AccesorioForm {
  estado_accesorio: string;
  tipo: string;
  modelo: string;
  serial: string;
  evidencia: string;
}

export default function EntradasPage() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [filteredEntradas, setFilteredEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todo' | 'por-ubicar' | 'cerrado'>('todo');
  const [showModal, setShowModal] = useState(false); // This will now control NuevaEntradaModal
  const [showAccesorioModal, setShowAccesorioModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [viewingEntradaId, setViewingEntradaId] = useState<string | null>(null);
  const [editingEntrada, setEditingEntrada] = useState<Entrada | null>(null); // Used to pass context to subsequent modals

  const [accesorioData, setAccesorioData] = useState<AccesorioForm>({
    estado_accesorio: 'Revisar',
    tipo: '',
    modelo: '',
    serial: '',
    evidencia: '',
  });

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
      console.error(error);
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
      filtered = filtered.filter(e =>
        e.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.usuario_asignado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.rel_cliente?.nombre_cliente?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar por número de folio descendente
    filtered.sort((a, b) => {
      const numA = getFolioNumber(a.folio);
      const numB = getFolioNumber(b.folio);
      if (numA !== numB) return numB - numA;
      // Si el número es igual (ej. E-76 y E-76-2), usar fecha
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });

    setFilteredEntradas(filtered);
  };

  const handleNewEntradaSuccess = (newEntrada: Entrada) => {
    loadEntradas();
    setEditingEntrada(null);
  };

  const handleAccesorioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEntrada) {
        await entradasApi.createAccesorio(editingEntrada.id_entrada, {
          tipo: accesorioData.tipo,
          modelo: accesorioData.modelo,
          serial: accesorioData.serial,
          estado_acc: accesorioData.estado_accesorio,
          evidencia: accesorioData.evidencia,
        });
        toast.success('Accesorio agregado correctamente');
      }
      setShowAccesorioModal(false);
      resetAccesorioForm();
      setEditingEntrada(null); // Clear editingEntrada after accessory is added
    } catch (error) {
      toast.error('Error al agregar el accesorio');
      console.error(error);
    }
  };

  const handleEdit = (entrada: Entrada) => {
    // For editing, we might need a separate modal or pass the data to NuevaEntradaModal if it supports editing.
    // For now, assuming NuevaEntradaModal is only for creation, this button might need to open a different modal or be updated.
    // If NuevaEntradaModal is to be reused for editing, it would need an `entrada` prop.
    // For this change, we'll keep it as is, but note that `setShowModal(true)` will open the *creation* modal.
    setEditingEntrada(entrada);
    setShowModal(true); // This will open NuevaEntradaModal, which is currently for creation.
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta entrada?')) return;

    try {
      await entradasApi.delete(id);
      toast.success('Entrada eliminada correctamente');
      loadEntradas();
    } catch (error) {
      toast.error('Error al eliminar la entrada');
      console.error(error);
    }
  };

  const resetAccesorioForm = () => {
    setAccesorioData({
      estado_accesorio: 'Revisar',
      tipo: '',
      modelo: '',
      serial: '',
      evidencia: '',
    });
  };

  const handleExport = () => {
    try {
      const exportData = filteredEntradas.map(e => ({
        Folio: e.folio,
        'Usuario Asignado': e.usuario_asignado || '',
        'Fecha de Creación': new Date(e.fecha_creacion).toLocaleDateString(),
        'Fecha de Asignación': e.fecha_asignacion ? new Date(e.fecha_asignacion).toLocaleDateString() : '',
        Estado: e.estado,
        Prioridad: e.prioridad || '',
        'Usuario Encargado': e.usuario_encargado || '',
        Cliente: e.cliente || '',
        Distribuidor: e.distribuidor || '',
        Factura: e.factura || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Entradas');

      const fileName = `entradas_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Archivo exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar el archivo');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-4 p-6 bg-white border-b border-gray-100 rounded-b-[2rem] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter transition-all hover:text-red-600 cursor-default">
              Entradas
            </h1>
            <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">
              Gestión Técnica de Recepción
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-3 bg-white text-gray-600 rounded-2xl border border-gray-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all font-bold shadow-sm"
            >
              <Download className="w-5" />
              Exportar
            </button>
            <button
              onClick={() => {
                setEditingEntrada(null); // Clear any editing context for a new entry
                setShowModal(true); // Open the NuevaEntradaModal
              }}
              className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all font-black shadow-lg shadow-red-200 active:scale-95"
            >
              <Plus className="w-5" />
              Nueva Entrada
            </button>
          </div>
        </div>

        {/* Tabs and Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
          <div className="flex p-1.5 bg-gray-50 rounded-2xl border border-gray-100 w-full md:w-auto overflow-x-auto">
            {[
              { id: 'todo', label: 'Historial Completo' },
              { id: 'por-ubicar', label: 'Pendientes de Ubicación' },
              { id: 'cerrado', label: 'Finalizadas' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-white text-red-600 shadow-md ring-1 ring-gray-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por folio, cliente o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] focus:bg-white focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium shadow-inner"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <TableList<any, any>
          isLoading={loading}
          data={filteredEntradas}
          hideToolbar={true}
          columns={[
            {
              accessorKey: 'folio',
              header: 'Folio',
              cell: ({ row }) => (
                <div className="flex flex-col">
                  <span className="font-black text-slate-900 text-lg tracking-tight -mb-1">
                    {row.original.folio}
                  </span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-100 w-fit px-1.5 rounded">
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
                  <span className="font-bold text-slate-700">
                    {row.original.rel_cliente?.nombre_cliente || row.original.cliente || '-'}
                  </span>
                  <span className="text-[11px] text-slate-400 italic">Solicitante</span>
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
                      <span className="flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100">
                        <Package className="w-3 h-3" /> {equipos}
                      </span>
                    )}
                    {accesorios > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg border border-purple-100">
                        <Wrench className="w-3 h-3" /> {accesorios}
                      </span>
                    )}
                    {equipos === 0 && accesorios === 0 && (
                      <span className="text-slate-300 text-[11px] italic">Sin ítems</span>
                    )}
                  </div>
                );
              }
            },
            {
              accessorKey: 'fecha_creacion',
              header: 'Registro',
              cell: ({ row }) => (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-300" />
                  <span className="font-medium">{new Date(row.original.fecha_creacion).toLocaleDateString()}</span>
                </div>
              )
            },
            {
              accessorKey: 'estado',
              header: 'Estado',
              cell: ({ row }) => (
                <span className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-full border shadow-sm ${row.original.estado === 'Por Ubicar'
                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                  {row.original.estado}
                </span>
              )
            },
            {
              id: 'acciones',
              header: () => <div className="text-right pr-4">Opciones</div>,
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2 pr-2">
                  <button
                    onClick={() => setViewingEntradaId(row.original.id_entrada)}
                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(row.original)}
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(row.original.id_entrada)}
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )
            }
          ]}
          renderMobileItem={(entrada) => (
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-transform">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                    {entrada.folio}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {entrada.elemento || 'General'}
                  </span>
                </div>
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${entrada.estado === 'Por Ubicar'
                  ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/50'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/50'
                  }`}>
                  {entrada.estado}
                </span>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Cliente</span>
                    <span className="text-sm font-bold text-slate-700 leading-tight">
                      {entrada.rel_cliente?.nombre_cliente || entrada.cliente || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                    <Package className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100">
                      {entrada._count?.entrada_detalle || 0} EQ
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg border border-purple-100">
                      {entrada._count?.entrada_accesorios || 0} ACC
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingEntradaId(entrada.id_entrada);
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-200 active:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Ver Detalles
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(entrada);
                    }}
                    className="p-3 bg-slate-50 text-slate-600 rounded-2xl border border-slate-100 active:bg-slate-100 transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entrada.id_entrada);
                    }}
                    className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100 active:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          emptyMessage="No se encontraron registros de entrada"
        />
      </div>

      {/* Nuevo Modal Premium */}
      <NuevaEntradaModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleNewEntradaSuccess}
        editingEntrada={editingEntrada} // Pass editingEntrada if the modal supports editing
      />

      {/* Modal Agregar Accesorio (Paso 2) */}
      {showAccesorioModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-50/50 to-white">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Configurar Accesorio</h2>
                <p className="text-slate-500 font-medium text-sm">Paso 02 de la entrada {editingEntrada?.folio}</p>
              </div>
              <button
                onClick={() => {
                  setShowAccesorioModal(false);
                  setEditingEntrada(null);
                  resetAccesorioForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAccesorioSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado de accesorio</label>
                <select
                  value={accesorioData.estado_accesorio}
                  onChange={(e) => setAccesorioData({ ...accesorioData, estado_accesorio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Revisar">Revisar</option>
                  <option value="Bueno">Bueno</option>
                  <option value="Malo">Malo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <input
                  type="text"
                  value={accesorioData.tipo}
                  onChange={(e) => setAccesorioData({ ...accesorioData, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <input
                  type="text"
                  value={accesorioData.modelo}
                  onChange={(e) => setAccesorioData({ ...accesorioData, modelo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial</label>
                <input
                  type="text"
                  value={accesorioData.serial}
                  onChange={(e) => setAccesorioData({ ...accesorioData, serial: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccesorioModal(false);
                    setShowModal(true);
                    resetAccesorioForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Guardar Accesorio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle Equipo */}
      <EntradaDetalleModal
        entradaId={editingEntrada?.id_entrada || null}
        open={showDetalleModal}
        onClose={() => {
          setShowDetalleModal(false);
          setEditingEntrada(null);
        }}
        onSuccess={() => {
          loadEntradas();
        }}
      />

      {/* Modal Detalles */}
      <EntradaDetailsModal
        entradaId={viewingEntradaId}
        open={!!viewingEntradaId}
        onClose={() => setViewingEntradaId(null)}
      />
    </div>
  );
}
