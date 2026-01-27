import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../src/providers/AuthProvider';
import { cn } from '@raymond/ui';

export default function HomeScreen() {
    const { user, signIn, signOut } = useAuth();

    return (
        <View className="flex-1 items-center justify-center bg-background p-4">
            <Text className="text-2xl font-bold text-foreground mb-4">
                Welcome to RAYMOND ERP
            </Text>

            {user ? (
                <View className="items-center">
                    <Text className="text-lg mb-4">Hello, {user.name}</Text>
                    <TouchableOpacity
                        onPress={signOut}
                        className="bg-red-500 px-6 py-3 rounded-lg"
                    >
                        <Text className="text-white font-semibold">Sign Out</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={signIn}
                    className="bg-blue-600 px-6 py-3 rounded-lg"
                >
                    <Text className="text-white font-semibold">Sign In</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
