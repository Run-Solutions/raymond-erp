'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-white font-sans text-slate-800">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex-shrink-0 cursor-pointer" onClick={() => router.push('/')}>
                        <Image
                            src="/fsimage.png"
                            alt="Raymond Logo"
                            width={160}
                            height={50}
                            className="h-10 w-auto object-contain"
                            priority
                        />
                    </div>

                    {/* Search Bar - Hidden on mobile, visible on medium+ screens */}
                    <div className="hidden md:flex items-center flex-1 max-w-xl mx-auto">
                        <div className="flex w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-[#d92828]/50 focus-within:border-[#d92828] transition-all">
                            <div className="pl-4 flex items-center pointer-events-none text-gray-400">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar"
                                className="w-full bg-transparent border-none focus:ring-0 px-3 py-2 text-gray-700 placeholder-gray-500 outline-none"
                            />
                            <button className="bg-[#cc2a2a] hover:bg-[#b02222] text-white px-8 py-2 font-medium transition-colors">
                                Buscar
                            </button>
                        </div>
                    </div>

                    {/* Login Button */}
                    <div className="ml-4">
                        <Link
                            href="/login"
                            className="bg-[#cc2a2a] hover:bg-[#b02222] text-white px-8 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg text-sm tracking-wide"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-white h-[calc(100vh-80px)]">
                <div className="absolute inset-0 w-full h-full">
                    <Image
                        src="/main_design_text.png"
                        alt="Platform Overview Illustration"
                        fill
                        className="object-contain object-center"
                        priority
                    />
                </div>

                <div className="absolute inset-0 flex items-start justify-center container mx-auto px-6 pt-32 pointer-events-none">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#333] leading-snug max-w-4xl text-center tracking-tight drop-shadow-sm pointer-events-auto">
                        Una sola plataforma para controlar entradas, salidas, renovaciones y almacenes, con datos claros, evidencia digital y trazabilidad total.
                    </h1>
                </div>
            </section>

            {/* Cards Section with Red Background Strip */}
            <section className="relative py-24 mb-10">
                {/* Red Background Strip */}
                <div className="absolute top-1/2 left-0 right-0 h-[280px] bg-[#cc2a2a] -translate-y-1/2 z-0 shadow-inner"></div>

                <div className="container mx-auto px-6 relative z-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-16 drop-shadow-sm">
                        Un solo sistema para controlar todo el ciclo del taller
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Card 1 */}
                        <div className="bg-white rounded-xl p-8 shadow-2xl text-center flex flex-col items-center hover:-translate-y-3 transition-transform duration-300 border border-gray-100">
                            <h3 className="text-xl font-bold text-[#cc2a2a] mb-3">Gestión de Entradas</h3>
                            <p className="text-gray-600 mb-8 h-10 font-medium">Todo inicia con un registro claro</p>
                            <div className="w-full h-40 relative mb-6">
                                <Image src="/ticket_management.png" alt="Gestión de Entradas" fill className="object-contain" />
                            </div>
                            <p className="text-[10px] text-red-500 mb-6 font-bold uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full">Registro digital + Evaluación + Evidencia</p>
                            <button
                                onClick={() => document.getElementById('entradas')?.scrollIntoView({ behavior: 'smooth' })}
                                className="mt-auto bg-[#cc2a2a] text-white px-8 py-2.5 rounded-lg shadow-md hover:bg-[#b02222] transition-all font-medium text-sm"
                            >
                                Ver más
                            </button>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white rounded-xl p-8 shadow-2xl text-center flex flex-col items-center hover:-translate-y-3 transition-transform duration-300 border border-gray-100 transform scale-105 z-20">
                            <h3 className="text-xl font-bold text-[#cc2a2a] mb-3">Control y Seguimiento</h3>
                            <p className="text-gray-600 mb-8 h-10 font-medium">Saber dónde está y en qué estado</p>
                            <div className="w-full h-40 relative mb-6">
                                <Image src="/monitoring_control.png" alt="Control y Seguimiento" fill className="object-contain" />
                            </div>
                            <p className="text-[10px] text-red-500 mb-6 font-bold uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full">Ubicación + Proceso + Incidencias</p>
                            <button
                                onClick={() => document.getElementById('control')?.scrollIntoView({ behavior: 'smooth' })}
                                className="mt-auto bg-[#cc2a2a] text-white px-8 py-2.5 rounded-lg shadow-md hover:bg-[#b02222] transition-all font-medium text-sm"
                            >
                                Ver más
                            </button>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white rounded-xl p-8 shadow-2xl text-center flex flex-col items-center hover:-translate-y-3 transition-transform duration-300 border border-gray-100">
                            <h3 className="text-xl font-bold text-[#cc2a2a] mb-3">Gestión de Salidas</h3>
                            <p className="text-gray-600 mb-8 h-10 font-medium">Cierre con respaldo y auditoría</p>
                            <div className="w-full h-40 relative mb-6">
                                <Image src="/output_management.png" alt="Gestión de Salidas" fill className="object-contain" />
                            </div>
                            <p className="text-[10px] text-red-500 mb-6 font-bold uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full">Checklist + Auditoría + Entrega</p>
                            <button
                                onClick={() => document.getElementById('salidas')?.scrollIntoView({ behavior: 'smooth' })}
                                className="mt-auto bg-[#cc2a2a] text-white px-8 py-2.5 rounded-lg shadow-md hover:bg-[#b02222] transition-all font-medium text-sm"
                            >
                                Ver más
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Section 1: Gestión digital de entradas */}
            <section id="entradas" className="py-24 bg-white relative overflow-hidden">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
                    <div className="md:w-1/2 relative z-10">
                        <h3 className="text-3xl font-extrabold text-slate-900 mb-8">Gestión digital de entradas</h3>
                        <div className="text-gray-600 space-y-6 leading-relaxed text-lg font-light">
                            <p className="flex gap-3"><span className="text-[#cc2a2a] font-bold">✓</span> Registra cada equipo, batería o cargador desde el primer momento.</p>
                            <p className="flex gap-3"><span className="text-[#cc2a2a] font-bold">✓</span> Centraliza evaluaciones, fotografías y datos clave en un solo lugar, evitando pérdidas de información y errores manuales.</p>
                            <p className="flex gap-3"><span className="text-[#cc2a2a] font-bold">✓</span> Todo ingreso queda documentado y disponible para consulta, auditoría y seguimiento histórico.</p>
                        </div>
                    </div>
                    <div className="md:w-1/2 flex justify-center relative">
                        <div className="absolute inset-0 bg-red-50 rounded-full filter blur-3xl opacity-30 -z-10"></div>
                        <div className="relative w-full max-w-lg h-[400px]">
                            <Image src="/digital_tickets.png" alt="Gestión digital de entradas" fill className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Section 2: Control y seguimiento en tiempo real */}
            <section id="control" className="py-24 bg-gray-50 relative overflow-hidden">
                <div className="container mx-auto px-6 flex flex-col md:flex-row-reverse items-center gap-16">
                    <div className="md:w-1/2 relative z-10">
                        <h3 className="text-3xl font-extrabold text-slate-900 mb-8">Control y seguimiento en tiempo real</h3>
                        <div className="text-gray-600 space-y-6 leading-relaxed text-lg font-light">
                            <p className="flex gap-3"><span className="text-[#cc2a2a] font-bold">✓</span> Conoce en todo momento dónde está cada equipo y en qué etapa del proceso se encuentra.</p>
                            <p className="flex gap-3"><span className="text-[#cc2a2a] font-bold">✓</span> Monitorea renovaciones, incidencias, tiempos detenidos y avance por estación de trabajo.</p>
                            <p className="flex gap-3"><span className="text-[#cc2a2a] font-bold">✓</span> La información fluye sin depender de la memoria del personal.</p>
                        </div>
                    </div>
                    <div className="md:w-1/2 flex justify-center relative">
                        <div className="absolute inset-0 bg-red-100 rounded-full filter blur-3xl opacity-40 -z-10"></div>
                        <div className="relative w-full max-w-lg h-[400px]">
                            <Image src="/tracking_time.png" alt="Control y seguimiento" fill className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Section 3: Gestión segura de salidas */}
            <section id="salidas" className="py-24 bg-white mb-20 relative overflow-hidden">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
                    <div className="md:w-1/2 relative z-10">
                        <h3 className="text-3xl font-extrabold text-slate-900 mb-8">Gestión segura de salidas</h3>
                        <div className="text-gray-600 space-y-6 leading-relaxed text-lg font-light">
                            <p className="flex gap-3"><span className="text-[#cc2a2a] font-bold">✓</span> Asegura entregas controladas y con respaldo digital.</p>
                            <p className="flex gap-3"><span className="text-[#cc2a2a] font-bold">✓</span> Genera checklists finales, cartas de instrucción con evidencia fotográfica y registro completo de refacciones utilizadas.</p>
                            <p className="flex gap-3"><span className="text-[#cc2a2a] font-bold">✓</span> Cada salida queda documentada para control interno y auditoría.</p>
                        </div>
                    </div>
                    <div className="md:w-1/2 flex justify-center relative">
                        <div className="absolute inset-0 bg-red-50 rounded-full filter blur-3xl opacity-30 -z-10"></div>
                        <div className="relative w-full max-w-lg h-[450px]">
                            <Image src="/exit_security.png" alt="Gestión segura de salidas" fill className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}

        </div>
    )
}
