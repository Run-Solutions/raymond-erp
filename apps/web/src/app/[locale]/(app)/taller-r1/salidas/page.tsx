'use client';

import { useState, useEffect, useRef } from 'react';
import { salidasApi, Salida, CreateSalidaDto } from '@/services/taller-r1/salidas.service';
import { toast } from 'sonner';
import { Plus, Download, Search, Edit, Trash2, X, FileText, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableList } from '@/components/shared/TableList';
import { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

export default function SalidasPage() {
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [filteredSalidas, setFilteredSalidas] = useState<Salida[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todo' | 'entregado'>('todo');
  const [showModal, setShowModal] = useState(false);
  const [editingSalida, setEditingSalida] = useState<Salida | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<CreateSalidaDto>>({
    folio: '',
    fecha_transporte: new Date(),
    numero_transporte: '',
    estado: 'Entregado',
    cliente: '',
    elemento: 'Accesorios',
    observaciones: '',
    remision: '',
    pedido: '',
  });

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
      console.error(error);
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

    if (activeTab === 'entregado') {
      filtered = filtered.filter(s => s.estado === 'Entregado');
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.cliente && s.cliente.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredSalidas(filtered);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setUploadedFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, evidencia: base64 });
      };
      reader.readAsDataURL(file);
      
      toast.success(`Archivo "${file.name}" cargado correctamente`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSalida) {
        await salidasApi.update(editingSalida.id_salida, formData);
        toast.success('Salida actualizada correctamente');
      } else {
        await salidasApi.create(formData as CreateSalidaDto);
        toast.success('Salida creada correctamente');
      }
      
      setShowModal(false);
      resetForm();
      loadSalidas();
    } catch (error) {
      toast.error('Error al guardar la salida');
      console.error(error);
    }
  };

  const handleEdit = (salida: Salida) => {
    setEditingSalida(salida);
    setFormData(salida);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta salida?')) return;
    
    try {
      await salidasApi.delete(id);
      toast.success('Salida eliminada correctamente');
      loadSalidas();
    } catch (error) {
      toast.error('Error al eliminar la salida');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      folio: '',
      fecha_transporte: new Date(),
      numero_transporte: '',
      estado: 'Entregado',
      cliente: '',
      elemento: 'Accesorios',
      observaciones: '',
      remision: '',
      pedido: '',
    });
    setEditingSalida(null);
    setUploadedFile(null);
    setUploadedFileName('');
  };

  const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    // El servidor remoto donde AppSheet/Prisma guardan las imágenes
    const REMOTE_SERVER = '143.198.60.56';
    
    // Limpiamos el path de posibles slashes duplicados
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    return `http://${REMOTE_SERVER}/${cleanPath}`;
  };

  const handleViewSignature = (path: string) => {
    const url = getImageUrl(path);
    if (url) {
      setSelectedSignature(url);
      setShowSignatureModal(true);
    }
  };

  const handleExport = () => {
    try {
      const exportData = filteredSalidas.map(s => ({
        Folio: s.folio,
        Estado: s.estado,
        Cliente: s.cliente || '',
        'Número de Transporte': s.numero_transporte || '',
        'Fecha de Transporte': new Date(s.fecha_transporte).toLocaleDateString(),
        Elemento: s.elemento || '',
        Observaciones: s.observaciones || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Salidas');
      
      const fileName = `salidas_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('Archivo exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar el archivo');
      console.error(error);
    }
  };


  const columns: ColumnDef<Salida>[] = [
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
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const estado = row.original.estado;
        const isEntregado = estado === 'Entregado';
        const isEnEspera = estado?.includes('espera');
        
        return (
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-semibold border",
            isEntregado && "bg-green-50 text-green-700 border-green-100",
            isEnEspera && "bg-red-50 text-red-700 border-red-100",
            !isEntregado && !isEnEspera && "bg-orange-50 text-orange-700 border-orange-100"
          )}>
            {estado}
          </span>
        )
      }
    },
    {
      accessorKey: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => <span className="font-medium text-gray-600">{row.original.cliente?.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || '-'}</span>
    },
    {
      id: 'firma',
      header: 'Firma de quien recibe',
      cell: ({ row }) => row.original.firma ? (
        <button 
          onClick={() => handleViewSignature(row.original.firma!)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all border border-gray-100 shadow-sm"
        >
          <FileText className="w-3.5 h-3.5 text-red-500" />
          Ver firma
        </button>
      ) : (
        <span className="text-[10px] text-gray-400 font-bold  tracking-widest pl-3">Sin firma</span>
      )
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
            onClick={() => handleDelete(row.original.id_salida)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter font-brand">Salidas</h1>
            <p className="text-sm text-gray-400 font-medium">Gestión de salidas del taller</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all font-bold text-sm"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-bold text-sm shadow-lg shadow-red-500/20"
            >
              <Plus className="w-4 h-4" />
              Agregar +
            </button>
          </div>
        </div>

        {/* Tabs and Search */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('todo')}
              className={cn(
                "pb-3 text-sm font-bold transition-all relative",
                activeTab === 'todo' 
                  ? "text-red-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-red-600" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              Todo
            </button>
            <button
              onClick={() => setActiveTab('entregado')}
              className={cn(
                "pb-3 text-sm font-bold transition-all relative",
                activeTab === 'entregado' 
                  ? "text-red-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-red-600" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              Entregado
            </button>
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar folio o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-gray-100 border-transparent focus:bg-white border focus:border-red-500/50 rounded-xl focus:outline-none transition-all text-sm w-64"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <TableList<Salida, any>
        isLoading={loading}
        data={filteredSalidas}
        hideToolbar={true}
        columns={columns}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[28px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSalida ? 'Editar salida' : 'Agregar salida'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remisión u orden de compra?</label>
                  <select
                    value={formData.remision ? 'SI' : 'NO'}
                    onChange={(e) => setFormData({ ...formData, remision: e.target.value === 'SI' ? '1' : '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de transporte</label>
                  <input
                    type="text"
                    value={formData.numero_transporte}
                    onChange={(e) => setFormData({ ...formData, numero_transporte: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de pedido de venta</label>
                  <input
                    type="text"
                    value={formData.pedido}
                    onChange={(e) => setFormData({ ...formData, pedido: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Elemento</label>
                  <select
                    value={formData.elemento}
                    onChange={(e) => setFormData({ ...formData, elemento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Accesorios">Accesorios</option>
                    <option value="Equipo">Equipo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia</label>
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
      {/* Signature Viewer Modal */}
      {showSignatureModal && selectedSignature && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
          onClick={() => setShowSignatureModal(false)}
        >
          <div 
            className="bg-white p-2 rounded-[32px] shadow-2xl max-w-lg w-full overflow-hidden border border-white/20"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full bg-gray-50 flex items-center justify-center rounded-[24px] overflow-hidden">
              <img 
                src={selectedSignature} 
                alt="Firma" 
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Error+al+cargar+firma';
                }}
              />
              <button
                onClick={() => setShowSignatureModal(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm font-black text-gray-900  tracking-tighter">Evidencia de Firma</p>
              <p className="text-xs text-gray-400 mt-1">Documento de validación de entrega</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
