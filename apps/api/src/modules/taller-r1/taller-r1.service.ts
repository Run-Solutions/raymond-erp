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

        // Helpers to get related data safely
        const getEntradaInfo = async (idEntrada: string | null) => {
            if (!idEntrada) return null;
            try {
                const ent = await (this.db as any).entradas.findUnique({ where: { id_entrada: idEntrada } });
                if (!ent) return null;
                let clienteNombre = ent.cliente;
                try {
                    const cli = await (this.db as any).cliente.findUnique({ where: { id_cliente: ent.cliente } });
                    if (cli) clienteNombre = cli.nombre_cliente;
                } catch { }
                return {
                    distribuidor: ent.distribuidor,
                    cliente: clienteNombre,
                    folio_entrada: ent.folio,
                };
            } catch { return null; }
        };

        const getUbicacionInfo = async (idUbi: string | null, idSub: string | null) => {
            let ubiNombre = idUbi;
            let subNombre = idSub;
            try {
                if (idUbi) {
                    const ubi = await (this.db as any).ubicacion.findUnique({ where: { id_ubicacion: idUbi } });
                    if (ubi) ubiNombre = ubi.nombre_ubicacion;
                }
                if (idSub) {
                    const sub = await (this.db as any).sub_ubicaciones.findUnique({ where: { id_sub_ubicacion: idSub } });
                    if (sub) subNombre = sub.nombre;
                }
            } catch { }
            return { ubicacion: ubiNombre, sub_ubicacion: subNombre };
        };

        const getEquipoInfo = async (serial: string | null) => {
            if (!serial) return null;
            try {
                return await (this.db as any).equipos.findUnique({ where: { numero_serie: serial } });
            } catch { return null; }
        };

        // 1. Buscar en entrada_detalle (Prioridad: historial de entradas)
        try {
            const detalle = await (this.db as any).entrada_detalle.findFirst({
                where: { serial_equipo: term },
                orderBy: { fecha: 'desc' },
            });

            if (detalle) {
                const [entradaInfo, ubiInfo, equipoInfo] = await Promise.all([
                    getEntradaInfo(detalle.id_entrada),
                    getUbicacionInfo(detalle.id_ubicacion, detalle.id_sub_ubicacion),
                    getEquipoInfo(detalle.serial_equipo)
                ]);

                return {
                    found: true,
                    type: 'equipo',
                    data: {
                        serial: detalle.serial_equipo,
                        clase: detalle.clase || equipoInfo?.clase,
                        modelo: detalle.modelo || equipoInfo?.modelo,
                        marca: equipoInfo?.marca,
                        estado: detalle.estado,
                        calificacion: detalle.calificacion,
                        distribuidor: entradaInfo?.distribuidor,
                        cliente: entradaInfo?.cliente,
                        folio_entrada: entradaInfo?.folio_entrada,
                        ubicacion: ubiInfo.ubicacion,
                        sub_ubicacion: ubiInfo.sub_ubicacion,
                        fecha_ingreso: detalle.fecha,
                        tiempo_almacen: detalle.fecha ? `${Math.floor((new Date().getTime() - new Date(detalle.fecha).getTime()) / (1000 * 60 * 60 * 24))} días` : 'N/A'
                    }
                };
            }
        } catch (e) { console.error('[search] entrada_detalle error:', (e as any).message); }

        // 2. Buscar en equipo_ubicacion (Stock actual)
        try {
            const equUbi = await (this.db as any).equipo_ubicacion.findFirst({
                where: { serial_equipo: term },
            });
            if (equUbi) {
                const [ubiInfo, equipoInfo] = await Promise.all([
                    getUbicacionInfo(equUbi.id_ubicacion, equUbi.id_sub_ubicacion),
                    getEquipoInfo(equUbi.serial_equipo)
                ]);

                return {
                    found: true,
                    type: 'equipo',
                    data: {
                        serial: equUbi.serial_equipo,
                        clase: equipoInfo?.clase,
                        modelo: equipoInfo?.modelo,
                        marca: equipoInfo?.marca,
                        estado: equUbi.estado,
                        ubicacion: ubiInfo.ubicacion,
                        sub_ubicacion: ubiInfo.sub_ubicacion,
                        fecha_ingreso: equUbi.fecha_entrada,
                        vendedor: equUbi.vendedor
                    }
                };
            }
        } catch (e) { console.error('[search] equipo_ubicacion error:', (e as any).message); }

        // 3. Buscar en accesorios
        try {
            const accesorio = await (this.db as any).entrada_accesorios.findFirst({
                where: { serial: term },
                orderBy: { fecha_ingreso: 'desc' }
            });
            if (accesorio) {
                const [entradaInfo, ubiInfo] = await Promise.all([
                    getEntradaInfo(accesorio.id_entrada),
                    getUbicacionInfo(accesorio.ubicacion, accesorio.sub_ubicacion)
                ]);

                return {
                    found: true,
                    type: 'accesorio',
                    data: {
                        serial: accesorio.serial,
                        tipo: accesorio.tipo,
                        modelo: accesorio.modelo,
                        estado: accesorio.estado,
                        estado_fisico: accesorio.estado_acc,
                        rack: accesorio.rack,
                        distribuidor: entradaInfo?.distribuidor,
                        cliente: entradaInfo?.cliente,
                        ubicacion: ubiInfo.ubicacion,
                        sub_ubicacion: ubiInfo.sub_ubicacion,
                        fecha_ingreso: accesorio.fecha_ingreso,
                        tiempo_almacen: accesorio.fecha_ingreso ? `${Math.floor((new Date().getTime() - new Date(accesorio.fecha_ingreso).getTime()) / (1000 * 60 * 60 * 24))} días` : 'N/A'
                    }
                };
            }
        } catch (e) { console.error('[search] accesorios error:', (e as any).message); }

        // 4. Buscar en equipos directamente
        try {
            const equipo = await (this.db as any).equipos.findFirst({
                where: { numero_serie: term },
            });
            if (equipo) return { found: true, type: 'equipo', data: equipo };
        } catch (e) { console.error('[search] equipo direct error:', (e as any).message); }

        // 5. Buscar en ubicaciones
        try {
            const ubicacion = await (this.db as any).ubicacion.findFirst({
                where: { id_ubicacion: term },
            });
            if (ubicacion) return { found: true, type: 'ubicacion', data: ubicacion };
        } catch (e) { console.error('[search] ubicacion error:', (e as any).message); }

        // 6. Buscar en Cargue Masivo
        try {
            const cargue = await (this.db as any).orden_base_cargue.findFirst({
                where: { serial_number: term },
            }) || await (this.db as any).CargueMasivo.findFirst({
                where: { SERIE: term },
            });
            if (cargue) return { found: true, type: 'cargue_masivo', data: cargue };
        } catch (e) { console.error('[search] cargue_masivo error:', (e as any).message); }

        return { found: false };
    }
}
