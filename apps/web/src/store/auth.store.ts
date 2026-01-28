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
            const accessToken = localStorage.getItem('accessToken') || 'dev-token';
            const refreshToken = localStorage.getItem('refreshToken') || 'dev-refresh';
            const userStr = localStorage.getItem('user');

            let user: User;
            if (userStr && userStr !== 'undefined' && userStr !== 'null') {
                try {
                    const rawUser = JSON.parse(userStr);
                    user = {
                        id: rawUser.id,
                        email: rawUser.email,
                        firstName: rawUser.first_name || rawUser.firstName,
                        lastName: rawUser.last_name || rawUser.lastName,
                        role: rawUser.roles || rawUser.role,
                        organizationId: rawUser.organization_id || rawUser.organizationId,
                        isSuperadmin: rawUser.isSuperadmin,
                        avatarUrl: rawUser.avatarUrl,
                    };
                } catch (e) {
                    // Fallback if parsing fails
                    user = {
                        id: 'dev-user',
                        email: 'admin@raymond-erp.com',
                        firstName: 'Admin',
                        lastName: 'Dev',
                        role: 'ADMIN',
                        organizationId: '1',
                        isSuperadmin: true,
                    };
                }
            } else {
                // FORCE DEV USER
                user = {
                    id: 'dev-user',
                    email: 'admin@raymond-erp.com',
                    firstName: 'Admin',
                    lastName: 'Dev',
                    role: 'ADMIN',
                    organizationId: '1',
                    isSuperadmin: true,
                };
            }

            set({
                accessToken,
                refreshToken,
                user,
                isLoading: false
            });

            // Try to load organization (will fail silently thanks to our previous fix)
            useOrganizationStore.getState().loadCurrentOrganization();
        } catch (e) {
            set({ isLoading: false });
        }
    },

    setUser: (user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
    },
}));
