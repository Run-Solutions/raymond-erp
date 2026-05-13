import React, { useEffect, useState } from 'react';
import { QrCode, Truck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { equipoUbicacionApi, EquipoUbicacion, MovilizacionHistory } from '@/services/taller-r1/equipo-ubicacion.service';

interface EquipoUbicacionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: EquipoUbicacion | null;
  onGenerateQR: (item: EquipoUbicacion) => void;
  onMovilizar?: (item: EquipoUbicacion) => void;
}

export const EquipoUbicacionDetailsModal = ({
  isOpen,
  onClose,
  selectedItem,
  onGenerateQR,
  onMovilizar
}: EquipoUbicacionDetailsModalProps) => {
  const [historialMovilizaciones, setHistorialMovilizaciones] = useState<MovilizacionHistory[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  useEffect(() => {
    if (isOpen && selectedItem) {
      loadHistorial(selectedItem.id_equipo_ubicacion);
    } else {
      setHistorialMovilizaciones([]);
    }
  }, [isOpen, selectedItem]);

  const loadHistorial = async (id: string) => {
    try {
      setLoadingHistorial(true);
      const history = await equipoUbicacionApi.getMovilizaciones(id);
      setHistorialMovilizaciones(Array.isArray(history) ? history : []);
    } catch (error) {
      console.error("Error loading historial:", error);
      setHistorialMovilizaciones([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-white !bg-white sm:rounded-2xl shadow-2xl border border-gray-200">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Detalles del Equipo</DialogTitle>
            <DialogDescription>
              Información detallada sobre la ubicación y estado del equipo seleccionado.
            </DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        {selectedItem && (
          <div className="space-y-4 font-sans max-h-[80vh] overflow-y-auto">

            <div className="flex flex-col">
              <span className="font-black text-slate-800 text-lg tracking-tight">Serial: {selectedItem.serial_equipo}</span>
              <span className="text-[10px] font-mono font-bold text-slate-400">Modelo: {selectedItem.modelo}</span>
            </div>

            <div className="flex flex-col">
              <span className="uppercase text-gray-500 font-normal text-xs mb-0.5">Ubicación</span>
              <span className="text-gray-900 font-semibold text-base">{selectedItem.ubicacion}</span>
            </div>

            <div className="flex flex-col">
              <span className="uppercase text-gray-500 font-normal text-xs mb-0.5">sub ubicación / posición</span>
              <span className="text-gray-900 font-semibold text-base">{selectedItem.sub_ubicacion}</span>
            </div>

            <div className="flex flex-col">
              <span className="uppercase text-gray-500 font-normal text-xs mb-0.5">estado</span>
              <span className="text-gray-900 font-semibold text-base">{selectedItem.estado}</span>
            </div>

            <div className="flex flex-col">
              <span className="uppercase text-gray-500 font-normal text-xs mb-0.5">Acciones</span>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => onGenerateQR(selectedItem)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  title="Generar QR"
                >
                  <QrCode className="w-5 h-5" />
                </button>
                {selectedItem.estado !== 'Retirado' && onMovilizar && (
                  <button
                    onClick={() => {
                        onClose();
                        onMovilizar(selectedItem);
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
                    title="Movilizar Equipo"
                  >
                    <Truck className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <span className="uppercase text-gray-500 font-normal text-xs mb-0.5">fecha de ingreso</span>
              <span className="text-gray-900 font-semibold text-base">
                {selectedItem.fecha_entrada && selectedItem.fecha_entrada !== 'N/D'
                  ? new Date(selectedItem.fecha_entrada).toLocaleString()
                  : '-'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="uppercase text-gray-500 font-normal text-xs mb-0.5">fecha de salida</span>
              <span className="text-gray-900 font-semibold text-base">
                {selectedItem.fecha_salida && selectedItem.fecha_salida !== 'N/D'
                  ? new Date(selectedItem.fecha_salida).toLocaleString()
                  : '-'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="uppercase text-gray-500 font-normal text-xs mb-0.5">vendedor</span>
              <span className="text-gray-900 font-semibold text-base">{selectedItem.unidad_venta}</span>
            </div>

            <div className="flex flex-col">
              <span className="uppercase text-gray-500 font-normal text-xs mb-0.5">cliente final / razón social</span>
              <span className="text-gray-900 font-semibold text-base">{selectedItem.cliente}</span>
            </div>

            <div className="flex flex-col">
              <span className="uppercase text-gray-500 font-normal text-xs mb-0.5">folio</span>
              <span className="text-gray-900 font-semibold text-base">#{selectedItem.folio}</span>
            </div>

            {/* Historial de Movilizaciones */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" /> Historial de Movimientos
              </h4>
              {loadingHistorial ? (
                <p className="text-xs text-gray-500">Cargando historial...</p>
              ) : historialMovilizaciones.length === 0 ? (
                <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">No hay movimientos registrados.</p>
              ) : (
                <div className="space-y-3">
                  {historialMovilizaciones.map((mov) => (
                    <div key={mov.id_movilizacion} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-gray-500">{new Date(mov.fecha_movilizacion).toLocaleString()}</span>
                        <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">{mov.usuario_movilizacion}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <div className="flex flex-col bg-white border border-green-100 rounded px-2 py-1 flex-1">
                          <span className="text-[9px] text-gray-400 uppercase">Origen (Liberado)</span>
                          <span className="text-gray-900 line-clamp-1" title={mov.nombre_ubicacion_origen}>{mov.nombre_ubicacion_origen}</span>
                          <span className="text-green-700 font-bold">POSICIÓN {mov.nombre_sub_ubicacion_origen}</span>
                        </div>
                        <span className="text-gray-300">→</span>
                        <div className="flex flex-col bg-white border border-red-100 rounded px-2 py-1 flex-1">
                          <span className="text-[9px] text-gray-400 uppercase">Destino (Ocupado)</span>
                          <span className="text-gray-900 line-clamp-1" title={mov.nombre_ubicacion_destino}>{mov.nombre_ubicacion_destino}</span>
                          <span className="text-red-700 font-bold">POSICIÓN {mov.nombre_sub_ubicacion_destino}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
