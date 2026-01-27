import { create } from 'zustand';
import { AuthService, User, AuthResponse } from '../services/auth.service';
import { useOrganizationStore } from './organization.store';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    signIn: (credentials: any) => Promise<void>;
    signUp: (data: any) => Promise<void>;
    signOut: () => Promise<void>;
    restoreSession: () => Promise<void>;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,

    signIn: async (credentials) => {
        set({ isLoading: true });
        try {
            const data = await AuthService.login(credentials);

            // Transform user data from snake_case to camelCase
            const rawUser = data.user as any; // Backend returns snake_case
            const transformedUser: User = {
                id: rawUser.id,
                email: rawUser.email,
                firstName: rawUser.first_name || rawUser.firstName,
                lastName: rawUser.last_name || rawUser.lastName,
                role: rawUser.roles || rawUser.role,
                organizationId: rawUser.organization_id || rawUser.organizationId,
                isSuperadmin: rawUser.isSuperadmin,
                avatarUrl: rawUser.avatarUrl || rawUser.avatar_url,
            };

            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            // CRITICAL: DO NOT store orgId in localStorage
            // The API interceptor gets orgId ONLY from the organization store to prevent data leaks
            localStorage.setItem('user', JSON.stringify(transformedUser));
            set({
                user: transformedUser,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                isLoading: false
            });
            // Load organization after successful login
            useOrganizationStore.getState().loadCurrentOrganization();
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    signUp: async (formData) => {
        set({ isLoading: true });
        try {
            const data = await AuthService.register(formData);

            // Transform user data from snake_case to camelCase
            const rawUser = data.user as any; // Backend returns snake_case
            const transformedUser: User = {
                id: rawUser.id,
                email: rawUser.email,
                firstName: rawUser.first_name || rawUser.firstName,
                lastName: rawUser.last_name || rawUser.lastName,
                role: rawUser.roles || rawUser.role,
                organizationId: rawUser.organization_id || rawUser.organizationId,
                isSuperadmin: rawUser.isSuperadmin,
                avatarUrl: rawUser.avatarUrl || rawUser.avatar_url,
            };

            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            // CRITICAL: DO NOT store orgId in localStorage
            // The API interceptor gets orgId ONLY from the organization store to prevent data leaks
            localStorage.setItem('user', JSON.stringify(transformedUser));
            set({
                user: transformedUser,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                isLoading: false
            });
            // Load organization after successful registration
            useOrganizationStore.getState().loadCurrentOrganization();
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    signOut: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
            try {
                await AuthService.logout(refreshToken);
            } catch (e) {
                console.error('Logout failed', e);
            }
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('orgId'); // Clean up if it exists (legacy)
        localStorage.removeItem('user');
        set({ user: null, accessToken: null, refreshToken: null });
        // Clear organization store on logout
        useOrganizationStore.getState().clear();
    },

    restoreSession: async () => {
        set({ isLoading: true });
        try {
            const accessToken = localStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken');
            const userStr = localStorage.getItem('user');

            if (accessToken && userStr) {
                const rawUser = JSON.parse(userStr);
                // Transform user data if it's in old format (snake_case)
                const user: User = {
                    id: rawUser.id,
                    email: rawUser.email,
                    firstName: rawUser.first_name || rawUser.firstName,
                    lastName: rawUser.last_name || rawUser.lastName,
                    role: rawUser.roles || rawUser.role,
                    organizationId: rawUser.organization_id || rawUser.organizationId,
                    isSuperadmin: rawUser.isSuperadmin,
                    avatarUrl: rawUser.avatarUrl,
                };

                // Re-save transformed user data
                localStorage.setItem('user', JSON.stringify(user));

                set({
                    accessToken,
                    refreshToken,
                    user,
                    isLoading: false
                });
                // Load organization after restoring session
                if (user.organizationId) {
                    useOrganizationStore.getState().loadCurrentOrganization();
                }
            } else {
                set({ isLoading: false });
            }
        } catch (e) {
            set({ isLoading: false });
        }
    },

    setUser: (user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
    },
}));
