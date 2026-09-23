export interface UserSession {
    sessionId: string;
    user_id: string;
    email: string;
    roles: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        roles: string;
        organization_id: string | null; // CRITICAL: Nullable for global SuperAdmin
        permissions: { resource: string; action: string }[];
        avatar_url?: string;
        isSuperadmin?: boolean; // CRITICAL: Flag for SuperAdmin global users
        adc_asociado_id?: string;
        adc_asociado_name?: string;
    };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    requiresPasswordSetup?: boolean; // True when the user exists in the remote DB but not in PSQL
    setupToken?: string; // Short-lived JWT to complete the forced password setup
}
