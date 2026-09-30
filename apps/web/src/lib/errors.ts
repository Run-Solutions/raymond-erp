import { toast } from 'sonner';

/** Como se clasifica un fallo. Se usa para elegir el texto y el icono. */
export type ErrorKind =
    | 'timeout'
    | 'offline'
    | 'red'
    | 'sesion'
    | 'permisos'
    | 'no-encontrado'
    | 'validacion'
    | 'conflicto'
    | 'demasiadas-peticiones'
    | 'servidor'
    | 'desconocido';

export interface ErrorDescrito {
    kind: ErrorKind;
    /** Texto corto para el toast. */
    title: string;
    /** Explicacion de que hacer. Opcional. */
    detail?: string;
    status?: number;
    retryable: boolean;
    /** Lo que realmente ocurrio, para la consola del backend. */
    tecnico: string;
}

const esTimeout = (e: any) =>
    e?.code === 'ECONNABORTED' ||
    e?.code === 'ETIMEDOUT' ||
    /timeout/i.test(e?.message || '');

const fueraDeLinea = () =>
    typeof navigator !== 'undefined' && navigator.onLine === false;

/** Extrae el mensaje real del backend (el filtro global lo deja en `message`). */
const mensajeDelBackend = (e: any): string | undefined => {
    const m = e?.response?.data?.message;
    if (!m) return undefined;
    if (Array.isArray(m)) return m.join('. ');
    return typeof m === 'string' ? m : undefined;
};

/**
 * Convierte cualquier error en algo mostrable. Un mismo error puede venir con
 * formas muy distintas segun si fue la red, el servidor o un 404, y sin esto la
 * persona veria "Error" o directamente el detalle tecnico.
 */
export function describirError(error: any, contexto?: string): ErrorDescrito {
    const status = error?.response?.status;
    const delBack = mensajeDelBackend(error);
    const url = error?.config?.url;
    const tecnico = [
        contexto,
        url ? `${error?.config?.method?.toUpperCase() || ''} ${url}`.trim() : null,
        status ? `status=${status}` : null,
        error?.message,
        delBack,
    ]
        .filter(Boolean)
        .join(' | ');

    if (esTimeout(error)) {
        return {
            kind: 'timeout',
            title: 'La conexión tardó demasiado',
            detail:
                'El servidor no respondió a tiempo. Puede ser que esté lento o que tu conexión se haya caído. Intenta de nuevo en un momento.',
            retryable: true,
            tecnico: tecnico,
        };
    }

    if (fueraDeLinea()) {
        return {
            kind: 'offline',
            title: 'Sin conexión a internet',
            detail: 'Revisa tu conexión. No pudimos comunicarnos con el servidor.',
            retryable: true,
            tecnico: tecnico,
        };
    }

    // Peticion que ni siquiera llego al servidor: se cae antes o durante el envio.
    if (error?.request && !error?.response) {
        return {
            kind: 'red',
            title: 'No pudimos conectarnos con el servidor',
            detail:
                'La petición no llegó a completarse. Revisa tu conexión o intenta en unos segundos.',
            retryable: true,
            tecnico: tecnico,
        };
    }

    if (status === 401) {
        return {
            kind: 'sesion',
            title: 'Tu sesión expiró',
            detail: 'Por favor inicia sesión nuevamente.',
            status,
            retryable: false,
            tecnico: tecnico,
        };
    }

    if (status === 403) {
        return {
            kind: 'permisos',
            title: 'No tienes permisos para esto',
            detail: delBack || 'Tu rol no permite realizar esta acción.',
            status,
            retryable: false,
            tecnico: tecnico,
        };
    }

    if (status === 404) {
        return {
            kind: 'no-encontrado',
            title: 'No encontramos esa información',
            detail: 'Puede que se haya eliminado o que el enlace esté incompleto.',
            status,
            retryable: false,
            tecnico: tecnico,
        };
    }

    if (status === 429) {
        return {
            kind: 'demasiadas-peticiones',
            title: 'Demasiadas solicitudes',
            detail: 'Espera unos segundos antes de volver a intentarlo.',
            status,
            retryable: true,
            tecnico: tecnico,
        };
    }

    if (status === 409) {
        return {
            kind: 'conflicto',
            title: 'No se pudo completar la operación',
            detail: delBack || 'El registro cambió mientras lo editabas. Recarga e intenta de nuevo.',
            status,
            retryable: true,
            tecnico: tecnico,
        };
    }

    if (status === 400 || status === 422) {
        return {
            kind: 'validacion',
            title: 'Revisa los datos capturados',
            detail: delBack || 'Alguno de los campos no es válido.',
            status,
            retryable: false,
            tecnico: tecnico,
        };
    }

    if (status && status >= 500) {
        return {
            kind: 'servidor',
            title: 'Ocurrió un problema en el servidor',
            detail:
                'El error ya quedó registrado. Intenta de nuevo en unos momentos; si sigue pasando, avisa a soporte.',
            status,
            retryable: true,
            tecnico: tecnico,
        };
    }

    return {
        kind: 'desconocido',
        title: 'No se pudo completar la acción',
        detail: delBack || 'Ocurrió un error inesperado. Intenta de nuevo.',
        retryable: true,
        tecnico: tecnico,
    };
}

/** Ultima vez que se mostro cada error, para no repetir el mismo toast. */
const ultimoAviso = new Map<string, number>();
const VENTANA_MS = 8000;

/**
 * Muestra el error al usuario. El mismo error no se repite dentro de la ventana:
 * si una pantalla dispara cinco consultas y todas fallan por la misma causa, se
 * ve un aviso, no cinco.
 */
export function mostrarError(error: any, contexto?: string): ErrorDescrito {
    const d = describirError(error, contexto);
    const clave = `${d.kind}|${d.title}|${d.detail || ''}`;
    const ahora = Date.now();
    const previo = ultimoAviso.get(clave);

    if (previo && ahora - previo < VENTANA_MS) {
        return d;
    }
    ultimoAviso.set(clave, ahora);

    toast.error(d.title, {
        description: d.detail,
        duration: d.retryable ? 6000 : 8000,
    });

    return d;
}
