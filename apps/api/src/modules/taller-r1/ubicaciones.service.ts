import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUbicacionDto {
    nombre_ubicacion: string;
    maximo_stock: number;
    Clase?: string;
}

@Injectable()
export class UbicacionesService {
    constructor(private prisma: PrismaTallerR1Service) { }

    async findAll() {
        return this.prisma.ubicacion.findMany();
    }

    async create(data: CreateUbicacionDto) {
        return this.prisma.ubicacion.create({
            data: {
                id_ubicacion: uuidv4(),
                ...data,
            },
        });
    }

    async update(id: string, data: Partial<CreateUbicacionDto>) {
        return this.prisma.ubicacion.update({
            where: { id_ubicacion: id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.ubicacion.delete({
            where: { id_ubicacion: id },
        });
    }
}
