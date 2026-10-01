// Caché en memoria del Dashboard r4, separado de dashboard.service.ts para que
// flotilla/rentas/presupuestos puedan invalidarlo sin crear una dependencia circular
// (dashboard.service.ts inyecta PresupuestosService).
export const dashboardMetricsCache = new Map<string, { timestamp: number; data: any }>();
export const DASHBOARD_CACHE_TTL_MS = 30 * 1000; // 30 seconds

export function clearDashboardMetricsCache() {
    dashboardMetricsCache.clear();
}
