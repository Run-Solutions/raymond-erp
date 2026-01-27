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
    };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
