import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
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
}

export interface CreateDetalleDto {
    id_equipo: string;
    tipo_salida: 'Renta' | 'Venta' | 'Embarque';
    serial_equipos?: string;
    id_ubicacion?: string;
    id_sub_ubicacion?: string;
    aditamentos?: string;
}

export interface CreateAccesorioDto {
    id_accesorio: string;
    modelo?: string;
    serial?: string;
    voltaje?: number;
    aditamentos?: string;
}

@Injectable()
export class SalidasService {
    constructor(private prisma: PrismaTallerR1Service) { }

    // Generate next folio with S- prefix
    async generateFolio(): Promise<string> {
        const lastSalida = await this.prisma.salidas.findFirst({
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
        return this.prisma.salidas.findMany({
            where,
            orderBy: { fecha_creacion: 'desc' },
        });
    }

    // Obtener una salida por ID con todos los detalles
    async findOne(id: string) {
        const salida = await this.prisma.salidas.findUnique({
            where: { id_salida: id },
        });

        if (!salida) {
            throw new NotFoundException(`Salida ${id} no encontrada`);
        }

        const detalles = await this.prisma.salida_detalle.findMany({
            where: { id_salida: id },
        });

        const accesorios = await this.prisma.salida_accesorios.findMany({
            where: {
                id_detalle: {
                    in: detalles.map(d => d.id_detalle)
                }
            },
        });

        return {
            ...salida,
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

        return this.prisma.salidas.create({
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
            },
        });
    }

    // Agregar equipo a la salida
    async createDetalle(id_salida: string, data: CreateDetalleDto) {
        const salida = await this.prisma.salidas.findUnique({
            where: { id_salida }
        });

        if (!salida) {
            throw new NotFoundException(`Salida ${id_salida} no encontrada`);
        }

        const id_detalle = uuidv4();

        return this.prisma.salida_detalle.create({
            data: {
                id_detalle,
                id_salida,
                id_equipo: data.id_equipo,
                tipo_salida: data.tipo_salida,
                serial_equipos: data.serial_equipos,
                id_ubicacion: data.id_ubicacion,
                id_sub_ubicacion: data.id_sub_ubicacion,
                aditamentos: data.aditamentos,
                cantidad_salida: 1,
            },
        });
    }

    // Agregar accesorio a la salida
    async createAccesorio(id_salida: string, data: CreateAccesorioDto) {
        // First, get a detalle from this salida to link the accessory
        const detalles = await this.prisma.salida_detalle.findMany({
            where: { id_salida },
            take: 1
        });

        let id_detalle: string;

        if (detalles.length === 0) {
            // Create a dummy detalle for accessories
            const newDetalle = await this.prisma.salida_detalle.create({
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

        return this.prisma.salida_accesorios.create({
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

    // Get available equipment (estado = Ingresado)
    async getAvailableEquipos() {
        return this.prisma.entrada_detalle.findMany({
            where: {
                estado: {
                    in: ['Ingresado', 'INGRESADO', 'Ubicado']
                }
            },
            orderBy: { fecha: 'desc' }
        });
    }

    // Get available accessories (estado_acc = Ingresado)
    async getAvailableAccesorios() {
        return this.prisma.entrada_accesorios.findMany({
            where: {
                OR: [
                    { estado_acc: 'Ingresado' },
                    { estado: 'Ingresado' },
                    { estado_acc: 'Ubicado' },
                    { estado: 'Ubicado' }
                ]
            },
            orderBy: { fecha_ingreso: 'desc' }
        });
    }

    // Scan QR - lookup by serial
    async scanSerial(serial: string) {
        // Try to find in equipment first
        const equipo = await this.prisma.entrada_detalle.findFirst({
            where: {
                serial_equipo: serial,
                estado: 'Ingresado'
            }
        });

        if (equipo) {
            return {
                type: 'equipo',
                data: equipo
            };
        }

        // Try accessories
        const accesorio = await this.prisma.entrada_accesorios.findFirst({
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
        return this.prisma.salidas.update({
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
        const equipoIds = salida.detalles
            .filter(d => d.id_equipo)
            .map(d => d.id_equipo);

        if (equipoIds.length > 0) {
            await this.prisma.entrada_detalle.updateMany({
                where: {
                    id_detalles: { in: equipoIds }
                },
                data: {
                    estado: 'Retirados'
                }
            });
        }

        // Update all accessories to Retirados
        const accesorioIds = salida.accesorios.map(a => a.accesorio_id);

        if (accesorioIds.length > 0) {
            await this.prisma.entrada_accesorios.updateMany({
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
        return this.prisma.salidas.update({
            where: { id_salida: id },
            data: {
                estado: 'Entregado'
            },
        });
    }

    // Actualizar una salida
    async update(id: string, data: UpdateSalidaDto) {
        return this.prisma.salidas.update({
            where: { id_salida: id },
            data,
        });
    }

    // Eliminar una salida
    async remove(id: string) {
        // First delete related detalles and accesorios
        const detalles = await this.prisma.salida_detalle.findMany({
            where: { id_salida: id }
        });

        const detalleIds = detalles.map(d => d.id_detalle);

        if (detalleIds.length > 0) {
            await this.prisma.salida_accesorios.deleteMany({
                where: { id_detalle: { in: detalleIds } }
            });

            await this.prisma.salida_detalle.deleteMany({
                where: { id_salida: id }
            });
        }

        return this.prisma.salidas.delete({
            where: { id_salida: id },
        });
    }

    // Obtener detalles de una salida
    async getDetalles(id_salida: string) {
        return this.prisma.salida_detalle.findMany({
            where: { id_salida },
        });
    }

    // Obtener accesorios de una salida
    async getAccesorios(id_detalle: string) {
        return this.prisma.salida_accesorios.findMany({
            where: { id_detalle },
        });
    }
}
