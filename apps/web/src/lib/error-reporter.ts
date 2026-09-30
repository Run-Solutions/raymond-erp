import { describirError } from './errors';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

/**
 * Cache de errores ya enviados, para que un fallo que se repite en bucle (por
 * ejemplo un componente que consulta antes de montar) no llene el log con la
 * misma linea cientos de veces.
 */
const enviados = new Map<string, number>();
const VENTANA_MS = 60000;
const MAX_REGISTROS = 200;

/** Limpia el mapa cuando crece demasiado (un mismo error no se reenvía nunca). */
function podar() {
    if (enviados.size <= MAX_REGISTROS) return;
    const ahora = Date.now();
    for (const [k, t] of enviados) {
        if (ahora - t > VENTANA_MS) enviados.delete(k);
    }
    // Si aun sigue grande (todo reciente), se descarta lo mas viejo.
    if (enviados.size > MAX_REGISTROS) {
        const orden = [...enviados.entries()].sort((a, b) => a[1] - b[1]);
        for (const [k] of orden.slice(0, Math.floor(MAX_REGISTROS / 2))) {
            enviados.delete(k);
        }
    }
}

function usuarioActual(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        const raw = localStorage.getItem('user');
        if (!raw || raw === 'null') return undefined;
        const u = JSON.parse(raw);
        return u?.email || u?.nombre || u?.id;
    } catch {
        return undefined;
    }
}

/**
 * Envia el error a la consola del backend.
 *
 * Se usa `fetch` a proposito y no el cliente de axios: si el fallo viene del
 * propio cliente (o no hay conexion), reenviarlo por ahi podria generar otro
 * error y un ciclo. Ademas usa `sendBeacon` cuando existe, que sobrevive al
 * cierre de la pestana -- justo cuando mas falta el log.
 */
export function reportarError(error: any, contexto?: string, extra?: Record<string, any>) {
    if (typeof window === 'undefined') return;

    const d = describirError(error, contexto);

    const clave = `${d.kind}|${d.status ?? ''}|${d.tecnico}`;
    const ahora = Date.now();
    const previo = enviados.get(clave);
    if (previo && ahora - previo < VENTANA_MS) return;
    enviados.set(clave, ahora);
    podar();

    const cuerpo = {
        kind: d.kind,
        title: d.title,
        message: d.detail || d.title,
        status: d.status,
        url: error?.config?.url,
        method: error?.config?.method?.toUpperCase(),
        contexto,
        userAgent: navigator.userAgent,
        userId: usuarioActual(),
        stack: typeof error?.stack === 'string' ? error.stack.slice(0, 2000) : undefined,
        occurredAt: new Date().toISOString(),
        ...extra,
    };

    try {
        const texto = JSON.stringify(cuerpo);
        const token = localStorage.getItem('accessToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token && token !== 'null' && token !== 'undefined') {
            headers.Authorization = `Bearer ${token}`;
        }

        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            navigator.sendBeacon(`${API_BASE}/logs/client-error`, new Blob([texto], { type: 'application/json' }));
            return;
        }

        void fetch(`${API_BASE}/logs/client-error`, {
            method: 'POST',
            headers,
            body: texto,
            keepalive: true,
        }).catch(() => {
            /* si ni el reporte sale, no hay nada mas que hacer */
        });
    } catch {
        /* si falla el reporte no debe romper la app */
    }
}

/** Registra los errores que no atrapa nadie: JS roto o promesas sin await. */
export function registrarErroresGlobales() {
    if (typeof window === 'undefined') return;
    const flag = '__raymondErroresRegistrados';
    if ((window as any)[flag]) return;
    (window as any)[flag] = true;

    window.addEventListener('error', (event) => {
        reportarError(event.error || event.message, 'error-global', {
            url: event.filename,
            method: 'JS',
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        const razon = event.reason;
        // La sesion expirada ya redirige a login: es ruido esperado.
        if (razon?.isSessionExpired) return;
        reportarError(razon, 'promesa-sin-atender');
    });
}
