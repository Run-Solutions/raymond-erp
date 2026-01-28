import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateAccesorioDto {
    tipo?: string;
    modelo?: string;
    serial?: string;
    rack?: string;
    estado_acc?: string;
    fecha_ingreso?: Date;
    evidencia?: string;
    estado?: string;
    ubicacion?: string;
    sub_ubicacion?: string;
}

@Injectable()
export class AccesoriosService {
    constructor(private prisma: PrismaTallerR1Service) { }

    async findAll() {
        return this.prisma.entrada_accesorios.findMany();
    }

    async create(data: CreateAccesorioDto) {
        return this.prisma.entrada_accesorios.create({
            data: {
                id_accesorio: uuidv4(),
                ...data,
                fecha_ingreso: data.fecha_ingreso || new Date(),
            },
        });
    }

    async update(id: string, data: Partial<CreateAccesorioDto>) {
        return this.prisma.entrada_accesorios.update({
            where: { id_accesorio: id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.entrada_accesorios.delete({
            where: { id_accesorio: id },
        });
    }
}
