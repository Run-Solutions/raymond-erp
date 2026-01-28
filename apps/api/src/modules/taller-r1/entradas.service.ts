import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';

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

@Injectable()
export class EntradasService {
    constructor(private prisma: PrismaTallerR1Service) { }

    // Obtener todas las entradas
    async findAll(estado?: string) {
        const where = estado ? { estado } : {};
        return this.prisma.entradas.findMany({
            where,
            orderBy: { fecha_creacion: 'desc' },
        });
    }

    // Obtener una entrada por ID
    async findOne(id: string) {
        return this.prisma.entradas.findUnique({
            where: { id_entrada: id },
        });
    }

    // Crear una nueva entrada
    async create(data: CreateEntradaDto) {
        const id_entrada = `ENT-${Date.now()}`;

        return this.prisma.entradas.create({
            data: {
                id_entrada,
                ...data,
            },
        });
    }

    // Actualizar una entrada
    async update(id: string, data: UpdateEntradaDto) {
        return this.prisma.entradas.update({
            where: { id_entrada: id },
            data,
        });
    }

    // Eliminar una entrada
    async remove(id: string) {
        return this.prisma.entradas.delete({
            where: { id_entrada: id },
        });
    }

    // Obtener detalles de una entrada
    async getDetalles(id_entrada: string) {
        return this.prisma.entrada_detalle.findMany({
            where: { id_entrada },
        });
    }

    // Obtener accesorios de una entrada
    async getAccesorios(id_entrada: string) {
        return this.prisma.entrada_accesorios.findMany({
            where: { id_entrada },
        });
    }
}
