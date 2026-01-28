import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateEquipoDto {
    numero_serie?: string;
    clase: string;
    modelo?: string;
    descripcion?: string;
    estado: string;
    marca?: string;
}

@Injectable()
export class EquiposService {
    constructor(private prisma: PrismaTallerR1Service) { }

    async findAll() {
        return this.prisma.equipos.findMany();
    }

    async findOne(id: string) {
        return this.prisma.equipos.findUnique({
            where: { id_equipos: id },
        });
    }

    async create(data: CreateEquipoDto) {
        return this.prisma.equipos.create({
            data: {
                id_equipos: uuidv4(),
                ...data,
            },
        });
    }

    async update(id: string, data: Partial<CreateEquipoDto>) {
        return this.prisma.equipos.update({
            where: { id_equipos: id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.equipos.delete({
            where: { id_equipos: id },
        });
    }
}
