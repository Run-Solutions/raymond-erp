import { PrismaClient as PrismaR1 } from '@prisma/client-taller-r1';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { TallerR1MailService } from './mail.service';

export interface CreateRenovadoDto {
    serial_equipo: string;
    fecha_target: Date;
    cliente?: string;
    adc?: string;
    meses_fuera: string; // 1-3, 4-6, 6-12, 12+
    tecnico_responsable?: string;
}

export interface AddRefaccionDto {
    area: string;
    descripcion: string;
    cantidad: number;
}

export interface CreateIncidenciaDto {
    tipo: string;
    comentarios?: string;
}

@Injectable()
export class RenovadosService {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }

    // Fases predefinidas (pueden ser 9 o 14 según requerimiento final)
    private readonly FASES_DEFAULT = [
        'Desmontaje',
        'Solicitud refacciones',
        'Mantenimiento preventivo',
        'Montaje motores',
        'Montaje refacciones',
        'Preparación pintura',
        'Pintura',
        'Detallado',
        'Pruebas funcionales'
    ];

    async findAll() {
        try {
            console.log('[RenovadosService] Fetching all renovados...');
            return await this.db.renovado_solicitud.findMany({
                include: {
                    fases: true,
                    _count: {
                        select: { incidencias: true }
                    }
                },
                orderBy: { fecha_target: 'asc' }
            });
        } catch (error: any) {
            console.error('[RenovadosService] CRITICAL ERROR in findAll:', error);
            if (error.code) {
                console.error(`[RenovadosService] Prisma Error Code: ${error.code}`);
            }
            if (error.meta) {
                console.error('[RenovadosService] Prisma Error Meta:', JSON.stringify(error.meta, null, 2));
            }
            throw new Error(`Error al obtener renovados: ${error.message || 'Desconocido'}`);
        }
    }

    async findOne(id: string) {
        const renovado = await this.db.renovado_solicitud.findUnique({
            where: { id_solicitud: id },
            include: {
                fases: { orderBy: { orden: 'asc' } },
                refacciones: true,
                incidencias: { orderBy: { fecha_inicio: 'desc' } }
            }
        });
        if (!renovado) throw new NotFoundException('Solicitud de renovado no encontrada');
        return renovado;
    }

    async create(dto: CreateRenovadoDto) {
        // 1. Validar que el equipo exista y esté en stock
        const equipoStock = await this.db.equipo_ubicacion.findFirst({
            where: { serial_equipo: dto.serial_equipo, stock: 'SI' }
        });

        if (!equipoStock) {
            throw new BadRequestException('El equipo no se encuentra en stock o no existe');
        }

        // 2. Transacción para crear solicitud y cambiar estado del equipo
        return this.db.$transaction(async (tx) => {
            // Crear solicitud
            const solicitud = await tx.renovado_solicitud.create({
                data: {
                    serial_equipo: dto.serial_equipo,
                    fecha_target: dto.fecha_target,
                    cliente: dto.cliente,
                    adc: dto.adc,
                    meses_fuera: dto.meses_fuera,
                    tecnico_responsable: dto.tecnico_responsable,
                }
            });

            // Inicializar fases
            await tx.renovado_fase.createMany({
                data: this.FASES_DEFAULT.map((nombre, index) => ({
                    id_solicitud: solicitud.id_solicitud,
                    nombre_fase: nombre,
                    orden: index + 1
                }))
            });

            // Actualizar estado en equipo_ubicacion
            await tx.equipo_ubicacion.update({
                where: { id_equipo_ubicacion: equipoStock.id_equipo_ubicacion },
                data: { estado: 'Renovación' }
            });

            return solicitud;
        });
    }

    async startFase(idFase: string, tecnico: string) {
        const fase = await this.db.renovado_fase.findUnique({ where: { id_fase: idFase } });
        if (!fase) throw new NotFoundException('Fase no encontrada');

        return this.db.renovado_fase.update({
            where: { id_fase: idFase },
            data: {
                fecha_inicio: new Date(),
                tecnico,
                completado: false
            }
        });
    }

    async completeFase(idFase: string) {
        const fase = await this.db.renovado_fase.findUnique({ where: { id_fase: idFase } });
        if (!fase || !fase.fecha_inicio) throw new BadRequestException('La fase no ha sido iniciada');

        const fechaFin = new Date();
        const horas = this.calcularHorasLaborales(fase.fecha_inicio, fechaFin);

        return this.db.renovado_fase.update({
            where: { id_fase: idFase },
            data: {
                fecha_fin: fechaFin,
                horas_registradas: horas,
                completado: true
            }
        });
    }

    async addRefaccion(idSolicitud: string, dto: AddRefaccionDto) {
        return this.db.renovado_refaccion.create({
            data: {
                id_solicitud: idSolicitud,
                ...dto
            }
        });
    }

    async createIncidencia(idSolicitud: string, dto: CreateIncidenciaDto) {
        return this.db.renovado_incidencia.create({
            data: {
                id_solicitud: idSolicitud,
                tipo: dto.tipo,
                comentarios: dto.comentarios,
                fecha_inicio: new Date()
            }
        });
    }

    async closeIncidencia(idIncidencia: string) {
        const incidencia = await this.db.renovado_incidencia.findUnique({ where: { id_incidencia: idIncidencia } });
        if (!incidencia) throw new NotFoundException('Incidencia no encontrada');

        const fechaFin = new Date();
        const horas = this.calcularHorasLaborales(incidencia.fecha_inicio, fechaFin);

        return this.db.renovado_incidencia.update({
            where: { id_incidencia: idIncidencia },
            data: {
                fecha_fin: fechaFin,
                horas_laborales: horas
            }
        });
    }

    async finalizeRenovado(idSolicitud: string) {
        const solicitud = await this.db.renovado_solicitud.findUnique({
            where: { id_solicitud: idSolicitud }
        });

        if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

        return this.db.$transaction(async (tx) => {
            // 1. Actualizar solicitud
            const updated = await tx.renovado_solicitud.update({
                where: { id_solicitud: idSolicitud },
                data: { estado: 'Finalizado' }
            });

            // 2. Actualizar equipo_ubicacion a "Stock renovado"
            const equipoStock = await tx.equipo_ubicacion.findFirst({
                where: { serial_equipo: solicitud.serial_equipo }
            });

            if (equipoStock) {
                await tx.equipo_ubicacion.update({
                    where: { id_equipo_ubicacion: equipoStock.id_equipo_ubicacion },
                    data: { estado: 'Stock renovado' }
                });
            }

            // TODO: Enviar correo automático

            return updated;
        });
    }

    /**
     * Calcula las horas laborales entre dos fechas.
     * Considera L-V y un máximo de 6 horas por día.
     */
    private calcularHorasLaborales(inicio: Date, fin: Date): number {
        let totalHoras = 0;
        const current = new Date(inicio);
        const end = new Date(fin);

        while (current < end) {
            const dayOfWeek = current.getDay();
            // Lunes (1) a Viernes (5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                const nextDay = new Date(current);
                nextDay.setHours(24, 0, 0, 0);

                const limit = nextDay < end ? nextDay : end;
                const diffMs = limit.getTime() - current.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);

                // Si el lapso es en el mismo día, limitamos a 6 horas (proporcional si es necesario)
                // Para simplificar: si el tiempo transcurrido en un día laboral supera las 24h (imposible en el loop), 
                // pero si estamos contando un día completo, sumamos 6.
                // Si es un parcial, sumamos (horas_parciales / 24) * 6.
                totalHoras += (diffHours / 24) * 6;
            }
            current.setHours(24, 0, 0, 0);
        }

        return Math.round(totalHoras * 100) / 100;
    }
}
