/**
 * Registro central de caches del modulo comercial-r4.
 *
 * Antes cada servicio declaraba su propio `Map` a nivel de modulo y se importaba
 * cruzado (ordenes -> presets -> rentas, y rentals -> ordenes), lo que generaba
 * ciclos de importacion. Aqui viven todas las caches y los servicios solo las consumen.
 *
 * REGLA: toda escritura a base de datos debe llamar a `clearR4Caches()` DESPUES del
 * ultimo write. Invalidar antes permite que un GET concurrente repueble la cache con
 * datos previos al cambio.
 */

type CacheEntry<T> = { timestamp: number; data: T };

/**
 * Techo de entradas por cache: evita crecimiento ilimitado por query params arbitrarios.
 */
const MAX_ENTRIES = 200;

class TtlCache<T> {
    private readonly store = new Map<string, CacheEntry<T>>();

    /**
     * Se incrementa en cada `clear()`. Un GET que empezo antes de una escritura
     * puede terminar despues; con esto no repuebla la cache con datos previos.
     */
    private version = 0;

    constructor(private readonly ttlMs: number) {}

    getVersion(): number {
        return this.version;
    }

    get(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (Date.now() - entry.timestamp >= this.ttlMs) {
            this.store.delete(key);
            return undefined;
        }
        return entry.data;
    }

    /**
     * Devuelve tambien si la entrada sigue fresca, sin borrar la vencida. Permite
     * responder al instante con el dato anterior y refrescar en segundo plano.
     */
    getWithMeta(key: string): { data: T; fresh: boolean } | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        return {
            data: entry.data,
            fresh: Date.now() - entry.timestamp < this.ttlMs,
        };
    }

    set(key: string, data: T): void {
        if (this.store.size >= MAX_ENTRIES && !this.store.has(key)) {
            const oldest = this.store.keys().next();
            if (!oldest.done) this.store.delete(oldest.value);
        }
        this.store.set(key, { timestamp: Date.now(), data });
    }

    /**
     * Solo guarda si no hubo un `clear()` desde que arranco la lectura. Evita que
     * una consulta lenta que corrio en paralelo a un write deje datos viejos.
     */
    setIfVersion(key: string, data: T, version: number): void {
        if (this.version !== version) return;
        this.set(key, data);
    }

    clear(): void {
        this.store.clear();
        this.version++;
    }
}

// La BD de R4 vive en un servidor remoto (~550 ms de RTT) y comparte host con
// procesos externos (AppSheet) que a veces la saturan: estos listados tardan
// decenas de segundos por lectura. Toda escritura invalida la cache despues del
// write (ver clearR4Caches), asi que un TTL mas alto solo evita recomputar en
// navegacion/refetch sin datos nuevos; no sirve cache vieja despues de un cambio.
export const rentasCache = new TtlCache<any[]>(2 * 60 * 1000);
export const ordenesCache = new TtlCache<any[]>(2 * 60 * 1000);
export const flotillaCache = new TtlCache<any>(2 * 60 * 1000);
// El dashboard de presupuestos es el endpoint mas caro. Su TTL es mayor de forma
// segura: cualquier escritura invalida la cache despues del write (ver clearR4Caches),
// asi que un TTL mayor solo protege lecturas puras y evita que N usuarios recomputen
// a la vez.
export const presupuestosCache = new TtlCache<any>(60 * 1000);

export type R4CacheName = 'rentas' | 'ordenes' | 'flotilla' | 'presupuestos';

export interface ClearR4CachesOptions {
    /** Que servicio provoco la invalidacion. Solo para trazabilidad. */
    origen?: string;
    /** Dominios a omitir, cuando el escritor ya sabe que uno no le aplica. */
    omit?: R4CacheName[];
}

const INVALIDATORS: Record<R4CacheName, () => void> = {
    rentas: () => rentasCache.clear(),
    ordenes: () => ordenesCache.clear(),
    flotilla: () => flotillaCache.clear(),
    presupuestos: () => presupuestosCache.clear(),
};

export function clearRentasCache(): void {
    INVALIDATORS.rentas();
}

export function clearOrdenesCache(): void {
    INVALIDATORS.ordenes();
}

export function clearFlotillaCache(): void {
    INVALIDATORS.flotilla();
}

export function clearPresupuestosCache(): void {
    INVALIDATORS.presupuestos();
}

const DOMINIOS: R4CacheName[] = ['rentas', 'ordenes', 'flotilla', 'presupuestos'];

/**
 * Invalida todas las caches de r4 (o solo las indicadas) tras un write.
 * Llamar SIEMPRE despues del ultimo write de la operacion.
 */
export function clearR4Caches(options: ClearR4CachesOptions = {}): void {
    const { omit = [] } = options;
    for (const dominio of DOMINIOS) {
        if (omit.includes(dominio)) continue;
        INVALIDATORS[dominio]();
    }
}