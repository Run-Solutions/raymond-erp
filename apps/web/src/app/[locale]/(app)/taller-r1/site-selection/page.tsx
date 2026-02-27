'use client';

import { useAuthTallerStore } from '@/store/auth-taller.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Building2, Factory, Warehouse, ChevronRight } from 'lucide-react';

export default function SiteSelectionPage() {
    const { user, setSelectedSite } = useAuthTallerStore();
    const router = useRouter();

    // Mapping code to display names and descriptions
    const siteOptions = [
        {
            id: 'r1',
            code: 'R1',
            name: 'Control Taller R1',
            description: 'Gestión principal de taller y reparaciones R1.',
            icon: Building2,
            color: 'from-red-500 to-red-700',
            borderColor: 'border-red-100',
            bgLight: 'bg-red-50',
        },
        {
            id: 'r2',
            code: 'R2',
            name: 'Control Raymond 2',
            description: 'Operaciones y logística en Frontera.',
            icon: Warehouse,
            color: 'from-blue-600 to-blue-800',
            borderColor: 'border-blue-100',
            bgLight: 'bg-blue-50',
        },
        {
            id: 'r3',
            code: 'R3',
            name: 'Raymond Planta',
            description: 'Control de inventario y activos en Planta (Naves).',
            icon: Factory,
            color: 'from-emerald-600 to-emerald-800',
            borderColor: 'border-emerald-100',
            bgLight: 'bg-emerald-50',
        },
    ];

    // Filter sites based on user permissions
    const userSites = user?.sitio ? user.sitio.split(',').map(s => s.trim().toUpperCase()) : ['R1'];
    const availableOptions = siteOptions.filter(opt => userSites.includes(opt.code));

    // Debugging site access issues
    useEffect(() => {
        console.log('[SiteSelection] User from store:', user);
        console.log('[SiteSelection] Parsed userSites:', userSites);
        console.log('[SiteSelection] Available options based on siteOptions:', availableOptions);
    }, [user, userSites, availableOptions]);

    const handleSelect = (siteId: string) => {
        setSelectedSite(siteId);
        // Redirect to logical starting point
        router.push('/es/taller-r1/entradas');
    };

    // Auto-selection disabled per user request to allow review/debugging
    /*
    useEffect(() => {
        if (availableOptions.length === 1) {
            handleSelect(availableOptions[0].id);
        }
    }, [availableOptions.length]);
    */

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
                <svg width="100%" height="100%">
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            <div className="w-full max-w-5xl relative z-10">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                        Selecciona un Centro de Control
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Bienvenido, <span className="font-semibold text-gray-900">{user.username}</span>.
                        Por favor selecciona el sitio con el que deseas trabajar hoy.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {availableOptions.map((site) => (
                        <button
                            key={site.id}
                            onClick={() => handleSelect(site.id)}
                            className={`group relative flex flex-col text-left bg-white rounded-3xl p-8 border ${site.borderColor} shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 ease-out overflow-hidden`}
                        >
                            {/* Accent Background Gradient */}
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${site.color} opacity-0 group-hover:opacity-5 rounded-bl-full transition-opacity duration-300`} />

                            <div className={`w-16 h-16 rounded-2xl ${site.bgLight} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300`}>
                                <site.icon className={`w-8 h-8 bg-gradient-to-br ${site.color} text-white rounded-lg p-1.5`} fill="currentColor" />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {site.name}
                            </h3>
                            <p className="text-gray-500 text-sm leading-relaxed mb-8">
                                {site.description}
                            </p>

                            <div className="mt-auto flex items-center text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                                Entrar ahora
                                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    ))}
                </div>

                {availableOptions.length === 0 && (
                    <div className="text-center mt-12 p-8 bg-red-50 rounded-2xl border border-red-100 italic text-red-600">
                        No tienes sitios asignados. Por favor, contacta al administrador.
                    </div>
                )}
            </div>

            {/* Footer logo/branding */}
            <div className="mt-16 text-gray-400 text-sm flex items-center gap-2">
                <div className="w-8 h-[1px] bg-gray-300" />
                RAYMOND ERP - SISTEMA DE CONTROL DE ACTIVOS
                <div className="w-8 h-[1px] bg-gray-300" />
            </div>
        </div>
    );
}
