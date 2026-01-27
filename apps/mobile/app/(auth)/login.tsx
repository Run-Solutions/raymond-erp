import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { cn } from '@raymond/ui';
import { Ionicons } from '@expo/vector-icons';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
    const router = useRouter();
    const signIn = useAuthStore((state) => state.signIn);
    const isLoading = useAuthStore((state) => state.isLoading);
    const [showPassword, setShowPassword] = useState(false);

    const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            await signIn(data);
            // Router replacement is handled in _layout.tsx via AuthProtection
        } catch (error: any) {
            Alert.alert('Login Failed', error.response?.data?.message || 'Something went wrong');
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-background p-6">
            <View className="w-full max-w-md space-y-6">
                <View className="items-center">
                    <Text className="text-3xl font-bold text-primary">RAYMOND ERP</Text>
                    <Text className="text-secondary-foreground mt-2">Sign in to your account</Text>
                </View>

                <View className="space-y-4">
                    <View>
                        <Text className="text-sm font-medium mb-1 text-foreground">Email</Text>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    className={cn(
                                        "w-full px-4 py-3 rounded-lg border bg-background text-foreground",
                                        errors.email ? "border-destructive" : "border-input"
                                    )}
                                    placeholder="name@company.com"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            )}
                        />
                        {errors.email && <Text className="text-destructive text-xs mt-1">{errors.email.message}</Text>}
                    </View>

                    <View>
                        <Text className="text-sm font-medium mb-1 text-foreground">Password</Text>
                        <View className="relative">
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        className={cn(
                                            "w-full px-4 py-3 pr-12 rounded-lg border bg-background text-foreground",
                                            errors.password ? "border-destructive" : "border-input"
                                        )}
                                        placeholder="••••••••"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        secureTextEntry={!showPassword}
                                    />
                                )}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-0 h-full justify-center"
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off" : "eye"}
                                    size={20}
                                    color="#6b7280"
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text className="text-destructive text-xs mt-1">{errors.password.message}</Text>}
                    </View>

                    <TouchableOpacity
                        onPress={handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className={cn(
                            "w-full py-4 rounded-lg flex-row justify-center items-center",
                            isLoading ? "bg-primary/70" : "bg-primary"
                        )}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-primary-foreground font-semibold text-lg">Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View className="flex-row justify-center mt-4">
                    <Text className="text-secondary-foreground">Don't have an account? </Text>
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text className="text-primary font-semibold">Sign Up</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    );
}
