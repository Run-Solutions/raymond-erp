import { PrismaClient as PrismaR1 } from '.prisma/client-taller-r1';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';

@Injectable()
export class UsuariosService {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.r1;
    }

    async findAll() {
        return this.db.usuarios.findMany({
            orderBy: { Usuario: 'asc' },
        });
    }

    async runMigration() {
        try {
            await this.db.$executeRawUnsafe(`ALTER TABLE usuarios ADD COLUMN TallerAsignado VARCHAR(10) DEFAULT 'R1'`);
            return { message: "TallerAsignado column added correctly.", status: "Success" }
        } catch (error: any) {
            return { message: "Error migrating database", error: error.message, status: "Failed" }
        }
    }

    async findOne(id: string) {
        const usuario = await this.db.usuarios.findUnique({
            where: { IDUsuarios: id },
        });
        if (!usuario) throw new NotFoundException('Usuario no encontrado');
        return usuario;
    }

    async create(data: any) {
        // Enforce UUID generation for the ID
        return this.db.usuarios.create({
            data: {
                ...data,
                // generate an ID if not provided. Taller DB usually uses a string ID.
                IDUsuarios: data.IDUsuarios || require('crypto').randomUUID().substring(0, 50),
            },
        });
    }

    async update(id: string, data: any) {
        return this.db.usuarios.update({
            where: { IDUsuarios: id },
            data,
        });
    }
}
