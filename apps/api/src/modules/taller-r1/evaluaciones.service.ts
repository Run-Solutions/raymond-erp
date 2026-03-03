import { PrismaClient as PrismaR1 } from '.prisma/client-taller-r1';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EvaluacionesService {
    private readonly logger = new Logger(EvaluacionesService.name);

    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }

    // --- EQUIPOS ---

    async saveEquipoEvaluation(data: {
        id_detalle: string;
        puntajes: any;
        fotos: any;
        porcentaje_total?: number;
        semanas_renovacion?: number;
        estado_montacargas?: string;
        notas?: string;
        horometro?: number;
        anio_fabricacion?: number;
        faltante_piezas?: string;
        fotos_faltantes?: any;
        observaciones?: any;
        usuario_evaluador?: string;
    }) {
        try {
            // Check if evaluation exists for this detail
            const existing = await this.db.evaluaciones_checklist.findFirst({
                where: { id_detalle: data.id_detalle }
            });

            let evaluation;
            if (existing) {
                evaluation = await this.db.evaluaciones_checklist.update({
                    where: { id_evaluacion: existing.id_evaluacion },
                    data: {
                        puntajes: data.puntajes,
                        fotos: data.fotos,
                        porcentaje_total: data.porcentaje_total,
                        semanas_renovacion: data.semanas_renovacion,
                        estado_montacargas: data.estado_montacargas,
                        notas: data.notas,
                        horometro: data.horometro,
                        anio_fabricacion: data.anio_fabricacion,
                        faltante_piezas: data.faltante_piezas,
                        fotos_faltantes: data.fotos_faltantes,
                        observaciones: data.observaciones,
                        usuario_evaluador: data.usuario_evaluador
                    }
                });
            } else {
                evaluation = await this.db.evaluaciones_checklist.create({
                    data: {
                        id_evaluacion: uuidv4(),
                        id_detalle: data.id_detalle,
                        puntajes: data.puntajes,
                        fotos: data.fotos,
                        porcentaje_total: data.porcentaje_total,
                        semanas_renovacion: data.semanas_renovacion,
                        estado_montacargas: data.estado_montacargas,
                        notas: data.notas,
                        horometro: data.horometro,
                        anio_fabricacion: data.anio_fabricacion,
                        faltante_piezas: data.faltante_piezas,
                        fotos_faltantes: data.fotos_faltantes,
                        observaciones: data.observaciones,
                        usuario_evaluador: data.usuario_evaluador
                    }
                });
            }

            // Update the Detail (Equipment) to reflect the new Qualification
            let calificacionText = 'Evaluado';
            if (data.estado_montacargas) {
                calificacionText = data.estado_montacargas;
            } else if (data.porcentaje_total !== undefined) {
                calificacionText = `${data.porcentaje_total}%`;
            }

            await this.db.entrada_detalle.update({
                where: { id_detalles: data.id_detalle },
                data: {
                    calificacion: calificacionText.trim(),
                    semanas_renovacion: data.semanas_renovacion !== undefined ? String(data.semanas_renovacion) : null,
                }
            });

            // Trigger Entry state check
            const detail = await this.db.entrada_detalle.findUnique({
                where: { id_detalles: data.id_detalle },
                select: { id_entrada: true }
            });
            if (detail?.id_entrada) {
                await this.checkEntryCompletion(detail.id_entrada);
            }

            return evaluation;
        } catch (error: any) {
            this.logger.error(`Error saving equipment evaluation: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getEquipoEvaluation(id_detalle: string) {
        try {
            const evaluation = await this.db.evaluaciones_checklist.findFirst({
                where: { id_detalle: id_detalle }
            });
            return evaluation;
        } catch (error: any) {
            this.logger.error(`Error getting equipment evaluation: ${error.message}`, error.stack);
            throw error;
        }
    }

    // --- ACCESORIOS ---

    async saveAccesorioEvaluation(data: {
        id_accesorio: string;
        voltaje?: number;
        condiciones?: string;
        parametros?: any;
        nivel_electrolitos?: string;
        fugas?: boolean;
        danos_fisicos?: string;
        prueba_carga?: any;
        fecha_ultima_carga?: Date | string;
        notas?: string;
        usuario_evaluador?: string;
    }) {
        try {
            const existing = await this.db.evaluaciones_accesorios.findFirst({
                where: { id_accesorio: data.id_accesorio }
            });

            const evaluation = existing
                ? await this.db.evaluaciones_accesorios.update({
                    where: { id_evaluacion_acc: existing.id_evaluacion_acc },
                    data: {
                        voltaje: data.voltaje,
                        condiciones: data.condiciones,
                        parametros: data.parametros,
                        nivel_electrolitos: data.nivel_electrolitos,
                        fugas: data.fugas,
                        danos_fisicos: data.danos_fisicos,
                        prueba_carga: data.prueba_carga,
                        fecha_ultima_carga: data.fecha_ultima_carga ? new Date(data.fecha_ultima_carga) : null,
                        notas: data.notas,
                        usuario_evaluador: data.usuario_evaluador
                    }
                })
                : await this.db.evaluaciones_accesorios.create({
                    data: {
                        id_evaluacion_acc: uuidv4(),
                        id_accesorio: data.id_accesorio,
                        voltaje: data.voltaje,
                        condiciones: data.condiciones,
                        parametros: data.parametros,
                        nivel_electrolitos: data.nivel_electrolitos,
                        fugas: data.fugas,
                        danos_fisicos: data.danos_fisicos,
                        prueba_carga: data.prueba_carga,
                        fecha_ultima_carga: data.fecha_ultima_carga ? new Date(data.fecha_ultima_carga) : null,
                        notas: data.notas,
                        usuario_evaluador: data.usuario_evaluador
                    }
                });

            // Trigger Entry state check
            const acc = await this.db.entrada_accesorios.findUnique({
                where: { id_accesorio: data.id_accesorio },
                select: { id_entrada: true }
            });
            if (acc?.id_entrada) {
                await this.checkEntryCompletion(acc.id_entrada);
            }

            return evaluation;
        } catch (error: any) {
            this.logger.error(`Error saving accessory evaluation: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getAccesorioEvaluation(id_accesorio: string) {
        try {
            const evaluation = await this.db.evaluaciones_accesorios.findFirst({
                where: { id_accesorio: id_accesorio }
            });
            return evaluation;
        } catch (error: any) {
            this.logger.error(`Error getting accessory evaluation: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getEvaluationById(id: string) {
        try {
            return await this.db.evaluaciones_checklist.findUnique({
                where: { id_evaluacion: id },
                include: {
                    entrada_detalle: {
                        include: {
                            entradas: true
                        }
                    }
                }
            });
        } catch (error: any) {
            this.logger.error(`Error getting evaluation by id: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getHistoryBySerial(serial: string) {
        try {
            const cleanSerial = serial.trim();
            console.log(`[EvaluacionesService] Searching history for serial: "${cleanSerial}"`);

            const results = await this.db.evaluaciones_checklist.findMany({
                where: {
                    entrada_detalle: {
                        OR: [
                            { serial_equipo: { contains: cleanSerial } },
                            { rel_equipo: { numero_serie: { contains: cleanSerial } } }
                        ]
                    }
                },
                include: {
                    entrada_detalle: {
                        include: {
                            entradas: true
                        }
                    }
                }
            });

            // Ordenar en memoria en vez de la base de datos para evitar MySQL error 1038 (Out of sort memory)
            results.sort((a: any, b: any) => {
                const dateA = a.fecha_creacion || (a.entrada_detalle && a.entrada_detalle.entradas ? a.entrada_detalle.entradas.fecha_creacion : 0);
                const dateB = b.fecha_creacion || (b.entrada_detalle && b.entrada_detalle.entradas ? b.entrada_detalle.entradas.fecha_creacion : 0);
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });

            console.log(`[EvaluacionesService] History found for "${cleanSerial}": ${results.length} records`);
            return results;
        } catch (error: any) {
            this.logger.error(`Error getting history by serial: ${error.message}`, error.stack);
            throw error;
        }
    }

    // --- CARGAS ---

    async registerCharge(id_accesorio: string, comentarios?: string) {
        try {
            // Calculate next charge (e.g., 7 days from now)
            const nextCharge = new Date();
            nextCharge.setDate(nextCharge.getDate() + 7);

            return await this.db.historial_cargas.create({
                data: {
                    id_carga: uuidv4(),
                    id_accesorio: id_accesorio,
                    proxima_carga: nextCharge,
                    comentarios: comentarios
                }
            });
        } catch (error: any) {
            this.logger.error(`Error registering charge: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getChargeHistory(id_accesorio: string) {
        try {
            return await this.db.historial_cargas.findMany({
                where: { id_accesorio: id_accesorio },
                orderBy: { fecha_carga: 'desc' }
            });
        } catch (error: any) {
            this.logger.error(`Error getting charge history: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async checkEntryCompletion(id_entrada: string) {
        try {
            console.log(`[EvaluacionesService] Checking completion for entry: ${id_entrada}`);

            const [detalles, accesorios] = await Promise.all([
                this.db.entrada_detalle.findMany({
                    where: { id_entrada }
                }),
                this.db.entrada_accesorios.findMany({
                    where: { id_entrada },
                    include: { evaluaciones: true }
                })
            ]);

            // All equipment must have a grade (calificacion)
            const allEquiposEvaluated = detalles.every(d => !!d.calificacion);

            // All accessories must have at least one evaluation record
            const allAccesoriosEvaluated = accesorios.every(a => a.evaluaciones.length > 0);

            console.log(`[EvaluacionesService] Entry ${id_entrada} results: Equipos=${allEquiposEvaluated}, Accesorios=${allAccesoriosEvaluated}`);

            if (allEquiposEvaluated && allAccesoriosEvaluated && (detalles.length > 0 || accesorios.length > 0)) {
                console.log(`[EvaluacionesService] All items evaluated. Transitioning Entry ${id_entrada} to "Por Ubicar"`);
                await this.db.entradas.update({
                    where: { id_entrada },
                    data: { estado: 'Por Ubicar' }
                });
            }
        } catch (error: any) {
            this.logger.error(`Error in checkEntryCompletion: ${error.message}`, error.stack);
        }
    }
}
