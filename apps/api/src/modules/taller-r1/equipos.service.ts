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
                estado: data.estado || 'Por Ubicar',
                // Note: The 'equipos' table in schema doesn't seem to have 'prioridad' directly on the model based on the view_file of schema earlier?
                // limit check: 188: estado String @db.VarChar(50)
                // 143: prioridad String? @db.VarChar(50) is on 'entradas' table.
                // Re-reading user request: "que en el momento de ya tener ingresados los equipos, estos en un primer momento estan en estado de: estado Por Ubicar prioridad Por Ubicar"
                // The 'entrada_detalle' has 'estado' (line 116).
                // The 'equipos' has 'estado' (line 188).
                // 'entradas' has 'prioridad' (line 143).
                // Let's assume the user means the *equipment record* or the *detail record*.
                // If it's the detail, I need to update entrances.service.ts
                // If it's the global equipment, it's here.
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
