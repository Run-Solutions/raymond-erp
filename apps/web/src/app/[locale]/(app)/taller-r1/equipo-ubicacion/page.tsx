'use client';

import { useState, useEffect } from 'react';
import { equipoUbicacionApi, EquipoUbicacion } from '@/services/taller-r1/equipo-ubicacion.service';
import { TableList } from '@/components/shared/TableList';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, MapPin } from 'lucide-react';

export default function EquipoUbicacionPage() {
  const [data, setData] = useState<EquipoUbicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipoUbicacion | null>(null);
  const [formData, setFormData] = useState({
    serial_equipo: '', id_ubicacion: '', stock: '1', estado: 'En Almacén', vendedor: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await equipoUbicacionApi.getAll();
      setData(res);
    } catch (e) { toast.error('Error'); }
    finally { setLoading(false); }
  };

  const filteredData = data.filter(i => 
    i.serial_equipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.id_ubicacion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await equipoUbicacionApi.update(editingItem.id_equipo_ubicacion, formData);
        toast.success('OK');
      } else {
        await equipoUbicacionApi.create(formData);
        toast.success('OK');
      }
      setShowModal(false);
      loadData();
    } catch (e) { toast.error('Error'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900  tracking-tighter  font-brand">Ubicación de Equipos</h1>
            <p className="text-sm text-gray-400 font-medium font-brand">Rastreo en tiempo real de unidades en taller</p>
          </div>
          <button
            onClick={() => { setEditingItem(null); setFormData({ serial_equipo: '', id_ubicacion: '', stock: '1', estado: 'En Almacén', vendedor: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-brand font-bold"
          >
            <Plus className="w-4 h-4" />
            Asignar Ubicación
          </button>
        </div>
      </div>

      <TableList<EquipoUbicacion, any>
        isLoading={loading}
        data={filteredData}
        hideToolbar={true}
        columns={[
          {
            accessorKey: 'serial_equipo',
            header: 'Serial Equipo',
            cell: ({ row }) => <span className="font-black text-gray-900  ">{row.original.serial_equipo}</span>
          },
          {
            accessorKey: 'id_ubicacion',
            header: 'ID Ubicación',
            cell: ({ row }) => (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                <span className="font-bold text-gray-700 ">{row.original.id_ubicacion}</span>
              </div>
            )
          },
          {
            accessorKey: 'stock',
            header: 'Stock',
            cell: ({ row }) => <span className="bg-gray-100  px-2 py-1 rounded text-xs font-bold text-gray-700 ">{row.original.stock}</span>
          },
          {
            accessorKey: 'estado',
            header: 'Estado',
            cell: ({ row }) => <span className="text-xs font-black  text-gray-500">{row.original.estado}</span>
          },
          {
            accessorKey: 'vendedor',
            header: 'Vendedor',
            cell: ({ row }) => <span className="text-gray-600 ">{row.original.vendedor || '-'}</span>
          },
          {
            id: 'acciones',
            header: 'Acciones',
            cell: ({ row }) => (
              <div className="flex gap-1 justify-end">
                <button onClick={() => { setEditingItem(row.original); setFormData({...row.original} as any); setShowModal(true); }} className="p-2 text-gray-400 hover:text-red-600 transition-all"><Edit className="w-4 h-4" /></button>
                <button onClick={async () => { if(confirm('Eliminar?')){ await equipoUbicacionApi.delete(row.original.id_equipo_ubicacion); loadData(); } }} className="p-2 text-gray-400 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            )
          }
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-brand">
          <div className="bg-white  rounded-3xl shadow-2xl max-w-lg w-full p-8">
            <h2 className="text-2xl font-black mb-6  tracking-tighter text-gray-900 ">Asignación</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Serial Equipo</label>
                <input type="text" value={formData.serial_equipo} onChange={e => setFormData({...formData, serial_equipo: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " required />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">ID Ubicación</label>
                <input type="text" value={formData.id_ubicacion} onChange={e => setFormData({...formData, id_ubicacion: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Stock</label>
                   <input type="text" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " />
                </div>
                <div>
                   <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Estado</label>
                   <input type="text" value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Vendedor</label>
                <input type="text" value={formData.vendedor} onChange={e => setFormData({...formData, vendedor: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-400 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-xl font-black transition-all hover:bg-black  tracking-tighter">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
