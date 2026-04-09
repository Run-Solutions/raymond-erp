import { PrismaClient as PrismaR1 } from '@prisma/client-taller-r1';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';

import { TallerR1MailService } from './mail.service';

@Injectable()
export class UsuariosService {
    constructor(
        private prisma: PrismaDynamicService,
        private mailService: TallerR1MailService
    ) { }

    private get db(): PrismaR1 {
        return this.prisma.r1;
    }

    async findAll(site?: string) {
        return this.db.usuarios.findMany({
            where: site ? { sitio: { contains: site } } : undefined,
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
        // Enforce max 7 alphanumeric characters generation for the ID
        return this.db.usuarios.create({
            data: {
                ...data,
                // generate an ID if not provided. Max 7 alphanumeric chars
                IDUsuarios: data.IDUsuarios || require('crypto').randomBytes(4).toString('hex').substring(0, 7),
            },
        });
    }

    async update(id: string, data: any) {
        return this.db.usuarios.update({
            where: { IDUsuarios: id },
            data,
        });
    }

    async findPending(site?: string) {
        return this.db.usuarios.findMany({
            where: { Status: 'PENDING' },
            orderBy: { Usuario: 'asc' },
        });
    }

    async approve(id: string, data: { Rol: string; sitio: string }) {
        const usuario = await this.db.usuarios.update({
            where: { IDUsuarios: id },
            data: {
                ...data,
                Status: 'APPROVED',
                UsuarioBloqueado: false, // Unblock
            },
        });

        // Send notification email
        await this.mailService.sendUserApprovedEmail(
            usuario.Correo,
            usuario.Usuario,
            data.sitio.split(',').map(s => s.trim())
        );

        return usuario;
    }

    async reject(id: string) {
        const usuario = await this.db.usuarios.update({
            where: { IDUsuarios: id },
            data: {
                Status: 'REJECTED',
                UsuarioBloqueado: true, // Ensure blocked
            },
        });

        // Send notification email
        await this.mailService.sendUserRejectedEmail(
            usuario.Correo,
            usuario.Usuario
        );

        return usuario;
    }
}
