'use client';

import { useState, useEffect } from 'react';
import { accesoriosApi, Accesorio } from '@/services/taller-r1/accesorios.service';
import { TableList } from '@/components/shared/TableList';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';

export default function AccesoriosPage() {
  const [data, setData] = useState<Accesorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Accesorio | null>(null);
  const [formData, setFormData] = useState({
    tipo: '', modelo: '', serial: '', estado_acc: 'Bueno', rack: '', ubicacion: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await accesoriosApi.getAll();
      setData(res);
    } catch (e) { toast.error('Error'); }
    finally { setLoading(false); }
  };

  const filteredData = data.filter(i => 
    i.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.serial?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await accesoriosApi.update(editingItem.id_accesorio, formData);
        toast.success('OK');
      } else {
        await accesoriosApi.create(formData);
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
            <h1 className="text-3xl font-black text-gray-900  tracking-tighter  font-brand">Accesorios</h1>
            <p className="text-sm text-gray-400 font-medium font-brand">Inventario de baterías, cargadores y periféricos</p>
          </div>
          <button
            onClick={() => { setEditingItem(null); setFormData({ tipo: '', modelo: '', serial: '', estado_acc: 'Bueno', rack: '', ubicacion: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-brand font-bold"
          >
            <Plus className="w-4 h-4" />
            Nuevo Accesorio
          </button>
        </div>
      </div>

      <TableList<Accesorio, any>
        isLoading={loading}
        data={filteredData}
        hideToolbar={true}
        columns={[
          {
            accessorKey: 'tipo',
            header: 'Tipo',
            cell: ({ row }) => <span className="font-bold text-gray-900   tracking-tighter text-xs h-6 px-2 bg-gray-100  flex items-center w-fit rounded">{row.original.tipo}</span>
          },
          {
            accessorKey: 'modelo',
            header: 'Modelo',
            cell: ({ row }) => <span className="font-black text-gray-900 ">{row.original.modelo}</span>
          },
          {
            accessorKey: 'serial',
            header: 'Serial',
            cell: ({ row }) => <span className="text-gray-500  font-mono text-xs">{row.original.serial}</span>
          },
          {
            accessorKey: 'estado_acc',
            header: 'Estado',
            cell: ({ row }) => <span className={`font-bold  text-[10px] ${row.original.estado_acc === 'Bueno' ? 'text-green-600' : 'text-orange-500'}`}>{row.original.estado_acc}</span>
          },
          {
            accessorKey: 'ubicacion',
            header: 'Ubicación',
            cell: ({ row }) => <span className="text-gray-600  font-bold">{row.original.ubicacion || '-'}</span>
          },
          {
            id: 'acciones',
            header: 'Acciones',
            cell: ({ row }) => (
              <div className="flex gap-1 justify-end">
                <button onClick={() => { setEditingItem(row.original); setFormData({...row.original} as any); setShowModal(true); }} className="p-2 text-gray-400 hover:text-red-600 transition-all"><Edit className="w-4 h-4" /></button>
                <button onClick={async () => { if(confirm('Eliminar?')){ await accesoriosApi.delete(row.original.id_accesorio); loadData(); } }} className="p-2 text-gray-400 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            )
          }
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white  rounded-3xl shadow-2xl max-w-xl w-full p-8 font-brand">
            <h2 className="text-2xl font-black mb-6  tracking-tighter text-gray-900 ">Accesorio</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Tipo</label>
                <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold ">
                  <option value="">Seleccionar</option>
                  <option value="Batería">Batería</option>
                  <option value="Cargador">Cargador</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Modelo</label>
                <input type="text" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Serial</label>
                <input type="text" value={formData.serial} onChange={e => setFormData({...formData, serial: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Estado</label>
                <select value={formData.estado_acc} onChange={e => setFormData({...formData, estado_acc: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold ">
                  <option value="Bueno">Bueno</option>
                  <option value="Regular">Regular</option>
                  <option value="Malo">Malo</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-xs font-black text-gray-400  tracking-widest block mb-1">Ubicación</label>
                <input type="text" value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})} className="w-full px-4 py-3 bg-gray-50  rounded-xl outline-none focus:ring-2 focus:ring-red-100  focus:bg-white  transition-all font-bold " />
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100  mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-400 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-xl font-black transition-all hover:bg-black  tracking-tighter shadow-xl shadow-red-100 ">Guardar Accesorio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
