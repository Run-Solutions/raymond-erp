'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ThemeSwitcher from '@/components/system/ThemeSwitcher';
import LanguageSwitcher from '@/components/system/LanguageSwitcher';
import Image from 'next/image';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const signIn = useAuthStore((state) => state.signIn);
    const router = useRouter();
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const t = useTranslations();

    const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    // Check if session expired on mount and load remembered email
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const expired = sessionStorage.getItem('sessionExpired');
            if (expired === 'true') {
                setSessionExpired(true);
                sessionStorage.removeItem('sessionExpired');
                toast.info('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
                    duration: 5000,
                    icon: <AlertCircle className="w-5 h-5" />,
                });
            }

            // Load remembered email
            const rememberedEmail = localStorage.getItem('rememberedEmail');
            const rememberedMe = localStorage.getItem('rememberMe') === 'true';
            if (rememberedEmail && rememberedMe) {
                setRememberMe(true);
                setValue('email', rememberedEmail);
            }
        }
    }, [setValue]);

    const onSubmit = async (data: LoginFormData) => {
        try {
            // Save email if "Remember me" is checked
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', data.email);
                localStorage.setItem('rememberMe', 'true');
            } else {
                // Remove saved email if unchecked
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberMe');
            }

            await signIn(data);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || t('auth.login.errors.invalidCredentials'));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Beautiful Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-rose-50 via-white to-red-100 dark:from-gray-950 dark:via-red-950/20 dark:to-gray-900">
                {/* Animated Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-red-100/40 via-transparent to-rose-100/40 dark:from-red-900/10 dark:via-transparent dark:to-rose-900/10 animate-pulse"></div>
            </div>

            {/* Animated Gradient Orbs */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-red-400/30 via-rose-400/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
            <div 
                className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-red-500/25 via-rose-500/15 to-transparent rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: '1s' }}
            ></div>
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-red-300/20 via-rose-300/10 to-red-400/20 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: '0.5s' }}
            ></div>

            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #dc2626 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }}></div>
            </div>

            {/* Switchers - Top Right */}
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
                <LanguageSwitcher />
                <ThemeSwitcher />
            </div>

            {/* Centered Login Card */}
            <div className="relative z-10 w-full max-w-md mx-auto px-6 sm:px-8">
                <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800/50 p-8 sm:p-10 relative overflow-hidden">
                    {/* Card Gradient Overlay */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-600 to-red-600"></div>
                    
                    {/* Subtle shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
                    {/* Logo & Brand */}
                    <div className="flex flex-col items-center mb-10 relative z-10">
                        <div className="relative w-24 h-24 mb-5 group">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-rose-700 rounded-2xl shadow-2xl shadow-red-500/30 group-hover:shadow-red-600/40 transition-all duration-300 group-hover:scale-105"></div>
                            <div className="relative w-full h-full p-3.5">
                                <Image
                                    src="/raymond-red.jpeg"
                                    alt="RAYMOND"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-red-600 via-rose-600 to-red-700 bg-clip-text text-transparent tracking-tight mb-2">
                            RAYMOND
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Enterprise 2.0</p>
                    </div>

                    {/* Form Header */}
                    <div className="text-center mb-8 relative z-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('auth.login.welcome')}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('auth.login.instruction')}
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-red-600 dark:text-red-500" />
                                {t('common.labels.email')}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 dark:group-focus-within:text-red-500 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all duration-200 outline-none shadow-sm hover:shadow-md"
                                    placeholder={t('auth.login.emailPlaceholder')}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-1.5 mt-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-red-600 dark:text-red-500" />
                                {t('common.labels.password')}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 dark:group-focus-within:text-red-500 transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    {...register('password')}
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all duration-200 outline-none shadow-sm hover:shadow-md"
                                    placeholder={t('auth.login.passwordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-1.5 mt-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-red-600 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                                />
                                <span className="text-gray-700 dark:text-gray-300">
                                    {t('auth.login.rememberMe')}
                                </span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold transition-colors"
                            >
                                {t('auth.login.forgotPassword')}
                            </Link>
                        </div>

                        {/* Session Expired Message */}
                        {sessionExpired && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                                    Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente.
                                </p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-red-600 via-red-700 to-rose-700 hover:from-red-700 hover:via-red-800 hover:to-rose-800 text-white font-bold py-4 px-6 rounded-xl shadow-xl shadow-red-500/40 hover:shadow-2xl hover:shadow-red-600/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        {t('auth.login.loggingIn')}
                                    </>
                                ) : (
                                    t('auth.login.signIn')
                                )}
                            </span>
                            {/* Shine effect on hover */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                        </button>

                        {/* Register Link */}
                        <div className="text-center pt-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('auth.login.noAccount')}{' '}
                                <Link
                                    href="/register"
                                    className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold transition-colors"
                                >
                                    {t('auth.login.createAccount')}
                                </Link>
                            </p>
                        </div>
                    </form>

                    {/* Footer Info */}
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-800/50 relative z-10">
                        {t('auth.login.terms')}{' '}
                        <Link href="/terms" className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold transition-colors">
                            {t('auth.login.termsLink')}
                        </Link>{' '}
                        {t('auth.login.and')}{' '}
                        <Link href="/privacy" className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold transition-colors">
                            {t('auth.login.privacyLink')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
