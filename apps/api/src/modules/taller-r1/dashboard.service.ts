import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): any {
        return this.prisma.client;
    }

    async getStats() {
        try {
            // Estados activos unificados (case insensitive general)
            const activeEquiposStatus = ['ingresado', 'reservado', 'Ingresado', 'Reservado', 'INGRESADO', 'RESERVADO'];

            // Format 10 days ago date
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 9);
            tenDaysAgo.setHours(0, 0, 0, 0);

            // Wait for parallel counts
            const [
                totalEquiposCount,
                entradasHistory,
                salidasHistory,
                totalEntradasActive,
                totalSalidasActive,
                totalAccesorios
            ] = await Promise.all([
                // 1. Equipos Registrados (solo Ingresados y Reservados)
                this.db.equipo_ubicacion.count({
                    where: { estado: { in: activeEquiposStatus } }
                }),
                
                // 2. Historial Entradas últimos 10 días
                this.db.entradas.findMany({
                    where: { fecha_creacion: { gte: tenDaysAgo } },
                    select: { fecha_creacion: true }
                }).catch(() => []),

                // 3. Historial Salidas últimos 10 días
                this.db.salidas.findMany({
                    where: { fecha_transporte: { gte: tenDaysAgo } },
                    select: { fecha_transporte: true }
                }).catch(() => []),

                // 4. Entradas "Por ubicar"
                this.db.entradas.count({
                    where: { estado: { in: ['Por ubicar', 'por ubicar', 'POR UBICAR'] } }
                }).catch(() => 0),

                // 5. Salidas en proceso (estatus diferente a Entregados y Cerrados)
                this.db.salidas.count({
                    where: { 
                        estado: { 
                            notIn: ['Cerrada', 'cerrada', 'CERRADA', 'Cancelada', 'cancelada', 'CANCELADA', 'Finalizada', 'Entregado', 'entregado', 'ENTREGADO', 'Entregados', 'entregados', 'ENTREGADOS'] 
                        } 
                    }
                }).catch(() => 0),

                // 6. Accesorios Ingresados
                this.db.entrada_accesorios.count({
                     where: { estado: { in: ['Ingresado', 'ingresado', 'INGRESADO'] } }
                }).catch(() => 0)
            ]);

            // Bucket data by day for the last 10 days
            const dailyFlowMap = new Map<string, { Entradas: number, Salidas: number }>();
            
            for (let i = 0; i < 10; i++) {
                const date = new Date(tenDaysAgo);
                date.setDate(date.getDate() + i);
                const dateKey = date.toISOString().split('T')[0];
                dailyFlowMap.set(dateKey, { Entradas: 0, Salidas: 0 });
            }

            entradasHistory.forEach((ent: any) => {
                if (ent.fecha_creacion) {
                     const dateKey = new Date(ent.fecha_creacion).toISOString().split('T')[0];
                     if (dailyFlowMap.has(dateKey)) {
                         dailyFlowMap.get(dateKey)!.Entradas += 1;
                     }
                }
            });

            salidasHistory.forEach((sal: any) => {
                if (sal.fecha_transporte) {
                     const dateKey = new Date(sal.fecha_transporte).toISOString().split('T')[0];
                     if (dailyFlowMap.has(dateKey)) {
                         dailyFlowMap.get(dateKey)!.Salidas += 1;
                     }
                }
            });

            const daily_flow = Array.from(dailyFlowMap.entries()).map(([dateStr, counts]) => {
                const dateObj = new Date(dateStr + 'T12:00:00'); // Tricking tz issues
                return {
                    name: dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
                    ...counts
                };
            });

            return {
                overview: {
                    total_equipos: totalEquiposCount,
                    entradas_activas: totalEntradasActive,
                    salidas_activas: totalSalidasActive,
                    total_accesorios: totalAccesorios
                },
                daily_flow
            };
        } catch (error: any) {
            console.error('[DashboardService] Error getting stats:', error);
            throw new InternalServerErrorException('Error al obtener estadísticas del dashboard');
        }
    }
}
