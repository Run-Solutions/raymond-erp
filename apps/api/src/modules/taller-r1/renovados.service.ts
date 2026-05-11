import { PrismaClient as PrismaR1 } from '@prisma-r1';
import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { StorageService } from './storage.service';
import { TallerR1MailService } from './mail.service';

import { IsString, IsDate, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRenovadoDto {
    @IsString()
    @IsNotEmpty()
    serial_equipo: string;

    @IsDate()
    @Type(() => Date)
    fecha_target: Date;

    @IsString()
    @IsOptional()
    cliente?: string;

    @IsString()
    @IsOptional()
    adc?: string;

    @IsString()
    @IsNotEmpty()
    meses_fuera: string; // 1-3, 4-6, 6-12, 12+

    @IsString()
    @IsOptional()
    tecnico_responsable?: string;

    @IsString()
    @IsOptional()
    id_estacion?: string;
}

export class AddRefaccionDto {
    @IsString()
    @IsNotEmpty()
    area: string;

    @IsString()
    @IsNotEmpty()
    descripcion: string;

    @IsNumber()
    cantidad: number;

    @IsNumber()
    @IsOptional()
    precio_unitario?: number;
}

export class CreateIncidenciaDto {
    @IsString()
    @IsNotEmpty()
    tipo: string;

    @IsString()
    @IsOptional()
    comentarios?: string;
}

@Injectable()
export class RenovadosService implements OnModuleInit {
    constructor(
        private prisma: PrismaDynamicService,
        private storageService: StorageService
    ) { }

    async onModuleInit() {
        try {
            await this.db.$executeRawUnsafe(`
                ALTER TABLE renovado_refaccion 
                ADD COLUMN IF NOT EXISTS precio_unitario FLOAT DEFAULT 0;
            `);
            console.log('[RenovadosService] Columna precio_unitario verificada/creada');
        } catch (error) {
            // Ignorar si falla por sintaxis (ej: MySQL no soporta IF NOT EXISTS en ADD COLUMN directamente)
            // Intentar sin IF NOT EXISTS y atrapar el error si ya existe
            try {
                await this.db.$executeRawUnsafe('ALTER TABLE renovado_refaccion ADD COLUMN precio_unitario FLOAT DEFAULT 0;');
            } catch (innerError) {
                // Probablemente ya existe
            }
        }
    }

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
            return await this.db.renovado_solicitud.findMany({
                include: {
                    fases: true,
                    rel_estacion: true,
                    _count: {
                        select: { incidencias: true }
                    }
                },
                orderBy: { created_at: 'desc' }
            });
        } catch (error: any) {
            throw new Error(`Error al obtener renovados: ${error.message || 'Desconocido'}`);
        }
    }

    async getPending() {
        try {
            // 1. Equipos en estado "Ingresado" o "Reservado" que tienen una evaluación vinculada
            const equipos = await this.db.equipo_ubicacion.findMany({
                where: { 
                    estado: { in: ['Ingresado', 'Reservado'] },
                    id_evaluacion: { not: null }
                },
                include: {
                    rel_evaluacion: {
                        include: {
                            entrada_detalle: {
                                select: {
                                    serial_equipo: true,
                                    modelo: true,
                                    clase: true,
                                    id_entrada: true
                                }
                            }
                        }
                    }
                }
            });

            const results = equipos
                .filter(e => e.rel_evaluacion?.estado_montacargas?.toLowerCase().includes('renov'))
                .map(e => ({
                    ...e,
                    id_detalle: e.rel_evaluacion?.id_detalle,
                    calificacion: e.rel_evaluacion?.estado_montacargas,
                    fecha_evaluacion: e.rel_evaluacion?.fecha_creacion,
                    modelo: e.rel_evaluacion?.entrada_detalle?.modelo,
                    clase: e.rel_evaluacion?.entrada_detalle?.clase,
                    id_entrada: e.rel_evaluacion?.entrada_detalle?.id_entrada
                }));

            return results;
        } catch (error: any) {
            console.error('[RenovadosService] Error in getPending:', error);
            throw new Error(`Error al obtener equipos pendientes: ${error.message}`);
        }
    }

    async findOne(id: string) {
        const renovado = await this.db.renovado_solicitud.findUnique({
            where: { id_solicitud: id },
            include: {
                fases: { orderBy: { orden: 'asc' } },
                refacciones: true,
                incidencias: { orderBy: { fecha_inicio: 'desc' } },
                rel_estacion: true
            }
        });
        if (!renovado) throw new NotFoundException('Solicitud de renovado no encontrada');

        const evaluacion = await this.db.evaluaciones_checklist.findFirst({
            where: {
                entrada_detalle: { serial_equipo: renovado.serial_equipo }
            },
            include: {
                entrada_detalle: true
            },
            orderBy: { fecha_creacion: 'desc' }
        });

        return {
            ...renovado,
            id_evaluacion: evaluacion?.id_evaluacion,
            id_detalle: evaluacion?.id_detalle,
            modelo: evaluacion?.entrada_detalle?.modelo
        };
    }

    async create(dto: CreateRenovadoDto) {
        const equipoStock = await this.db.equipo_ubicacion.findFirst({
            where: { 
                serial_equipo: dto.serial_equipo,
                OR: [{ stock: 'SI' }, { estado: 'Ingresado' }, { estado: 'Reservado' }]
            }
        });

        if (!equipoStock) {
            throw new BadRequestException('El equipo no se encuentra disponible para renovación o no existe');
        }

        if (dto.id_estacion) {
            const estacion = await this.db.taller_estacion.findUnique({
                where: { id_estacion: dto.id_estacion }
            });
            if (!estacion || estacion.ocupada) {
                throw new BadRequestException('La estación seleccionada no está disponible o no existe');
            }
        }

        try {
            const trueDate = new Date(dto.fecha_target);
            if (isNaN(trueDate.getTime())) {
                throw new BadRequestException('La fecha target no es válida');
            }

            return await this.db.$transaction(async (tx) => {
                const newRenovado = await tx.renovado_solicitud.create({
                    data: {
                        serial_equipo: dto.serial_equipo,
                        fecha_target: trueDate,
                        cliente: dto.cliente,
                        adc: dto.adc,
                        meses_fuera: dto.meses_fuera,
                        tecnico_responsable: dto.tecnico_responsable,
                        id_estacion: dto.id_estacion,
                        estado: 'En Proceso'
                    }
                });

                await tx.equipo_ubicacion.update({
                    where: { id_equipo_ubicacion: equipoStock.id_equipo_ubicacion },
                    data: { estado: 'En mantenimiento' }
                });

                if (dto.id_estacion) {
                    await tx.taller_estacion.update({
                        where: { id_estacion: dto.id_estacion },
                        data: { ocupada: true }
                    });
                }

                const fasesData = this.FASES_DEFAULT.map((nombre, index) => ({
                    id_solicitud: newRenovado.id_solicitud,
                    nombre_fase: nombre,
                    orden: index + 1,
                    tecnico: dto.tecnico_responsable,
                    estado: 'Sin iniciar'
                }));
                
                for (const fase of fasesData) {
                    await tx.renovado_fase.create({ data: fase });
                }

                return newRenovado;
            }, { timeout: 20000 });
        } catch (error: any) {
            console.error('[RenovadosService] Error creating renovado:', error);
            throw new Error(`Error al iniciar renovación: ${error.message || 'Error interno'}`);
        }
    }

    async startFase(idFase: string, tecnico: string) {
        const fase = await this.db.renovado_fase.findUnique({ where: { id_fase: idFase } });
        if (!fase) throw new NotFoundException('Fase no encontrada');

        const activePhase = await this.db.renovado_fase.findFirst({
            where: { id_solicitud: fase.id_solicitud, estado: 'En proceso' }
        });

        if (activePhase) {
            throw new BadRequestException('No se puede iniciar esta fase mientras exista otra en proceso.');
        }

        return this.db.renovado_fase.update({
            where: { id_fase: idFase },
            data: {
                fecha_inicio: new Date(),
                tecnico,
                completado: false,
                estado: 'En proceso'
            }
        });
    }

    async completeFase(idFase: string, nextPhaseName?: string) {
        const fase = await this.db.renovado_fase.findUnique({ 
            where: { id_fase: idFase },
            include: { solicitud: true }
        });
        if (!fase || !fase.fecha_inicio) throw new BadRequestException('La fase no ha sido iniciada');

        const fechaFin = new Date();
        const horas = this.calcularHorasLaborales(fase.fecha_inicio, fechaFin);

        return await this.db.$transaction(async (tx) => {
            return await tx.renovado_fase.update({
                where: { id_fase: idFase },
                data: {
                    fecha_fin: fechaFin,
                    horas_registradas: horas,
                    completado: true,
                    estado: 'Finalizada'
                }
            });
        });
    }

    async updateFaseEvidence(idFase: string, dto: { comentarios?: string, fotos?: any, foto_1?: string, foto_2?: string }) {
        const fase = await this.db.renovado_fase.findUnique({
            where: { id_fase: idFase },
            include: { solicitud: true }
        });
        
        if (!fase) throw new NotFoundException('Fase no encontrada');

        const site = this.prisma.currentSite?.toUpperCase() || 'R1';
        const folderPath = `${site}/Renovados/${fase.solicitud.serial_equipo}/${fase.nombre_fase}`;
        const updateData: any = { comentarios: dto.comentarios, fotos: dto.fotos };

        // Process foto_1 if it's base64
        if (dto.foto_1?.startsWith('data:image')) {
            const url = await this.storageService.uploadBase64Image(dto.foto_1, folderPath, 'foto_1');
            if (url) updateData.foto_1 = url;
        } else if (dto.foto_1) {
            updateData.foto_1 = dto.foto_1;
        }

        // Process foto_2 if it's base64
        if (dto.foto_2?.startsWith('data:image')) {
            const url = await this.storageService.uploadBase64Image(dto.foto_2, folderPath, 'foto_2');
            if (url) updateData.foto_2 = url;
        } else if (dto.foto_2) {
            updateData.foto_2 = dto.foto_2;
        }

        return this.db.renovado_fase.update({
            where: { id_fase: idFase },
            data: updateData
        });
    }

    async changeStation(idSolicitud: string, idEstacionNueva: string, motivo: string, usuarioQueCambia: string) {
        const solicitud = await this.db.renovado_solicitud.findUnique({
            where: { id_solicitud: idSolicitud }
        });
        if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

        return await this.db.$transaction(async (tx) => {
            // Free the old station
            if (solicitud.id_estacion) {
                await tx.taller_estacion.update({
                    where: { id_estacion: solicitud.id_estacion },
                    data: { ocupada: false }
                });
            }

            // Update to new station
            const updated = await tx.renovado_solicitud.update({
                where: { id_solicitud: idSolicitud },
                data: { id_estacion: idEstacionNueva }
            });

            // Mark new station occupied
            await tx.taller_estacion.update({
                where: { id_estacion: idEstacionNueva },
                data: { ocupada: true }
            });

            // Log it as an incidence for history tracking
            await tx.renovado_incidencia.create({
                data: {
                    id_solicitud: idSolicitud,
                    tipo: 'CAMBIO_ESTACION',
                    comentarios: `Cambio de estación de ${solicitud.id_estacion || 'Ninguna'} a ${idEstacionNueva} por: ${usuarioQueCambia}. Motivo: ${motivo}`,
                    fecha_fin: new Date(),
                    horas_laborales: 0
                }
            });

            return updated;
        });
    }

    async changeTechnician(idSolicitud: string, tecnicoNuevo: string, motivo: string, usuarioQueCambia: string) {
        const solicitud = await this.db.renovado_solicitud.findUnique({
            where: { id_solicitud: idSolicitud }
        });
        if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

        const tecnicoAnterior = solicitud.tecnico_responsable;

        return await this.db.$transaction(async (tx) => {
            // 1. Actualizar solicitud
            const updated = await tx.renovado_solicitud.update({
                where: { id_solicitud: idSolicitud },
                data: { tecnico_responsable: tecnicoNuevo }
            });

            // 2. Registrar log
            await tx.taller_cambio_tecnico_log.create({
                data: {
                    id_solicitud: idSolicitud,
                    tecnico_anterior: tecnicoAnterior,
                    tecnico_nuevo: tecnicoNuevo,
                    motivo,
                    usuario_que_cambia: usuarioQueCambia
                }
            });

            // 3. Opcional: Actualizar técnico en la fase activa si existe
            const faseActiva = await tx.renovado_fase.findFirst({
                where: { id_solicitud: idSolicitud, completado: false, fecha_inicio: { not: null } }
            });
            if (faseActiva) {
                await tx.renovado_fase.update({
                    where: { id_fase: faseActiva.id_fase },
                    data: { tecnico: tecnicoNuevo }
                });
            }

            return updated;
        });
    }

    async getTechnicianLogs(idSolicitud: string) {
        return this.db.taller_cambio_tecnico_log.findMany({
            where: { id_solicitud: idSolicitud },
            orderBy: { fecha: 'desc' }
        });
    }

    async addRefaccion(idSolicitud: string, dto: AddRefaccionDto) {
        try {
            // 1. Obtener datos de la solicitud para el serial
            const solicitud = await this.db.renovado_solicitud.findUnique({
                where: { id_solicitud: idSolicitud }
            });
            if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

            // 2. Buscar vinculación con equipo_ubicacion por serial
            const equipoUbicacion = await this.db.equipo_ubicacion.findFirst({
                where: { serial_equipo: solicitud.serial_equipo },
                orderBy: { id_equipo_ubicacion: 'desc' } // El más reciente
            });

            // 3. Buscar ID de refacción en el catálogo por nombre
            const refaccionBase = await this.db.refacciones.findFirst({
                where: { refaccion: dto.descripcion }
            });

            // 4. Intentar guardar en la tabla de la orden con precio_unitario (Prisma validará si existe en el cliente)
            const nuevaRefaccion = await this.db.renovado_refaccion.create({
                data: {
                    id_solicitud: idSolicitud,
                    area: dto.area,
                    descripcion: dto.descripcion,
                    cantidad: Number(dto.cantidad),
                    precio_unitario: Number(dto.precio_unitario || 0)
                } as any
            });

            // 5. SURTIR AUTOMÁTICAMENTE LA TABLA costos_refacciones
            if (equipoUbicacion && refaccionBase) {
                const costoTotal = Number(dto.precio_unitario || 0) * Number(dto.cantidad);
                await this.db.costos_refacciones.create({
                    data: {
                        id_equipo_ubicacion: equipoUbicacion.id_equipo_ubicacion,
                        id_refaccion: refaccionBase.id_refaccion,
                        precio: costoTotal
                    }
                });
                console.log(`[RenovadosService] Costo surtido para equipo ${solicitud.serial_equipo}`);
            }

            return nuevaRefaccion;
        } catch (error: any) {
            console.warn('[RenovadosService] Falló guardado con precio_unitario o vinculación de costos, reintentando básico:', error.message);
            
            // Fallback: guardar lo mínimo indispensable para no bloquear al usuario
            return await this.db.renovado_refaccion.create({
                data: {
                    id_solicitud: idSolicitud,
                    area: dto.area,
                    descripcion: dto.descripcion,
                    cantidad: Number(dto.cantidad)
                }
            });
        }
    }

    async createIncidencia(idSolicitud: string, dto: CreateIncidenciaDto) {
        // Si el tipo es "ESTACION LIBRE", deberíamos liberar la estación asociada a la solicitud
        if (dto.tipo === 'ESTACION LIBRE') {
            const solicitud = await this.db.renovado_solicitud.findUnique({
                where: { id_solicitud: idSolicitud }
            });
            if (solicitud?.id_estacion) {
                await this.db.taller_estacion.update({
                    where: { id_estacion: solicitud.id_estacion },
                    data: { ocupada: false }
                });
            }
        }

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

            // 3. Liberar estación si tenía una asignada
            if (solicitud.id_estacion) {
                await tx.taller_estacion.update({
                    where: { id_estacion: solicitud.id_estacion },
                    data: { ocupada: false }
                });
            }

            // TODO: Enviar correo automático

            return updated;
        });
    }

    async startOrder(idSolicitud: string) {
        const solicitud = await this.db.renovado_solicitud.findUnique({
            where: { id_solicitud: idSolicitud }
        });

        if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

        return this.db.renovado_solicitud.update({
            where: { id_solicitud: idSolicitud },
            data: { estado: 'En Proceso' }
        });
    }

    /**
     * Calcula las horas laborales entre dos fechas.
     * Considera L-V y un máximo de 6 horas por día.
     */
    private calcularHorasLaborales(inicio: Date, fin: Date): number {
        const HORA_INICIO = 8; // 8:00 AM
        const HORA_FIN = 17;   // 5:00 PM (9 horas totales por día)
        
        let totalHoras = 0;
        let current = new Date(inicio);
        const end = new Date(fin);

        while (current < end) {
            const dayOfWeek = current.getDay();
            // Lunes (1) a Viernes (5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                const startOfWork = new Date(current);
                startOfWork.setHours(HORA_INICIO, 0, 0, 0);
                
                const endOfWork = new Date(current);
                endOfWork.setHours(HORA_FIN, 0, 0, 0);

                // Intersección entre el horario laboral y el tiempo transcurrido
                const overlapStart = new Date(Math.max(current.getTime(), startOfWork.getTime()));
                const overlapEnd = new Date(Math.min(end.getTime(), endOfWork.getTime()));

                if (overlapStart < overlapEnd) {
                    const diffMs = overlapEnd.getTime() - overlapStart.getTime();
                    totalHoras += diffMs / (1000 * 60 * 60);
                }
            }
            // Avanzar al siguiente día a la medianoche para el siguiente ciclo del bucle
            current = new Date(current);
            current.setDate(current.getDate() + 1);
            current.setHours(0, 0, 0, 0);
        }

        return Math.round(totalHoras * 100) / 100;
    }
    async getEstaciones() {
        return await this.db.taller_estacion.findMany({
            orderBy: { nombre: 'asc' }
        });
    }

    async seedEstaciones() {
        const total = 12;
        const exists = await this.db.taller_estacion.count();
        if (exists > 0) return { message: 'Estaciones ya inicializadas' };

        const data = Array.from({ length: total }, (_, i) => ({
            id_estacion: `EST-${i + 1}`,
            nombre: `Estacion ${i + 1}`,
            ocupada: false
        }));

        await this.db.taller_estacion.createMany({ data });
        return { message: `${total} estaciones creadas` };
    }
}
