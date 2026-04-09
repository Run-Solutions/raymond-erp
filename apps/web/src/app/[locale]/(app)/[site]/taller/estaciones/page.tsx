'use client';

import { EstacionesTab } from '@/components/taller-r1/renovados/EstacionesTab';

export default function EstacionesTallerPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden space-y-8">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Estaciones de Taller</h1>
                <p className="text-slate-500 font-medium mt-1">Gestión administrativa y logística de estaciones de mantenimiento R1</p>
            </div>
            <EstacionesTab />
        </div>
    );
}
