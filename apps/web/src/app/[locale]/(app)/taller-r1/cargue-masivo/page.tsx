'use client';

import React, { useState, useEffect } from 'react';
import { cargueMasivoApi, OrdenBaseCargue } from '@/services/taller-r1/cargue-masivo.service';
import { TableList } from '@/components/shared/TableList';
import { toast } from 'sonner';
import { Upload, Loader2, FileSpreadsheet, CheckCircle, Plus, Save, Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import * as XLSX from 'xlsx';

// Helper para convertir fechas de Excel (número a Date)
function parseExcelDate(excelDate: any): Date | null {
  if (!excelDate) return null;
  if (excelDate instanceof Date) return excelDate;
  if (typeof excelDate === 'number') {
    // Excel dates are days since 1900-01-01
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

// Helper para convertir mes de texto a número
function parseMonth(monthText: any): number | null {
  if (!monthText) return null;
  const monthMap: { [key: string]: number } = {
    'ene': 1, 'enero': 1, 'jan': 1, 'january': 1,
    'feb': 2, 'febrero': 2, 'february': 2,
    'mar': 3, 'marzo': 3, 'march': 3,
    'abr': 4, 'abril': 4, 'apr': 4, 'april': 4,
    'may': 5, 'mayo': 5,
    'jun': 6, 'junio': 6, 'june': 6,
    'jul': 7, 'julio': 7, 'july': 7,
    'ago': 8, 'agosto': 8, 'aug': 8, 'august': 8,
    'sep': 9, 'septiembre': 9, 'september': 9,
    'oct': 10, 'octubre': 10, 'october': 10,
    'nov': 11, 'noviembre': 11, 'november': 11,
    'dic': 12, 'diciembre': 12, 'dec': 12, 'december': 12,
  };
  const normalized = String(monthText).toLowerCase().trim();
  return monthMap[normalized] || null;
}

// Helper para parseInt seguro
function parseIntSafe(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const parsed = parseInt(String(val).replace(/[^0-9-]/g, ''), 10);
  return isNaN(parsed) ? null : parsed;
}

// Editable Cell Component
const EditableCell = ({ value: initialValue, onChange }: { value: any, onChange: (val: any) => void }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState(initialValue || '');

  React.useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue]);

  if (isEditing) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          if (value !== initialValue) {
            onChange(value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setIsEditing(false);
            if (value !== initialValue) {
              onChange(value);
            }
          }
          if (e.key === 'Escape') {
            setValue(initialValue || '');
            setIsEditing(false);
          }
        }}
        autoFocus
        className="w-full min-w-[100px] px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-blue-50 px-2 py-1.5 rounded transition-colors min-h-[28px] min-w-[80px]"
      title="Haz clic para editar"
    >
      {value || <span className="text-gray-400 italic font-normal text-xs">-</span>}
    </div>
  );
};


type LocalOrdenBase = OrdenBaseCargue & { _isNew?: boolean; _isEdited?: boolean };

export default function CargueMasivoPage() {
  const [data, setData] = useState<LocalOrdenBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await cargueMasivoApi.getAll();
      console.log('📦 CargueMasivo response completo:', res);
      console.log('📊 Tipo de respuesta:', typeof res);
      console.log('📊 Es array?:', Array.isArray(res));
      console.log('📊 Longitud:', res?.length);
      
      const finalData = Array.isArray(res) ? res : [];
      console.log('✅ Datos finales a cargar en la tabla:', finalData.length, 'registros');
      
      setData(finalData);
    } catch (error) {
      toast.error('Error al cargar los datos');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile) {
      toast.error('Por favor selecciona un archivo primero');
      return;
    }

    try {
      setUploading(true);
      console.log('Procesando archivo:', selectedFile.name);
      
      const reader = new FileReader();

      reader.onload = async (evt) => {
        try {
          const fileData = evt.target?.result;
          const workbook = XLSX.read(fileData, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          
          console.log('Excel parseado. Filas:', json.length);
          console.log('Primera fila RAW completa:', json[0]);
          console.log('Segunda fila RAW completa:', json[1]);
          
          // Log de algunos valores específicos para debug
          if (json[0]) {
            const row0 = json[0] as any;
            console.log('DEBUG - Valores específicos fila 0:');
            console.log('  compras (estatus):', row0['compras']);
            console.log('  __empty (entering_dealer):', row0['__empty']);
            console.log('  __empty_2 (model):', row0['__empty_2']);
            console.log('  __empty_9 (serial):', row0['__empty_9']);
            console.log('  __empty_10 (operacion):', row0['__empty_10']);
          }
          
          // Mapeo correcto basado en la estructura del Excel (UPPERCASE keys)
          // IMPORTANTE: La primera fila contiene los encabezados, la saltamos
          const dataRows = json.slice(1); // Saltar primera fila (encabezados)
          
          const payload = dataRows.map((row: any) => {
            const mapped = {
              ubicacion: row['Ubicación'] ? String(row['Ubicación']) : (row['Ubicación2'] ? String(row['Ubicación2']) : null),
              condicion: row['Condición'] ? String(row['Condición']) : null,
              operacion: row['Operación'] ? String(row['Operación']) : null,
              unidad_venta: row['Unidad de Venta'] ? String(row['Unidad de Venta']) : null,
              cliente_final: row['CIiente FinaI'] ? String(row['CIiente FinaI']) : null,
              qty: parseIntSafe(row['QTY']),
              modelo: row['ModeIo'] ? String(row['ModeIo']) : null,
              serial_numbers_raw: row['SeriaI / Iot #'] ? String(row['SeriaI / Iot #']) : null,
              serial_number: row['SeriaI / Iot #'] ? String(row['SeriaI / Iot #']).split('-').pop() : null,
              serial_lot: row['SeriaI / Iot #'] ? String(row['SeriaI / Iot #']) : null,
              clase: row['Clase'] ? String(row['Clase']) : null,
              po_number: row['PO#'] ? String(row['PO#']) : null,
              end_production: parseExcelDate(row['End Production'])?.toISOString(),
              dia_recibo: parseExcelDate(row['Día de recibo'])?.toISOString(),
              dias_inventario: parseIntSafe(row['Dias de Inventario']),
              antiguedad: parseIntSafe(row['Antigüedad']),
              fecha_liberacion: parseExcelDate(row['Fecha de Liberacion'])?.toISOString(),
              folio_liberacion: row['Folio de Liberacion'] ? String(row['Folio de Liberacion']) : null,
              destino: row['Destino'] ? String(row['Destino']) : null,
              folio_factura: row['Folio Factura'] ? String(row['Folio Factura']) : null,
              bol_number: row['BOL#'] ? String(row['BOL#']) : null,
              semana_importacion: parseIntSafe(row['Semana Importacion']),
              mes_importacion: parseIntSafe(row['Mes importación']),
              anio_importacion: parseIntSafe(row['Año importación']),
              destino_importacion: row['Destino Importación'] ? String(row['Destino Importación']) : null,
              referencia_arribo_laredo: row['Referencia Arribo (Laredo)'] ? String(row['Referencia Arribo (Laredo)']) : null,
              fecha_arribo_laredo: parseExcelDate(row['Fecha Arribo (Laredo)'])?.toISOString(),
              referencia_proforma: row['Referencia / Proforma'] ? String(row['Referencia / Proforma']) : null,
              pedimento: row['Pedimento'] ? String(row['Pedimento']) : null,
              fecha_pedimento: parseExcelDate(row['Fecha Pedimento'])?.toISOString(),
              acondicionado: row['Acondicionado'] ? String(row['Acondicionado']) : null,
              lugar_entrada_piso: row['Lugar de Entrada a Piso'] ? String(row['Lugar de Entrada a Piso']) : null,
              fecha_entrada_piso: parseExcelDate(row['Fecha de Entrada Piso'])?.toISOString(),
              fecha_salida_piso: parseExcelDate(row['Fecha de Salida Piso'])?.toISOString(),
              estatus_operacion: row['Estatus'] ? String(row['Estatus']) : null,
              operacion2: row['Operación3'] ? String(row['Operación3']) : null,
              oc: row['OC'] ? String(row['OC']) : null,
              responsable: row['Responsable'] ? String(row['Responsable']) : null,
              comentarios: row['Comentarios'] ? String(row['Comentarios']) : null,
              estatus: row['Estatus'] ? String(row['Estatus']) : null,
            };
            
            // Remove undefined values, keep nulls
            const cleaned: any = {};
            Object.entries(mapped).forEach(([key, value]) => {
              if (value !== undefined) {
                cleaned[key] = value;
              }
            });

            return cleaned;
          });
          
          console.log('Payload mapeado (primera fila):', payload[0]);
          console.log('Total registros a subir:', payload.length);
          
          await cargueMasivoApi.uploadData(payload);
          toast.success(`${payload.length} registros cargados exitosamente`);
          setSelectedFile(null);
          
          // Esperar un poco antes de recargar para asegurar que los datos se guardaron
          console.log('Recargando datos de la tabla...');
          setTimeout(async () => {
            await loadData();
            console.log('Datos recargados. Total en estado:', data.length);
          }, 500);
        } catch (error) {
          toast.error('Error al procesar el archivo Excel');
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        toast.error('Error al leer el archivo');
        setUploading(false);
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      toast.error('Error al manejar el archivo');
      setUploading(false);
    }
  };

  const handleCellEdit = async (rowId: number, field: string, value: any) => {
    try {
      console.log(`Guardando ${field} = ${value} para ID ${rowId}`);
      await cargueMasivoApi.update(rowId, { [field]: value });
      toast.success('Cambio guardado');
      // Actualizar el estado local
      setData(prevData => 
        prevData.map(item => 
          item.id === rowId ? { ...item, [field]: value } : item
        )
      );
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar el cambio');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('¿Estás SEGURO de que deseas eliminar TODOS los registros de la base de datos? Esta acción no se puede deshacer.')) return;
    try {
      setLoading(true);
      await cargueMasivoApi.deleteAll();
      toast.success('Todos los registros han sido eliminados.');
      setData([]);
    } catch (error) {
      toast.error('Error al eliminar los registros.');
    } finally {
      setLoading(false);
    }
  };

  const createColumn = (key: keyof OrdenBaseCargue, header: string, size: number = 150): ColumnDef<LocalOrdenBase> => ({
    accessorKey: key,
    header: header,
    size,
    cell: ({ row }) => (
      <EditableCell 
        value={(row.original as any)[key]} 
        onChange={(val) => handleCellEdit(row.original.id, key as string, val)} 
      />
    )
  });

  const columns: ColumnDef<LocalOrdenBase>[] = [
    {
      id: 'actions',
      header: 'Acciones',
      size: 100,
      cell: ({ row }) => {
        const canSave = row.original._isNew || row.original._isEdited;
        return (
          <div className="flex gap-2">
            <button 
              onClick={() => saveRow(row.original)}
              disabled={!canSave}
              className={`flex items-center gap-1 p-2 rounded transition-colors tooltip ${canSave ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              title="Guardar cambios"
            >
              <Save className="w-5 h-5" />
            </button>
            <button 
              onClick={() => deleteRow(row.original.id, row.original._isNew)}
              className="flex items-center gap-1 p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors tooltip"
              title="Eliminar"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        );
      }
    },
    { accessorKey: 'id', header: 'ID', size: 60, cell: ({row}) => row.original._isNew ? <span className="text-gray-400 italic">Nuevo</span> : row.original.id },
    createColumn('ubicacion', 'Ubicación', 120),
    createColumn('condicion', 'Condición', 120),
    createColumn('operacion', 'Operación', 120),
    createColumn('unidad_venta', 'Unidad de Venta', 150),
    createColumn('cliente_final', 'Cliente Final', 200),
    createColumn('qty', 'QTY', 80),
    createColumn('modelo', 'Modelo', 120),
    createColumn('serial_number', 'Serial / lot #', 150),
    createColumn('clase', 'Clase', 100),
    createColumn('po_number', 'PO#', 120),
    createColumn('end_production', 'End Production', 130),
    createColumn('dia_recibo', 'Día de recibo', 130),
    createColumn('dias_inventario', 'Dias de Inventario', 130),
    createColumn('antiguedad', 'Antigüedad', 100),
    createColumn('fecha_liberacion', 'Fecha de Liberacion', 150),
    createColumn('folio_liberacion', 'Folio de Liberacion', 150),
    createColumn('destino', 'Destino', 120),
    createColumn('folio_factura', 'Folio Factura', 120),
    createColumn('bol_number', 'BOL#', 120),
    createColumn('semana_importacion', 'Semana Importacion', 150),
    createColumn('mes_importacion', 'Mes importación', 130),
    createColumn('anio_importacion', 'Año importación', 130),
    createColumn('destino_importacion', 'Destino Importación', 160),
    createColumn('referencia_arribo_laredo', 'Ref. Arribo (Laredo)', 160),
    createColumn('fecha_arribo_laredo', 'Fecha Arribo (Laredo)', 160),
    createColumn('referencia_proforma', 'Ref. / Proforma', 150),
    createColumn('pedimento', 'Pedimento', 120),
    createColumn('fecha_pedimento', 'Fecha Pedimento', 140),
    createColumn('acondicionado', 'Acondicionado', 130),
    createColumn('lugar_entrada_piso', 'Lugar Entrada Piso', 150),
    createColumn('fecha_entrada_piso', 'Fecha Entrada Piso', 150),
    createColumn('fecha_salida_piso', 'Fecha Salida Piso', 150),
    createColumn('estatus', 'Estatus', 120),
    createColumn('operacion2', 'Operación 2/3', 120),
    createColumn('oc', 'OC', 100),
    createColumn('responsable', 'Responsable', 150),
    createColumn('comentarios', 'Comentarios', 250),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-none">
        <div className="mx-auto px-8 py-6 max-w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                Cargue Masivo
              </h1>
              <p className="text-gray-600 mt-2 font-medium">
                Gestión de órdenes base mediante carga de archivos Excel
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                <p className="text-red-800 font-bold text-sm">
                  {data.length} Registros
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section - Compacto */}
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-5 shadow-md mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 rounded-xl p-3 shadow-md flex-shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-gray-900 mb-1">
                Cargar Archivo Excel
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Selecciona un archivo Excel (.xlsx, .xls) con las órdenes base
              </p>
              
              <div className="flex gap-3 items-center">
                {/* File Input Area */}
                <div className="flex-1">
                  <label className="block">
                    <div className={`
                      border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
                      ${selectedFile 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 bg-white hover:border-red-400 hover:bg-red-50'
                      }
                    `}>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileInputChange}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div className="text-left">
                            <p className="font-bold text-sm text-green-800">{selectedFile.name}</p>
                            <p className="text-xs text-green-600">
                              {(selectedFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <p className="text-sm font-semibold text-gray-700">
                            Seleccionar archivo
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Upload Button */}
                {selectedFile && (
                  <button
                    onClick={uploadSelectedFile}
                    disabled={uploading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg hover:from-red-700 hover:to-red-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Subir
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            {/* ADD ROW & DELETE ALL BUTTONS */}
            <div className="flex-none flex items-center gap-3">
              <button
                onClick={handleDeleteAll}
                className="flex items-center gap-2 px-6 py-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-bold shadow transition-all active:scale-95"
                title="Eliminar todos los registros"
              >
                <Trash2 className="w-5 h-5" />
                Eliminar Todos
              </button>
              <button
                onClick={handleAddRow}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Agregar Línea Manual
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-[500px] w-full min-w-0 relative">
          <div className="absolute inset-0 overflow-auto">
            <TableList
              isLoading={loading}
              data={data}
              columns={columns}
              hideToolbar={true}
              initialPageSize={20}
              emptyMessage={
                <div className="py-16 text-center">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">
                    No hay datos cargados
                  </h3>
                  <p className="text-gray-500">
                    Sube un archivo Excel o agrega una línea para empezar a editar
                  </p>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
