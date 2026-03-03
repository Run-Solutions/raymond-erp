import { PrismaClient as PrismaR1 } from '@prisma/client-taller-r1';
import { Injectable } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
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
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }

    async findAll() {
        return this.db.equipos.findMany();
    }

    async findOne(id: string) {
        return this.db.equipos.findUnique({
            where: { id_equipos: id },
        });
    }

    async create(data: CreateEquipoDto) {
        return this.db.equipos.create({
            data: {
                id_equipos: uuidv4(),
                ...data,
                estado: data.estado || 'Por Ubicar',
            },
        });
    }

    async update(id: string, data: Partial<CreateEquipoDto>) {
        return this.db.equipos.update({
            where: { id_equipos: id },
            data,
        });
    }

    async remove(id: string) {
        return this.db.equipos.delete({
            where: { id_equipos: id },
        });
    }
}
