import { PrismaClient as PrismaR1 } from '@prisma-r1';
import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { TallerR1MailService } from './mail.service';

export interface CreateRenovadoDto {
    serial_equipo: string;
    fecha_target: Date;
    cliente?: string;
    adc?: string;
    meses_fuera: string; // 1-3, 4-6, 6-12, 12+
    tecnico_responsable?: string;
    id_estacion?: string;
}

export interface AddRefaccionDto {
    area: string;
    descripcion: string;
    cantidad: number;
    precio_unitario?: number;
}

export interface CreateIncidenciaDto {
    tipo: string;
    comentarios?: string;
}

@Injectable()
export class RenovadosService implements OnModuleInit {
    constructor(private prisma: PrismaDynamicService) { }

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
            // Usamos el nuevo campo id_evaluacion para una consulta directa y limpia
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

            // 2. Filtrar por los que tengan "Renovación" en la evaluación y mapear
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
        return renovado;
    }

    async create(dto: CreateRenovadoDto) {
        // 1. Validar que el equipo exista y esté en stock, ingresado o reservado
        const equipoStock = await this.db.equipo_ubicacion.findFirst({
            where: { 
                serial_equipo: dto.serial_equipo,
                OR: [{ stock: 'SI' }, { estado: 'Ingresado' }, { estado: 'Reservado' }]
            }
        });

        if (!equipoStock) {
            throw new BadRequestException('El equipo no se encuentra disponible para renovación o no existe');
        }

        // 1.1 Validar que la estación esté disponible si se proporcionó una
        if (dto.id_estacion) {
            const estacion = await this.db.taller_estacion.findUnique({
                where: { id_estacion: dto.id_estacion }
            });
            if (!estacion || estacion.ocupada) {
                throw new BadRequestException('La estación seleccionada no está disponible o no existe');
            }
        }

        // 2. Transacción para crear solicitud y cambiar estado del equipo
        try {
            return await this.db.$transaction(async (tx) => {
                // Crear solicitud
                const newRenovado = await tx.renovado_solicitud.create({
                    data: {
                        serial_equipo: dto.serial_equipo,
                        fecha_target: dto.fecha_target,
                        cliente: dto.cliente,
                        adc: dto.adc,
                        meses_fuera: dto.meses_fuera,
                        tecnico_responsable: dto.tecnico_responsable,
                        id_estacion: dto.id_estacion,
                        estado: 'En Proceso'
                    }
                });

                // Cambiar estado del equipo en ubicacion
                await tx.equipo_ubicacion.update({
                    where: { id_equipo_ubicacion: equipoStock.id_equipo_ubicacion },
                    data: { estado: 'En mantenimiento' }
                });

                // Marcar estación como ocupada
                if (dto.id_estacion) {
                    await tx.taller_estacion.update({
                        where: { id_estacion: dto.id_estacion },
                        data: { ocupada: true }
                    });
                }

                // Crear todas las fases iniciales
                const fasesData = this.FASES_DEFAULT.map((nombre, index) => ({
                    id_solicitud: newRenovado.id_solicitud,
                    nombre_fase: nombre,
                    orden: index + 1,
                    tecnico: dto.tecnico_responsable,
                    estado: 'Sin iniciar'
                }));
                
                await tx.renovado_fase.createMany({
                    data: fasesData
                });

                return newRenovado;
            });
        } catch (error: any) {
            console.error('[RenovadosService] Error creating renovado:', error);
            throw new Error(`Error al iniciar renovación: ${error.message}`);
        }
    }

    async startFase(idFase: string, tecnico: string) {
        const fase = await this.db.renovado_fase.findUnique({ where: { id_fase: idFase } });
        if (!fase) throw new NotFoundException('Fase no encontrada');

        const activePhase = await this.db.renovado_fase.findFirst({
            where: { id_solicitud: fase.id_solicitud, estado: 'En proceso' }
        });

        if (activePhase) {
            throw new BadRequestException('No se puede iniciar esta fase mientras exista otra en proceso. Finalícela primero.');
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
            // 1. Completar fase actual
            const completed = await tx.renovado_fase.update({
                where: { id_fase: idFase },
                data: {
                    fecha_fin: fechaFin,
                    horas_registradas: horas,
                    completado: true,
                    estado: 'Finalizada'
                }
            });

            // 2. Ya no se crea la siguiente fase dinámicamente,
            // las fases ya están pre-creadas. Ignoramos nextPhaseName.
            return completed;
        });
    }

    async updateFaseEvidence(idFase: string, dto: { comentarios?: string, fotos?: any, foto_1?: string, foto_2?: string }) {
        return this.db.renovado_fase.update({
            where: { id_fase: idFase },
            data: {
                comentarios: dto.comentarios,
                fotos: dto.fotos,
                foto_1: dto.foto_1,
                foto_2: dto.foto_2
            }
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
                await this.db.costos_refacciones.create({
                    data: {
                        id_equipo_ubicacion: equipoUbicacion.id_equipo_ubicacion,
                        id_refaccion: refaccionBase.id_refaccion,
                        precio: Number(dto.precio_unitario || 0)
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
