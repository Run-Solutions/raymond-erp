'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { authTallerService } from '@/services/taller-r1/auth-taller.service';
import { toast } from 'sonner';

const registerSchema = z.object({
    firstName: z.string().min(2, 'Nombre es requerido'),
    lastName: z.string().min(2, 'Apellido es requerido'),
    email: z.string().email('Correo inválido'),
    password: z.string()
        .min(8, 'Contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
        .regex(/\d/, 'Debe incluir al menos un número'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
        },
    });

    // Use watch for real-time validation without manual state management
    const passwordValue = watch('password', '');

    const onSubmit = async (data: RegisterFormData) => {
        try {
            setError('');
            const response = await authTallerService.register({
                email: data.email,
                password: data.password,
                username: `${data.firstName} ${data.lastName}`.trim(),
                sitio: 'PENDING'
            });
            
            // Handle both wrapped and unwrapped responses
            const message = response.data?.message || response.message;
            
            if (message) {
                toast.success(message);
                setIsSuccess(true);
            } else {
                // If no message but response exists, assume success anyway
                setIsSuccess(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error al registrarse');
            toast.error(err.response?.data?.message || 'Error al registrarse');
        }
    };

    // Password policy indicators
    const policies = [
        { label: 'Mínimo 8 caracteres', met: passwordValue.length >= 8 },
        { label: 'Al menos un número', met: /\d/.test(passwordValue) },
        { label: 'Al menos una mayúscula', met: /[A-Z]/.test(passwordValue) },
    ];

    if (isSuccess) {
        return (
            <div className="min-h-screen w-full relative bg-white flex flex-col items-center justify-center font-sans overflow-hidden">
                <div className="relative z-10 w-full max-w-[450px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-10 border border-gray-100/50 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Usuario registrado</h2>
                    <p className="text-gray-600 mb-8">
                        Espera la confirmación por parte del administrador del sistema.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block w-full bg-[#D92D20] text-white font-medium py-3 rounded-lg hover:bg-[#B91C1C] transition-colors text-sm shadow-sm"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full relative bg-white flex flex-col items-center justify-center font-sans overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                    <Image
                        src="/login_background.png"
                        alt="Background"
                        fill
                        className="object-contain object-center opacity-40"
                        priority
                    />
                </div>
            </div>

            {/* Logo Top Left */}
            <div className="absolute top-8 left-8 z-20 w-48 h-12">
                <Image
                    src="/fsimage.png"
                    alt="RAYMOND"
                    width={180}
                    height={50}
                    className="object-contain object-left"
                    priority
                />
            </div>

            {/* Register Card */}
            <div className="relative z-10 w-full max-w-[450px] bg-white/80 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-10 border border-white/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitar Acceso</h2>
                    <p className="text-gray-500 text-sm">Crea tu cuenta para acceder al sistema</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Nombre</label>
                            <input
                                {...register('firstName')}
                                type="text"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm"
                                placeholder="Tu nombre"
                            />
                            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Apellido</label>
                            <input
                                {...register('lastName')}
                                type="text"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm"
                                placeholder="Tu apellido"
                            />
                            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
                        <input
                            {...register('email')}
                            type="email"
                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm"
                            placeholder="ejemplo@raymond.com"
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                        <div className="relative">
                            <input
                                {...register('password')}
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm pr-10"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        
                        {/* Password Policy Indicators */}
                        <div className="mt-3 px-1 space-y-1.5">
                            {policies.map((policy, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${policy.met ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${policy.met ? 'text-green-600' : 'text-gray-400'}`}>
                                        {policy.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#D92D20] text-white font-medium py-3 rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 text-sm shadow-sm mt-4 active:scale-[0.98] transition-transform"
                    >
                        {isSubmitting ? 'Procesando...' : 'Enviar Solicitud'}
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-500">
                            ¿Ya tienes una cuenta?{' '}
                            <Link href="/login" className="font-semibold text-[#D92D20] hover:underline">
                                Iniciar Sesión
                            </Link>
                        </p>
                    </div>
                </form>
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 left-0 right-0 z-20 text-center space-y-2">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-[0.1em]">
                    © 2026 Raymond Corporation
                </p>
                <div className="flex flex-col items-center opacity-60">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Desarrollado por</span>
                    <span className="text-[11px] text-red-600 font-black uppercase tracking-[0.15em] mt-0.5">RUN SOLUTIONS & SERVICES</span>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="absolute top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm shadow-sm animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}
        </div>
    );
}
