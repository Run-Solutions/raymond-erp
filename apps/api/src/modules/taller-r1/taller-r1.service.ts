import { PrismaClient as PrismaR1 } from '@prisma/client-taller-r1';
import { Injectable } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';

@Injectable()
export class TallerR1Service {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }

    // Ejemplo: Obtener todos los equipos
    async getAllEquipos() {
        return this.db.equipos.findMany();
    }

    // Ejemplo: Obtener equipos por clase
    async getEquiposByClase(clase: string) {
        return this.db.equipos.findMany({
            where: { clase },
        });
    }

    // Ejemplo: Obtener todas las ubicaciones
    async getAllUbicaciones() {
        return this.db.ubicacion.findMany();
    }

    // Ejemplo: Obtener entradas
    async getAllEntradas() {
        return this.db.entradas.findMany();
    }

    // Ejemplo: Obtener salidas
    async getAllSalidas() {
        return this.db.salidas.findMany();
    }

    // Buscar general por QR
    async search(q: string) {
        if (!q) return { found: false };

        const term = String(q).trim();

        // 1. Buscar en equipos (por numero_serie)
        try {
            const equipo = await this.db.equipos.findFirst({
                where: { numero_serie: term },
            });
            if (equipo) return { found: true, type: 'equipo', data: equipo };
        } catch (e) {
            console.error('[search] error:', (e as any).message);
        }

        // 2. Buscar en entrada_detalle (serial_equipo)
        try {
            const detalle = await this.db.entrada_detalle.findFirst({
                where: { serial_equipo: term },
                select: {
                    id_detalles: true,
                    id_entrada: true,
                    serial_equipo: true,
                    tipo_entrada: true,
                    fecha: true,
                    estado: true,
                    calificacion: true,
                    clase: true,
                    modelo: true,
                }
            });
            if (detalle) return { found: true, type: 'equipo', data: detalle };
        } catch (e) {
            console.error('[search] entrada_detalle error:', (e as any).message);
        }

        // 3. Buscar en accesorios (por serial)
        try {
            const accesorio = await this.db.entrada_accesorios.findFirst({
                where: { serial: term },
                select: {
                    id_accesorio: true,
                    tipo: true,
                    modelo: true,
                    serial: true,
                    rack: true,
                    estado_acc: true,
                    fecha_ingreso: true,
                    estado: true,
                    ubicacion: true,
                    pdf: true,
                    id_entrada: true,
                }
            });
            if (accesorio) return { found: true, type: 'accesorio', data: accesorio };
        } catch (e) {
            console.error('[search] accesorios error:', (e as any).message);
        }

        // 4. Buscar en ubicaciones
        try {
            const ubicacion = await this.db.ubicacion.findFirst({
                where: { id_ubicacion: term },
            });
            if (ubicacion) return { found: true, type: 'ubicacion', data: ubicacion };
        } catch (e) {
            console.error('[search] ubicacion error:', (e as any).message);
        }

        // 5. Buscar en equipo_ubicacion
        try {
            const equUbi = await this.db.equipo_ubicacion.findFirst({
                where: { serial_equipo: term },
            });
            if (equUbi) return { found: true, type: 'ubicacion', data: equUbi };
        } catch (e) {
            console.error('[search] equipo_ubicacion error:', (e as any).message);
        }

        // 6. Buscar en Cargue Masivo
        try {
            // @ts-ignore
            const cargue = await this.db.orden_base_cargue.findFirst({
                where: { serial_number: term },
            });
            if (cargue) return { found: true, type: 'cargue_masivo', data: cargue };
        } catch (e) {
            console.error('[search] cargue_masivo error:', (e as any).message);
        }

        return { found: false };
    }
}
