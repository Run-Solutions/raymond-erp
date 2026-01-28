'use client';

import { useState, useEffect, useRef } from 'react';
import { entradasApi, Entrada, CreateEntradaDto } from '@/services/taller-r1/entradas.service';
import { TableList } from '@/components/shared/TableList';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Download, Search, Edit, Trash2, X, Upload, Calendar, FileText } from 'lucide-react';
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
  const [showModal, setShowModal] = useState(false);
  const [showAccesorioModal, setShowAccesorioModal] = useState(false);
  const [editingEntrada, setEditingEntrada] = useState<Entrada | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<CreateEntradaDto>>({
    folio: '',
    distribuidor: '',
    factura: '',
    cliente_origen: '',
    adc: '',
    cliente: '',
    fecha_creacion: new Date(),
    elemento: 'Equipo',
    comentario: '',
    evidencia_1: '',
    estado: 'Por Ubicar',
    prioridad: 'Media',
  });

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
        e.cliente?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEntradas(filtered);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setUploadedFileName(file.name);
      
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, evidencia_1: base64 });
      };
      reader.readAsDataURL(file);
      
      toast.success(`Archivo "${file.name}" cargado correctamente`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEntrada) {
        await entradasApi.update(editingEntrada.id_entrada, formData);
        toast.success('Entrada actualizada correctamente');
      } else {
        await entradasApi.create(formData as CreateEntradaDto);
        toast.success('Entrada creada correctamente');
      }
      
      setShowModal(false);
      resetForm();
      loadEntradas();
    } catch (error) {
      toast.error('Error al guardar la entrada');
      console.error(error);
    }
  };

  const handleAccesorioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Implement accesorio creation API call
    toast.success('Accesorio agregado correctamente');
    setShowAccesorioModal(false);
    resetAccesorioForm();
  };

  const handleEdit = (entrada: Entrada) => {
    setEditingEntrada(entrada);
    setFormData(entrada);
    setShowModal(true);
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

  const resetForm = () => {
    setFormData({
      folio: '',
      distribuidor: '',
      factura: '',
      cliente_origen: '',
      adc: '',
      cliente: '',
      fecha_creacion: new Date(),
      elemento: 'Equipo',
      comentario: '',
      evidencia_1: '',
      estado: 'Por Ubicar',
      prioridad: 'Media',
    });
    setEditingEntrada(null);
    setUploadedFile(null);
    setUploadedFileName('');
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

  const openAccesorioModal = () => {
    setShowModal(false);
    setShowAccesorioModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter ">Entradas</h1>
            <p className="text-sm text-gray-400 font-medium">Gestión de entradas del taller</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar +
            </button>
          </div>
        </div>

        {/* Tabs and Content Control */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('todo')}
              className={`pb-2 text-sm font-bold transition-all relative ${
                activeTab === 'todo'
                  ? 'text-red-600 after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-0.5 after:bg-red-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setActiveTab('por-ubicar')}
              className={`pb-2 text-sm font-bold transition-all relative ${
                activeTab === 'por-ubicar'
                  ? 'text-red-600 after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-0.5 after:bg-red-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Por Ubicar
            </button>
            <button
              onClick={() => setActiveTab('cerrado')}
              className={`pb-2 text-sm font-bold transition-all relative ${
                activeTab === 'cerrado'
                  ? 'text-red-600 after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-0.5 after:bg-red-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Cerrado
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar entrada..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none text-sm w-96"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <TableList<Entrada, any>
        isLoading={loading}
        data={filteredEntradas}
        hideToolbar={true}
        columns={[
          {
            accessorKey: 'folio',
            header: 'Folio',
            cell: ({ row }) => (
              <span className="font-black text-gray-900 tracking-tight">
                {row.original.folio}
              </span>
            )
          },
          {
            accessorKey: 'usuario_asignado',
            header: 'Usuario asignado',
            cell: ({ row }) => row.original.usuario_asignado?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || '-'
          },
          {
            accessorKey: 'fecha_creacion',
            header: 'Fecha de creación',
            cell: ({ row }) => new Date(row.original.fecha_creacion).toLocaleDateString()
          },
          {
            accessorKey: 'fecha_asignacion',
            header: 'Fecha de asignación',
            cell: ({ row }) => row.original.fecha_asignacion ? new Date(row.original.fecha_asignacion).toLocaleDateString() : '-'
          },
          {
            accessorKey: 'estado',
            header: 'Estado',
            cell: ({ row }) => (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                row.original.estado === 'Por Ubicar' 
                  ? 'bg-orange-50 text-orange-800 border-orange-100'
                  : 'bg-green-50 text-green-800 border-green-100'
              }`}>
                {row.original.estado}
              </span>
            )
          },
          {
            accessorKey: 'prioridad',
            header: 'Prioridad',
            cell: ({ row }) => (
              <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold  text-gray-600">
                {row.original.prioridad || 'Media'}
              </span>
            )
          },
          {
            accessorKey: 'usuario_encargado',
            header: 'Usuario encargado',
            cell: ({ row }) => row.original.usuario_encargado?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || '-'
          },
          {
            id: 'acciones',
            header: 'Acciones',
            cell: ({ row }) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => handleEdit(row.original)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(row.original.id_entrada)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          }
        ]}
        emptyMessage="No hay entradas para mostrar"
      />

      {/* Modal Entrada */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingEntrada ? 'Editar Entrada' : 'Agregar Entrada'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Folio</label>
                  <input
                    type="text"
                    value={formData.folio}
                    onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distribuidor</label>
                  <input
                    type="text"
                    value={formData.distribuidor}
                    onChange={(e) => setFormData({ ...formData, distribuidor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de factura de embarque</label>
                  <input
                    type="text"
                    value={formData.factura}
                    onChange={(e) => setFormData({ ...formData, factura: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente de origen</label>
                  <input
                    type="text"
                    value={formData.cliente_origen}
                    onChange={(e) => setFormData({ ...formData, cliente_origen: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ADC</label>
                  <input
                    type="text"
                    value={formData.adc}
                    onChange={(e) => setFormData({ ...formData, adc: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <input
                    type="text"
                    value={formData.cliente}
                    onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de creación</label>
                  <input
                    type="date"
                    value={formData.fecha_creacion ? new Date(formData.fecha_creacion).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, fecha_creacion: new Date(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Elemento</label>
                  <select
                    value={formData.elemento}
                    onChange={(e) => setFormData({ ...formData, elemento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Equipo">Equipo</option>
                    <option value="Accesorio">Accesorio</option>
                  </select>
                </div>
              </div>

              {/* Botón Agregar Accesorio */}
              {formData.elemento === 'Accesorio' && (
                <div>
                  <button
                    type="button"
                    onClick={openAccesorioModal}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar accesorio
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
                <textarea
                  value={formData.comentario}
                  onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia de caja</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploadedFileName ? (
                        <>
                          <FileText className="w-8 h-8 mb-3 text-green-500" />
                          <p className="mb-2 text-sm text-gray-700 font-semibold">{uploadedFileName}</p>
                          <p className="text-xs text-gray-500">Archivo cargado correctamente</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click para subir</span> o arrastra y suelta
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG o PDF</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Accesorio */}
      {showAccesorioModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Agregar accesorio</h2>
              <button
                onClick={() => {
                  setShowAccesorioModal(false);
                  setShowModal(true);
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
    </div>
  );
}
