'use client';

import { useState, useEffect } from 'react';
import { equiposApi, Equipo, CreateEquipoDto } from '@/services/taller-r1/equipos.service';
import { TableList } from '@/components/shared/TableList';
import { toast } from 'sonner';
import { Plus, Download, Search, Edit, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [filteredEquipos, setFilteredEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);

  const [formData, setFormData] = useState<Partial<CreateEquipoDto>>({
    numero_serie: '',
    clase: '',
    modelo: '',
    descripcion: '',
    estado: 'Disponible',
    marca: 'Raymond',
  });

  useEffect(() => {
    loadEquipos();
  }, []);

  useEffect(() => {
    filterEquipos();
  }, [equipos, searchTerm]);

  const loadEquipos = async () => {
    try {
      setLoading(true);
      const data = await equiposApi.getAll();
      setEquipos(data);
    } catch (error) {
      toast.error('Error al cargar los equipos');
    } finally {
      setLoading(false);
    }
  };

  const filterEquipos = () => {
    let filtered = [...equipos];
    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.marca?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredEquipos(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEquipo) {
        await equiposApi.update(editingEquipo.id_equipos, formData);
        toast.success('Equipo actualizado correctamente');
      } else {
        await equiposApi.create(formData as CreateEquipoDto);
        toast.success('Equipo creado correctamente');
      }
      setShowModal(false);
      resetForm();
      loadEquipos();
    } catch (error) {
      toast.error('Error al guardar el equipo');
    }
  };

  const handleEdit = (equipo: Equipo) => {
    setEditingEquipo(equipo);
    setFormData(equipo);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este equipo?')) return;
    try {
      await equiposApi.delete(id);
      toast.success('Equipo eliminado correctamente');
      loadEquipos();
    } catch (error) {
      toast.error('Error al eliminar el equipo');
    }
  };

  const resetForm = () => {
    setFormData({
      numero_serie: '',
      clase: '',
      modelo: '',
      descripcion: '',
      estado: 'Disponible',
      marca: 'Raymond',
    });
    setEditingEquipo(null);
  };

  const handleExport = () => {
    try {
      const exportData = filteredEquipos.map(e => ({
        Modelo: e.modelo,
        Marca: e.marca,
        Clase: e.clase,
        Estado: e.estado,
        'Número de Serie': e.numero_serie,
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipos');
      XLSX.writeFile(workbook, `equipos_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50  ">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900   tracking-tighter ">Equipos</h1>
            <p className="text-sm text-gray-400 font-medium">Inventario técnico de activos Raymond</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white   text-gray-700  rounded-lg border border-gray-300  hover:bg-gray-50  transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar +
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar equipo por modelo o serie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50   border border-transparent rounded-xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none text-sm w-96"
            />
          </div>
        </div>
      </div>

      <TableList<Equipo, any>
        isLoading={loading}
        data={filteredEquipos}
        hideToolbar={true}
        columns={[
          {
            accessorKey: 'modelo',
            header: 'Modelo',
            cell: ({ row }) => (
              <span className="font-black text-gray-900   tracking-tight">
                {row.original.modelo}
              </span>
            )
          },
          {
            accessorKey: 'marca',
            header: 'Marca',
            cell: ({ row }) => row.original.marca || 'Raymond'
          },
          {
            accessorKey: 'clase',
            header: 'Clase',
            cell: ({ row }) => (
              <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold ">
                {row.original.clase}
              </span>
            )
          },
          {
            accessorKey: 'estado',
            header: 'Estado',
            cell: ({ row }) => (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                row.original.estado === 'Disponible' || row.original.estado === 'Activo'
                  ? 'bg-green-50 text-green-800 border-green-100'
                  : 'bg-red-50 text-red-800 border-red-100'
              }`}>
                {row.original.estado}
              </span>
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
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(row.original.id_equipos)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          }
        ]}
        emptyMessage="No hay equipos en inventario"
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white   rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-8 border-b border-gray-50 ">
              <h2 className="text-2xl font-black text-gray-900    tracking-tighter">
                {editingEquipo ? 'Editar Equipo' : 'Registrar Equipo'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Número de Serie</label>
                  <input
                    type="text"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Modelo</label>
                  <input
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Clase</label>
                  <select
                    value={formData.clase}
                    onChange={(e) => setFormData({ ...formData, clase: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                  >
                    <option value="">Seleccionar Clase</option>
                    <option value="Clase I">Clase I</option>
                    <option value="Clase II">Clase II</option>
                    <option value="Clase III">Clase III</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Marca</label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Activo">Activo</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400  tracking-widest">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-8 border-t border-gray-50 ">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-6 py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-red-600 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-red-100 hover:shadow-gray-200"
                >
                  Guardar Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
