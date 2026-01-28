'use client';

import { useState, useEffect } from 'react';
import { clientesApi, Cliente, CreateClienteDto } from '@/services/taller-r1/clientes.service';
import { TableList } from '@/components/shared/TableList';
import { toast } from 'sonner';
import { Plus, Download, Search, Edit, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  const [formData, setFormData] = useState<Partial<CreateClienteDto>>({
    nombre_cliente: '',
    razon_social: '',
    rfc: '',
    persona_contacto: '',
    telefono: 0,
    calle: '',
    numero_calle: '',
    ciudad: '',
    cp: '',
  });

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    filterClientes();
  }, [clientes, searchTerm]);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const data = await clientesApi.getAll();
      setClientes(data);
    } catch (error) {
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const filterClientes = () => {
    let filtered = [...clientes];
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.nombre_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rfc?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredClientes(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await clientesApi.update(editingCliente.id_cliente, formData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await clientesApi.create(formData as CreateClienteDto);
        toast.success('Cliente creado correctamente');
      }
      setShowModal(false);
      resetForm();
      loadClientes();
    } catch (error) {
      toast.error('Error al guardar el cliente');
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData(cliente);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este cliente?')) return;
    try {
      await clientesApi.delete(id);
      toast.success('Cliente eliminado correctamente');
      loadClientes();
    } catch (error) {
      toast.error('Error al eliminar el cliente');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre_cliente: '',
      razon_social: '',
      rfc: '',
      persona_contacto: '',
      telefono: 0,
      calle: '',
      numero_calle: '',
      ciudad: '',
      cp: '',
    });
    setEditingCliente(null);
  };

  const handleExport = () => {
    try {
      const exportData = filteredClientes.map(c => ({
        'Nombre del Cliente': c.nombre_cliente,
        'Razón Social': c.razon_social,
        RFC: c.rfc,
        'Persona de Contacto': c.persona_contacto,
        Teléfono: c.telefono,
        Ciudad: c.ciudad,
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
      XLSX.writeFile(workbook, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            <h1 className="text-3xl font-black text-gray-900   tracking-tighter ">Clientes</h1>
            <p className="text-sm text-gray-400 font-medium">Gestión de cartera de clientes Raymond</p>
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
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50   border border-transparent rounded-xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none text-sm w-80"
            />
          </div>
        </div>
      </div>

      <TableList<Cliente, any>
        isLoading={loading}
        data={filteredClientes}
        hideToolbar={true}
        columns={[
          {
            accessorKey: 'nombre_cliente',
            header: 'Nombre del cliente',
            cell: ({ row }) => (
              <span className="font-bold text-gray-900 tracking-tight">
                {row.original.nombre_cliente?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
              </span>
            )
          },
          {
            accessorKey: 'razon_social',
            header: 'Razón social',
            cell: ({ row }) => (
              <span className="text-gray-600 font-medium">
                {row.original.razon_social?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || '-'}
              </span>
            )
          },
          {
            accessorKey: 'rfc',
            header: 'Rfc',
            cell: ({ row }) => (
              <span className="text-gray-500 font-mono text-xs uppercase">
                {row.original.rfc || '-'}
              </span>
            )
          },
          {
            accessorKey: 'persona_contacto',
            header: 'Persona de contacto',
            cell: ({ row }) => row.original.persona_contacto?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || '-'
          },
          {
            accessorKey: 'telefono',
            header: 'Teléfono',
            cell: ({ row }) => row.original.telefono || '-'
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
                  onClick={() => handleDelete(row.original.id_cliente)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          }
        ]}
        emptyMessage="No hay clientes registrados"
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white   rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-8 border-b border-gray-50 ">
              <h2 className="text-2xl font-black text-gray-900    tracking-tighter">
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={formData.nombre_cliente}
                    onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Razón Social</label>
                  <input
                    type="text"
                    value={formData.razon_social}
                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">RFC</label>
                  <input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Persona de Contacto</label>
                  <input
                    type="text"
                    value={formData.persona_contacto}
                    onChange={(e) => setFormData({ ...formData, persona_contacto: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Teléfono</label>
                  <input
                    type="number"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: parseInt(e.target.value) })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400  tracking-widest">Ciudad</label>
                  <input
                    type="text"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50  border border-transparent rounded-2xl focus:bg-white  focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all outline-none font-medium"
                  />
                </div>
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
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
