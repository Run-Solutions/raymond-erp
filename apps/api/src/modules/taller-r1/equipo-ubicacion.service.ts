import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateEquipoUbicacionDto {
    id_equipos?: string;
    id_ubicacion?: string;
    stock: string;
    id_sub_ubicacion?: string;
    estado?: string;
    fecha_entrada?: string;
    serial_equipo?: string;
    vendedor?: string;
}

@Injectable()
export class EquipoUbicacionService {
    constructor(private prisma: PrismaTallerR1Service) { }

    async findAll() {
        return this.prisma.equipo_ubicacion.findMany({
            include: {
                // Since this is a custom prisma client, I should check if relations are defined
                // Based on the schema provided, there are no explicit relations defined with 'relation' keyword
                // but let's try a simple join if we had them or just return the data.
            }
        });
    }

    async create(data: CreateEquipoUbicacionDto) {
        return this.prisma.equipo_ubicacion.create({
            data: {
                id_equipo_ubicacion: uuidv4(),
                ...data,
            },
        });
    }

    async update(id: string, data: Partial<CreateEquipoUbicacionDto>) {
        return this.prisma.equipo_ubicacion.update({
            where: { id_equipo_ubicacion: id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.equipo_ubicacion.delete({
            where: { id_equipo_ubicacion: id },
        });
    }
}
