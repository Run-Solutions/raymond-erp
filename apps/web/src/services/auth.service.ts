import api from '@/lib/api';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string | null; // CRITICAL: Nullable for global SuperAdmin
    isSuperadmin: boolean;
    avatarUrl?: string;
    sitio?: string;
    adc_asociado_id?: string;
    adc_asociado_name?: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface PasswordSetupRequired {
    requiresPasswordSetup: true;
    setupToken: string;
    user: User;
    expiresIn: number;
}

export type LoginResult = AuthResponse | PasswordSetupRequired;

// Helper to transform backend user data (snake_case) to frontend format (camelCase)
const transformUserData = (rawUser: any): User => {
    return {
        id: rawUser.id,
        email: rawUser.email,
        firstName: rawUser.first_name || rawUser.firstName,
        lastName: rawUser.last_name || rawUser.lastName,
        role: rawUser.roles || rawUser.role, // Backend uses 'roles', frontend expects 'role'
        organizationId: rawUser.organization_id || rawUser.organizationId,
        isSuperadmin: rawUser.isSuperadmin,
        avatarUrl: rawUser.avatarUrl || rawUser.avatar_url,
        sitio: rawUser.sitio,
        adc_asociado_id: rawUser.adc_asociado_id,
        adc_asociado_name: rawUser.adc_asociado_name,
    };
};

export const AuthService = {
    login: async (credentials: any): Promise<LoginResult> => {
        const response = await api.post<{ success: boolean, data: any }>('/auth/login', credentials);
        const backendData = response.data.data;

        // Account exists in the remote DB (ComercialR4) but was lost in PSQL:
        // the password setup must be completed before logging in.
        if (backendData.requiresPasswordSetup) {
            return {
                requiresPasswordSetup: true,
                setupToken: backendData.setupToken,
                user: transformUserData(backendData.user),
                expiresIn: backendData.expiresIn,
            };
        }

        return {
            user: transformUserData(backendData.user),
            accessToken: backendData.accessToken,
            refreshToken: backendData.refreshToken,
            expiresIn: backendData.expiresIn,
        };
    },

    setupPassword: async (setupToken: string, password: string): Promise<AuthResponse> => {
        const response = await api.post<{ success: boolean, data: any }>('/auth/setup-password', { setupToken, password });
        const backendData = response.data.data;
        return {
            user: transformUserData(backendData.user),
            accessToken: backendData.accessToken,
            refreshToken: backendData.refreshToken,
            expiresIn: backendData.expiresIn,
        };
    },

    refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
        const response = await api.post<{ success: boolean, data: any }>('/auth/refresh', { refreshToken });
        const backendData = response.data.data;
        return {
            user: transformUserData(backendData.user),
            accessToken: backendData.accessToken,
            refreshToken: backendData.refreshToken,
            expiresIn: backendData.expiresIn,
        };
    },

    logout: async (refreshToken: string): Promise<void> => {
        await api.post('/auth/logout', { refreshToken });
    },
};
