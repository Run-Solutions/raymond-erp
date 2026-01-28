import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';

@Injectable()
export class TallerR1Service {
    constructor(private prisma: PrismaTallerR1Service) { }

    // Ejemplo: Obtener todos los equipos
    async getAllEquipos() {
        return this.prisma.equipos.findMany();
    }

    // Ejemplo: Obtener equipos por clase
    async getEquiposByClase(clase: string) {
        return this.prisma.equipos.findMany({
            where: { clase },
        });
    }

    // Ejemplo: Obtener todas las ubicaciones
    async getAllUbicaciones() {
        return this.prisma.ubicacion.findMany();
    }

    // Ejemplo: Obtener entradas
    async getAllEntradas() {
        return this.prisma.entradas.findMany();
    }

    // Ejemplo: Obtener salidas
    async getAllSalidas() {
        return this.prisma.salidas.findMany();
    }

    // Puedes agregar más métodos según tus necesidades
}
