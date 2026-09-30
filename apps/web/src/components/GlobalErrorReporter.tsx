'use client';

import { useEffect } from 'react';
import { registrarErroresGlobales } from '@/lib/error-reporter';

/**
 * Se monta una sola vez en el layout raiz. Registra los errores que nadie
 * atrapa: JavaScript roto o promesas sin `await`. Sin esto, un error asi
 * unicamente se ve si el usuario abre la consola del navegador.
 */
export default function GlobalErrorReporter() {
    useEffect(() => {
        registrarErroresGlobales();
    }, []);

    return null;
}
