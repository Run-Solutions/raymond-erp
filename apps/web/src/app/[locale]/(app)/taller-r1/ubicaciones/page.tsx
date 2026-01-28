'use client';

import { useState, useEffect } from 'react';
import { ubicacionesApi, Ubicacion } from '@/services/taller-r1/ubicaciones.service';
import { TableList } from '@/components/shared/TableList';
import { toast } from 'sonner';
import { Plus, Download, Search, Edit, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function UbicacionesPage() {
  const [data, setData] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Ubicacion | null>(null);
  const [formData, setFormData] = useState({
    nombre_ubicacion: '',
    maximo_stock: 0,
    Clase: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ubicacionesApi.getAll();
      setData(res);
    } catch (e) { toast.error('Error al cargar datos'); }
    finally { setLoading(false); }
  };

  const filteredData = data.filter(i => 
    i.nombre_ubicacion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await ubicacionesApi.update(editingItem.id_ubicacion, formData);
        toast.success('Actualizado');
      } else {
        await ubicacionesApi.create(formData);
        toast.success('Creado');
      }
      setShowModal(false);
      loadData();
    } catch (e) { toast.error('Error al guardar'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900  tracking-tighter  font-brand">Ubicaciones</h1>
            <p className="text-sm text-gray-400 font-medium font-brand">Gestión de espacios en almacén R1</p>
          </div>
          <button
            onClick={() => { setEditingItem(null); setFormData({ nombre_ubicacion: '', maximo_stock: 0, Clase: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-brand font-bold"
          >
            <Plus className="w-4 h-4" />
            Agregar +
          </button>
        </div>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white  border border-gray-100  rounded-xl focus:border-red-600 outline-none text-sm w-80 shadow-sm "
          />
        </div>
      </div>

      <TableList<Ubicacion, any>
        isLoading={loading}
        data={filteredData}
        hideToolbar={true}
        columns={[
          {
            accessorKey: 'nombre_ubicacion',
            header: 'Nombre',
            cell: ({ row }) => <span className="font-bold text-gray-900 ">{row.original.nombre_ubicacion}</span>
          },
          {
            accessorKey: 'maximo_stock',
            header: 'Stock Máximo',
            cell: ({ row }) => <span className="text-gray-600  font-mono">{row.original.maximo_stock}</span>
          },
          {
            accessorKey: 'Clase',
            header: 'Clase Permitida',
            cell: ({ row }) => <span className="bg-red-50  text-red-700  px-2 py-1 rounded text-xs font-black  tracking-tighter">{row.original.Clase || 'Cualquiera'}</span>
          },
          {
            id: 'acciones',
            header: 'Acciones',
            cell: ({ row }) => (
              <div className="flex gap-1 justify-end">
                <button onClick={() => { setEditingItem(row.original); setFormData({ ...row.original, Clase: row.original.Clase || '' }); setShowModal(true); }} className="p-2 text-gray-400 hover:text-red-600 transition-all"><Edit className="w-4 h-4" /></button>
                <button onClick={async () => { if(confirm('Eliminar?')){ await ubicacionesApi.delete(row.original.id_ubicacion); loadData(); } }} className="p-2 text-gray-400 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            )
          }
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white  rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-black mb-6  tracking-tighter text-gray-900 ">Ubicación</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Nombre</label>
                <input type="text" value={formData.nombre_ubicacion} onChange={e => setFormData({...formData, nombre_ubicacion: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all " required />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Stock Máximo</label>
                <input type="number" value={formData.maximo_stock} onChange={e => setFormData({...formData, maximo_stock: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all " required />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Clase</label>
                <input type="text" value={formData.Clase} onChange={e => setFormData({...formData, Clase: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all " placeholder="Ej: Clase I" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-400 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-xl font-black transition-all hover:bg-black">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
