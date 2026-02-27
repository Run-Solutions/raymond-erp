import { PrismaClient as PrismaR1 } from '.prisma/client-taller-r1';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface CreateSalidaDto {
    tiene_remision: boolean;
    numero_remision?: string;
    numero_transporte?: string;
    pedido_venta?: string;
    cliente?: string;
    tipo_elemento: 'Equipos' | 'Accesorios';
    observaciones?: string;
    evidencia?: string;
    razon_social?: string;
    direccion_cliente?: string;
    rfc?: string;
    contacto?: string;
    telefono?: string;
    destino?: string;
}

export interface UpdateSalidaDto {
    fecha_transporte?: Date;
    numero_transporte?: string;
    estado?: string;
    cliente?: string;
    firma?: string;
    evidencia?: string;
    usuario_asignado?: string;
    firma_usuario?: string;
    comentario?: string;
    nombre_recibe?: string;
    elemento?: string;
    carta_instruccion?: string;
    pedido?: string;
    razon_social?: string;
    direccion_cliente?: string;
    rfc?: string;
    contacto?: string;
    telefono?: string;
    remision?: string;
    adc?: string;
    oc?: string;
    observaciones?: string;
    remision_confirmacion?: number;
    destino?: string;
}

export interface CreateDetalleDto {
    id_equipo: string;
    id_equipo_ubicacion?: string;
    tipo_salida: 'Renta' | 'Venta' | 'Embarque';
    serial_equipos?: string;
    id_ubicacion?: string;
    id_sub_ubicacion?: string;
    aditamentos?: string;
    foto_llave?: string;
    foto_kit_tapon?: string;
    foto_compartimento_baterias?: string;
    foto_lineas_vida?: string;
    foto_compartimento_operador?: string;
    foto_pernos_horquillas?: string;
    foto_clamp_opc?: string;
    foto_frente_equipo?: string;
    foto_posterior_equipo?: string;
    foto_kit_aceite?: string;
    checklist_entrega?: any;
}

export interface CreateAccesorioDto {
    id_accesorio: string;
    modelo?: string;
    serial?: string;
    voltaje?: number;
    aditamentos?: string;
}

import { PrismaDynamicService } from '../../database/prisma-dynamic.service';

@Injectable()
export class SalidasService {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }

    // Generate next folio with S- prefix
    async generateFolio(): Promise<string> {
        const lastSalida = await this.db.salidas.findFirst({
            orderBy: { fecha_creacion: 'desc' },
            select: { folio: true }
        });

        if (!lastSalida || !lastSalida.folio) {
            return 'S-001';
        }

        const match = lastSalida.folio.match(/S-(\d+)/);
        if (!match) {
            return 'S-001';
        }

        const nextNumber = parseInt(match[1], 10) + 1;
        return `S-${String(nextNumber).padStart(3, '0')}`;
    }

    // Obtener todas las salidas con detalles
    async findAll(estado?: string) {
        const where = estado ? { estado } : {};
        return this.db.salidas.findMany({
            where,
            orderBy: { fecha_creacion: 'desc' },
        });
    }

    // Obtener una salida por ID con todos los detalles
    async findOne(id: string) {
        const salida = await this.db.salidas.findUnique({
            where: { id_salida: id },
        });

        if (!salida) {
            throw new NotFoundException(`Salida ${id} no encontrada`);
        }

        // Fetch client name if not already in salida record
        let clientName = salida.razon_social;
        if (!clientName && salida.cliente) {
            const client = await this.db.cliente.findUnique({
                where: { id_cliente: salida.cliente },
                select: { razon_social: true, nombre_cliente: true }
            });
            clientName = client?.razon_social || client?.nombre_cliente || salida.cliente;
        }

        const detallesRaw = await this.db.salida_detalle.findMany({
            where: { id_salida: id },
        });

        const accesoriosRaw = await this.db.salida_accesorios.findMany({
            where: {
                id_detalle: {
                    in: detallesRaw.map(d => d.id_detalle)
                }
            },
        });

        // Fetch all location names at once for performance
        const ubicacionIds = [...new Set([
            ...detallesRaw.map(d => d.id_ubicacion).filter(Boolean),
            // Accessories don't have location directly in salida_accesorios schema but might be needed if structure changes
        ] as string[])];

        const subUbicacionIds = [...new Set([
            ...detallesRaw.map(d => d.id_sub_ubicacion).filter(Boolean),
        ] as string[])];

        const [ubicaciones, subUbicaciones] = await Promise.all([
            this.db.ubicacion.findMany({
                where: { id_ubicacion: { in: ubicacionIds } },
                select: { id_ubicacion: true, nombre_ubicacion: true }
            }),
            this.db.sub_ubicaciones.findMany({
                where: { id_sub_ubicacion: { in: subUbicacionIds } },
                select: { id_sub_ubicacion: true, nombre: true }
            })
        ]);

        const ubicacionMap = new Map(ubicaciones.map(u => [u.id_ubicacion, u.nombre_ubicacion]));
        const subUbicacionMap = new Map(subUbicaciones.map(s => [s.id_sub_ubicacion, s.nombre]));

        const detalles = detallesRaw.map(d => ({
            ...d,
            nombre_ubicacion: (d.id_ubicacion && ubicacionMap.get(d.id_ubicacion)) || d.id_ubicacion,
            nombre_sub_ubicacion: (d.id_sub_ubicacion && subUbicacionMap.get(d.id_sub_ubicacion)) || d.id_sub_ubicacion,
        }));

        // For accessories, they are linked to a detail. Let's see if we need to enrich them too
        // Based on schema, accessories don't have location in salida_accesorios
        const accesorios = accesoriosRaw;

        return {
            ...salida,
            razon_social: clientName,
            detalles,
            accesorios
        };
    }

    // Crear una nueva salida
    async create(data: CreateSalidaDto) {
        const id_salida = uuidv4();
        const folio = await this.generateFolio();
        const fecha_creacion = new Date();
        const fecha_transporte = new Date();

        // Determine initial status
        const estado = data.tiene_remision ? 'Por Entregar' : 'En espera de remisión';

        return this.db.salidas.create({
            data: {
                id_salida,
                folio,
                fecha_creacion,
                fecha_transporte,
                estado,
                numero_transporte: data.numero_transporte,
                pedido: data.pedido_venta,
                cliente: data.cliente,
                elemento: data.tipo_elemento,
                observaciones: data.observaciones,
                evidencia: data.evidencia,
                remision: data.numero_remision,
                remision_confirmacion: data.tiene_remision ? 1 : 0,
                razon_social: data.razon_social,
                direccion_cliente: data.direccion_cliente,
                rfc: data.rfc,
                contacto: data.contacto,
                telefono: data.telefono,
                destino: data.destino,
                usuario_asignado: this.prisma.currentUser?.substring(0, 100),
            },
        });
    }

    // Agregar equipo a la salida
    async createDetalle(id_salida: string, data: CreateDetalleDto) {
        console.log('[createDetalle] id_salida:', id_salida);
        console.log('[createDetalle] data keys:', Object.keys(data));
        console.log('[createDetalle] id_equipo:', data.id_equipo);
        console.log('[createDetalle] id_equipo_ubicacion:', data.id_equipo_ubicacion, 'length:', data.id_equipo_ubicacion?.length);
        console.log('[createDetalle] id_sub_ubicacion:', data.id_sub_ubicacion, 'length:', data.id_sub_ubicacion?.length);

        const salida = await this.db.salidas.findUnique({
            where: { id_salida }
        });

        if (!salida) {
            throw new NotFoundException(`Salida ${id_salida} no encontrada`);
        }

        const id_detalle = uuidv4();

        try {
            return await this.db.salida_detalle.create({
                data: {
                    id_detalle,
                    id_salida,
                    id_equipo: data.id_equipo,
                    id_equipo_ubicacion: data.id_equipo_ubicacion,
                    tipo_salida: data.tipo_salida,
                    serial_equipos: data.serial_equipos,
                    id_ubicacion: data.id_ubicacion,
                    id_sub_ubicacion: data.id_sub_ubicacion,
                    aditamentos: data.aditamentos,
                    cantidad_salida: 1,
                    foto_llave: data.foto_llave,
                    foto_kit_tapon: data.foto_kit_tapon,
                    foto_compartimento_baterias: data.foto_compartimento_baterias,
                    foto_lineas_vida: data.foto_lineas_vida,
                    foto_compartimento_operador: data.foto_compartimento_operador,
                    foto_pernos_horquillas: data.foto_pernos_horquillas,
                    foto_clamp_opc: data.foto_clamp_opc,
                    foto_frente_equipo: data.foto_frente_equipo,
                    foto_posterior_equipo: data.foto_posterior_equipo,
                    foto_kit_aceite: data.foto_kit_aceite,
                    checklist_entrega: data.checklist_entrega,
                },
            });
        } catch (err: any) {
            console.error('[createDetalle] Prisma error:', err?.message);
            console.error('[createDetalle] Prisma error code:', err?.code);
            console.error('[createDetalle] Prisma meta:', JSON.stringify(err?.meta));
            throw err;
        }
    }

    // Agregar accesorio a la salida
    async createAccesorio(id_salida: string, data: CreateAccesorioDto) {
        // First, get a detalle from this salida to link the accessory
        const detalles = await this.db.salida_detalle.findMany({
            where: { id_salida },
            take: 1
        });

        let id_detalle: string;

        if (detalles.length === 0) {
            // Create a dummy detalle for accessories
            const newDetalle = await this.db.salida_detalle.create({
                data: {
                    id_detalle: uuidv4(),
                    id_salida,
                    cantidad_salida: 0,
                }
            });
            id_detalle = newDetalle.id_detalle;
        } else {
            id_detalle = detalles[0].id_detalle;
        }

        const id_accesorio_salida = uuidv4();

        return this.db.salida_accesorios.create({
            data: {
                id_accesorio: id_accesorio_salida,
                accesorio_id: data.id_accesorio,
                id_detalle,
                modelo: data.modelo,
                serial: data.serial,
                voltaje: data.voltaje,
                aditamentos: data.aditamentos,
            },
        });
    }

    // Get available equipment (estado = Ingresado and not in active Salida)
    async getAvailableEquipos() {
        // Find active Salidas
        const activeSalidas = await this.db.salidas.findMany({
            where: { estado: { not: 'Entregado' } },
            select: { id_salida: true }
        });
        const activeSalidaIds = activeSalidas.map(s => s.id_salida);

        // Find equipment currently in active Salidas
        const activeDetalles = await this.db.salida_detalle.findMany({
            where: { id_salida: { in: activeSalidaIds } },
            select: { id_equipo: true, serial_equipos: true }
        });
        const excludedEquipoIds = activeDetalles.map(d => d.id_equipo).filter(Boolean) as string[];
        const excludedSerials = activeDetalles.map(d => d.serial_equipos).filter(Boolean) as string[];

        const equipos_ubicacion = await this.db.equipo_ubicacion.findMany({
            where: {
                estado: {
                    in: ['Ingresado', 'INGRESADO', 'Ubicado', 'Ingresados', 'INGRESADOS', 'Ubicados']
                },
                id_equipos: excludedEquipoIds.length > 0 ? { notIn: excludedEquipoIds } : undefined,
                serial_equipo: excludedSerials.length > 0 ? { notIn: excludedSerials } : undefined
            },
            orderBy: { fecha_entrada: 'desc' }
        });

        if (equipos_ubicacion.length === 0) return [];

        // Batch IDs to avoid O(N) queries
        const equipoIds = [...new Set(equipos_ubicacion.map(e => e.id_equipos).filter(Boolean) as string[])];
        const ubicacionIds = [...new Set(equipos_ubicacion.map(e => e.id_ubicacion).filter(Boolean) as string[])];
        const subUbicacionIds = [...new Set(equipos_ubicacion.map(e => e.id_sub_ubicacion).filter(Boolean) as string[])];

        // Fetch all related info at once
        const [equiposInfo, ubicacionesInfo, subUbicacionesInfo] = await Promise.all([
            this.db.equipos.findMany({
                where: { id_equipos: { in: equipoIds } },
                select: { id_equipos: true, modelo: true }
            }),
            this.db.ubicacion.findMany({
                where: { id_ubicacion: { in: ubicacionIds } },
                select: { id_ubicacion: true, nombre_ubicacion: true }
            }),
            this.db.sub_ubicaciones.findMany({
                where: { id_sub_ubicacion: { in: subUbicacionIds } },
                select: { id_sub_ubicacion: true, nombre: true }
            })
        ]);

        // Maps for O(1) lookups
        const equipoMap = new Map(equiposInfo.map(e => [e.id_equipos, e.modelo]));
        const ubicacionMap = new Map(ubicacionesInfo.map(u => [u.id_ubicacion, u.nombre_ubicacion]));
        const subUbicacionMap = new Map(subUbicacionesInfo.map(s => [s.id_sub_ubicacion, s.nombre]));

        return equipos_ubicacion.map(e => {
            const uName = (e.id_ubicacion && ubicacionMap.get(e.id_ubicacion)) || e.id_ubicacion || 'ALMACÉN';
            const sName = (e.id_sub_ubicacion && subUbicacionMap.get(e.id_sub_ubicacion)) || e.id_sub_ubicacion || '';
            const fullLocation = sName ? `${uName} - ${sName}` : uName;

            return {
                id_detalles: e.id_equipos,
                id_equipo_ubicacion: e.id_equipo_ubicacion,
                serial_equipo: e.serial_equipo,
                id_ubicacion: e.id_ubicacion,
                nombre_ubicacion: fullLocation,
                id_sub_ubicacion: e.id_sub_ubicacion,
                estado: e.estado,
                modelo: (e.id_equipos && equipoMap.get(e.id_equipos)) || 'S/M'
            };
        });
    }

    // Get available accessories (estado_acc = Ingresado and not in active Salida)
    async getAvailableAccesorios() {
        const activeSalidas = await this.db.salidas.findMany({
            where: { estado: { not: 'Entregado' } },
            select: { id_salida: true }
        });
        const activeSalidaIds = activeSalidas.map(s => s.id_salida);

        const activeDetalles = await this.db.salida_detalle.findMany({
            where: { id_salida: { in: activeSalidaIds } },
            select: { id_detalle: true }
        });
        const activeDetalleIds = activeDetalles.map(d => d.id_detalle);

        const activeAccesorios = await this.db.salida_accesorios.findMany({
            where: { id_detalle: { in: activeDetalleIds } },
            select: { accesorio_id: true, serial: true }
        });
        const excludedAccesorioIds = activeAccesorios.map(a => a.accesorio_id).filter(Boolean) as string[];
        const excludedSerials = activeAccesorios.map(a => a.serial).filter(Boolean) as string[];

        const accesorios = await this.db.entrada_accesorios.findMany({
            where: {
                OR: [
                    { estado_acc: 'Ingresado' },
                    { estado: 'Ingresado' },
                    { estado_acc: 'Ubicado' },
                    { estado: 'Ubicado' }
                ],
                id_accesorio: excludedAccesorioIds.length > 0 ? { notIn: excludedAccesorioIds } : undefined,
                serial: excludedSerials.length > 0 ? { notIn: excludedSerials } : undefined
            },
            orderBy: { fecha_ingreso: 'desc' }
        });

        if (accesorios.length === 0) return [];

        const ubicacionIds = [...new Set(accesorios.map(a => a.ubicacion).filter(Boolean) as string[])];
        const subUbicacionIds = [...new Set(accesorios.map(a => a.sub_ubicacion).filter(Boolean) as string[])];

        const [ubicacionesInfo, subUbicacionesInfo] = await Promise.all([
            this.db.ubicacion.findMany({
                where: { id_ubicacion: { in: ubicacionIds } },
                select: { id_ubicacion: true, nombre_ubicacion: true }
            }),
            this.db.sub_ubicaciones.findMany({
                where: { id_sub_ubicacion: { in: subUbicacionIds } },
                select: { id_sub_ubicacion: true, nombre: true }
            })
        ]);

        const ubicacionMap = new Map(ubicacionesInfo.map(u => [u.id_ubicacion, u.nombre_ubicacion]));
        const subUbicacionMap = new Map(subUbicacionesInfo.map(s => [s.id_sub_ubicacion, s.nombre]));

        return accesorios.map(a => {
            const uName = (a.ubicacion && ubicacionMap.get(a.ubicacion)) || a.ubicacion || 'ALMACÉN';
            const sName = (a.sub_ubicacion && subUbicacionMap.get(a.sub_ubicacion)) || a.sub_ubicacion || '';
            const fullLocation = sName ? `${uName} - ${sName}` : uName;

            return {
                ...a,
                nombre_ubicacion: fullLocation
            };
        });
    }

    // Scan QR - lookup by serial
    async scanSerial(serial: string) {
        // Find if it's already in an active Salida
        const activeSalidas = await this.db.salidas.findMany({
            where: { estado: { not: 'Entregado' } },
            select: { id_salida: true }
        });
        const activeSalidaIds = activeSalidas.map(s => s.id_salida);

        const activeDetalles = await this.db.salida_detalle.findMany({
            where: { id_salida: { in: activeSalidaIds } },
            select: { id_detalle: true, id_equipo: true, serial_equipos: true }
        });
        const activeDetalleIds = activeDetalles.map(d => d.id_detalle);

        const activeAccesorios = await this.db.salida_accesorios.findMany({
            where: { id_detalle: { in: activeDetalleIds } },
            select: { accesorio_id: true, serial: true }
        });

        const isEquipoActive = activeDetalles.some(d => d.serial_equipos === serial);
        const isAccesorioActive = activeAccesorios.some(a => a.serial === serial);

        if (isEquipoActive || isAccesorioActive) {
            throw new BadRequestException(`El elemento con serial ${serial} ya se encuentra asignado a una Salida en proceso`);
        }

        // Try to find in equipment first
        const equipo = await this.db.equipo_ubicacion.findFirst({
            where: {
                serial_equipo: serial,
                estado: {
                    in: ['Ingresado', 'INGRESADO', 'Ubicado', 'Ingresados', 'INGRESADOS', 'Ubicados']
                }
            }
        });

        if (equipo) {
            // Get detailed info for scan
            let nombre_ubicacion = equipo.id_ubicacion;
            if (equipo.id_ubicacion) {
                const u = await this.db.ubicacion.findUnique({
                    where: { id_ubicacion: equipo.id_ubicacion },
                    select: { nombre_ubicacion: true }
                });
                if (u) nombre_ubicacion = u.nombre_ubicacion;
            }

            let modelo = 'S/M';
            if (equipo.id_equipos) {
                const eq = await this.db.equipos.findUnique({
                    where: { id_equipos: equipo.id_equipos },
                    select: { modelo: true }
                });
                if (eq) modelo = eq.modelo;
            }

            return {
                type: 'equipo',
                data: {
                    id_detalles: equipo.id_equipos,
                    id_equipo_ubicacion: equipo.id_equipo_ubicacion,
                    serial_equipo: equipo.serial_equipo,
                    id_ubicacion: equipo.id_ubicacion,
                    nombre_ubicacion: nombre_ubicacion,
                    id_sub_ubicacion: equipo.id_sub_ubicacion,
                    estado: equipo.estado,
                    modelo: modelo
                }
            };
        }

        // Try accessories
        const accesorio = await this.db.entrada_accesorios.findFirst({
            where: {
                serial,
                estado_acc: 'Ingresado'
            }
        });

        if (accesorio) {
            return {
                type: 'accesorio',
                data: accesorio
            };
        }

        throw new NotFoundException(`No se encontró ningún elemento con serial ${serial} en estado Ingresado`);
    }

    // Update remission info and change status
    async updateRemision(id: string, remision: string) {
        return this.db.salidas.update({
            where: { id_salida: id },
            data: {
                remision,
                remision_confirmacion: 1,
                estado: 'Por Entregar'
            },
        });
    }

    // Close folio - update equipment/accessories to Retirados
    async cerrarFolio(id: string) {
        const salida = await this.findOne(id);

        if (!salida) {
            throw new NotFoundException(`Salida ${id} no encontrada`);
        }

        if (salida.estado === 'Entregado') {
            throw new BadRequestException('Esta salida ya está cerrada');
        }

        // Update all equipment in this exit to Retirados
        const equipoIDs = salida.detalles
            .filter(d => d.id_equipo)
            .map(d => d.id_equipo);

        const equipoUbicacionIDs = salida.detalles
            .filter(d => d.id_equipo_ubicacion)
            .map(d => d.id_equipo_ubicacion);

        if (equipoIDs.length > 0 || equipoUbicacionIDs.length > 0) {
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Update equipo_ubicacion
            await this.db.equipo_ubicacion.updateMany({
                where: {
                    OR: [
                        { id_equipos: { in: equipoIDs } },
                        { id_equipo_ubicacion: { in: equipoUbicacionIDs } }
                    ]
                },
                data: {
                    estado: 'Retirados',
                    fecha_salida: now,
                    usuario_salida: this.prisma.currentUser?.substring(0, 20) || 'Sistema'
                }
            });

            // Keep entrada_detalle updated for legacy reasons
            if (equipoIDs.length > 0) {
                await this.db.entrada_detalle.updateMany({
                    where: {
                        id_equipo: { in: equipoIDs }
                    },
                    data: {
                        estado: 'Retirados'
                    }
                });
            }
        }

        // Update all accessories to Retirados
        const accesorioIds = salida.accesorios.map(a => a.accesorio_id);

        if (accesorioIds.length > 0) {
            await this.db.entrada_accesorios.updateMany({
                where: {
                    id_accesorio: { in: accesorioIds }
                },
                data: {
                    estado_acc: 'Retirados',
                    estado: 'Retirados'
                }
            });
        }

        // Update salida status
        return this.db.salidas.update({
            where: { id_salida: id },
            data: {
                estado: 'Entregado'
            },
        });
    }

    // Actualizar una salida
    async update(id: string, data: UpdateSalidaDto) {
        return this.db.salidas.update({
            where: { id_salida: id },
            data,
        });
    }

    // Quitar un detalle (equipo) de la salida
    async removeDetalle(id_salida: string, id_detalle: string) {
        const salida = await this.findOne(id_salida);
        if (!salida) throw new NotFoundException('Salida no encontrada');
        if (salida.estado === 'Entregado') throw new BadRequestException('No se puede modificar una salida entregada');

        const detalle = await this.db.salida_detalle.findFirst({
            where: { id_detalle, id_salida }
        });
        if (!detalle) throw new NotFoundException('Elemento no encontrado en esta salida');

        // Delete associated accessories that used this id_detalle as parent
        await this.db.salida_accesorios.deleteMany({
            where: { id_detalle }
        });

        // Delete the detail itself
        return this.db.salida_detalle.delete({
            where: { id_detalle }
        });
    }

    // Quitar un accesorio de la salida
    async removeAccesorio(id_salida: string, id_accesorio: string) {
        const salida = await this.findOne(id_salida);
        if (!salida) throw new NotFoundException('Salida no encontrada');
        if (salida.estado === 'Entregado') throw new BadRequestException('No se puede modificar una salida entregada');

        // Note: id_accesorio here is the PK of salida_accesorios, OR we just delete by accesorio_id
        // The frontend will likely pass the accesorio_id (from the original accessory) or the id_accesorio (the link ID)
        // We'll delete by whichever matches either field for safety, ensuring it belongs to a detalle in this salida
        const detalleIds = salida.detalles.map(d => d.id_detalle);

        if (detalleIds.length === 0) throw new NotFoundException('El accesorio no pertenece a esta salida');

        const acc = await this.db.salida_accesorios.findFirst({
            where: {
                id_detalle: { in: detalleIds },
                OR: [
                    { id_accesorio: id_accesorio },
                    { accesorio_id: id_accesorio }
                ]
            }
        });

        if (!acc) throw new NotFoundException('Accesorio no encontrado en esta salida');

        return this.db.salida_accesorios.delete({
            where: { id_accesorio: acc.id_accesorio }
        });
    }

    // Eliminar una salida completa
    async remove(id: string) {
        // First delete related detalles and accesorios
        const detalles = await this.db.salida_detalle.findMany({
            where: { id_salida: id }
        });

        const detalleIds = detalles.map(d => d.id_detalle);

        if (detalleIds.length > 0) {
            await this.db.salida_accesorios.deleteMany({
                where: { id_detalle: { in: detalleIds } }
            });

            await this.db.salida_detalle.deleteMany({
                where: { id_salida: id }
            });
        }

        return this.db.salidas.delete({
            where: { id_salida: id },
        });
    }

    // Obtener detalles de una salida
    async getDetalles(id_salida: string) {
        return this.db.salida_detalle.findMany({
            where: { id_salida },
        });
    }

    // Obtener accesorios de una salida
    async getAccesorios(id_detalle: string) {
        return this.db.salida_accesorios.findMany({
            where: { id_detalle },
        });
    }
}
