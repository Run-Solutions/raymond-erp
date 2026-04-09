import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateAuditoriaDto {
    fecha_auditoria: Date;
    usuario_auditor: string;
    comentarios?: string;
    id_ubicacion?: string;
}

@Injectable()
export class AuditoriaService {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): any {
        return this.prisma.client;
    }

    async findAll() {
        try {
            console.log(`[AuditoriaService] DB Client used:`, this.prisma.currentSite);
            if (!this.db.auditoria) {
                console.error(`[AuditoriaService] ERROR: this.db.auditoria is undefined! Prisma client might be outdated.`);
                throw new InternalServerErrorException('Prisma client outdated. Por favor reinicia el backend.');
            }
            return await this.db.auditoria.findMany({
                orderBy: { fecha_auditoria: 'desc' }
            });
        } catch (error: any) {
            console.error('[AuditoriaService] findAll error:', error);
            throw error;
        }
    }

    async findById(id: string) {
        const auditoria = await this.db.auditoria.findUnique({
            where: { id_auditoria: id }
        });
        if (!auditoria) throw new NotFoundException('Auditoría no encontrada');
        return auditoria;
    }

    async create(data: CreateAuditoriaDto) {
        try {
            console.log(`[AuditoriaService] create called with data:`, data);
            if (!this.db.auditoria) {
                console.error(`[AuditoriaService] ERROR: this.db.auditoria is undefined! Prisma client might be outdated.`);
                throw new InternalServerErrorException('Prisma client outdated. Por favor reinicia el backend.');
            }
            return await this.db.auditoria.create({
                data: {
                    id_auditoria: uuidv4(),
                    fecha_auditoria: data.fecha_auditoria || new Date(),
                    usuario_auditor: data.usuario_auditor || 'Auditor',
                    comentarios: data.comentarios,
                    id_ubicacion: data.id_ubicacion,
                }
            });
        } catch (error: any) {
            console.error('[AuditoriaService] create error:', error);
            throw new InternalServerErrorException(`Error al crear auditoria: ${error?.message || error}`);
        }
    }

    async scanEquipo(id_auditoria: string, serial: string) {
        await this.findById(id_auditoria);

        // Limpiar serial
        const serialClean = serial.trim();

        // Verificar si ya fue escaneado en esta auditoría
        const alreadyScanned = await this.db.auditoria_detalle.findFirst({
            where: { id_auditoria, serial_equipo: serialClean }
        });

        if (alreadyScanned) {
            throw new BadRequestException('Este equipo ya fue escaneado en esta auditoría');
        }

        // Registrar en el detalle
        const auditoriaDetalle = await this.db.auditoria_detalle.create({
            data: {
                id_auditoria_detalle: uuidv4(),
                id_auditoria,
                serial_equipo: serialClean,
            }
        });

        // Buscar información del equipo en la base de datos (equipo_ubicacion)
        const equipoInfo = await this.db.equipo_ubicacion.findFirst({
            where: { serial_equipo: serialClean },
            include: {
                ubicacion: { select: { nombre_ubicacion: true } },
                equipos: { select: { modelo: true, clase: true } } // Added if relation matches 'equipos'
            }
        });

        if (!equipoInfo) {
            return {
                status: 'NOT_FOUND',
                message: 'Equipo no existe en la base de datos',
                serial: serialClean,
                auditoria_detalle: auditoriaDetalle
            };
        }

        const validStates = ['Ingresado', 'Reservado', 'ingresado', 'reservado']; // Case insensitive check
        const isStateValid = equipoInfo.estado && validStates.includes(equipoInfo.estado.toLowerCase());

        if (!isStateValid) {
             return {
                status: 'INVALID_STATE',
                message: `Equipo encontrado pero en estado inválido (${equipoInfo.estado})`,
                equipoInfo: {
                    estado: equipoInfo.estado,
                    ubicacion: equipoInfo.ubicacion?.nombre_ubicacion || 'Sin ubicación',
                    modelo: equipoInfo.equipos?.modelo || 'N/A'
                },
                serial: serialClean,
                auditoria_detalle: auditoriaDetalle
            };
        }

        return {
            status: 'FOUND',
            message: 'Equipo validado correctamente',
            equipoInfo: {
                estado: equipoInfo.estado,
                ubicacion: equipoInfo.ubicacion?.nombre_ubicacion || 'Sin ubicación',
                modelo: equipoInfo.equipos?.modelo || 'N/A'
            },
            serial: serialClean,
            auditoria_detalle: auditoriaDetalle
        };
    }

    async getReport(id_auditoria: string) {
        const auditoria = await this.findById(id_auditoria);

        // Obtener todos los escaneados
        const detalles = await this.db.auditoria_detalle.findMany({
            where: { id_auditoria }
        });
        const scannedSerials = detalles
            .filter((d: any) => d.serial_equipo)
            .map((d: any) => d.serial_equipo.toLowerCase());

        // Obtener la información completa de los equipos escaneados en una sola consulta
        const scannedDetails = [] as any[];
        
        // Batch query para optimizar N+1
        const equiposInfo = await this.db.equipo_ubicacion.findMany({
            where: { serial_equipo: { in: scannedSerials } },
            include: {
                ubicacion: { select: { nombre_ubicacion: true } },
                equipos: { select: { modelo: true, clase: true } }
            }
        });

        // Crear mapa para acceso rápido
        const equipoInfoMap = new Map();
        equiposInfo.forEach((eq: any) => {
            if (eq.serial_equipo) {
                equipoInfoMap.set(eq.serial_equipo.toLowerCase(), eq);
            }
        });

        for (const detalle of detalles) {
             const serialLower = detalle.serial_equipo ? detalle.serial_equipo.toLowerCase() : '';
             const equipoInfo = equipoInfoMap.get(serialLower);
             
             let statusText = 'No existe / Otra ubicación';
             if (equipoInfo) {
                 const isStateValid = equipoInfo.estado && ['ingresado', 'reservado'].includes(equipoInfo.estado.toLowerCase());
                 if (isStateValid) {
                     statusText = 'Encontrado Correctamente';
                 } else {
                     statusText = `Entrado incorrecto (${equipoInfo.estado})`;
                 }
             }

             scannedDetails.push({
                 serial: detalle.serial_equipo,
                 estado_actual: equipoInfo?.estado || 'N/A',
                 ubicacion_actual: equipoInfo?.ubicacion?.nombre_ubicacion || 'N/A',
                 modelo: equipoInfo?.equipos?.modelo || 'N/A',
                 clase: equipoInfo?.equipos?.clase || 'N/A',
                 status_auditoria: statusText
             });
        }

        // Obtener faltantes (específico si hay ubicación, general a toda la locación si no)
        let missingEquipos = [] as any[];
        
        // Determinar el filtro de la consulta
        const whereCondition: any = {
             estado: { in: ['Ingresado', 'Reservado', 'ingresado', 'reservado'] }
        };
        if (auditoria.id_ubicacion) {
             whereCondition.id_ubicacion = auditoria.id_ubicacion;
        }

        const expectedEquipos = await this.db.equipo_ubicacion.findMany({
            where: whereCondition,
            include: {
                ubicacion: { select: { nombre_ubicacion: true } },
                equipos: { select: { modelo: true, clase: true } }
            }
        });

        // Filtrar los que no están en la lista de escaneados
        missingEquipos = expectedEquipos
            .filter((eq: any) => eq.serial_equipo && !scannedSerials.includes(eq.serial_equipo.toLowerCase()))
            .map((eq: any) => ({
                serial: eq.serial_equipo,
                estado_actual: eq.estado,
                ubicacion_actual: eq.ubicacion?.nombre_ubicacion || 'N/A',
                modelo: eq.equipos?.modelo || 'N/A',
                clase: eq.equipos?.clase || 'N/A',
                status_auditoria: 'Faltante (No escaneado)'
            }));

        return {
            auditoria,
            scanned: scannedDetails,
            missing: missingEquipos
        };
    }
}
