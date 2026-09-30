import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

/**
 * Claves de cache de R4. Centralizadas para que un invalidate en cualquier
 * modulo limpie exactamente lo que corresponde, en vez de recargar la pantalla
 * completa. Anadir aqui la clave del modulo nuevo al migrarlo.
 */
export const r4Keys = {
    flotilla: ['r4', 'flotilla'] as const,
    flotillaSolicitudes: ['r4', 'flotilla', 'solicitudes'] as const,
    clientes: ['r4', 'clientes'] as const,
    rentas: ['r4', 'rentas'] as const,
    presupuestos: ['r4', 'presupuestos'] as const,
    ordenes: ['r4', 'ordenes-mensuales'] as const,
    ordenesOcsOrigen: ['r4', 'ordenes-mensuales', 'ocs-origen'] as const,
    adcs: ['r4', 'adcs'] as const,
    tipoCambio: ['r4', 'tipo-cambio'] as const,
    dashboardMetrics: ['r4', 'dashboard', 'metrics'] as const,
    adcsSummary: ['r4', 'adcs', 'summary'] as const,
    roles: ['r4', 'roles'] as const,
};

/**
 * Referencia estable para "aun no hay datos". Sin esto, `data ?? []` devuelve un
 * array nuevo en cada render y las dependencias de useMemo/useEffect que dependen
 * de la lista se recomputan siempre.
 */
export const EMPTY_LIST: any[] = [];

const toArray = (payload: any): any[] => {
    const raw = payload?.data ?? payload;
    return Array.isArray(raw) ? raw : [];
};

/**
 * Desenvuelve el sobre `{ success, data }` de los endpoints que devuelven un
 * objeto (dashboard, resumen de ADC, detalle de flotilla). Sin esto el
 * consumidor leeria `metrics.data.totalFlotilla` y los campos saldrian
 * `undefined` en runtime sin que el typecheck lo note.
 */
const unwrap = (payload: any): any => payload?.data ?? payload;

/** Normaliza mayusculas de distribuidor/modelo/serie para que la tabla no tenga variantes. */
export const normalizeRentas = (dataArray: any): any[] =>
    (Array.isArray(dataArray) ? dataArray : []).map((r: any) => ({
        ...r,
        distribuidor: r.distribuidor?.toUpperCase(),
        activo: r.activo ? {
            ...r.activo,
            distribuidor: r.activo.distribuidor?.toUpperCase(),
            modelo: r.activo.modelo?.toUpperCase(),
            serie: r.activo.serie?.toUpperCase(),
        } : null,
    }));

const normalizeEquipos = (dataArray: any): any[] =>
    (Array.isArray(dataArray) ? dataArray : []).map((e: any) => ({
        ...e,
        distribuidor: e.distribuidor?.toUpperCase(),
        modelo: e.modelo?.toUpperCase(),
        serie: e.serie?.toUpperCase(),
    }));

/**
 * Equipos de la flotilla.
 *
 * `enabled` existe para los consumidores bajo demanda: mientras sea false la query
 * no se descarga (aun si ya hay datos en cache, no los entrega). Con varios
 * observadores de la misma clave, basta con que uno tenga `enabled` para que la
 * descarga ocurra, y los demas la reaprovechan.
 */
export function useFlotillaQuery(enabled = true) {
    return useQuery<any[]>({
        queryKey: [...r4Keys.flotilla],
        queryFn: async () => toArray((await api.get('/r4/flotilla')).data),
        enabled,
    });
}

/**
 * Solicitudes de cambio pendientes. Los ADC no las ven: para ellos la consulta
 * queda deshabilitada en vez de pedir y descartar la respuesta.
 */
export function useSolicitudesFlotillaQuery(enabled: boolean) {
    return useQuery<any[]>({
        queryKey: [...r4Keys.flotillaSolicitudes],
        queryFn: async () => toArray((await api.get('/r4/flotilla/solicitudes')).data),
        enabled,
    });
}

/**
 * Clientes con sus sitios. Es la misma clave que consume FlotillaTab, asi que una
 * edicion en Clientes y Sitios se refleja sola en los selectores de flotilla.
 * `enabled` permite que un modal lo consulte solo
 * mientras esta abierto; la clave sigue siendo la compartida, asi que si otro
 * modulo ya cargo la lista se reutiliza esa copia.
 */
export function useClientesQuery(enabled = true) {
    return useQuery<any[]>({
        queryKey: [...r4Keys.clientes],
        queryFn: async () => toArray((await api.get('/r4/clientes')).data),
        enabled,
    });
}

/**
 * Contratos de renta (el tab "Contratos & Rentas"). `enabled` permite que un
 * modal la consulte solo mientras esta abierto, reutilizando la copia cacheada
 * si el tab de rentas ya la descargo.
 */
export function useRentasQuery(enabled = true) {
    return useQuery<any[]>({
        queryKey: [...r4Keys.rentas],
        queryFn: async () => normalizeRentas(toArray((await api.get('/r4/rentas')).data)),
        enabled,
    });
}

/**
 * Ordenes mensuales. El filtro de ADC va en la clave: cambiar de alcance debe
 * considerarse otra consulta, no mezclar datos de dos alcances.
 */
export function useOrdenesQuery(adc?: string | null) {
    return useQuery<any[]>({
        queryKey: [...r4Keys.ordenes, { adc: adc || null }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (adc) params.append('adc', adc);
            const url = params.toString()
                ? `/r4/ordenes-mensuales?${params.toString()}`
                : '/r4/ordenes-mensuales';
            return toArray((await api.get(url)).data);
        },
    });
}

/**
 * OCs disponibles del periodo origen para el modal "copiar mes anterior".
 * `sitio_ids` entra en la clave y en la query: filtrar por sitios debe pedir
 * una lista distinta, no reutilizar la de "todos los sitios".
 */
export function useOcsOrigenQuery(
    opts: { periodo: string; cliente_id?: string; sitio_ids?: string },
    enabled = true,
) {
    const { periodo, cliente_id, sitio_ids } = opts;
    return useQuery<any[]>({
        queryKey: [...r4Keys.ordenesOcsOrigen, { periodo, cliente_id: cliente_id || null, sitio_ids: sitio_ids || null }],
        queryFn: async () => {
            const params = new URLSearchParams({ periodo });
            if (cliente_id) params.append('cliente_id', cliente_id);
            if (sitio_ids) params.append('sitio_ids', sitio_ids);
            return toArray((await api.get(`/r4/ordenes/ocs-origen?${params.toString()}`)).data);
        },
        enabled: enabled && !!periodo,
    });
}

export function useAdcsQuery(enabled = true) {
    return useQuery<any[]>({
        queryKey: [...r4Keys.adcs],
        queryFn: async () => toArray((await api.get('/r4/adcs')).data),
        enabled,
    });
}

/** Roles disponibles para los selectores de usuarios. */
export function useRolesQuery(enabled = true) {
    return useQuery<any[]>({
        queryKey: [...r4Keys.roles],
        queryFn: async () => toArray((await api.get('/roles')).data),
        enabled,
    });
}

/** Resumen de un ADC, para el modal de detalle. */
export function useAdcSummaryQuery(name: string, isOpen: boolean) {
    return useQuery<any>({
        queryKey: [...r4Keys.adcsSummary, name],
        queryFn: async () => unwrap((await api.get(`/r4/adcs/${encodeURIComponent(name)}/summary`)).data),
        enabled: isOpen && !!name,
    });
}

/**
 * Tipos de cambio del año. `historial` cambia el endpoint al de auditoría, y va
 * en su propia clave para que ambas respuestas convivan sin pisarse.
 * `enabled` permite pedir el historial solo cuando se abre su modal.
 */
export function useTipoCambioQuery(year: number | string, historial = false, enabled = true) {
    return useQuery<any[]>({
        queryKey: [...r4Keys.tipoCambio, { year: String(year), historial }],
        queryFn: async () => {
            const path = historial ? 'historial' : '';
            const res = await api.get(`/r4/tipo-cambio${path ? `/${path}` : ''}?year=${year}`);
            return toArray(res.data);
        },
        enabled,
    });
}

export function useDashboardMetricsQuery(year: number, month: number) {
    return useQuery<any>({
        queryKey: [...r4Keys.dashboardMetrics, { year, month }],
        queryFn: async () =>
            unwrap((await api.get(`/r4/dashboard/metrics?year=${year}&month=${month}`)).data),
        placeholderData: (prev: any) => prev,
    });
}

/** Detalle de un equipo: historial de cambios, sitio y accesorios. */
export function useFlotillaDetalleQuery(id: string) {
    return useQuery<any>({
        queryKey: [...r4Keys.flotilla, 'detalle', id],
        queryFn: async () => unwrap((await api.get(`/r4/flotilla/${encodeURIComponent(id)}`)).data),
        enabled: !!id,
    });
}

/**
 * Equipos para el selector de alta de renta.
 *
 * Comparte la clave de `useFlotillaQuery` a proposito: es el mismo endpoint, asi
 * que se reutiliza la misma peticion/cache en vez de duplicarla. La normalizacion
 * de mayusculas la aplica el consumidor con `useMemo`, porque aqui dos queries
 * con la misma clave pero distinto `queryFn` pelearian por el mismo dato.
 *
 * `enabled` se propaga a la query subyacente: si ningun observador la pide, no se
 * descarga. Asi abrir el tab de rentas no descarga la flotilla completa si el
 * usuario no abre el modal; y si el observer de FlotillaTab ya esta montado, su
 * cache se reusa sin peticion extra.
 */
export function useEquiposNormalizados(enabled: boolean) {
    const query = useFlotillaQuery(enabled);
    const equipos = useMemo(
        () => (enabled ? normalizeEquipos(query.data ?? EMPTY_LIST) : EMPTY_LIST),
        [enabled, query.data]
    );
    return { ...query, equiposNormalizados: equipos };
}


