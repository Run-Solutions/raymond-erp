import { PrismaClient as PrismaR1 } from '.prisma/client-taller-r1';
import { Injectable, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateEntradaDto {
    folio: string;
    distribuidor?: string;
    factura?: string;
    cliente_origen?: string;
    adc?: string;
    cliente?: string;
    fecha_creacion: Date;
    elemento?: string;
    comentario?: string;
    evidencia_1?: string;
    usuario_asignado?: string;
    estado: string;
    prioridad?: string;
    firma_entrega?: string;
    firma_recibo?: string;
    nombre_entrega?: string;
    comentario_1?: string;
    comentario_2?: string;
    evidencia_2?: string;
    evidencia_3?: string;
}

export interface UpdateEntradaDto {
    usuario_asignado?: string;
    comentario?: string;
    evidencia_1?: string;
    evidencia_2?: string;
    estado?: string;
    fecha_cierre?: Date;
    prioridad?: string;
    fecha_asignacion?: Date;
    usuario_encargado?: string;
    cliente?: string;
}

import { PrismaDynamicService } from '../../database/prisma-dynamic.service';

@Injectable()
export class EntradasService {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }



    // Obtener todas las entradas
    async findAll(estado?: string) {
        const where = estado ? { estado } : {};
        return this.db.entradas.findMany({
            where,
            include: {
                rel_cliente: {
                    select: {
                        nombre_cliente: true,
                    },
                },
                _count: {
                    select: {
                        entrada_detalle: true,
                        entrada_accesorios: true,
                    },
                },
            },
            orderBy: { fecha_creacion: 'desc' },
        });
    }

    // Obtener conteos de equipos y accesorios para todas las entradas
    async getCounts() {
        const [detalles, accesorios]: any[] = await Promise.all([
            this.db.$queryRaw`
                SELECT id_entrada, COUNT(*) as count
                FROM entrada_detalle
                GROUP BY id_entrada
            `,
            this.db.$queryRaw`
                SELECT id_entrada, COUNT(*) as count
                FROM entrada_accesorios
                GROUP BY id_entrada
            `,
        ]);

        const counts: Record<string, { equipos: number; accesorios: number }> = {};
        for (const row of detalles) {
            if (!counts[row.id_entrada]) counts[row.id_entrada] = { equipos: 0, accesorios: 0 };
            counts[row.id_entrada].equipos = Number(row.count);
        }
        for (const row of accesorios) {
            if (!counts[row.id_entrada]) counts[row.id_entrada] = { equipos: 0, accesorios: 0 };
            counts[row.id_entrada].accesorios = Number(row.count);
        }
        return counts;
    }

    // Obtener una entrada por ID
    async findOne(id: string) {
        return this.db.entradas.findUnique({
            where: { id_entrada: id },
            include: {
                rel_cliente: {
                    select: {
                        nombre_cliente: true,
                    },
                },
                _count: {
                    select: {
                        entrada_detalle: true,
                        entrada_accesorios: true,
                    },
                },
            },
        });
    }

    // Crear una nueva entrada
    async create(data: CreateEntradaDto) {
        console.log('[EntradasService] create called for folio:', data.folio);
        try {
            const id_entrada = `ENT-${Date.now()}`;

            // 1. Extract Base64 signatures for disk saving
            const signaturesToSave: any = {};
            if (data.firma_entrega?.startsWith('data:image')) signaturesToSave.firma_entrega = data.firma_entrega;
            if (data.firma_recibo?.startsWith('data:image')) signaturesToSave.firma_recibo = data.firma_recibo;

            // 2. Save signatures to disk
            let savedPaths = {};
            if (Object.keys(signaturesToSave).length > 0) {
                console.log('[EntradasService] Saving signatures to disk...');
                savedPaths = await this.saveImagesDirectly(data.folio, 'headers', signaturesToSave);
            }

            // 3. Clean payload: Remove Base64 strings for VarChar(100) fields to avoid truncation error
            const cleanData = { ...data };
            if (cleanData.firma_entrega?.startsWith('data:image')) delete cleanData.firma_entrega;
            if (cleanData.firma_recibo?.startsWith('data:image')) delete cleanData.firma_recibo;

            console.log('[EntradasService] Creating entry in DB with id:', id_entrada);
            return await this.db.entradas.create({
                data: {
                    id_entrada,
                    ...cleanData,
                    ...savedPaths,
                    estado: data.estado || (this.prisma.currentSite === 'r3' ? 'Por Ubicar' : 'Recibido – En espera evaluación'),
                    usuario_asignado: this.prisma.currentUser?.substring(0, 100),
                },
            });
        } catch (error: any) {
            console.error('[EntradasService] Error in create:', error);
            if (error.code === 'P2003') {
                throw new BadRequestException('El cliente seleccionado o algún dato relacionado no es válido (Foreign Key Constraint).');
            }
            if (error.code === 'P2002') throw new ConflictException(`Ya existe un registro con el folio ${data.folio}`);
            throw new InternalServerErrorException('Error al crear la entrada en el servidor.');
        }
    }

    private async saveImagesDirectly(folio: string, subFolder: string, files: { [key: string]: string }) {
        const result: { [key: string]: string } = {};
        try {
            const baseDir = path.join(process.cwd(), 'uploads', 'entradas', folio, subFolder);
            if (!fs.existsSync(baseDir)) {
                fs.mkdirSync(baseDir, { recursive: true });
            }

            for (const [key, base64] of Object.entries(files)) {
                if (typeof base64 === 'string' && base64.startsWith('data:image')) {
                    const matches = base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                        const fileName = `${key}_${Date.now()}.${extension}`;
                        const filePath = path.join(baseDir, fileName);
                        const buffer = Buffer.from(matches[2], 'base64');

                        fs.writeFileSync(filePath, buffer);
                        result[key] = `/uploads/entradas/${folio}/${subFolder}/${fileName}`;
                    }
                }
            }
        } catch (error) {
            console.error('[EntradasService] Error saving files directly:', error);
        }
        return result;
    }

    // Actualizar una entrada
    async update(id: string, data: UpdateEntradaDto) {
        return this.db.entradas.update({
            where: { id_entrada: id },
            data,
        });
    }

    // Eliminar una entrada
    async remove(id: string) {
        return this.db.entradas.delete({
            where: { id_entrada: id },
        });
    }

    // Obtener detalles de una entrada
    async getDetalles(id_entrada: string) {
        const detalles = await this.db.entrada_detalle.findMany({
            where: { id_entrada },
            include: {
                rel_ubicacion: { select: { nombre_ubicacion: true } },
                rel_sub_ubicacion: { select: { nombre: true } },
                rel_equipo: true,
                // rel_serie_info removed from relation to allow unregistered serials
            }
        });

        // Manually populate rel_serie_info from CargueMasivo
        const serials = detalles
            .map(d => d.serial_equipo)
            .filter((s): s is string => !!s);

        if (serials.length > 0) {
            const infos = await this.db.cargueMasivo.findMany({
                where: { SERIE: { in: serials } }
            });
            const infoMap = new Map(infos.map(i => [i.SERIE, i]));

            return detalles.map(d => ({
                ...d,
                rel_serie_info: (d.serial_equipo && infoMap.get(d.serial_equipo)) || null
            }));
        }

        return detalles;
    }

    // Obtener accesorios de una entrada
    async getAccesorios(id_entrada: string) {
        return this.db.entrada_accesorios.findMany({
            where: { id_entrada },
            include: {
                rel_ubicacion: { select: { nombre_ubicacion: true } },
                rel_sub_ubicacion: { select: { nombre: true } },
            }
        });
    }

    // Crear detalle de entrada (Equipo)
    async createDetalle(id_entrada: string, data: any) {
        console.log('[EntradasService] createDetalle called for header:', id_entrada);
        try {
            const id_detalles = `DET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // 1. Fetch Folio for file path
            const entrada = await this.db.entradas.findUnique({ where: { id_entrada }, select: { folio: true } });
            if (!entrada) {
                console.error(`[EntradasService] Entrada ${id_entrada} not found in DB`);
                throw new BadRequestException(`La entrada con ID ${id_entrada} no existe. No se puede crear el detalle.`);
            }

            // 2. Process images - Extract Base64
            const imageFiles: any = {};
            if (typeof data.evidencia_1 === 'string' && data.evidencia_1.startsWith('data:image')) imageFiles.evidencia_1 = data.evidencia_1;
            if (typeof data.evidencia_2 === 'string' && data.evidencia_2.startsWith('data:image')) imageFiles.evidencia_2 = data.evidencia_2;
            if (typeof data.evidencia_3 === 'string' && data.evidencia_3.startsWith('data:image')) imageFiles.evidencia_3 = data.evidencia_3;
            if (typeof data.evidencia_4 === 'string' && data.evidencia_4.startsWith('data:image')) imageFiles.evidencia_4 = data.evidencia_4;

            console.log('[EntradasService] Saving images to disk if any...');
            // 3. Save to disk
            const savedPaths: any = await this.saveImagesDirectly(entrada.folio, id_detalles, imageFiles);

            console.log('[EntradasService] Finding automatic allocation for Evaluation...');
            let id_ubicacion = data.id_ubicacion;
            let id_sub_ubicacion = data.id_sub_ubicacion;

            // ONLY if it's an equipment (serial exists) and no location was manually set
            // For R3 (Naves), we skip the automatic Evaluation zone allocation
            if (!id_ubicacion && this.prisma.currentSite !== 'r3') {
                const evalZone = await this.db.ubicacion.findFirst({
                    where: { nombre_ubicacion: 'EVALUACIÓN' }
                });
                if (evalZone) {
                    id_ubicacion = evalZone.id_ubicacion;
                    const availableSub = await this.db.sub_ubicaciones.findFirst({
                        where: { id_ubicacion: evalZone.id_ubicacion, ubicacion_ocupada: false },
                        orderBy: { nombre: 'asc' }
                    });
                    if (availableSub) {
                        // id_sub_ubicacion column is VarChar(10) — only assign if it fits
                        if (availableSub.id_sub_ubicacion.length <= 10) {
                            id_sub_ubicacion = availableSub.id_sub_ubicacion;
                            // Mark as occupied
                            await this.db.sub_ubicaciones.update({
                                where: { id_sub_ubicacion: availableSub.id_sub_ubicacion },
                                data: { ubicacion_ocupada: true }
                            });
                            console.log(`[EntradasService] Auto-allocated to ${availableSub.nombre}`);
                        } else {
                            console.warn(`[EntradasService] Sub-location ID "${availableSub.id_sub_ubicacion}" exceeds VarChar(10) limit — skipping auto-allocation`);
                        }
                    }
                }
            }

            console.log('[EntradasService] Creating database record for detail:', id_detalles);

            // Validate and parse date safely
            let fechaIngreso = new Date();
            if (data.fecha) {
                const parsedDate = new Date(data.fecha);
                if (!isNaN(parsedDate.getTime())) {
                    fechaIngreso = parsedDate;
                }
            }

            // 4. Explicit mapping to avoid "Unknown Argument" errors
            const result = await this.db.entrada_detalle.create({
                data: {
                    id_detalles,
                    id_entrada,
                    serial_equipo: data.serial_equipo || 'S/N',
                    clase: data.clase,
                    modelo: data.modelo,
                    id_ubicacion,
                    id_sub_ubicacion,
                    estado: data.estado || (this.prisma.currentSite === 'r3' ? 'Por Ubicar' : 'Recibido – En espera evaluación'),
                    calificacion: this.prisma.currentSite === 'r3' ? 'N/A' : null,
                    tipo_entrada: data.tipo_entrada || 'Renta',
                    pdf: false,
                    fecha: fechaIngreso,
                    ...savedPaths,
                    comentario_1: data.comentario_1,
                    comentario_2: data.comentario_2,
                },
            });
            console.log('[EntradasService] Detail record created successfully');
            return result;
        } catch (error: any) {
            console.error('[EntradasService] Error in createDetalle:', error.stack || error);
            if (error.code === 'P2003') {
                throw new BadRequestException('Error de integridad: El ID de la entrada o un dato relacionado no existe en la BD.');
            }
            if (error.code === 'P2002') {
                throw new ConflictException('Ya existe un detalle con este ID.');
            }
            throw new InternalServerErrorException(`Error al crear el detalle: ${error.message || 'Error desconocido'}`);
        }
    }

    // Actualizar detalle de entrada
    async updateDetalle(id_detalle: string, data: any) {
        // Handle images if any (similar logic can be applied if needed, but for 'Ubicar' it might just be locations)
        return this.db.entrada_detalle.update({
            where: { id_detalles: id_detalle },
            data,
        });
    }

    // Crear accesorio de entrada
    async createAccesorio(id_entrada: string, data: any) {
        console.log('[EntradasService] createAccesorio called for:', id_entrada);
        try {
            const id_accesorio = `ACC-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

            // 1. Fetch Folio
            const entrada = await this.db.entradas.findUnique({ where: { id_entrada }, select: { folio: true } });
            if (!entrada) {
                console.error(`[EntradasService] Entrada ${id_entrada} not found in DB`);
                throw new BadRequestException(`La entrada con ID ${id_entrada} no existe. No se puede crear el accesorio.`);
            }

            // 2. Process evidence
            const imageFiles: any = {};
            if (typeof data.evidencia === 'string' && data.evidencia.startsWith('data:image')) {
                imageFiles.evidencia = data.evidencia;
            }

            console.log('[EntradasService] Saving accessory images to disk...');
            // 3. Save to disk
            const savedPaths: any = await this.saveImagesDirectly(entrada.folio, id_accesorio, imageFiles);

            let fechaIngreso = new Date();
            if (data.fecha_ingreso) {
                const parsedDate = new Date(data.fecha_ingreso);
                if (!isNaN(parsedDate.getTime())) {
                    fechaIngreso = parsedDate;
                }
            }

            console.log('[EntradasService] Creating database record for accessory:', id_accesorio);
            // 4. Explicit mapping
            const result = await this.db.entrada_accesorios.create({
                data: {
                    id_accesorio,
                    id_entrada,
                    tipo: data.tipo,
                    modelo: data.modelo,
                    serial: data.serial,
                    estado_acc: data.estado_acc || (this.prisma.currentSite === 'r3' ? 'Por Ubicar' : 'Pendiente'),
                    fecha_ingreso: fechaIngreso,
                    evidencia: savedPaths.evidencia || (typeof data.evidencia === 'string' && data.evidencia.startsWith('data:image') ? null : data.evidencia),
                },
            });
            console.log('[EntradasService] Accessory record created successfully');
            return result;
        } catch (error: any) {
            console.error('[EntradasService] Error in createAccesorio:', error.stack || error);
            throw new InternalServerErrorException(`Error al crear el accesorio: ${error.message || 'Error desconocido'}`);
        }
    }

    // Actualizar accesorio de entrada
    async updateAccesorio(id_accesorio: string, data: any) {
        const updateData: any = { ...data };
        if (data.fecha_ultima_carga !== undefined) {
            updateData.fecha_ultima_carga = data.fecha_ultima_carga ? new Date(data.fecha_ultima_carga) : null;
        }

        // Use updateMany because it's a composite primary key and we may only have id_accesorio
        return this.db.entrada_accesorios.updateMany({
            where: { id_accesorio },
            data: updateData,
        });
    }

    async ubicarEquipos(id_entrada: string, usuario: string) {
        console.log(`[EntradasService] ubicarEquipos called for entry: ${id_entrada} by user: ${usuario}`);

        return await this.db.$transaction(async (tx) => {
            // 1. Get entry with details and accessories
            const entrada = await tx.entradas.findUnique({
                where: { id_entrada },
                include: {
                    entrada_detalle: true,
                    entrada_accesorios: true
                }
            });

            if (!entrada) throw new BadRequestException(`Entrada ${id_entrada} no encontrada.`);

            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // 2. Process Equipment (entrada_detalle)
            console.log(`[EntradasService] Processing ${entrada.entrada_detalle.length} equipment details`);
            for (const detalle of entrada.entrada_detalle) {
                if (!detalle.id_ubicacion || !detalle.id_sub_ubicacion) {
                    console.log(`[EntradasService] WARNING: Skipping equipment ${detalle.serial_equipo} due to missing location`);
                    continue;
                }

                // Identify if it was in EVALUACIÓN to free that sub-location later (if it's changing)
                // Note: We'll fetch the current state from DB just for this check if needed, 
                // but usually id_ubicacion here IS the new one.
                // Actually, 'detalle' here is the record in 'entrada_detalle' which HAS the location it WAS assigned to (EVALUACION).
                // When we 'ubicar', we are moving it to a PERMANENT location.

                // 1. Get current location name to see if it's EVALUACIÓN
                const prevLocation = await tx.ubicacion.findUnique({
                    where: { id_ubicacion: detalle.id_ubicacion },
                    select: { nombre_ubicacion: true }
                });

                // Create or find record in 'equipos' (Master Table)
                let id_equipo_final = detalle.id_equipo;

                if (!id_equipo_final && detalle.serial_equipo) {
                    const existingEquipo = await tx.equipos.findUnique({
                        where: { numero_serie: detalle.serial_equipo }
                    });

                    if (existingEquipo) {
                        id_equipo_final = existingEquipo.id_equipos;
                    } else {
                        // Create new equipment in master table
                        const newEquipoId = uuidv4();
                        await tx.equipos.create({
                            data: {
                                id_equipos: newEquipoId,
                                numero_serie: detalle.serial_equipo,
                                clase: detalle.clase || 'Manual',
                                modelo: detalle.modelo || 'Desconocido',
                                estado: 'Disponible',
                                marca: 'Raymond' // Default or based on logic if available
                            }
                        });
                        id_equipo_final = newEquipoId;
                    }
                }

                // Create record in equipo_ubicacion (the permanent home)
                await tx.equipo_ubicacion.create({
                    data: {
                        id_equipo_ubicacion: uuidv4(),
                        id_equipos: id_equipo_final,
                        id_ubicacion: detalle.id_ubicacion,
                        stock: detalle.id_detalles?.substring(0, 25) || '',
                        id_sub_ubicacion: detalle.id_sub_ubicacion,
                        estado: 'Ingresado',
                        fecha_entrada: now,
                        serial_equipo: detalle.serial_equipo,
                        usuario_entrada: this.prisma.currentUser || usuario || 'Sistema'
                    }
                });

                // 2. If it was in EVALUACIÓN, we should free it. 
                // Wait, if id_ubicacion is STILL EVALUACION, we shouldn't free it yet?
                // Usually 'ubicar' means moving to a permanent shelf.
                if (prevLocation?.nombre_ubicacion === 'EVALUACIÓN') {
                    await tx.sub_ubicaciones.update({
                        where: { id_sub_ubicacion: detalle.id_sub_ubicacion },
                        data: { ubicacion_ocupada: false }
                    });
                    console.log(`[EntradasService] Freed EVALUACIÓN sub-location ${detalle.id_sub_ubicacion}`);
                } else {
                    // Mark NEW sub-location as occupied if it's not evaluation
                    await tx.sub_ubicaciones.update({
                        where: { id_sub_ubicacion: detalle.id_sub_ubicacion },
                        data: { ubicacion_ocupada: true }
                    });
                }

                // Update detail status
                await tx.entrada_detalle.update({
                    where: { id_detalles: detalle.id_detalles },
                    data: { estado: 'Ingresado' }
                });
            }

            // 3. Process Accessories (entrada_accesorios)
            console.log(`[EntradasService] Processing ${entrada.entrada_accesorios.length} accessories`);
            for (const acc of entrada.entrada_accesorios) {
                if (!acc.ubicacion || !acc.sub_ubicacion) {
                    console.log(`[EntradasService] WARNING: Skipping accessory ${acc.tipo} due to missing location`);
                    continue;
                }

                // Accessory locations are not marked as occupied (allows multiple items)
                // Removed: tx.sub_ubicaciones.update({ ... ubicacion_ocupada: true })

                // Update accessory status using updateMany due to composite key
                await tx.entrada_accesorios.updateMany({
                    where: {
                        id_accesorio: acc.id_accesorio,
                        id_entrada: acc.id_entrada
                    },
                    data: { estado: 'Ingresado' }
                });
            }

            // 4. Update Entry Status/Priority
            console.log(`[EntradasService] Finalizing entry status update`);
            return await tx.entradas.update({
                where: { id_entrada },
                data: {
                    prioridad: 'Cerrado',
                    estado: 'Cerrado'
                }
            });
        }, {
            timeout: 10000 // Increase timeout to 10s for remote DB latency
        });
    }

    // Obtener el último folio generado (Formato E-n)
    async getLastFolio() {
        const lastEntrada = await this.db.entradas.findFirst({
            where: {
                folio: {
                    startsWith: 'E-',
                },
            },
            orderBy: {
                fecha_creacion: 'desc',
            },
        });

        if (!lastEntrada) return 'E-1';

        const lastFolio = lastEntrada.folio;
        const lastNumber = parseInt(lastFolio.replace('E-', ''), 10);

        if (isNaN(lastNumber)) {
            // If the last one wasn't a number, find any with number
            const allFolios = await this.db.entradas.findMany({
                where: { folio: { startsWith: 'E-' } },
                select: { folio: true }
            });
            const numbers = allFolios
                .map(e => parseInt(e.folio.replace('E-', ''), 10))
                .filter(n => !isNaN(n));
            const max = numbers.length > 0 ? Math.max(...numbers) : 0;
            return `E-${max + 1}`;
        }

        return `E-${lastNumber + 1}`;
    }
}
