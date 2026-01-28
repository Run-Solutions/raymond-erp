import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateClienteDto {
    id_documento?: string;
    nombre_cliente: string;
    rfc?: string;
    persona_contacto?: string;
    telefono?: number;
    razon_social?: string;
    calle?: string;
    numero_calle?: string;
    ciudad?: string;
    cp?: string;
}

@Injectable()
export class ClientesService {
    constructor(private prisma: PrismaTallerR1Service) { }

    async findAll() {
        return this.prisma.cliente.findMany();
    }

    async findOne(id: string) {
        return this.prisma.cliente.findUnique({
            where: { id_cliente: id },
        });
    }

    async create(data: CreateClienteDto) {
        return this.prisma.cliente.create({
            data: {
                id_cliente: uuidv4(),
                ...data,
            },
        });
    }

    async update(id: string, data: Partial<CreateClienteDto>) {
        return this.prisma.cliente.update({
            where: { id_cliente: id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.cliente.delete({
            where: { id_cliente: id },
        });
    }
}
