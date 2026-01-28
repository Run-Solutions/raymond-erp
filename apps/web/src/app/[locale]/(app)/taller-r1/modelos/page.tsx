'use client';

import { useState, useEffect } from 'react';
import { modelosApi, Modelo } from '@/services/taller-r1/modelos.service';
import { TableList } from '@/components/shared/TableList';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';

export default function ModelosPage() {
  const [data, setData] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Modelo | null>(null);
  const [formData, setFormData] = useState({ modelo: '', clase_id: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await modelosApi.getAll();
      setData(res);
    } catch (e) { toast.error('Error'); }
    finally { setLoading(false); }
  };

  const filteredData = data.filter(i => 
    i.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await modelosApi.update(editingItem.id_modelo, formData);
        toast.success('OK');
      } else {
        await modelosApi.create(formData);
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
            <h1 className="text-3xl font-black text-gray-900  tracking-tighter  font-brand">Modelos</h1>
            <p className="text-sm text-gray-400 font-medium font-brand">Catálogo de modelos Raymond disponibles</p>
          </div>
          <button
            onClick={() => { setEditingItem(null); setFormData({ modelo: '', clase_id: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-brand font-bold"
          >
            <Plus className="w-4 h-4" />
            Nuevo Modelo
          </button>
        </div>
      </div>

      <TableList<Modelo, any>
        isLoading={loading}
        data={filteredData}
        hideToolbar={true}
        columns={[
          {
            accessorKey: 'modelo',
            header: 'Modelo',
            cell: ({ row }) => <span className="font-black text-gray-900   tracking-tighter">{row.original.modelo}</span>
          },
          {
            accessorKey: 'clase_id',
            header: 'ID Clase',
            cell: ({ row }) => <span className="text-gray-500  font-mono text-xs">{row.original.clase_id || '-'}</span>
          },
          {
            id: 'acciones',
            header: 'Acciones',
            cell: ({ row }) => (
              <div className="flex gap-1 justify-end">
                <button onClick={() => { setEditingItem(row.original); setFormData({ ...row.original, clase_id: row.original.clase_id || '' }); setShowModal(true); }} className="p-2 text-gray-400 hover:text-red-600 transition-all"><Edit className="w-4 h-4" /></button>
                <button onClick={async () => { if(confirm('Eliminar?')){ await modelosApi.delete(row.original.id_modelo); loadData(); } }} className="p-2 text-gray-400 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            )
          }
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white  rounded-2xl shadow-2xl max-w-md w-full p-8 font-brand">
            <h2 className="text-2xl font-black mb-6  tracking-tighter text-gray-900 ">Detalle Modelo</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Nombre Modelo</label>
                <input type="text" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " required />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">ID Clase</label>
                <input type="text" value={formData.clase_id} onChange={e => setFormData({...formData, clase_id: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-400 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-xl font-black transition-all hover:bg-black  tracking-tighter">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
