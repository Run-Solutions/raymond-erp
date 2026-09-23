'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Eye, EyeOff, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const PENDING_PASSWORD_SETUP_KEY = 'pendingPasswordSetup';

const changePasswordSchema = z
    .object({
        password: z
            .string()
            .min(8, 'La contraseña debe tener al menos 8 caracteres')
            .regex(/^(?=.*[A-Z])(?=.*\d).+$/, 'La contraseña debe contener al menos una mayúscula y un número'),
        confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
    });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

interface PendingSetup {
    setupToken: string;
    email: string;
}

export default function ChangePasswordPage() {
    const completePasswordSetup = useAuthStore((state) => state.completePasswordSetup);
    const router = useRouter();
    const params = useParams() as { locale?: string };
    const locale = params?.locale || 'es';

    const [pending, setPending] = useState<PendingSetup | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(PENDING_PASSWORD_SETUP_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.setupToken) {
                    setPending(parsed);
                    return;
                }
            }
        } catch (_) {
            /* ignore malformed storage */
        }
        router.replace(`/${locale}/login`);
    }, [locale, router]);

    const { register, handleSubmit, formState: { errors } } = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { password: '', confirmPassword: '' },
    });

    const onSubmit = async (data: ChangePasswordFormData) => {
        if (!pending) return;
        setSubmitting(true);
        setError('');
        try {
            await completePasswordSetup(pending.setupToken, data.password);
            router.push(`/${locale}/site-selection`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ocurrió un error al cambiar la contraseña. Intenta iniciar sesión nuevamente.');
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans overflow-hidden bg-slate-900">
            {/* Inline style for clean autofill */}
            <style>{`
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus,
                input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
                    -webkit-text-fill-color: #0f172a !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>

            {/* Left Side - Password Setup Form */}
            <div className="relative w-full lg:w-1/2 flex flex-col justify-between bg-gradient-to-br from-slate-50 via-[#f8fafc] to-slate-100 min-h-screen">
                <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-20 right-0 w-80 h-80 bg-slate-400/10 rounded-full blur-2xl pointer-events-none" />

                {/* Logo Top Left */}
                <div className="pt-8 pl-8 sm:pl-10 z-20">
                    <Image
                        src="/fsimage.png"
                        alt="RAYMOND"
                        width={180}
                        height={50}
                        className="object-contain object-left drop-shadow-xs"
                        priority
                    />
                </div>

                {/* Card */}
                <div className="flex-1 flex items-center justify-center p-6 sm:p-8 z-10">
                    <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] p-8 sm:p-10 border border-slate-200/80 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-rose-500" />

                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
                                <ShieldCheck className="w-7 h-7 text-red-600" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                                Cambio de contraseña requerido
                            </h2>
                            <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed max-w-[340px]">
                                Por motivos de seguridad debes establecer una nueva contraseña para continuar
                                accediendo al sistema.
                            </p>
                            {pending?.email && (
                                <span className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 rounded-full px-4 py-1.5">
                                    {pending.email}
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            {/* Input: New Password */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Nueva contraseña
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-slate-400 pointer-events-none">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        {...register('password')}
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-red-600 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-semibold shadow-xs"
                                        placeholder="Mínimo 8 caracteres"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                                        tabIndex={-1}
                                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-600 text-xs font-semibold mt-1">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Input: Confirm Password */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Confirmar contraseña
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-slate-400 pointer-events-none">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        {...register('confirmPassword')}
                                        type={showConfirm ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-red-600 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-semibold shadow-xs"
                                        placeholder="Repite tu contraseña"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(p => !p)}
                                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                                        tabIndex={-1}
                                        title={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-red-600 text-xs font-semibold mt-1">
                                        {errors.confirmPassword.message}
                                    </p>
                                )}
                            </div>

                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed pt-1">
                                La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número.
                            </p>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting || !pending}
                                className="w-full bg-[#D92D20] hover:bg-[#B91C1C] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-xs uppercase tracking-wider shadow-lg shadow-red-600/25 active:scale-[0.98] cursor-pointer"
                            >
                                {submitting ? 'Guardando cambios...' : 'Guardar y continuar'}
                            </button>

                            <div className="text-center pt-1">
                                <Link
                                    href={`/${locale}/login`}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </form>

                        {error && (
                            <div className="mt-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold leading-relaxed">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="bg-white/90 backdrop-blur-md border-t border-slate-200/80 text-slate-900 h-20 flex flex-col sm:flex-row items-center justify-between px-6 sm:px-10 py-2 z-20 shadow-xs">
                    <div className="flex items-center">
                        <Image
                            src="/fsimage.png"
                            alt="RAYMOND"
                            width={130}
                            height={36}
                            className="object-contain"
                        />
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold tracking-wide text-center sm:text-right flex flex-col gap-0.5">
                        <span className="uppercase text-slate-800 tracking-tight">Plataforma Comercial Corporación Raymond de México</span>
                        <span className="text-slate-400 text-[8.5px] uppercase tracking-widest font-semibold">RUN SOLUTIONS | TÉRMINOS DE USO</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Static visual */}
            <div className="hidden lg:block lg:w-1/2 relative bg-slate-950 overflow-hidden">
                <img
                    src="/comercial/page1.jpeg"
                    alt="RAYMOND"
                    className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 z-20 pointer-events-none" />
            </div>
        </div>
    );
}