import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';
import { mostrarError } from './errors';
import { reportarError } from './error-reporter';

/**
 * Red de seguridad para errores: sin esto, una consulta o mutacion que falla solo
 * deja la pantalla vacia y el error se pierde en la consola del navegador.
 * `mostrarError` deduplica, asi que cinco consultas que fallen por la misma causa
 * muestran un solo aviso en vez de cinco.
 */
function alFallar(error: any, origen: string) {
    reportarError(error, origen);
    mostrarError(error, 'No se pudo completar la operación');
}

/**
 * Cliente de TanStack Query unico para toda la aplicacion.
 *
 * Antes cada layout creaba su propio `new QueryClient()`, lo que producia caches
 * aisladas: un `invalidateQueries` en R4 no limpiaba la cache de otro layout, y
 * volver a una vista volvia a pedir datos porque la otra cache nunca se llenaba.
 *
 * Defaults pensados para un ERP: los datos se consideran frescos un rato para no
 * re-fetchear en cada montaje de componente, y NO se re-fetchea al reenfocar la
 * ventana, porque en R4 eso detonaba peticiones constantes al alternar entre pestanas
 * y el Excel.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Datos frescos: no se vuelve a pedir al montar componentes que ya los tienen.
            staleTime: 30 * 1000,
            // Evita el refetch automatico al volver a la pestana / tomar foco.
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            // La cache sobrevive 5 min aunque ningun componente la observe, para que
            // navegar fuera y volver no dispare una pantalla de carga completa.
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnMount: true,
        },
        mutations: {
            retry: 0,
        },
    },

    // En v5 los manejadores globales van en las cache, no en `defaultOptions`.
    queryCache: new QueryCache({
        onError: (error: any, query) => alFallar(error, 'consulta'),
    }),
    mutationCache: new MutationCache({
        onError: (error: any) => alFallar(error, 'operacion'),
    }),
});

export default queryClient;
