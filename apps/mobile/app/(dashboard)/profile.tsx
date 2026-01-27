import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useAuthStore } from '../../src/store/auth.store';
import { cn } from '@raymond/ui';

export default function ProfileScreen() {
    const { user, signOut } = useAuthStore();

    return (
        <View className="flex-1 bg-background p-6">
            <View className="items-center mb-8">
                <View className="w-24 h-24 rounded-full bg-muted items-center justify-center mb-4 overflow-hidden">
                    {user?.avatarUrl ? (
                        <Image source={{ uri: user.avatarUrl }} className="w-full h-full" />
                    ) : (
                        <Text className="text-4xl text-muted-foreground">{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
                    )}
                </View>
                <Text className="text-2xl font-bold text-foreground">{user?.firstName} {user?.lastName}</Text>
                <Text className="text-secondary-foreground">{user?.email}</Text>
                <View className="mt-2 px-3 py-1 bg-primary/10 rounded-full">
                    <Text className="text-primary text-xs font-bold uppercase">{user?.role}</Text>
                </View>
            </View>

            <View className="space-y-4">
                <TouchableOpacity
                    onPress={() => signOut()}
                    className="w-full py-4 rounded-lg bg-destructive flex-row justify-center items-center"
                >
                    <Text className="text-destructive-foreground font-semibold text-lg">Sign Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
