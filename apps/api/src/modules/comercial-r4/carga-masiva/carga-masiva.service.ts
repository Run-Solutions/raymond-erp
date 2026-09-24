import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaDynamicService } from '../../../database/prisma-dynamic.service';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid'; // Fallback for IDs if needed

// Mapeo de nombre completo del mes (como viene en el Excel) → número de mes
const MONTH_NAME_MAP: Record<string, string> = {
    'ENERO': '01', 'ENE': '01', 'JAN': '01',
    'FEBRERO': '02', 'FEB': '02',
    'MARZO': '03', 'MAR': '03',
    'ABRIL': '04', 'ABR': '04', 'APR': '04',
    'MAYO': '05', 'MAY': '05',
    'JUNIO': '06', 'JUN': '06',
    'JULIO': '07', 'JUL': '07',
    'AGOSTO': '08', 'AGO': '08', 'AUG': '08',
    'SEPTIEMBRE': '09', 'SEP': '09', 'SEPT': '09',
    'OCTUBRE': '10', 'OCT': '10',
    'NOVIEMBRE': '11', 'NOV': '11',
    'DICIEMBRE': '12', 'DIC': '12', 'DEC': '12',
};
const normalizeADCName = (name: string | null | undefined): string | null => {
    if (!name) return null;
    const cleanName = name.trim();
    const upperName = cleanName.toUpperCase();
    
    if (upperName === 'ALEJANDRA') return 'Alejandra Arellanes';
    if (upperName === 'ANDREA') return 'Andrea Esquivel';
    if (upperName === 'DANIEL') return 'Daniel Romero';
    if (upperName === 'MONTSERRAT') return 'Montserrat Covarrubias';
    if (upperName === 'SIMALÚ' || upperName === 'SIMALU') return 'Simalú León';
    
    return cleanName;
};

// Normaliza una serie/número de serie para usarla como identificador de activo.
// Evita espacios consecutivos, espacios finales y caracteres que rompan la URL,
// para no colisionar por colación PAD SPACE de MySQL ni por codificación (#, espacios).
const normalizeSerie = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const solo = raw.trim().replace(/\s+/g, ' ');
    if (!solo) return null;
    // Los caracteres # & ? / se dejan (pueden formar parte legítima de una serie),
    // pero se garantiza que quede un solo espacio entre tokens.
    return solo;
};

/**
 * Normaliza un nombre de cliente para comparación fuzzy.
 * Elimina espacios, acentos, puntuación y convierte a mayúsculas.
 * Ejemplo: "Mercado Libre" → "MERCADOLIBRE"
 *          "MERCADO LIBRE S.A. DE C.V." → "MERCADOLIBREDECV"
 */
const normalizeClientName = (name: string | null | undefined): string => {
    if (!name) return '';
    return name
        .toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quitar acentos
        .replace(/[^A-Z0-9]/g, '');  // quitar espacios, puntos, comas, S.A., etc.
};

/**
 * Determina dinámicamente si una fila corresponde a un aditamento, batería, plataforma o accesorio.
 * Los montacargas industriales pertenecen a las clases estándar (Clase I, II, III, IV, V).
 * Los aditamentos y accesorios (Clase "Others", tipos de batería/stand/clamp, o donde la Serie es igual al Modelo)
 * no cuentan con número de serie único de fabricante y pueden repetirse en el inventario.
 */
const isAditamentoOrAccesorio = (tipo?: string | null, clase?: string | null, modelo?: string | null, serie?: string | null): boolean => {
    const t = (tipo || '').toLowerCase().trim();
    const c = (clase || '').toLowerCase().trim();
    const m = (modelo || '').toLowerCase().trim();
    const s = (serie || '').toLowerCase().trim();

    // 1. Por Clasificación: Si la clase es "Others", "Accesorios" o "Aditamentos"
    if (c.includes('other') || c.includes('accesorio') || c.includes('aditamento')) return true;

    // 2. Por Tipo de equipo: Componentes de soporte, baterías, plataformas, cargadores, aditamentos
    const tiposAditamentos = ['battery', 'bater', 'stand', 'plataforma', 'aditamento', 'cargador', 'clamp', 'pushpull', 'caseta', 'patin', 'patín', 'accesorio'];
    if (tiposAditamentos.some(tipoAdit => t.includes(tipoAdit))) return true;

    // 3. Cuando la Serie registrada es idéntica al Modelo (típico en accesorios genéricos sin serie de fábrica)
    // y no pertenece a las clases principales de montacargas (Clase I, II, III, IV, V)
    const esClaseMontacargas = /\b(i|ii|iii|iv|v)\b/i.test(c) || c.includes('clase 1') || c.includes('clase 2') || c.includes('clase 3');
    if (s && m && s === m && !esClaseMontacargas) return true;

    return false;
};

// Catálogo oficial de tipos de equipo. Una carga masiva NUNCA crea tipos nuevos:
// si el TIPO del archivo no coincide con este catálogo (o un alias conocido),
// la carga se rechaza y se informa al usuario.
const TIPOS_VALIDOS: string[] = [
    'Contrabalanceado',
    'Contrabalanceado CI',
    'Reach',
    'Walkie',
    'Stacker',
    'Orderpicker',
    'Deep Reach',
    'Swing Reach',
    'Tugger',
    'Plataforma',
    'Barredora',
    'Intercambiador',
    'Battery Stand',
    'Aditamento',
    'Baterías',
    'Cargador',
    'Otros',
];

// Alias normalizados (sin acentos, sin puntuación) → tipo canónico
const TIPO_ALIASES: Record<string, string> = {
    'CONTRABALANCEADOCLAMP': 'Contrabalanceado',
    'CONTRABALANCEADOCLI': 'Contrabalanceado CI',
    'BATERIASCARGADOR': 'Baterías',
    'CARGADORBATERIAS': 'Cargador',
};

// Normaliza un TIPO al valor canónico del catálogo. Devuelve null si no existe.
const normalizeTipo = (raw?: string | null): string | null => {
    if (!raw) return null;
    const key = raw
        .toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '');
    if (TIPO_ALIASES[key]) return TIPO_ALIASES[key];
    return TIPOS_VALIDOS.find(t =>
        t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '') === key,
    ) || null;
};

// Columnas obligatorias del archivo maestro. Si falta alguna, la carga se rechaza.
const COLUMNAS_REQUERIDAS: { nombre: string; candidatos: string[] }[] = [
    { nombre: 'CLIENTE', candidatos: ['CLIENTE'] },
    { nombre: 'SITE', candidatos: ['SITE', 'SITIO', 'SUCURSAL', 'TIENDA'] },
    { nombre: 'CUENTA', candidatos: ['CUENTA'] },
    { nombre: 'ADC', candidatos: ['ADC', 'RESPONSABLE', 'EJECUTIVO', 'EJECUTIVO ADC'] },
    { nombre: 'DISTRIBUIDOR', candidatos: ['DISTRIBUIDOR', 'DISTRIBUIDOR AUTORIZADO', 'DEALER', 'DEALER ASIGNADO', 'AGENCIA', 'PROVEEDOR'] },
    { nombre: 'TIPO', candidatos: ['TIPO'] },
    { nombre: 'CLASE', candidatos: ['CLASE'] },
    { nombre: 'MODELO', candidatos: ['MODELO'] },
    { nombre: 'SERIE', candidatos: ['SERIE', 'S/N', 'SN', 'NÚMERO DE SERIE', 'NUMERO DE SERIE', 'NO SERIE', 'NO. SERIE', 'SERIE EQUIPO', 'NUMERO SERIE DEL EQUIPO'] },
    { nombre: 'OACH', candidatos: ['OACH'] },
    { nombre: 'ALTURA', candidatos: ['ALTURA'] },
    { nombre: 'BC', candidatos: ['BC'] },
    { nombre: 'IWAREHOUSE S/N', candidatos: ['IWAREHOUSE S/N', 'IWAREHOUSE', 'IW S/N'] },
    { nombre: 'PROPIETARIO', candidatos: ['PROPIETARIO'] },
    { nombre: 'ESTATUS', candidatos: ['ESTATUS', 'ESTADO', 'ESTADO DEL ACTIVO'] },
    { nombre: 'FECHA ENTREGADO', candidatos: ['FECHA ENTREGADO', 'F. ENTREGADO', 'ENTREGADO', 'FECHA DE ENTREGA'] },
    { nombre: 'PLAZO DE RENTA (MESES)', candidatos: ['PLAZO DE RENTA (MESES)', 'PLAZO DE RENTA', 'PLAZO', 'MESES DE RENTA'] },
    { nombre: 'FECHA VENCIMIENTO', candidatos: ['FECHA VENCIMIENTO', 'FECHA DE VENCIMIENTO', 'VENCIMIENTO', 'FECHA FIN', 'FECHA VENC'] },
    { nombre: 'PRECIO RENTA CLIENTE', candidatos: ['PRECIO RENTA CLIENTE', 'PRECIO RENTA', 'RENTA CLIENTE', 'TARIFA', 'RENTA MENSUAL'] },
    { nombre: 'MONEDA', candidatos: ['MONEDA'] },
    { nombre: 'CFPM / SMP', candidatos: ['CFPM / SMP', 'CFPM/SMP', 'CFPM', 'SMP'] },
];

@Injectable()
export class CargaMasivaService {
    private readonly logger = new Logger(CargaMasivaService.name);

    constructor(private readonly prismaService: PrismaDynamicService) {}

    async procesarArchivo(file: Express.Multer.File, userId: string, adcFilter?: string, aplicar: boolean = true) {
        if (aplicar === false) {
            // Dry-run: ejecuta la lógica completa dentro de una transacción que se REVIERTE al final,
            // de modo que el plan y la ejecución usan exactamente el mismo código y no se persiste nada.
            const db = PrismaDynamicService.clients.r4;
            if (!db) {
                throw new Error('Database client for R4 no inicializado');
            }
            try {
                await db.$transaction(async (tx: any) => {
                    const result = await this.procesarArchivoTx(tx, file, userId, adcFilter);
                    throw { __dryRunRollback: true, result };
                }, { maxWait: 60000, timeout: 600000 });
                throw new Error('UNREACHABLE: la transacción dry-run debió revertirse');
            } catch (error: any) {
                if (error && error.__dryRunRollback) {
                    return { ...error.result, dry_run: true };
                }
                this.logger.error(`Error en procesarArchivo (dry-run): ${error.message}`);
                throw new HttpException(error.message || 'Error procesando el archivo', HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }

        const db = PrismaDynamicService.clients.r4;
        if (!db) {
            throw new Error('Database client for R4 no inicializado');
        }

        try {
            const result = await this.procesarArchivoTx(db, file, userId, adcFilter);
            return result;
        } catch (error: any) {
            this.logger.error(`Error en procesarArchivo: ${error.message}`);
            throw new HttpException(error.message || 'Error procesando el archivo', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Núcleo de procesamiento. `db` puede ser el cliente R4 o un cliente de transacción (dry-run).
    private async procesarArchivoTx(db: any, file: Express.Multer.File, userId: string, adcFilter?: string) {
        try {
            this.logger.log('Iniciando lectura de Excel...');

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(file.buffer as any);

            let worksheet: ExcelJS.Worksheet | undefined;
            // Primero buscar por nombre
            const targetSheetNames = ['FLOTILLA', 'RESUMEN FLOTILLA', 'RENTAS', 'BASE DE DATOS'];
            for (const name of targetSheetNames) {
                const sheet = workbook.worksheets.find(ws => ws.name.toUpperCase().includes(name));
                if (sheet) {
                    worksheet = sheet;
                    break;
                }
            }
            
            // Si no encuentra por nombre, buscar la que tenga SERIE en la fila 1
            if (!worksheet) {
                for (const ws of workbook.worksheets) {
                    const hRow = ws.getRow(1);
                    let hasSerie = false;
                    hRow.eachCell(c => {
                        if (c.value?.toString().toUpperCase().includes('SERIE')) hasSerie = true;
                    });
                    if (hasSerie) {
                        worksheet = ws;
                        break;
                    }
                }
            }
            
            // Fallback a la primera hoja
            if (!worksheet) {
                worksheet = workbook.worksheets[0];
            }

            if (!worksheet) {
                throw new HttpException('El archivo Excel está vacío o no tiene hojas.', HttpStatus.BAD_REQUEST);
            }

            // Buscar la fila de encabezados (primeras 10 filas)
            let headerRowIndex = 1;
            let bestMatchCount = 0;
            
            for (let i = 1; i <= 10; i++) {
                const row = worksheet.getRow(i);
                const matchedSet = new Set<string>();
                row.eachCell({ includeEmpty: false }, (cell) => {
                    const val = cell.value?.toString().toUpperCase() || '';
                    if (val.includes('CLIENTE')) matchedSet.add('CLIENTE');
                    if (val.includes('SERIE')) matchedSet.add('SERIE');
                    if (val.includes('OACH')) matchedSet.add('OACH');
                    if (val.includes('SITIO')) matchedSet.add('SITIO');
                });
                const matchCount = matchedSet.size;
                if (matchCount > bestMatchCount) {
                    bestMatchCount = matchCount;
                    headerRowIndex = i;
                }
            }

            const headerRow = worksheet.getRow(headerRowIndex);
            const headers: string[] = [];
            headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                // Normalize: trim + collapse multiple spaces into one
                headers[colNumber] = (cell.value?.toString() || '').trim().toUpperCase().replace(/\s+/g, ' ');
            });

            if (headers.filter(Boolean).length === 0 || bestMatchCount === 0) {
                throw new HttpException(`No se encontraron encabezados válidos en las primeras 10 filas de la hoja ${worksheet.name}.`, HttpStatus.BAD_REQUEST);
            }


            const currentYear = new Date().getFullYear();
            const activeMonths: { name: string; period: string }[] = [];

            for (const [monthName, monthNum] of Object.entries(MONTH_NAME_MAP)) {
                const hasPO = headers.some(h => h === `PO ${monthName}` || h.startsWith(`PO ${monthName}`));
                if (hasPO) {
                    activeMonths.push({ name: monthName, period: `${currentYear}-${monthNum}` });
                }
            }

            this.logger.log(`Meses detectados: ${activeMonths.map(m => m.name).join(', ')}`);

            const extractCellValue = (cell: ExcelJS.Cell): string | null => {
                let val = cell.value;
                if (val === null || val === undefined) return null;
                if (val instanceof Date) {
                    return val.toISOString().split('T')[0];
                }
                if (typeof val === 'object') {
                    if ('result' in val && val.result !== undefined && val.result !== null) {
                        val = val.result;
                        if (val instanceof Date) return val.toISOString().split('T')[0];
                    } else if ('text' in val && typeof (val as any).text === 'string') {
                        val = (val as any).text;
                    } else if ('hyperlink' in val && typeof (val as any).hyperlink === 'string') {
                        val = (val as any).hyperlink.replace(/^mailto:/i, '');
                    } else if ('richText' in val && Array.isArray((val as any).richText)) {
                        val = (val as any).richText.map((rt: any) => rt.text).join('');
                    }
                }
                const str = val ? val.toString().trim() : '';
                if (str === '[object Object]' || str === '' || str === 'null' || str === 'undefined') return null;
                return str;
            };

            const getStrictColVal = (row: ExcelJS.Row, headersList: string[], candidates: string[], excludeWords: string[] = []): string | null => {
                // 1. Exact match first
                for (const cand of candidates) {
                    const upperCand = cand.toUpperCase().trim();
                    const idx = headersList.findIndex(h => h === upperCand);
                    if (idx > 0) {
                        const val = extractCellValue(row.getCell(idx));
                        if (val) return val;
                    }
                }
                // 2. Partial match without excluded words
                for (const cand of candidates) {
                    const upperCand = cand.toUpperCase().trim();
                    const idx = headersList.findIndex(h => {
                        if (!h) return false;
                        if (!h.includes(upperCand)) return false;
                        return !excludeWords.some(w => h.includes(w.toUpperCase()));
                    });
                    if (idx > 0) {
                        const val = extractCellValue(row.getCell(idx));
                        if (val) return val;
                    }
                }
                return null;
            };

            const getVal = (row: ExcelJS.Row, colName: string): string | null => {
                return getStrictColVal(row, headers, [colName]);
            };

            const getDateVal = (row: ExcelJS.Row, colNames: string[], defaultDate: Date | null): Date | null => {
                for (const colName of colNames) {
                    const upperName = colName.toUpperCase();
                    let idx = headers.findIndex(h => h === upperName);
                    if (idx < 0) idx = headers.findIndex(h => h && h.includes(upperName));
                    if (idx > 0) {
                        const cell = row.getCell(idx);
                        const val = cell.value;
                        if (val) {
                            if (val instanceof Date) return val;
                            const valStr = val.toString().trim();
                            // Detect DD/MM/YY or DD/MM/YYYY
                            if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(valStr)) {
                                const parts = valStr.split(' ')[0].split('/');
                                const year = parseInt(parts[2]) < 100 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
                                return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
                            }
                            const parsed = new Date(valStr);
                            if (!isNaN(parsed.getTime())) return parsed;
                        }
                    }
                }
                return defaultDate;
            };

            // Columnas candidatas para fechas de contrato (ampliadas para cubrir los encabezados reales del archivo maestro).
            const FECHA_INICIO_CANDIDATES = ['F. ENTREGADO', 'ENTREGADO', 'F. ENT', 'F ENT', 'FECHA ENTREGADO', 'FECHA DE ENTREGADO', 'FECHA DE INICIO', 'INICIO'];
            const FECHA_VENCIMIENTO_CANDIDATES = ['F. VENC', 'F VENC', 'VENCIMIENTO', 'FECHA VENCIMIENTO', 'FECHA DE VENCIMIENTO', 'FECHA FIN', 'FECHA FINAL', 'FECHA FIN CONTRATO', 'FIN CONTRATO', 'FIN'];

            const esNoAplica = (v: string | null | undefined): boolean =>
                !v || /^(NA|N\/A|N-A|N A|-|NO|NULL|UNDEFINED|VACIO)$/i.test((v || '').trim());

            const addMeses = (fecha: Date, meses: number): Date => {
                const d = new Date(fecha);
                d.setMonth(d.getMonth() + meses);
                return d;
            };

            // Moneda con la que se paga al distribuidor (PRECIO/MONEDA RENTA DEALER según el archivo maestro).
            // Evita el "MXN" por defecto cuando la columna sólo no coincide con "MONEDA PAGO".
            const getMonedaPagoDistribuidor = (row: ExcelJS.Row): string => {
                const candidates = ['MONEDA SERVICIO', 'MONEDA PAGO', 'MONEDA PAGO DISTRIBUIDOR', 'MONEDA SERVICIO DIST.', 'MONEDA SERVICIO POLIZA', 'MONEDA DEALER', 'MONEDA RENTA DEALER', 'MONEDA POLIZA'];
                for (const cand of candidates) {
                    const val = getVal(row, cand);
                    if (val && !esNoAplica(val)) return val.trim().substring(0, 20);
                }
                const moneda = getVal(row, 'MONEDA');
                return moneda && !esNoAplica(moneda) ? moneda.trim().substring(0, 20) : 'MXN';
            };

            const parseCurrency = (valStr: string | null | undefined): number | null => {
                if (!valStr) return null;
                let clean = valStr.trim().replace(/[$'\s]/g, '');
                if (!clean) return null;

                const hasDot = clean.includes('.');
                const hasComma = clean.includes(',');

                if (hasDot && hasComma) {
                    const firstDot = clean.indexOf('.');
                    const firstComma = clean.indexOf(',');
                    if (firstDot < firstComma) {
                        // Spanish format: 22.462,00 -> 22462.00
                        clean = clean.replace(/\./g, '').replace(/,/g, '.');
                    } else {
                        // English format: 22,462.00 -> 22462.00
                        clean = clean.replace(/,/g, '');
                    }
                } else if (hasComma) {
                    // Only comma exists: e.g. 22462,00 or 22,462
                    const parts = clean.split(',');
                    if (parts.length === 2 && parts[1].length <= 2) {
                        clean = clean.replace(/,/g, '.');
                    } else {
                        clean = clean.replace(/,/g, '');
                    }
                } else if (hasDot) {
                    // Only dot exists: e.g. 22.462 or 22462.00
                    const parts = clean.split('.');
                    if (parts.length === 2 && parts[1].length === 3) {
                        clean = clean.replace(/\./g, '');
                    }
                }

                clean = clean.replace(/[^0-9.-]/g, '');
                const parsed = parseFloat(clean);
                return isNaN(parsed) ? null : parsed;
            };

            // === VALIDACIÓN DE COLUMNAS OBLIGATORIAS ===
            // Si el documento no trae todas las columnas requeridas, no se permite subir.
            const headersCargados = headers.filter((h): h is string => !!h && h.trim() !== '');
            const columnasFaltantes: string[] = [];
            for (const req of COLUMNAS_REQUERIDAS) {
                const existe = req.candidatos.some(c => headersCargados.includes(c));
                if (!existe) columnasFaltantes.push(req.nombre);
            }
            if (columnasFaltantes.length > 0) {
                this.logger.warn(`Carga masiva rechazada: faltan columnas [${columnasFaltantes.join(', ')}]`);
                throw new HttpException(
                    `El documento no contiene todas las columnas requeridas del archivo maestro. Faltan: ${columnasFaltantes.join(', ')}. Revisa el archivo y vuelve a intentarlo.`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            // === VALIDACIÓN DE TIPOS DE EQUIPO ===
            // La carga masiva NUNCA crea tipos nuevos: si el TIPO no coincide con el
            // catálogo oficial (o un alias conocido), se informa y NO se sube nada.
            const tipoColumnIdx = headers.findIndex(h => h === 'TIPO');
            const serieColumnCandidates = ['SERIE', 'S/N', 'SN', 'NÚMERO DE SERIE', 'NUMERO DE SERIE', 'NO SERIE', 'NO. SERIE', 'SERIE EQUIPO', 'NUMERO SERIE DEL EQUIPO'];
            const tiposInvalidos: { fila: number; serie: string; tipo: string }[] = [];
            for (let rowNumber = headerRowIndex + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
                const row = worksheet.getRow(rowNumber);
                let hasData = false;
                row.eachCell({ includeEmpty: false }, (cell: any) => {
                    if (cell.value && cell.value.toString().trim() !== '') hasData = true;
                });
                if (!hasData) continue;

                let serie = '';
                for (const cand of serieColumnCandidates) {
                    const idx = headers.findIndex(h => h === cand);
                    if (idx > 0) {
                        const v = extractCellValue(row.getCell(idx));
                        if (v) { serie = v; break; }
                    }
                }
                const tipoRaw = tipoColumnIdx > 0 ? extractCellValue(row.getCell(tipoColumnIdx)) : null;
                if (serie && tipoRaw && !normalizeTipo(tipoRaw)) {
                    tiposInvalidos.push({ fila: rowNumber, serie, tipo: tipoRaw });
                }
            }
            if (tiposInvalidos.length > 0) {
                this.logger.warn(`Carga masiva rechazada: ${tiposInvalidos.length} fila(s) con tipo de equipo desconocido.`);
                const muestra = tiposInvalidos.slice(0, 15).map(t => `fila ${t.fila} (serie ${t.serie}): "${t.tipo}"`).join('; ');
                const resto = tiposInvalidos.length > 15 ? ` ... y ${tiposInvalidos.length - 15} más.` : '';
                throw new HttpException(
                    `La carga fue rechazada: ${tiposInvalidos.length} fila(s) traen un TIPO de equipo que no existe en el catálogo y no se pueden crear tipos nuevos. Se encontró: ${muestra}${resto}`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            // Caches en memoria
            const clienteCache = new Map<string, any>();
            const sitioCache = new Map<string, any>();
            const activoCache = new Map<string, any>();
            const rentaCache = new Map<string, any>();
            const ordenesMensualesSet = new Set<string>();

            let clientesNuevos = 0;
            let sitiosNuevos = 0;

            // PROCESAR DIRECTORIO SI EXISTE
            const candDistContactoNombre = [
                'CONTACTO DEL DISTRIBUIDOR', 'CONTACTO DE DISTRIBUIDOR', 'CONTACTO DISTRIBUIDOR', 'CONTACTO DIST',
                'CONTACTO TECNICO DEL DISTRIBUIDOR', 'CONTACTO TÉCNICO DEL DISTRIBUIDOR',
                'CONTACTO TECNICO', 'CONTACTO TÉCNICO', 'CONTACTO DEALER', 'CONTACTO DEL DEALER',
                'PERSONA DEALER', 'RESPONSABLE DEALER', 'TECNICO DEALER', 'TÉCNICO DEALER',
                'TECNICO', 'TÉCNICO', 'ASESOR DEALER', 'ASESOR TECNICO', 'ASESOR TÉCNICO',
                'NOMBRE DEL CONTACTO', 'NOMBRE CONTACTO DISTRIBUIDOR', 'NOMBRE CONTACTO', 'CONTACTO'
            ];
            const candDistContactoTel = [
                'TEL DEL CONTACTO DEL DISTRIBUIDOR', 'TEL. DEL CONTACTO DEL DISTRIBUIDOR', 'TELEFONO DEL CONTACTO DEL DISTRIBUIDOR', 'TELÉFONO DEL CONTACTO DEL DISTRIBUIDOR',
                'TELEFONO DISTRIBUIDOR', 'TELÉFONO DISTRIBUIDOR', 'TEL DISTRIBUIDOR', 'TEL. DISTRIBUIDOR',
                'TELEFONO DEALER', 'TELÉFONO DEALER', 'TEL DEALER', 'TEL. DEALER',
                'TELEFONO TECNICO', 'TELÉFONO TÉCNICO', 'TEL TECNICO', 'TEL. TECNICO',
                'TEL CONTACTO', 'TELEFONO CONTACTO', 'TELÉFONO CONTACTO', 'TELÉFONO', 'TELEFONO', 'TEL'
            ];
            const candDistContactoMail = [
                'MAIL DEL CONTACTO DEL DISTRIBUIDOR', 'CORREO DEL CONTACTO DEL DISTRIBUIDOR', 'EMAIL DEL CONTACTO DEL DISTRIBUIDOR',
                'CORREO DISTRIBUIDOR', 'EMAIL DISTRIBUIDOR', 'MAIL DISTRIBUIDOR',
                'CORREO DEALER', 'EMAIL DEALER', 'MAIL DEALER',
                'CORREO TECNICO', 'EMAIL TECNICO', 'MAIL TECNICO', 'CORREO TÉCNICO', 'EMAIL TÉCNICO', 'MAIL TÉCNICO',
                'MAIL CONTACTO', 'CORREO CONTACTO', 'EMAIL CONTACTO', 'MAIL', 'CORREO', 'EMAIL'
            ];
            const candDistSucursal = [
                'SUCURSAL', 'SUCURSAL DISTRIBUIDOR', 'SUCURSAL DEALER', 'AGENCIA', 'PLAZA'
            ];

            const directorioSheet = workbook.worksheets.find(ws => ws.name.toUpperCase().includes('DIRECTORIO'));
            if (directorioSheet) {
                this.logger.log('Hoja de Directorio detectada, pre-cargando clientes y sitios...');
                
                // Buscar la fila de encabezados
                let dirHeaderRowIndex = 1;
                let dirBestMatchCount = 0;
                
                for (let i = 1; i <= 10; i++) {
                    const row = directorioSheet.getRow(i);
                    const matchedSet = new Set<string>();
                    row.eachCell({ includeEmpty: false }, (cell) => {
                        const val = cell.value?.toString().toUpperCase() || '';
                        if (val.includes('CLIENTE')) matchedSet.add('CLIENTE');
                        if (val.includes('SITE') || val.includes('SITIO')) matchedSet.add('SITE');
                        if (val.includes('RFC')) matchedSet.add('RFC');
                        if (val.includes('MAIL') || val.includes('CORREO')) matchedSet.add('MAIL');
                        if (val.includes('TELÉFONO') || val.includes('TELEFONO')) matchedSet.add('TELEFONO');
                        if (val.includes('RAZÓN SOCIAL') || val.includes('RAZON SOCIAL')) matchedSet.add('RAZON SOCIAL');
                    });
                    const matchCount = matchedSet.size;
                    if (matchCount > dirBestMatchCount) {
                        dirBestMatchCount = matchCount;
                        dirHeaderRowIndex = i;
                    }
                }

                const dirHeaders: string[] = [];
                directorioSheet.getRow(dirHeaderRowIndex).eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    dirHeaders[colNumber] = (cell.value?.toString() || '').trim().toUpperCase().replace(/\s+/g, ' ');
                });

                const getDirVal = (row: ExcelJS.Row, candidates: string | string[], excludeWords: string[] = []): string | null => {
                    const candArray = Array.isArray(candidates) ? candidates : [candidates];
                    return getStrictColVal(row, dirHeaders, candArray, excludeWords);
                };

                let dirConsecutiveEmpty = 0;
                for (let i = dirHeaderRowIndex + 1; i <= directorioSheet.rowCount; i++) {
                    const row = directorioSheet.getRow(i);
                    let hasData = false;
                    row.eachCell({ includeEmpty: false }, (cell) => { 
                        if (cell.value && cell.value.toString().trim() !== '') {
                            hasData = true;
                        }
                    });
                    
                    if (!hasData) {
                        dirConsecutiveEmpty++;
                        if (dirConsecutiveEmpty >= 20) {
                            this.logger.log('Se detectaron 20 filas sin datos consecutivas en el Directorio, terminando lectura.');
                            break;
                        }
                        continue;
                    }
                    dirConsecutiveEmpty = 0;

                    const clientName = getDirVal(row, ['CLIENTE', 'RAZON SOCIAL', 'RAZÓN SOCIAL', 'NOMBRE CLIENTE', 'CUENTA']);
                    const siteName = getDirVal(row, ['SITIO', 'SITE', 'SUCURSAL', 'TIENDA']);
                    
                    if (clientName) {
                        const rfc = getDirVal(row, ['RFC', 'R.F.C.', 'RFC CLIENTE']);
                        // Correo del CLIENTE (excluyendo dealer, distribuidor, adc, tecnico)
                        const correoCliente = getDirVal(row, ['CORREO CLIENTE', 'EMAIL CLIENTE', 'MAIL CLIENTE', 'CORREO FACTURACION', 'CORREO', 'EMAIL', 'MAIL'], ['DISTRIBUIDOR', 'DEALER', 'ADC', 'RESPONSABLE', 'TECNICO']);
                        const telefonoCliente = getDirVal(row, ['TELEFONO CLIENTE', 'TELÉFONO CLIENTE', 'TEL CLIENTE', 'TELEFONO', 'TELÉFONO'], ['DISTRIBUIDOR', 'DEALER', 'ADC', 'RESPONSABLE', 'TECNICO']);
                        const contactoCliente = getDirVal(row, ['CONTACTO CLIENTE', 'ATENCION', 'ATENCIÓN', 'CONTACTO DE CLIENTE', 'CONTACTO'], ['DISTRIBUIDOR', 'DEALER', 'ADC', 'RESPONSABLE', 'TECNICO']);
                        const direccionCliente = getDirVal(row, ['DIRECCION CLIENTE', 'DIRECCIÓN CLIENTE', 'DOMICILIO FISCAL', 'DIRECCION FISCAL', 'DOMICILIO CLIENTE']);

                        let cliente = clienteCache.get(normalizeClientName(clientName));
                        if (!cliente) {
                            // Búsqueda fuzzy: traemos todos y comparamos normalizado
                            const allClientes = await db.cliente.findMany({ select: { id: true, razon_social: true, rfc: true, datos_comerciales: true } });
                            const normalizedInput = normalizeClientName(clientName);
                            cliente = allClientes.find(c => normalizeClientName(c.razon_social) === normalizedInput) || null;
                            if (!cliente) {
                                cliente = await db.cliente.create({ 
                                    data: { 
                                        razon_social: clientName,
                                        rfc: rfc,
                                        datos_comerciales: {
                                            correo: correoCliente,
                                            telefono: telefonoCliente,
                                            contacto: contactoCliente,
                                            direccion: direccionCliente
                                        }
                                    } 
                                });
                                clientesNuevos++;
                            } else {
                                // Update existing client if it was missing these fields
                                cliente = await db.cliente.update({
                                    where: { id: cliente.id },
                                    data: {
                                        rfc: rfc || cliente.rfc,
                                        datos_comerciales: {
                                            correo: correoCliente || (cliente.datos_comerciales as any)?.correo,
                                            telefono: telefonoCliente || (cliente.datos_comerciales as any)?.telefono,
                                            contacto: contactoCliente || (cliente.datos_comerciales as any)?.contacto,
                                            direccion: direccionCliente || (cliente.datos_comerciales as any)?.direccion
                                        }
                                    }
                                });
                            }
                            clienteCache.set(normalizeClientName(clientName), cliente);
                        }
                        
                        if (siteName) {
                            const region = getDirVal(row, ['REGION', 'REGIÓN']);
                            const responsable = normalizeADCName(getDirVal(row, ['RESPONSABLE', 'ADC', 'EJECUTIVO ADC', 'EJECUTIVO']));
                            const distribuidor = getDirVal(row, ['DISTRIBUIDOR', 'DISTRIBUIDOR AUTORIZADO', 'DEALER', 'DEALER ASIGNADO', 'AGENCIA', 'PROVEEDOR']);
                            const sucursal = getDirVal(row, candDistSucursal);
                            const contactoNombre = getDirVal(row, candDistContactoNombre);
                            const contactoTelefono = getDirVal(row, candDistContactoTel);
                            const contactoCorreo = getDirVal(row, candDistContactoMail);
                            
                            const adcCorreo = getDirVal(row, ['CORREO ADC', 'EMAIL ADC', 'MAIL ADC', 'CORREO RESPONSABLE', 'EMAIL RESPONSABLE']);
                            const adcTelefono = getDirVal(row, ['TELEFONO ADC', 'TELÉFONO ADC', 'TEL ADC', 'TELEFONO RESPONSABLE', 'TELÉFONO RESPONSABLE']);
                            const distribuidorDireccion = getDirVal(row, ['DIRECCION DISTRIBUIDOR', 'DIRECCIÓN DISTRIBUIDOR', 'DIRECCION DEALER', 'DIRECCIÓN DEALER', 'DOMICILIO DISTRIBUIDOR']);
                            const adcDireccion = getDirVal(row, ['DIRECCION ADC', 'DIRECCIÓN ADC']);
                            const cuentaDir = getDirVal(row, ['CUENTA', 'NO. CUENTA', 'NUMERO CUENTA']);

                            const sitioData = {
                                cliente_id: cliente.id,
                                nombre: siteName,
                                direccion: getDirVal(row, ['DIRECCION', 'DIRECCIÓN', 'CALLE', 'CALLE Y NUMERO', 'DOMICILIO', 'DIRECCION SITIO']),
                                distribuidor: distribuidor || null,
                                adc: responsable || null,
                                cuenta: cuentaDir || null,
                                contacto_operativo: {
                                    ...(region ? { region } : {}),
                                    ...(responsable ? { responsable } : {}),
                                    ...(adcCorreo ? { adc_correo: adcCorreo } : {}),
                                    ...(adcTelefono ? { adc_telefono: adcTelefono } : {}),
                                    ...(adcDireccion ? { adc_direccion: adcDireccion } : {}),
                                    ...(sucursal ? { distribuidor_sucursal: sucursal } : {}),
                                    ...(contactoNombre ? { distribuidor_contacto_nombre: contactoNombre } : {}),
                                    ...(contactoTelefono ? { distribuidor_contacto_telefono: contactoTelefono } : {}),
                                    ...(contactoCorreo ? { distribuidor_contacto_correo: contactoCorreo } : {}),
                                    ...(distribuidorDireccion ? { distribuidor_direccion: distribuidorDireccion } : {})
                                }
                            };

                            const cacheKey1 = `${cliente.id}::${normalizeClientName(siteName)}`;
                            const cacheKey2 = `${cliente.id}::${siteName.trim()}`;
                            let sitio = sitioCache.get(cacheKey1) || sitioCache.get(cacheKey2);

                            if (!sitio) {
                                sitio = await db.sitio.findFirst({ where: { cliente_id: cliente.id, nombre: siteName } });
                                if (!sitio) {
                                    sitio = await db.sitio.create({ data: sitioData });
                                    sitiosNuevos++;
                                } else {
                                    const mergedContacto = {
                                        ...((sitio.contacto_operativo as any) || {}),
                                        ...sitioData.contacto_operativo
                                    };
                                    sitio = await db.sitio.update({
                                        where: { id: sitio.id },
                                        data: {
                                            ...(sitioData.direccion ? { direccion: sitioData.direccion } : {}),
                                            ...(sitioData.distribuidor ? { distribuidor: sitioData.distribuidor } : {}),
                                            ...(sitioData.adc ? { adc: sitioData.adc } : {}),
                                            ...(sitioData.cuenta ? { cuenta: sitioData.cuenta } : {}),
                                            contacto_operativo: mergedContacto
                                        }
                                    });
                                }
                            } else {
                                const mergedContacto = {
                                    ...((sitio.contacto_operativo as any) || {}),
                                    ...sitioData.contacto_operativo
                                };
                                sitio = await db.sitio.update({
                                    where: { id: sitio.id },
                                    data: {
                                        ...(sitioData.direccion ? { direccion: sitioData.direccion } : {}),
                                        ...(sitioData.adc ? { adc: sitioData.adc } : {}),
                                        ...(sitioData.distribuidor ? { distribuidor: sitioData.distribuidor } : {}),
                                        ...(sitioData.cuenta ? { cuenta: sitioData.cuenta } : {}),
                                        contacto_operativo: mergedContacto
                                    }
                                });
                            }
                            sitioCache.set(cacheKey1, sitio);
                            sitioCache.set(cacheKey2, sitio);
                        }
                    }
                }
            }

            // Precarga de la base de datos para identificar órdenes existentes
            const existentesOrdenes = await db.ordenMensual.findMany({ 
                select: { id: true, activo_id: true, periodo: true, po: true, tarifa: true, moneda: true, condiciones: true } 
            });
            const existingOrdersMap = new Map<string, any>();
            existentesOrdenes.forEach(o => {
                existingOrdersMap.set(`M::${o.activo_id}::${o.periodo}`, o);
                existingOrdersMap.set(`B::${o.activo_id}::${o.periodo}::${o.po || ''}`, o);
            });

            const ordenesMensualesParaInsertar: any[] = [];
            const ordenesMensualesParaActualizar: any[] = [];
            const seenOrderKeysInFile = new Set<string>();

            let processed = 0;
            let errors = 0;
            let rentasCreadas = 0;
            const errorDetails: string[] = [];
            const acciones: any[] = [];
            const seenSeriesMap = new Map<string, { rows: number[]; clientes: Set<string>; modelos: Set<string>; adcs: Set<string> }>();
            const aditamentoCountMap = new Map<string, number>();

            this.logger.log('Iniciando procesamiento de filas...');
            let consecutiveEmpty = 0;

            for (let rowNumber = headerRowIndex + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
                const row = worksheet.getRow(rowNumber);

                let hasData = false;
                row.eachCell({ includeEmpty: false }, (cell) => { 
                    if (cell.value && cell.value.toString().trim() !== '') {
                        hasData = true;
                    }
                });
                
                if (!hasData) {
                    consecutiveEmpty++;
                    if (consecutiveEmpty >= 20) {
                        this.logger.log(`Se detectaron 20 filas sin datos consecutivas a partir de la fila ${rowNumber - 20}, terminando procesamiento.`);
                        break;
                    }
                    continue;
                }
                
                consecutiveEmpty = 0;

                try {
                    const clienteName = getStrictColVal(row, headers, ['CLIENTE', 'RAZON SOCIAL', 'RAZÓN SOCIAL', 'CLIENTE / RAZÓN SOCIAL', 'CUENTA']);
                    const serie = normalizeSerie(getStrictColVal(row, headers, ['SERIE', 'NÚMERO DE SERIE', 'NUMERO DE SERIE', 'NO. SERIE', 'SERIE EQUIPO', 'S/N', 'SN']));

                    if (!clienteName || !serie) {
                        // Se omite el logger para no saturar la consola en caso de filas mal formateadas
                        continue;
                    }

                    const rawTipo = getVal(row, 'TIPO');
                    const rawClase = getVal(row, 'CLASE');
                    const rawModelo = getVal(row, 'MODELO');

                    // Regla de Aditamentos / Accesorios: si no tienen serie única de fábrica y repiten nombre en Excel,
                    // se genera un identificador correlativo (ej. "IS-3-21 #2") para que se guarden como activos independientes.
                    let effectiveSerie = serie;
                    const isAdit = isAditamentoOrAccesorio(rawTipo, rawClase, rawModelo, serie);
                    if (isAdit) {
                        const count = (aditamentoCountMap.get(serie) || 0) + 1;
                        aditamentoCountMap.set(serie, count);
                        if (count > 1) {
                            effectiveSerie = `${serie} #${count}`;
                        }
                    }

                    const rawRowAdc = getStrictColVal(row, headers, ['RESPONSABLE', 'ADC', 'EJECUTIVO ADC', 'EJECUTIVO']);
                    const adc = normalizeADCName(rawRowAdc);
                    
                    // CARGA PARCIAL: si se especificó un ADC filter, ignorar filas de otros ADCs
                    if (adcFilter) {
                        const normRowAdc = (adc || '').toLowerCase().trim();
                        const normFilter = normalizeADCName(adcFilter)?.toLowerCase().trim() || adcFilter.toLowerCase().trim();
                        if (normRowAdc && normFilter && normRowAdc !== normFilter && !normRowAdc.includes(normFilter) && !normFilter.includes(normRowAdc)) {
                            this.logger.log(`Fila ${rowNumber}: ADC "${adc}" omitido (carga parcial para "${adcFilter}")`);
                            continue;
                        }
                    }

                    // Registrar serie para conteo de únicos y detección de duplicados
                    if (!seenSeriesMap.has(effectiveSerie)) {
                        seenSeriesMap.set(effectiveSerie, {
                            rows: [rowNumber],
                            clientes: new Set([clienteName]),
                            modelos: new Set([rawModelo || '-']),
                            adcs: new Set([adc || 'Sin ADC']),
                        });
                    } else {
                        const entry = seenSeriesMap.get(effectiveSerie)!;
                        entry.rows.push(rowNumber);
                        if (clienteName) entry.clientes.add(clienteName);
                        if (rawModelo) entry.modelos.add(rawModelo);
                        if (adc) entry.adcs.add(adc);
                    }

                    // A: CLIENTE (con búsqueda fuzzy para evitar duplicados como "MERCADO LIBRE" vs "MERCADOLIBRE")
                    let cliente = clienteCache.get(normalizeClientName(clienteName));
                    if (!cliente) {
                        const allClientes = await db.cliente.findMany({ select: { id: true, razon_social: true, rfc: true, datos_comerciales: true } });
                        const normalizedInput = normalizeClientName(clienteName);
                        cliente = allClientes.find(c => normalizeClientName(c.razon_social) === normalizedInput) || null;
                        const rfc = getStrictColVal(row, headers, ['RFC', 'RFC CLIENTE', 'R.F.C.']);
                        const correoCliente = getStrictColVal(row, headers, ['CORREO CLIENTE', 'MAIL CLIENTE', 'EMAIL CLIENTE', 'CORREO FACTURACION'], ['DISTRIBUIDOR', 'DEALER', 'ADC', 'RESPONSABLE', 'TECNICO']);
                        const telefonoCliente = getStrictColVal(row, headers, ['TELEFONO CLIENTE', 'TELÉFONO CLIENTE', 'TEL CLIENTE'], ['DISTRIBUIDOR', 'DEALER', 'ADC', 'RESPONSABLE', 'TECNICO']);
                        const direccionCliente = getStrictColVal(row, headers, ['DIRECCION CLIENTE', 'DIRECCIÓN CLIENTE', 'DOMICILIO FISCAL', 'DOMICILIO CLIENTE']);
                        const contactoCliente = getStrictColVal(row, headers, ['CONTACTO CLIENTE', 'CONTACTO_CLIENTE', 'ATENCION', 'ATENCIÓN'], ['DISTRIBUIDOR', 'DEALER', 'ADC', 'RESPONSABLE', 'TECNICO']);

                        if (!cliente) {
                            cliente = await db.cliente.create({
                                data: {
                                    razon_social: clienteName,
                                    codigo_cliente: `CLI-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
                                    estado: 'ACTIVO',
                                    rfc: rfc,
                                    datos_comerciales: {
                                        correo: correoCliente,
                                        telefono: telefonoCliente,
                                        direccion: direccionCliente,
                                        contacto: contactoCliente
                                    }
                                },
                            });
                            clientesNuevos++;
                        } else {
                            cliente = await db.cliente.update({
                                where: { id: cliente.id },
                                data: {
                                    rfc: rfc || cliente.rfc,
                                    datos_comerciales: {
                                        correo: correoCliente || (cliente.datos_comerciales as any)?.correo,
                                        telefono: telefonoCliente || (cliente.datos_comerciales as any)?.telefono,
                                        direccion: direccionCliente || (cliente.datos_comerciales as any)?.direccion,
                                        contacto: contactoCliente || (cliente.datos_comerciales as any)?.contacto
                                    }
                                }
                            });
                        }
                        clienteCache.set(normalizeClientName(clienteName), cliente);
                    }

                    // B: SITIO
                    const sitioName = getStrictColVal(row, headers, ['SITE', 'SITIO', 'SUCURSAL', 'TIENDA']) || 'Sin Sitio';
                    const sitioCacheKey1 = `${cliente.id}::${normalizeClientName(sitioName)}`;
                    const sitioCacheKey2 = `${cliente.id}::${sitioName.trim()}`;
                    let sitio = sitioCache.get(sitioCacheKey1) || sitioCache.get(sitioCacheKey2);
                    
                    const distribuidor = getStrictColVal(row, headers, ['DISTRIBUIDOR', 'DISTRIBUIDOR AUTORIZADO', 'DEALER', 'DEALER ASIGNADO', 'AGENCIA', 'PROVEEDOR']);
                    
                    const mainContactoNombre = getStrictColVal(row, headers, candDistContactoNombre);
                    const mainContactoCorreo = getStrictColVal(row, headers, candDistContactoMail);
                    const mainContactoTel = getStrictColVal(row, headers, candDistContactoTel);
                    const mainAdcCorreo = getStrictColVal(row, headers, ['CORREO ADC', 'MAIL ADC', 'EMAIL ADC', 'CORREO RESPONSABLE']);
                    const mainAdcTel = getStrictColVal(row, headers, ['TELEFONO ADC', 'TELÉFONO ADC', 'TELEFONO RESPONSABLE']);
                    const mainAdcDir = getStrictColVal(row, headers, ['DIRECCION ADC', 'DIRECCIÓN ADC']);
                    const mainDistDir = getStrictColVal(row, headers, ['DIRECCION DISTRIBUIDOR', 'DIRECCIÓN DISTRIBUIDOR', 'DIRECCION DEALER', 'DIRECCIÓN DEALER', 'DOMICILIO DISTRIBUIDOR']);
                    const mainCiudad = getStrictColVal(row, headers, ['MUNICIPIO', 'CIUDAD', 'PLAZA']);
                    const mainDireccion = getStrictColVal(row, headers, ['DIRECCION', 'DIRECCIÓN', 'CALLE', 'CALLE Y NUMERO', 'DOMICILIO', 'DIRECCION SITIO']);
                    const mainCuenta = getStrictColVal(row, headers, ['CUENTA', 'NO. CUENTA', 'NUMERO CUENTA']);

                    if (!sitio) {
                        sitio = await db.sitio.findFirst({
                            where: { cliente_id: cliente.id, nombre: sitioName },
                        });
                        
                        if (!sitio) {
                            sitio = await db.sitio.create({
                                data: {
                                    cliente_id: cliente.id,
                                    nombre: sitioName,
                                    ciudad: mainCiudad,
                                    direccion: mainDireccion,
                                    cuenta: mainCuenta,
                                    adc: adc,
                                    distribuidor: distribuidor,
                                    contacto_operativo: {
                                        ...(mainAdcCorreo ? { adc_correo: mainAdcCorreo } : {}),
                                        ...(mainAdcTel ? { adc_telefono: mainAdcTel } : {}),
                                        ...(mainAdcDir ? { adc_direccion: mainAdcDir } : {}),
                                        ...(mainContactoNombre ? { distribuidor_contacto_nombre: mainContactoNombre } : {}),
                                        ...(mainContactoCorreo ? { distribuidor_contacto_correo: mainContactoCorreo } : {}),
                                        ...(mainContactoTel ? { distribuidor_contacto_telefono: mainContactoTel } : {}),
                                        ...(mainDistDir ? { distribuidor_direccion: mainDistDir } : {}),
                                    }
                                },
                            });
                            sitiosNuevos++;
                        } else {
                            // Update existing site
                            sitio = await db.sitio.update({
                                where: { id: sitio.id },
                                data: {
                                    ciudad: mainCiudad || sitio.ciudad,
                                    direccion: mainDireccion || sitio.direccion,
                                    cuenta: mainCuenta || sitio.cuenta,
                                    adc: adc || sitio.adc,
                                    distribuidor: distribuidor || sitio.distribuidor,
                                    contacto_operativo: {
                                        ...((sitio.contacto_operativo as any) || {}),
                                        ...(mainAdcCorreo ? { adc_correo: mainAdcCorreo } : {}),
                                        ...(mainAdcTel ? { adc_telefono: mainAdcTel } : {}),
                                        ...(mainAdcDir ? { adc_direccion: mainAdcDir } : {}),
                                        ...(mainContactoNombre ? { distribuidor_contacto_nombre: mainContactoNombre } : {}),
                                        ...(mainContactoCorreo ? { distribuidor_contacto_correo: mainContactoCorreo } : {}),
                                        ...(mainContactoTel ? { distribuidor_contacto_telefono: mainContactoTel } : {}),
                                        ...(mainDistDir ? { distribuidor_direccion: mainDistDir } : {}),
                                    }
                                }
                            });
                        }
                    } else {
                        // Site was found in cache (e.g. from Directorio): ONLY update non-empty fields and MERGE contacto_operativo
                        const existingContacto = (sitio.contacto_operativo as any) || {};
                        const mergedContacto = {
                            ...existingContacto,
                            ...(mainAdcCorreo ? { adc_correo: mainAdcCorreo } : {}),
                            ...(mainAdcTel ? { adc_telefono: mainAdcTel } : {}),
                            ...(mainAdcDir ? { adc_direccion: mainAdcDir } : {}),
                            ...(mainContactoNombre ? { distribuidor_contacto_nombre: mainContactoNombre } : {}),
                            ...(mainContactoCorreo ? { distribuidor_contacto_correo: mainContactoCorreo } : {}),
                            ...(mainContactoTel ? { distribuidor_contacto_telefono: mainContactoTel } : {}),
                            ...(mainDistDir ? { distribuidor_direccion: mainDistDir } : {}),
                        };
                        const updateData: any = { contacto_operativo: mergedContacto };
                        if (mainCiudad) updateData.ciudad = mainCiudad;
                        if (mainDireccion && (!sitio.direccion || sitio.direccion === '-')) updateData.direccion = mainDireccion;
                        if (mainCuenta) updateData.cuenta = mainCuenta;
                        if (adc) updateData.adc = adc;
                        if (distribuidor) updateData.distribuidor = distribuidor;

                        sitio = await db.sitio.update({ where: { id: sitio.id }, data: updateData });
                    }
                    sitioCache.set(sitioCacheKey1, sitio);
                    sitioCache.set(sitioCacheKey2, sitio);

                    // C: ACTIVO
                    let activo = activoCache.get(effectiveSerie);
                    if (!activo) {
                        // IMPORTANTE: `id` NO debe ir en `update` del upsert — el cliente Prisma de MySQL
                        // lo degrada a updateMany y devuelve {count} sin el registro (activo.id queda undefined).
                        const activoData = {
                            tipo: normalizeTipo(rawTipo),
                            clase: rawClase?.substring(0, 100) || null,
                            modelo: rawModelo?.substring(0, 100) || null,
                            oach: getVal(row, 'OACH')?.substring(0, 100) || null,
                            altura: getVal(row, 'ALTURA')?.substring(0, 50) || null,
                            bc: getVal(row, 'BC')?.substring(0, 50) || null,
                            estatus: getVal(row, 'ESTATUS')?.substring(0, 100) || 'Activo',
                            estatus_operativo: getVal(row, 'ESTATUS')?.substring(0, 50) || 'OPERATIVO',
                            cliente_id: cliente.id,
                            sitio_id: sitio.id,
                            cuenta: getVal(row, 'CUENTA')?.substring(0, 100) || null,
                            adc: normalizeADCName(getVal(row, 'RESPONSABLE') || getVal(row, 'ADC'))?.substring(0, 100) || null,
                            distribuidor: getVal(row, 'DISTRIBUIDOR')?.substring(0, 100) || null,
                            propietario: getVal(row, 'PROPIETARIO')?.substring(0, 100) || null,
                            info_tecnica: {
                                iwarehouse: getVal(row, 'IWAREHOUSE S/N') || getVal(row, 'IWAREHOUSE') || null
                            },
                        };
                        activo = await db.activo.upsert({
                            where: { id: effectiveSerie },
                            update: activoData,
                            create: { id: effectiveSerie.substring(0, 50), serie: effectiveSerie, ...activoData },
                        });
                        if (!activo || activo.id === undefined) {
                            activo = await db.activo.findUnique({ where: { id: effectiveSerie } });
                        }
                        activoCache.set(effectiveSerie, activo);
                    }

                    // D: RENTA
                    let renta = rentaCache.get(activo.id);
                    const tarifaStr = getVal(row, 'PRECIO RENTA CLIENTE') || getVal(row, 'RENTA') || getVal(row, 'TARIFA');
                    const tarifaParsed = parseCurrency(tarifaStr);

                    const codRentaCli = getVal(row, 'CÓD RENTA CLI') || getVal(row, 'COD RENTA CLI') || `RENTA-${effectiveSerie}`;
                    const rowMoneda = getVal(row, 'MONEDA') || 'MXN';
                    const monedaPagoDistribuidor = getMonedaPagoDistribuidor(row);
                    const tipoPoliza = getVal(row, 'CFPM / SMP') || 'SMP';
                    const costoPolizaServicio = parseCurrency(
                        getVal(row, 'COSTO POLIZA') || getVal(row, 'COSTO PÓLIZA') || getVal(row, 'COSTO SMP DIST.') || getVal(row, 'COSTO SERVICIO')
                    );
                    const plazoMeses = parseCurrency(getVal(row, 'PLAZO') || getVal(row, 'PLAZO DE RENTA (MESES)'));
                    const defaultFin = new Date();
                    defaultFin.setFullYear(defaultFin.getFullYear() + 1);
                    const fechaInicio = getDateVal(row, FECHA_INICIO_CANDIDATES, new Date());
                    const fechaVencimientoDoc = getDateVal(row, FECHA_VENCIMIENTO_CANDIDATES, null);
                    // Regla corregida: si el archivo trae vencimiento válido se usa; si no,
                    // se calcula fecha_inicio + plazo_meses; solo como última red hoy + 1 año.
                    const fechaFin = fechaVencimientoDoc
                        || (plazoMeses ? addMeses(fechaInicio, plazoMeses) : defaultFin);

                    const tieneInfoRenta =
                        (tarifaParsed !== null && !isNaN(tarifaParsed))
                        || !!fechaVencimientoDoc
                        || !!plazoMeses
                        || !!costoPolizaServicio
                        || rowMoneda !== 'MXN'
                        || activeMonths.some(({ name }) => {
                            return !!(getVal(row, `PO ${name}`) || getVal(row, `MONTO ${name}`) || getVal(row, `PEDIDO ${name}`));
                        });

                    if (tieneInfoRenta) {
                        if (!renta) {
                            renta = await db.renta.findFirst({
                                where: { activo_id: activo.id },
                                orderBy: { created_at: 'desc' },
                                include: { cliente: { select: { razon_social: true } }, detalles: true },
                            });
                            rentaCache.set(activo.id, renta);
                        }

                        const condicionesBase = (renta?.condiciones as any) || {};
                        const condicionesNuevas = {
                            ...condicionesBase,
                            moneda: rowMoneda,
                            tipo_poliza: tipoPoliza,
                            plazo_meses: plazoMeses ?? condicionesBase.plazo_meses,
                            costo_poliza_distribuidor: costoPolizaServicio ?? condicionesBase.costo_poliza_distribuidor,
                            moneda_pago_distribuidor: monedaPagoDistribuidor ?? condicionesBase.moneda_pago_distribuidor,
                        };
                        const dataRenta = {
                            cuenta: getVal(row, 'CUENTA'),
                            adc: normalizeADCName(getVal(row, 'RESPONSABLE') || getVal(row, 'ADC')),
                            distribuidor: getVal(row, 'DISTRIBUIDOR'),
                            tarifa: tarifaParsed ?? (renta ? renta.tarifa : tarifaParsed),
                            fecha_inicio: fechaInicio,
                            fecha_fin: fechaFin,
                        };

                        // Caso especial: el activo tiene una renta de OTRO cliente → la anterior pasa a
                        // historial (CANCELADA) y la nueva se crea como la renta actual.
                        const cambioCliente = !!(renta && normalizeClientName(renta.cliente?.razon_social) !== normalizeClientName(clienteName));

                        if (cambioCliente) {
                            const notaCancelacion = `Cancelada por carga masiva el ${new Date().toISOString().split('T')[0]}: sustituida por contrato del cliente "${clienteName}". Permanece en historial.`;
                            await db.renta.update({
                                where: { id: renta.id },
                                data: { estado: 'CANCELADA', comentarios: notaCancelacion },
                            });
                            await db.auditoria.create({
                                data: {
                                    modulo: 'RENTAS',
                                    registro_id: renta.id,
                                    accion: 'CANCELADA_IMPORTACION',
                                    usuario_id: userId,
                                    valor_anterior: { estado: renta.estado, cliente: renta.cliente?.razon_social || null },
                                    valor_nuevo: { estado: 'CANCELADA', cliente_nuevo: clienteName },
                                    observaciones: notaCancelacion,
                                },
                            });
                            acciones.push({ accion: 'CANCELAR_RENTA_HISTORIAL', serie: effectiveSerie, renta_id: renta.id, cliente_anterior: renta.cliente?.razon_social || null, cliente_nuevo: clienteName });

                            const nuevoIdRenta = `${codRentaCli}-${Date.now().toString(36)}`.substring(0, 50);
                            renta = await db.renta.create({
                                data: {
                                    id: nuevoIdRenta,
                                    activo_id: activo.id,
                                    cliente_id: cliente.id,
                                    sitio_id: sitio.id,
                                    ...dataRenta,
                                    estado: 'IMPORTADA',
                                    origen: 'IMPORTADA',
                                    condiciones: condicionesNuevas,
                                    detalles: {
                                        create: {
                                            renta_base: tarifaParsed,
                                            renta_real: tarifaParsed,
                                            moneda: rowMoneda,
                                            tipo_renta: 'MENSUAL',
                                        },
                                    },
                                },
                            });
                            await db.auditoria.create({
                                data: {
                                    modulo: 'RENTAS',
                                    registro_id: renta.id,
                                    accion: 'CREACION_MASIVA',
                                    usuario_id: userId,
                                    valor_anterior: null,
                                    valor_nuevo: { activo_id: activo.id, tarifa: tarifaParsed, cliente: clienteName },
                                    observaciones: `Renta nueva (sustituye a una de cliente distinto) importada masivamente desde Excel`,
                                },
                            });
                            renta = { ...renta, cliente: { razon_social: clienteName } } as any;
                            acciones.push({ accion: 'CREAR_RENTA', serie: effectiveSerie, renta_id: renta.id, cliente: clienteName, fecha_inicio: fechaInicio, fecha_fin: fechaFin, tarifa: tarifaParsed, condiciones: condicionesNuevas, sustituye: true });
                        } else if (renta) {
                            // Existe renta del mismo cliente → actualización completa con el archivo maestro
                            const detallesPrevios = (renta.detalles as any) || null;
                            renta = await db.renta.update({
                                where: { id: renta.id },
                                data: {
                                    cliente_id: cliente.id,
                                    sitio_id: sitio.id,
                                    ...dataRenta,
                                    condiciones: condicionesNuevas,
                                },
                            });
                            await db.detallesRenta.upsert({
                                where: { renta_id: renta.id },
                                update: {
                                    renta_base: tarifaParsed ?? detallesPrevios?.renta_base ?? null,
                                    moneda: rowMoneda,
                                },
                                create: {
                                    renta_id: renta.id,
                                    renta_base: tarifaParsed,
                                    renta_real: tarifaParsed,
                                    moneda: rowMoneda,
                                    tipo_renta: 'MENSUAL',
                                },
                            });
                            renta = { ...renta, cliente: { razon_social: clienteName } } as any;
                            acciones.push({ accion: 'ACTUALIZAR_RENTA', serie: effectiveSerie, renta_id: renta.id, fecha_inicio: fechaInicio, fecha_fin: fechaFin, tarifa: tarifaParsed, condiciones: condicionesNuevas });
                        } else {
                            // No existía renta → se crea la renta actual con los datos del archivo
                            renta = await db.renta.create({
                                data: {
                                    id: codRentaCli,
                                    activo_id: activo.id,
                                    cliente_id: cliente.id,
                                    sitio_id: sitio.id,
                                    ...dataRenta,
                                    estado: 'IMPORTADA',
                                    origen: 'IMPORTADA',
                                    condiciones: condicionesNuevas,
                                    detalles: {
                                        create: {
                                            renta_base: tarifaParsed,
                                            renta_real: tarifaParsed,
                                            moneda: rowMoneda,
                                            tipo_renta: 'MENSUAL',
                                        },
                                    },
                                },
                            });
                            await db.auditoria.create({
                                data: {
                                    modulo: 'RENTAS',
                                    registro_id: renta.id,
                                    accion: 'CREACION_MASIVA',
                                    usuario_id: userId,
                                    valor_anterior: null,
                                    valor_nuevo: { activo_id: activo.id, tarifa: tarifaParsed },
                                    observaciones: `Renta importada masivamente desde Excel`,
                                },
                            });
                            renta = { ...renta, cliente: { razon_social: clienteName } } as any;
                            acciones.push({ accion: 'CREAR_RENTA', serie: effectiveSerie, renta_id: renta.id, cliente: clienteName, fecha_inicio: fechaInicio, fecha_fin: fechaFin, tarifa: tarifaParsed, condiciones: condicionesNuevas });
                        }
                        rentaCache.set(activo.id, renta);

                        // E: ÓRDENES MENSUALES (Acumular en memoria para insertar o actualizar).
                        // Se procesan aunque no se haya podido leer el precio del cliente.
                        const huboReemplazo = cambioCliente;
                        for (const { name: monthName, period } of activeMonths) {
                            const po = getVal(row, `PO ${monthName}`);
                            const monto = getVal(row, `MONTO ${monthName}`);
                            const pedido = getVal(row, `PEDIDO ${monthName}`);

                            if (!po && !monto && !pedido) continue;

                            const isMensual = getVal(row, 'TIPO')?.toLowerCase().trim() === 'mensual';
                            const cacheKeyM = `M::${activo.id}::${period}`;
                            const cacheKeyB = `B::${activo.id}::${period}::${po || ''}`;
                            const dedupKey = isMensual ? cacheKeyM : cacheKeyB;

                            if (seenOrderKeysInFile.has(dedupKey)) {
                                continue;
                            }
                            seenOrderKeysInFile.add(dedupKey);

                            const parsedMonto = parseCurrency(monto);
                            const monedaMes = getVal(row, `MONEDA ${monthName}`);
                            const fechaOc = getVal(row, `FECHA OC ${monthName}`);
                            const fechaPed = getVal(row, `FECHA PED ${monthName}`);
                            // Con cambio de cliente las órdenes del archivo pertenecen a la renta NUEVA:
                            // no se reutilizan las órdenes previas ligadas a la renta cancelada.
                            const existingOrder = huboReemplazo
                                ? null
                                : (existingOrdersMap.get(cacheKeyM) || existingOrdersMap.get(cacheKeyB));

                            // Las columnas mensuales pueden traer "NA" (no aplica) en lugar de un valor real.
                        const orderPo = esNoAplica(po) ? null : po;
                        const orderMoneda = esNoAplica(monedaMes) ? getVal(row, 'MONEDA') : monedaMes;

                        if (existingOrder) {
                                const existingCond = (existingOrder.condiciones as any) || {};
                                const mergedCondiciones = {
                                    ...existingCond,
                                    ...(fechaOc ? { fecha_oc: fechaOc } : {}),
                                    ...(pedido ? { pedido: pedido } : {}),
                                    ...(fechaPed ? { fecha_ped: fechaPed } : {}),
                                    ...(getVal(row, `APLICA SMP ${monthName}`) ? { aplica_smp: getVal(row, `APLICA SMP ${monthName}`) } : {}),
                                    ...(getVal(row, `REALIZADO ${monthName}`) ? { realizado: getVal(row, `REALIZADO ${monthName}`) } : {}),
                                    ...(getVal(row, `COMENTARIOS ${monthName}`) ? { comentarios: getVal(row, `COMENTARIOS ${monthName}`) } : {}),
                                };

                                ordenesMensualesParaActualizar.push({
                                    id: existingOrder.id,
                                    po: (orderPo || existingOrder.po || 'IMPORTADA'),
                                    tarifa: (!isNaN(parsedMonto as any) && parsedMonto !== null ? parsedMonto : existingOrder.tarifa),
                                    moneda: (orderMoneda || existingOrder.moneda || 'MXN').toString().substring(0, 20),
                                    condiciones: mergedCondiciones
                                });
                                acciones.push({ accion: 'ACTUALIZAR_ORDEN', serie: effectiveSerie, periodo: period, po: orderPo || existingOrder.po, tarifa: parsedMonto, moneda: orderMoneda });
                            } else {
                                const condicionesOrdenNuevas: any = {
                                    fecha_oc: fechaOc || null,
                                    pedido: pedido || null,
                                    fecha_ped: fechaPed || null,
                                    aplica_smp: getVal(row, `APLICA SMP ${monthName}`) || null,
                                    realizado: getVal(row, `REALIZADO ${monthName}`) || null,
                                    comentarios: getVal(row, `COMENTARIOS ${monthName}`) || null,
                                };

                                ordenesMensualesParaInsertar.push({
                                    cliente_id: cliente.id,
                                    renta_id: renta.id,
                                    activo_id: activo.id,
                                    periodo: period,
                                    po: orderPo || 'IMPORTADA',
                                    tarifa: (!isNaN(parsedMonto as any) ? parsedMonto : null),
                                    moneda: (orderMoneda || 'MXN').toString().substring(0, 20),
                                    estado: 'IMPORTADA',
                                    condiciones: condicionesOrdenNuevas,
                                });
                                rentasCreadas++;
                                acciones.push({ accion: 'INSERTAR_ORDEN', serie: effectiveSerie, periodo: period, po: orderPo || 'IMPORTADA', tarifa: parsedMonto, moneda: orderMoneda || 'MXN' });
                            }
                        }
                    }


                    processed++;
                } catch (err: any) {
                    errors++;
                    const msg = `Fila ${rowNumber}: ${err.message}`;
                    errorDetails.push(msg);
                }
            }

            // Inserción masiva y actualización de órdenes
            if (ordenesMensualesParaInsertar.length > 0) {
                this.logger.log(`Insertando ${ordenesMensualesParaInsertar.length} ordenes mensuales nuevas por lotes...`);
                const chunkSize = 1000;
                for (let i = 0; i < ordenesMensualesParaInsertar.length; i += chunkSize) {
                    await db.ordenMensual.createMany({
                        data: ordenesMensualesParaInsertar.slice(i, i + chunkSize),
                        skipDuplicates: true,
                    });
                }
            }

            if (ordenesMensualesParaActualizar.length > 0) {
                this.logger.log(`Actualizando ${ordenesMensualesParaActualizar.length} ordenes mensuales existentes...`);
                for (const ord of ordenesMensualesParaActualizar) {
                    await db.ordenMensual.update({
                        where: { id: ord.id },
                        data: {
                            po: ord.po,
                            tarifa: ord.tarifa,
                            moneda: ord.moneda,
                            condiciones: ord.condiciones,
                        }
                    }).catch(() => null);
                }
            }

            // Calcular series duplicadas y equipos únicos consolidados
            const duplicados: Array<{ serie: string; count: number; rows: number[]; clientes: string[]; modelos: string[]; adcs: string[] }> = [];
            let totalFilasDuplicadas = 0;

            for (const [s, data] of seenSeriesMap.entries()) {
                if (data.rows.length > 1) {
                    duplicados.push({
                        serie: s,
                        count: data.rows.length,
                        rows: data.rows,
                        clientes: Array.from(data.clientes),
                        modelos: Array.from(data.modelos),
                        adcs: Array.from(data.adcs),
                    });
                    totalFilasDuplicadas += (data.rows.length - 1);
                }
            }

            const equiposUnicos = seenSeriesMap.size;

            // --- 7. Registrar historial de carga ---
            await db.cargaMasivaLog.create({
                data: {
                    modulo: 'FLOTILLA_RENTAS',
                    usuario_id: userId,
                    total_registros: processed + errors,
                    procesados: processed,
                    errores: errors,
                    resumen: {
                        clientesNuevos,
                        sitiosNuevos,
                        rentasCreadas,
                        equiposUnicos,
                        totalFilasDuplicadas,
                        duplicados,
                        mesesProcesados: activeMonths.map(m => m.name),
                        errorDetails,
                        acciones,
                    },
                },
            });

            const resumen = {
                clientesNuevos,
                sitiosNuevos,
                rentasCreadas,
                equiposUnicos,
                totalFilasDuplicadas,
                duplicados,
                acciones,
            };

            this.logger.log(`Proceso finalizado. Procesados: ${processed}, Equipos Únicos: ${equiposUnicos}, Duplicados: ${duplicados.length}, Creados: ${rentasCreadas}`);

            return {
                success: true,
                message: `Carga masiva completada: ${processed} filas procesadas, ${equiposUnicos} equipos únicos registrados (${duplicados.length} series con filas duplicadas consolidadas).`,
                processed,
                errors,
                details: resumen,
                errorDetails,
            };

        } catch (error: any) {
            this.logger.error(`Error en procesarArchivo: ${error.message}`);
            throw new HttpException(error.message || 'Error procesando el archivo', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // -------------------------------------------------------------------------
    // PARCHE PUNTUAL DE MONEDAS (MONEDA SERVICIO / MONEDA)
    // -------------------------------------------------------------------------
    private findCol(keys: string[], candidates: string[], exclude: string[] = []): string | null {
        const up = keys.map(k => (k || '').toUpperCase().trim()).filter(Boolean);
        for (const c of candidates) {
            const uc = c.toUpperCase().trim();
            const hit = up.find(h => h === uc);
            if (hit) return hit;
        }
        for (const c of candidates) {
            const uc = c.toUpperCase().trim();
            const hit = up.find(h => h && h.includes(uc) && !exclude.some(e => h.includes(e.toUpperCase())));
            if (hit) return hit;
        }
        return null;
    }

    private parseCsvLine(line: string, sep: string): string[] {
        const out: string[] = [];
        let cur = '';
        let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
                if (ch === '"') {
                    if (line[i + 1] === '"') { cur += '"'; i++; }
                    else inQ = false;
                } else cur += ch;
            } else if (ch === '"') {
                inQ = true;
            } else if (ch === sep) {
                out.push(cur);
                cur = '';
            } else {
                cur += ch;
            }
        }
        out.push(cur);
        return out;
    }

    private async leerArchivoValores(file: Express.Multer.File): Promise<Record<string, string>[]> {
        const fname = (file.originalname || '').toLowerCase();
        const esCsv = fname.endsWith('.csv') || file.mimetype.includes('csv') || file.mimetype.includes('text');
        if (esCsv) {
            const text = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
            const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
            if (lines.length === 0) return [];
            const firstLine = lines[0];
            const sep = firstLine.includes(';') ? ';' : ',';
            const header = this.parseCsvLine(firstLine, sep).map(h => h.trim().toUpperCase());
            const rows: Record<string, string>[] = [];
            for (let i = 1; i < lines.length; i++) {
                const fields = this.parseCsvLine(lines[i], sep);
                const obj: Record<string, string> = {};
                let has = false;
                header.forEach((h, idx) => {
                    if (h && fields[idx] !== undefined && fields[idx] !== '') {
                        obj[h] = fields[idx].trim();
                        has = true;
                    }
                });
                if (has) rows.push(obj);
            }
            return rows;
        }
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(file.buffer as any);
        const ws = workbook.worksheets.find(w => w.name.toUpperCase().includes('VALORES')) || workbook.worksheets[0];
        const headers: string[] = [];
        ws.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
            headers[colNumber] = (cell.value?.toString() || '').trim().toUpperCase().replace(/\s+/g, ' ');
        });
        const rows: Record<string, string>[] = [];
        for (let r = 2; r <= ws.rowCount; r++) {
            const xRow = ws.getRow(r);
            const obj: Record<string, string> = {};
            let has = false;
            xRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                const h = headers[colNumber];
                if (h) {
                    const v = cell.value;
                    if (v instanceof Date) obj[h] = v.toISOString().split('T')[0];
                    else if (typeof v === 'object') obj[h] = ((v as any).text ?? String(v ?? '')).toString();
                    else obj[h] = String(v ?? '');
                    has = true;
                }
            });
            if (has) rows.push(obj);
        }
        return rows;
    }

    private registrarExcluido(lista: any[], resumen: any, entry: { serie: string; renta_id?: string; campo?: string; motivo: string; detalle?: string }) {
        const motivo = entry.motivo;
        resumen.excluidosPorMotivo[motivo] = (resumen.excluidosPorMotivo[motivo] || 0) + 1;
        lista.push({ tipo: 'EXCLUIDO', serie: entry.serie, renta_id: entry.renta_id || '', campo: entry.campo || '', motivo, detalle: entry.detalle || '' });
    }

    /**
     * Parche puntual de monedas (MONEDA SERVICIO / MONEDA renta) usando el archivo maestro (CSV o Excel).
     * - MONEDA SERVICIO (condiciones.moneda_pago_distribuidor):
     *     · archivo trae USD/MXN y la BD difiere o es NULL → se coloca el valor del archivo.
     *     · archivo NA/vacío y la BD vale un valor heredado (MXN) → se limpia a NULL (el front mostrará "-").
     *     · Protección: nunca se revierte un USD real a MXN (se reporta como excluido).
     * - MONEDA renta (detalles_renta.moneda): solo se completa si la fila de detalles EXISTE y su moneda es NULL/vacía.
     *   Rentas sin detalles_renta, monedas opuestas y filas NA se reportan en excluidos sin modificar.
     * Si aplicar=false → solo análisis (dry-run), no escribe nada en la BD.
     */
    async actualizarValores(file: Express.Multer.File, aplicar: boolean) {
        try {
            const db = PrismaDynamicService.clients.r4;
            if (!db) {
                throw new Error('Database client for R4 no inicializado');
            }

            const rows = await this.leerArchivoValores(file);

            const esValorMoneda = (v: string) => v === 'USD' || v === 'MXN';

            if (rows.length === 0) {
                throw new HttpException('El archivo no tiene filas con datos válidas.', HttpStatus.BAD_REQUEST);
            }

            const keys = Object.keys(rows[0]);
            const colCliente = this.findCol(keys, ['CLIENTE', 'RAZON SOCIAL', 'CUENTA']);
            const colSerie = this.findCol(keys, ['SERIE']);
            const colMoneda = this.findCol(keys, ['MONEDA'], ['MONEDA SERVICIO', 'MONEDA PAGO']);
            const colMonedaServicio = this.findCol(keys, ['MONEDA SERVICIO', 'MONEDA PAGO']);

            if (!colSerie) {
                throw new HttpException('No se encontró la columna SERIE en el archivo.', HttpStatus.BAD_REQUEST);
            }

            const aplicados: any[] = [];
            const excluidos: any[] = [];
            const ops: any[] = [];
            const resumen = {
                monedaServicioColocadas: 0,
                monedaServicioLimpiadas: 0,
                monedaRentaColocadas: 0,
                excluidosPorMotivo: {} as Record<string, number>,
            };

            const seenSeries = new Set<string>();
            const seriesUnicas = [...new Set(rows.map(r => (r[colSerie] || '').trim()).filter(Boolean))];

            // Carga masiva previa: 1 query de activos + 1 query de rentas (evita miles de round-trips)
            const activosDb = await db.activo.findMany({
                where: { serie: { in: seriesUnicas } },
                select: { id: true, serie: true, cliente_id: true },
            });
            const activoPorSerie = new Map<string, any>(activosDb.map((a: any) => [a.serie, a] as [string, any]));
            const idsActivos = activosDb.map(a => a.id);

            const rentasDb = idsActivos.length > 0
                ? await db.renta.findMany({
                    where: { activo_id: { in: idsActivos } },
                    orderBy: { created_at: 'desc' },
                    include: { detalles: true, cliente: { select: { razon_social: true } } },
                })
                : [];
            const rentasPorActivo = new Map<string, any[]>();
            for (const r of rentasDb) {
                const arr = rentasPorActivo.get(r.activo_id) || [];
                arr.push(r);
                rentasPorActivo.set(r.activo_id, arr);
            }
            // Renta efectiva por activo: la VIGENTE más reciente, o la más reciente si no hay VIGENTE
            const rentaPorActivo = new Map<string, any>();
            for (const [activoId, list] of rentasPorActivo) {
                rentaPorActivo.set(activoId, list.find(r => r.estado === 'VIGENTE') || list[0]);
            }

            for (const row of rows) {
                const serie = (row[colSerie] || '').trim();
                if (!serie) continue;

                if (seenSeries.has(serie)) {
                    this.registrarExcluido(excluidos, resumen, {
                        serie,
                        motivo: 'DUPLICADA',
                        detalle: 'Serie repetida en el archivo; se procesó solo la primera aparición.',
                    });
                    continue;
                }
                seenSeries.add(serie);

                const activo = activoPorSerie.get(serie) || null;
                if (!activo) {
                    this.registrarExcluido(excluidos, resumen, { serie, motivo: 'SERIE_SIN_ACTIVO' });
                    continue;
                }

                const renta = rentaPorActivo.get(activo.id) || null;
                if (!renta) {
                    this.registrarExcluido(excluidos, resumen, { serie, motivo: 'SIN_RENTA' });
                    continue;
                }

                const fvMs = (colMonedaServicio ? (row[colMonedaServicio] || '') : '').trim().toUpperCase();
                const fvMon = (colMoneda ? (row[colMoneda] || '') : '').trim().toUpperCase();

                // Validación de cliente (solo si el archivo trae CLIENTE)
                const fileCliente = colCliente ? (row[colCliente] || '').trim() : '';
                if (fileCliente && normalizeClientName(fileCliente) !== normalizeClientName(renta.cliente?.razon_social)) {
                    this.registrarExcluido(excluidos, resumen, {
                        serie,
                        renta_id: renta.id,
                        motivo: 'CLIENTE_NO_COINCIDE',
                        detalle: `${fileCliente} vs ${renta.cliente?.razon_social}`,
                    });
                    continue;
                }

                const condiciones: any = (renta.condiciones as any) || {};
                const actualMs: string | null = typeof condiciones.moneda_pago_distribuidor === 'string' && condiciones.moneda_pago_distribuidor.trim() !== ''
                    ? condiciones.moneda_pago_distribuidor.trim().toUpperCase()
                    : null;

                // ---------- MONEDA SERVICIO ----------
                if (colMonedaServicio) {
                    if (esValorMoneda(fvMs)) {
                        if (actualMs !== fvMs) {
                            if (actualMs === 'USD' && fvMs === 'MXN') {
                                this.registrarExcluido(excluidos, resumen, {
                                    serie,
                                    renta_id: renta.id,
                                    campo: 'MONEDA SERVICIO',
                                    motivo: 'CONFLICTO_USD_REAL',
                                    detalle: `BD=${actualMs} → archivo=${fvMs}`,
                                });
                            } else {
                                const nuevoCond = { ...condiciones, moneda_pago_distribuidor: fvMs };
                                aplicados.push({ tipo: 'APLICADO', serie, renta_id: renta.id, campo: 'MONEDA SERVICIO', anterior: actualMs || 'NULL', nuevo: fvMs });
                                if (aplicar) ops.push(db.renta.update({ where: { id: renta.id }, data: { condiciones: nuevoCond as any } }));
                                resumen.monedaServicioColocadas++;
                            }
                        }
                    } else if (actualMs != null) {
                        if (actualMs === 'USD') {
                            this.registrarExcluido(excluidos, resumen, {
                                serie,
                                renta_id: renta.id,
                                campo: 'MONEDA SERVICIO',
                                motivo: 'CONFLICTO_LIMPIEZA',
                                detalle: `BD=${actualMs} y archivo sin valor`,
                            });
                        } else {
                            const limpiado = { ...condiciones };
                            delete limpiado.moneda_pago_distribuidor;
                            aplicados.push({ tipo: 'APLICADO', serie, renta_id: renta.id, campo: 'MONEDA SERVICIO', anterior: actualMs, nuevo: 'NULL' });
                            if (aplicar) ops.push(db.renta.update({ where: { id: renta.id }, data: { condiciones: limpiado as any } }));
                            resumen.monedaServicioLimpiadas++;
                        }
                    }
                }

                // ---------- MONEDA (renta) ----------
                if (esValorMoneda(fvMon)) {
                    if (!renta.detalles) {
                        this.registrarExcluido(excluidos, resumen, { serie, renta_id: renta.id, campo: 'MONEDA', motivo: 'SIN_DETALLES' });
                    } else {
                        const curMon = (renta.detalles.moneda || '').trim().toUpperCase();
                        if (curMon !== fvMon) {
                            // 'NA'/'N/A'/'-' equivalen a valor ausente: se completan desde el archivo
                            if (curMon === '' || curMon === 'NULL' || curMon === 'NA' || curMon === 'N/A' || curMon === '-') {
                                aplicados.push({ tipo: 'APLICADO', serie, renta_id: renta.id, campo: 'MONEDA', anterior: curMon || 'NULL', nuevo: fvMon });
                                if (aplicar) ops.push(db.detalles_renta.update({ where: { renta_id: renta.id }, data: { moneda: fvMon } }));
                                resumen.monedaRentaColocadas++;
                            } else {
                                this.registrarExcluido(excluidos, resumen, {
                                    serie,
                                    renta_id: renta.id,
                                    campo: 'MONEDA',
                                    motivo: 'MONEDA_OPUESTA',
                                    detalle: `BD=${curMon} → archivo=${fvMon}`,
                                });
                            }
                        }
                    }
                } else if (fvMon !== '') {
                    this.registrarExcluido(excluidos, resumen, {
                        serie,
                        renta_id: renta.id,
                        campo: 'MONEDA',
                        motivo: 'MONEDA_NA',
                        detalle: `valor archivo: "${row[colMoneda]}"`,
                    });
                }
            }

            if (aplicar && ops.length > 0) {
                // Escritura en lotes para no saturar la transacción
                let filasAfectadas = 0;
                for (let i = 0; i < ops.length; i += 100) {
                    const lote: any[] = await db.$transaction(ops.slice(i, i + 100));
                    filasAfectadas += lote.length;
                }
                this.logger.log(`actualizarValores: aplicado. ${resumen.monedaServicioColocadas} colocadas, ${resumen.monedaServicioLimpiadas} limpiadas, ${resumen.monedaRentaColocadas} moneda-renta. Filas afectadas ${filasAfectadas}`);
            }

            return {
                success: true,
                dry_run: !aplicar,
                total_filas: rows.length,
                resumen,
                aplicados,
                excluidos,
            };
        } catch (error: any) {
            this.logger.error(`Error en actualizarValores: ${error.message}`);
            throw new HttpException(error.message || 'Error actualizando valores', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
