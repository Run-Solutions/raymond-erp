import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';

export interface CreateSalidaDto {
    folio: string;
    fecha_transporte: Date;
    numero_transporte?: string;
    estado: string;
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

@Injectable()
export class SalidasService {
    constructor(private prisma: PrismaTallerR1Service) { }

    // Obtener todas las salidas
    async findAll(estado?: string) {
        const where = estado ? { estado } : {};
        return this.prisma.salidas.findMany({
            where,
            orderBy: { fecha_creacion: 'desc' },
        });
    }

    // Obtener una salida por ID
    async findOne(id: string) {
        return this.prisma.salidas.findUnique({
            where: { id_salida: id },
        });
    }

    // Crear una nueva salida
    async create(data: CreateSalidaDto) {
        const id_salida = `SAL-${Date.now()}`;
        const fecha_creacion = new Date();

        return this.prisma.salidas.create({
            data: {
                id_salida,
                fecha_creacion,
                ...data,
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
