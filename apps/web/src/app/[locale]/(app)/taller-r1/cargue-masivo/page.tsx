'use client';

import React, { useState, useEffect } from 'react';
import { cargueMasivoApi, OrdenBaseCargue } from '@/services/taller-r1/cargue-masivo.service';
import { TableList } from '@/components/shared/TableList';
import { toast } from 'sonner';
import { Upload, Loader2, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
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


export default function CargueMasivoPage() {
  const [data, setData] = useState<OrdenBaseCargue[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Iniciando carga de datos...');
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
      console.error('❌ Error en loadData:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log('Archivo seleccionado:', file.name);
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
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
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
              estatus: row['COMPRAS'] || row['Estatus'] || null,
              entering_dealer: row['__EMPTY'] || null,
              receiving_dealer: row['__EMPTY_1'] || null,
              model: row['__EMPTY_2'] ? String(row['__EMPTY_2']) : null,
              sales_order2: row['__EMPTY_3'] ? String(row['__EMPTY_3']) : null,
              dealer_po: row['__EMPTY_4'] ? String(row['__EMPTY_4']) : null,
              quote_number: row['__EMPTY_5'] ? String(row['__EMPTY_5']) : null,
              qty_on_order: row['__EMPTY_6'] || null,
              ord_entry_date: parseExcelDate(row['__EMPTY_7'])?.toISOString(),
              curr_ship_date: parseExcelDate(row['__EMPTY_8'])?.toISOString(),
              serial_numbers_raw: row['__EMPTY_9'] ? String(row['__EMPTY_9']) : null,
              serial_number: row['__EMPTY_9'] ? String(row['__EMPTY_9']).split('-').pop() : null,
              operacion: row['__EMPTY_10'] ? String(row['__EMPTY_10']) : null,
              razon_social_registro: row['__EMPTY_11'] ? String(row['__EMPTY_11']) : null,
              unidad_venta: row['__EMPTY_12'] ? String(row['__EMPTY_12']) : null,
              cliente_final: row['__EMPTY_13'] ? String(row['__EMPTY_13']) : null,
              qty: row['__EMPTY_14'] || null,
              modelo: row['__EMPTY_15'] ? String(row['__EMPTY_15']) : null,
              mastil: row['__EMPTY_16'] ? String(row['__EMPTY_16']) : null,
              clase: row['__EMPTY_17'] ? String(row['__EMPTY_17']) : null,
              tipo: row['__EMPTY_18'] ? String(row['__EMPTY_18']) : null,
              po_number: row['__EMPTY_19'] ? String(row['__EMPTY_19']) : null,
              so_number: row['__EMPTY_20'] ? String(row['__EMPTY_20']) : null,
              quote: row['__EMPTY_21'] ? String(row['__EMPTY_21']) : null,
              serial_lot: row['__EMPTY_22'] ? String(row['__EMPTY_22']) : null,
              valor_factura: row['__EMPTY_23'] || null,
              end_production: parseExcelDate(row['__EMPTY_24'])?.toISOString(),
              endofprod_year: row['__EMPTY_25'] || null,
              endofprod_month: parseMonth(row['__EMPTY_26']),
              dia_recibo: parseExcelDate(row['PLANTA'])?.toISOString(),
              dias_inventario: row['__EMPTY_27'] || null,
              antiguedad: row['__EMPTY_28'] || null,
              fecha_liberacion: parseExcelDate(row['__EMPTY_29'])?.toISOString(),
              folio_liberacion: row['__EMPTY_30'] ? String(row['__EMPTY_30']) : null,
              destino: row['__EMPTY_31'] ? String(row['__EMPTY_31']) : null,
              folio_factura: row['__EMPTY_32'] ? String(row['__EMPTY_32']) : null,
              bol_number: row['FRONTERA'] ? String(row['FRONTERA']) : null,
              semana_importacion: row['__EMPTY_33'] || null,
              mes_importacion: row['__EMPTY_34'] || null,
              anio_importacion: row['__EMPTY_35'] || null,
              destino_importacion: row['__EMPTY_36'] ? String(row['__EMPTY_36']) : null,
              referencia_arribo_laredo: row['__EMPTY_37'] ? String(row['__EMPTY_37']) : null,
              fecha_arribo_laredo: parseExcelDate(row['__EMPTY_38'])?.toISOString(),
              referencia_proforma: row['__EMPTY_39'] ? String(row['__EMPTY_39']) : null,
              pedimento: row['__EMPTY_40'] ? String(row['__EMPTY_40']) : null,
              fecha_pedimento: parseExcelDate(row['__EMPTY_41'])?.toISOString(),
              condicion: row['PISO'] ? String(row['PISO']) : null,
              acondicionado: row['__EMPTY_42'] ? String(row['__EMPTY_42']) : null,
              lugar_entrada_piso: row['__EMPTY_43'] ? String(row['__EMPTY_43']) : null,
              fecha_entrada_piso: parseExcelDate(row['__EMPTY_44'])?.toISOString(),
              fecha_salida_piso: parseExcelDate(row['__EMPTY_45'])?.toISOString(),
              ubicacion: row['__EMPTY_46'] ? String(row['__EMPTY_46']) : null,
              estatus_operacion: row['__EMPTY_47'] ? String(row['__EMPTY_47']) : null,
              operacion2: row['__EMPTY_48'] ? String(row['__EMPTY_48']) : null,
              oc: row['__EMPTY_49'] ? String(row['__EMPTY_49']) : null,
              responsable: row['__EMPTY_50'] ? String(row['__EMPTY_50']) : null,
              comentarios: row['__EMPTY_51'] ? String(row['__EMPTY_51']) : null,
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
          console.error('Error en parse/upload:', error);
          toast.error('Error al procesar el archivo Excel');
        } finally {
          setUploading(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Error al leer archivo');
        toast.error('Error al leer el archivo');
        setUploading(false);
      };
      
      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error('Error en manejo de archivo:', error);
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

  const columns: ColumnDef<OrdenBaseCargue>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'serial_number',
      header: 'Número de Serie',
      size: 180,
      cell: ({ row }) => {
        const [isEditing, setIsEditing] = React.useState(false);
        const [value, setValue] = React.useState(row.original.serial_number || '');

        if (isEditing) {
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => {
                setIsEditing(false);
                if (value !== row.original.serial_number) {
                  handleCellEdit(row.original.id, 'serial_number', value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditing(false);
                  if (value !== row.original.serial_number) {
                    handleCellEdit(row.original.id, 'serial_number', value);
                  }
                }
                if (e.key === 'Escape') {
                  setValue(row.original.serial_number || '');
                  setIsEditing(false);
                }
              }}
              autoFocus
              className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          );
        }

        return (
          <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
            title="Haz clic para editar"
          >
            {value || <span className="text-gray-400 italic">Sin serie</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'model',
      header: 'Modelo',
      size: 100,
    },
    {
      accessorKey: 'operacion',
      header: 'Operación',
      size: 120,
    },
    {
      accessorKey: 'clase',
      header: 'Clase',
      size: 80,
    },
    {
      accessorKey: 'dealer_po',
      header: 'PO Dealer',
      size: 120,
    },
    {
      accessorKey: 'cliente_final',
      header: 'Cliente Final',
      size: 180,
    },
    {
      accessorKey: 'estatus',
      header: 'Estatus',
      size: 100,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
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
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <TableList
            isLoading={loading}
            data={data}
            columns={columns}
            hideToolbar={true}
            emptyMessage={
              <div className="py-16 text-center">
                <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  No hay datos cargados
                </h3>
                <p className="text-gray-500">
                  Sube un archivo Excel para comenzar
                </p>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
