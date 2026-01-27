import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useRouter } from 'expo-router';
import { AuthService } from '../../src/services/auth.service';
import { cn } from '@raymond/ui';

const registerSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
    const router = useRouter();
    const signUp = useAuthStore((state) => state.signUp);
    const isLoading = useAuthStore((state) => state.isLoading);

    const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            await signUp(data);
            // Router replacement is handled in _layout.tsx via AuthProtection
        } catch (error: any) {
            Alert.alert('Registration Failed', error.response?.data?.message || 'Something went wrong');
        }
    };

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
            <View className="flex-1 justify-center items-center p-6">
                <View className="w-full max-w-md space-y-6">
                    <View className="items-center">
                        <Text className="text-3xl font-bold text-primary">Create Account</Text>
                        <Text className="text-secondary-foreground mt-2">Join RAYMOND ERP today</Text>
                    </View>

                    <View className="space-y-4">
                        <View className="flex-row space-x-4">
                            <View className="flex-1">
                                <Text className="text-sm font-medium mb-1 text-foreground">First Name</Text>
                                <Controller
                                    control={control}
                                    name="firstName"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            className={cn("w-full px-4 py-3 rounded-lg border bg-background text-foreground", errors.firstName ? "border-destructive" : "border-input")}
                                            placeholder="John"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                        />
                                    )}
                                />
                                {errors.firstName && <Text className="text-destructive text-xs mt-1">{errors.firstName.message}</Text>}
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-medium mb-1 text-foreground">Last Name</Text>
                                <Controller
                                    control={control}
                                    name="lastName"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            className={cn("w-full px-4 py-3 rounded-lg border bg-background text-foreground", errors.lastName ? "border-destructive" : "border-input")}
                                            placeholder="Doe"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                        />
                                    )}
                                />
                                {errors.lastName && <Text className="text-destructive text-xs mt-1">{errors.lastName.message}</Text>}
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium mb-1 text-foreground">Email</Text>
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        className={cn("w-full px-4 py-3 rounded-lg border bg-background text-foreground", errors.email ? "border-destructive" : "border-input")}
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
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        className={cn("w-full px-4 py-3 rounded-lg border bg-background text-foreground", errors.password ? "border-destructive" : "border-input")}
                                        placeholder="••••••••"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        secureTextEntry
                                    />
                                )}
                            />
                            {errors.password && <Text className="text-destructive text-xs mt-1">{errors.password.message}</Text>}
                        </View>

                        <View>
                            <Text className="text-sm font-medium mb-1 text-foreground">Confirm Password</Text>
                            <Controller
                                control={control}
                                name="confirmPassword"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        className={cn("w-full px-4 py-3 rounded-lg border bg-background text-foreground", errors.confirmPassword ? "border-destructive" : "border-input")}
                                        placeholder="••••••••"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        secureTextEntry
                                    />
                                )}
                            />
                            {errors.confirmPassword && <Text className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</Text>}
                        </View>

                        <TouchableOpacity
                            onPress={handleSubmit(onSubmit)}
                            disabled={isLoading}
                            className={cn("w-full py-4 rounded-lg flex-row justify-center items-center", isLoading ? "bg-primary/70" : "bg-primary")}
                        >
                            {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-primary-foreground font-semibold text-lg">Create Account</Text>}
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center mt-4">
                        <Text className="text-secondary-foreground">Already have an account? </Text>
                        <Link href="/login" asChild>
                            <TouchableOpacity>
                                <Text className="text-primary font-semibold">Sign In</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
