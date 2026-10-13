'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Boton flotante para forzar una sincronizacion rapida.
 *
 * Vacía las caches del backend de R4 (rentas, ordenes, flotilla, presupuestos) y
 * despues invalida todas las consultas de TanStack Query para que la vista actual
 * (y las siguientes) vuelvan a pedir datos frescos.
 */
export default function SyncButton() {
    const queryClient = useQueryClient();
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            await api.post('/r4/cache/clear');
            await queryClient.invalidateQueries();
            toast.success('Sincronización completada');
        } catch (error) {
            console.error('Error al sincronizar:', error);
            toast.error('No se pudo sincronizar los cambios');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            title="Forzar sincronización de cambios"
            aria-label="Forzar sincronización de cambios"
            className={cn(
                'fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-white border border-slate-200',
                'shadow-xl px-4 py-3 text-sm font-bold text-slate-700 transition-all cursor-pointer',
                'hover:text-red-600 hover:border-red-200 hover:shadow-2xl disabled:opacity-60 disabled:cursor-wait'
            )}
        >
            <RefreshCw className={cn('w-4 h-4 shrink-0', isSyncing && 'animate-spin')} />
            <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
        </button>
    );
}
