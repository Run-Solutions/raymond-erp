import { Injectable } from '@nestjs/common';
import { PrismaClient as PrismaR1 } from '.prisma/client-taller-r1';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';

@Injectable()
export class InventarioService {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }

    async getInventario() {
        // Query equipo_ubicacion to get current stock
        const equipoUbicaciones = await this.db.equipo_ubicacion.findMany({
            where: {
                estado: { not: 'Retirado' }
            }
        });

        // Extract IDs for bulk fetching master data
        const equipoIds = [...new Set(equipoUbicaciones.map((e) => e.id_equipos).filter(Boolean))] as string[];
        const ubicacionIds = [...new Set(equipoUbicaciones.map((e) => e.id_ubicacion).filter(Boolean))] as string[];
        const subUbicacionIds = [...new Set(equipoUbicaciones.map((e) => e.id_sub_ubicacion).filter(Boolean))] as string[];
        const serials = [...new Set(equipoUbicaciones.map((e) => e.serial_equipo).filter(Boolean))] as string[];

        // Fetch master data in parallel
        const [
            equipos,
            ubicaciones,
            subUbicaciones,
            entradasDetalle
        ] = await Promise.all([
            this.db.equipos.findMany({ where: { id_equipos: { in: equipoIds } } }),
            this.db.ubicacion.findMany({ where: { id_ubicacion: { in: ubicacionIds } } }),
            this.db.sub_ubicaciones.findMany({ where: { id_sub_ubicacion: { in: subUbicacionIds } } }),
            this.db.entrada_detalle.findMany({
                where: { serial_equipo: { in: serials } },
                include: { entradas: { select: { folio: true, fecha_creacion: true } } }
            })
        ]);

        // Lookup maps
        const equiposMap = new Map(equipos.map(e => [e.id_equipos, e]));
        const ubicacionesMap = new Map(ubicaciones.map(e => [e.id_ubicacion, e.nombre_ubicacion]));
        const subUbicacionesMap = new Map(subUbicaciones.map(e => [e.id_sub_ubicacion, e.nombre]));

        // Group folios by serial (get the latest one)
        const serialInfoMap = new Map<string, { folio: string; fecha_ingreso: Date | null }>();
        entradasDetalle.forEach(det => {
            if (det.serial_equipo && det.entradas) {
                const existing = serialInfoMap.get(det.serial_equipo);
                if (!existing || new Date(det.entradas.fecha_creacion).getTime() > (existing.fecha_ingreso?.getTime() || 0)) {
                    serialInfoMap.set(det.serial_equipo, {
                        folio: det.entradas.folio,
                        fecha_ingreso: new Date(det.entradas.fecha_creacion)
                    });
                }
            }
        });

        const now = new Date();
        const currentSite = this.prisma.currentSite.toUpperCase();

        return equipoUbicaciones.map((eu) => {
            const eq = eu.id_equipos ? equiposMap.get(eu.id_equipos) : null;
            const info = eu.serial_equipo ? serialInfoMap.get(eu.serial_equipo) : null;

            // Calculate permanency
            let diasPermanencia = 0;
            let semanasPermanencia = 0;

            if (info?.fecha_ingreso) {
                const diffTime = Math.abs(now.getTime() - info.fecha_ingreso.getTime());
                diasPermanencia = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                semanasPermanencia = parseFloat((diasPermanencia / 7).toFixed(1));
            }

            return {
                id_equipo_ubicacion: eu.id_equipo_ubicacion,
                serial_equipo: eu.serial_equipo || 'S/N',
                marca: eq?.marca || 'N/D',
                modelo: eq?.modelo || 'N/D',
                clase: eq?.clase || 'N/D',
                ubicacion: eu.id_ubicacion ? ubicacionesMap.get(eu.id_ubicacion) || 'N/D' : 'N/D',
                sub_ubicacion: eu.id_sub_ubicacion ? subUbicacionesMap.get(eu.id_sub_ubicacion) || 'N/D' : 'N/D',
                estado: eu.estado || 'N/D',
                fecha_ingreso: info?.fecha_ingreso || eu.fecha_entrada || 'N/D',
                folio: info?.folio || eu.stock || 'N/D', // Use original folio from entrada or stock field as fallback
                sitio: currentSite,
                dias_permanencia: diasPermanencia,
                semanas_permanencia: semanasPermanencia
            };
        });
    }
}
