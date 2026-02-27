import { PrismaClient as PrismaR1 } from '.prisma/client-taller-r1';
import { Injectable } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
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
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }

    async findAll() {
        return this.db.entrada_accesorios.findMany({
            include: {
                rel_ubicacion: { select: { nombre_ubicacion: true } },
                rel_sub_ubicacion: { select: { nombre: true } },
            },
        });
    }

    async create(data: CreateAccesorioDto) {
        return this.db.entrada_accesorios.create({
            data: {
                id_accesorio: uuidv4(),
                ...data,
                fecha_ingreso: data.fecha_ingreso || new Date(),
            },
        });
    }

    async update(id: string, data: Partial<CreateAccesorioDto>) {
        return this.db.entrada_accesorios.update({
            where: { id_accesorio: id },
            data,
        });
    }

    async remove(id: string) {
        return this.db.entrada_accesorios.delete({
            where: { id_accesorio: id },
        });
    }

    async getAlertasBaterias() {
        const treintaDiasAtras = new Date();
        treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

        // Fetch all batteries
        const batteries = await this.db.entrada_accesorios.findMany({
            where: { tipo: { in: ['Batería', 'Bateria'] } },
            include: { evaluaciones: { orderBy: { fecha_creacion: 'desc' }, take: 1 } }
        });

        // Filter batteries that have a recent evaluation but its fecha_ultima_carga is old, or lack one entirely
        const alerts = batteries.filter(b => {
            const latestEval = b.evaluaciones?.[0];
            if (!latestEval) return true; // Needs charge if it has never been evaluated
            if (!latestEval.fecha_ultima_carga) return true; // Needs charge if it was evaluated but no date was set
            return latestEval.fecha_ultima_carga <= treintaDiasAtras;
        }).map(b => ({
            ...b,
            fecha_ultima_carga: b.evaluaciones?.[0]?.fecha_ultima_carga || null
        }));

        return alerts;
    }
}
