import { PrismaClient as PrismaR1 } from '.prisma/client-taller-r1';
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateModeloDto {
    modelo: string;
    clase_id?: string;
}

@Injectable()
export class ModelosService {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }

    async findAll(clase_id?: string) {
        return this.db.modelo.findMany({
            where: clase_id ? { clase_id } : {},
        });
    }

    async create(data: CreateModeloDto) {
        // Enforce the requirement: "El ID y el nombre del modelo serán el mismo valor"
        const finalIdModelo = data.modelo.trim().toUpperCase();

        try {
            return await this.db.modelo.create({
                data: {
                    id_modelo: finalIdModelo,
                    modelo: data.modelo.trim(),
                    clase_id: data.clase_id,
                },
            });
        } catch (error: any) {
            if (error?.code === 'P2002') {
                throw new ConflictException(`El modelo '${finalIdModelo}' ya existe.`);
            }
            throw error;
        }
    }

    async update(id: string, data: Partial<CreateModeloDto>) {
        return this.db.modelo.update({
            where: { id_modelo: id },
            data,
        });
    }

    async remove(id: string) {
        return this.db.modelo.delete({
            where: { id_modelo: id },
        });
    }
}
