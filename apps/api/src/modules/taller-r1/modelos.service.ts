import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateModeloDto {
    modelo: string;
    clase_id?: string;
}

@Injectable()
export class ModelosService {
    constructor(private prisma: PrismaTallerR1Service) { }

    async findAll() {
        return this.prisma.modelo.findMany();
    }

    async create(data: CreateModeloDto) {
        return this.prisma.modelo.create({
            data: {
                id_modelo: uuidv4(),
                ...data,
            },
        });
    }

    async update(id: string, data: Partial<CreateModeloDto>) {
        return this.prisma.modelo.update({
            where: { id_modelo: id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.modelo.delete({
            where: { id_modelo: id },
        });
    }
}
