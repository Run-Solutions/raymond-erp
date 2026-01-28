'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';

const loginSchema = z.object({
    email: z.string().min(1, 'Usuario requerido'),
    password: z.string().min(1, 'Contraseña requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const signIn = useAuthStore((state) => state.signIn);
    const router = useRouter();
    const [error, setError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            // Bypass login for development
            router.push('/es/taller-r1/entradas');
            return;
            
            /* 
            await signIn(data);
            router.push('/dashboard');
            */
        } catch (err: any) {
            setError(err.response?.data?.message || 'Credenciales inválidas');
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA] p-4 lg:p-0 font-sans selection:bg-red-100 selection:text-red-900">
            {/* Main Application Container */}
            <div className="w-full max-w-6xl h-full lg:h-[750px] bg-white rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col lg:flex-row overflow-hidden relative">
                
                {/* Branding Section (Left) */}
                <div className="lg:w-1/2 h-full bg-white flex flex-col p-12 lg:p-20 justify-between relative border-r border-gray-100/50">
                    <div className="z-10">
                        <div className="w-72 h-24 relative transition-transform hover:scale-105 duration-500">
                            <Image
                                src="/logo-raymond.svg"
                                alt="RAYMOND"
                                fill
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </div>

                    {/* Industrial Showcase Area - Perfectly Blended */}
                    <div className="flex-1 flex items-center justify-center relative">
                        <div className="absolute w-80 h-80 bg-red-400/10 rounded-full blur-[100px] animate-pulse"></div>
                        <div className="relative w-full aspect-video transition-all duration-700 hover:scale-110 mix-blend-multiply filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.1)]">
                            <Image
                                src="/raymondgif-ezgif.com-reverse.gif"
                                alt="Raymond Forklift"
                                fill
                                className="object-contain"
                                priority
                                unoptimized
                            />
                        </div>
                    </div>

                    <div className="pt-8">
                        <div className="inline-flex items-center gap-3 group cursor-default">
                            <span className="w-12 h-[2px] bg-red-600 transition-all group-hover:w-20"></span>
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400/80">
                                Global Standards
                            </span>
                        </div>
                    </div>
                </div>

                {/* Authentication Section (Right) */}
                <div className="lg:w-1/2 h-full bg-white p-12 lg:p-24 flex items-center justify-center relative">
                    {/* Subtle Brand Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-50/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="w-full max-w-md mx-auto relative z-10">
                        <div className="mb-14">
                            <h2 className="text-5xl font-black text-gray-900 tracking-tighter leading-none mb-4">
                                Iniciar Sesión
                            </h2>
                            <p className="text-gray-400 font-medium text-lg">
                                Ingrese al ecosistema inteligente de Raymond.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
                            {/* Input: Username */}
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                    Usuario Corporativo
                                </label>
                                <input
                                    {...register('email')}
                                    type="text"
                                    autoComplete="off"
                                    className="w-full px-6 py-4.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all duration-300 outline-none font-semibold shadow-sm"
                                    placeholder="Nombre de usuario"
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-[10px] font-bold mt-1.5 pl-1 uppercase tracking-tight">
                                        * {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Input: Password */}
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                    Contraseña
                                </label>
                                <input
                                    {...register('password')}
                                    type="password"
                                    className="w-full px-6 py-4.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all duration-300 outline-none font-semibold shadow-sm"
                                    placeholder="••••••••"
                                />
                                {errors.password && (
                                    <p className="text-red-500 text-[10px] font-bold mt-1.5 pl-1 uppercase tracking-tight">
                                        * {errors.password.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end pt-1">
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-widest decoration-red-100 underline underline-offset-4"
                                >
                                    ¿Olvidó su contraseña?
                                </Link>
                            </div>

                            <div className="pt-8">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-[#D91B1B] text-white font-black py-5 rounded-2xl hover:bg-[#A81515] transition-all duration-300 disabled:opacity-50 active:scale-[0.98] shadow-xl shadow-red-100 hover:shadow-red-200 text-lg uppercase tracking-wider"
                                >
                                    {isSubmitting ? 'Cargando...' : 'Entrar al Sistema'}
                                </button>
                            </div>

                            <div className="text-center pt-10 border-t border-gray-50 mt-12">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">¿No tiene una cuenta corporativa?</p>
                                <Link
                                    href="/register"
                                    className="text-gray-900 font-black text-sm border-b-2 border-red-600 pb-1 hover:text-red-600 transition-colors uppercase tracking-tighter"
                                >
                                    Solicitar registro
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
