import api from '@/lib/api';
import { Organization } from '@/types';

export interface OrganizationStats {
    users: number;
    projects: number;
    tasks: number;
    clients: number;
    suppliers: number;
}

export interface OrganizationWithStats extends Organization {
    stats?: OrganizationStats;
    isActive: boolean;
}

export interface SwitchOrganizationResponse {
    success: boolean;
    data: {
        organization: Organization;
        accessToken: string;
        refreshToken?: string;
    };
}

/**
 * Transform organization data from backend (snake_case) to frontend (camelCase)
 */
function transformOrganization(backendOrg: any): Organization {
    return {
        id: backendOrg.id,
        name: backendOrg.name,
        slug: backendOrg.slug,
        isActive: backendOrg.is_active ?? backendOrg.isActive,
        logoUrl: backendOrg.logo_url ?? backendOrg.logoUrl,
        logoZoom: backendOrg.logo_zoom ?? backendOrg.logoZoom,
        primaryColor: backendOrg.primary_color ?? backendOrg.primaryColor,
        secondaryColor: backendOrg.secondary_color ?? backendOrg.secondaryColor,
        accentColor: backendOrg.accent_color ?? backendOrg.accentColor,
        createdAt: backendOrg.created_at ?? backendOrg.createdAt,
        updatedAt: backendOrg.updated_at ?? backendOrg.updatedAt,
    };
}

export const OrganizationService = {
    /**
     * Get current organization details
     * CRITICAL: SuperAdmin users may have no organization context (organization_id = null)
     */
    getCurrent: async (): Promise<OrganizationWithStats | null> => {
        try {
            const response = await api.get<{
                success: boolean;
                data: any;
                isSuperadmin?: boolean;
                message?: string;
            }>('/organization');

            // Handle wrapped response format
            if (response.data && 'success' in response.data) {
                // SuperAdmin without organization context
                if (response.data.isSuperadmin && !response.data.data) {
                    console.log('[OrganizationService.getCurrent] SuperAdmin without organization context');
                    return null;
                }

                // Transform snake_case to camelCase
                if (response.data.data) {
                    return transformOrganization(response.data.data) as OrganizationWithStats;
                }

                return null;
            }

            // Handle direct response format (legacy)
            if (response.data && (response.data as any).id) {
                return transformOrganization(response.data) as OrganizationWithStats;
            }

            return null;
        } catch (error: any) {
            // Handle network errors gracefully (server/database down)
            if (error?.code === 'ECONNREFUSED' || error?.message?.includes('Network Error') || !error?.response) {
                // Server is not responding - likely database is down
                console.warn('[OrganizationService.getCurrent] Server unavailable - database might be down');
                return null;
            }
            
            // If 401/403, user might not be authenticated or doesn't have permission
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                console.log('[OrganizationService.getCurrent] Unauthorized - returning null');
                return null;
            }
            
            // For other errors, return null to prevent UI crashes
            console.warn('[OrganizationService.getCurrent] Error:', error?.response?.data?.message || error?.message || 'Unknown error');
            return null;
        }
    },

    /**
     * Get organization statistics
     * CRITICAL: organizationId is required to prevent data leakage between orgs
     */
    getStats: async (organizationId: string): Promise<OrganizationStats> => {
        if (!organizationId) {
            throw new Error('[OrganizationService.getStats] organizationId is required - cannot fetch stats without it');
        }

        try {
            const response = await api.get<{ success: boolean; data: OrganizationStats }>(
                `/organization/stats?organizationId=${organizationId}`
            );
            
            // Handle wrapped response format
            if (response.data && 'success' in response.data && response.data.success) {
                return response.data.data;
            }
            
            // Handle direct response format (legacy)
            if (response.data && !('success' in response.data)) {
                return response.data as OrganizationStats;
            }
            
            throw new Error('Invalid response format from getStats endpoint');
        } catch (error: any) {
            // Handle network errors gracefully (server/database down)
            if (error?.code === 'ECONNREFUSED' || error?.message?.includes('Network Error') || !error?.response) {
                console.warn('[OrganizationService.getStats] Server unavailable - returning empty stats');
                return {
                    users: 0,
                    projects: 0,
                    tasks: 0,
                    clients: 0,
                    suppliers: 0,
                };
            }
            
            // If SuperAdmin without org context, return empty stats
            if (error?.response?.data?.isSuperadmin) {
                return {
                    users: 0,
                    projects: 0,
                    tasks: 0,
                    clients: 0,
                    suppliers: 0,
                };
            }
            
            // For other errors, return empty stats to prevent UI crashes
            console.warn('[OrganizationService.getStats] Error:', error?.response?.data?.message || error?.message || 'Unknown error');
            return {
                users: 0,
                projects: 0,
                tasks: 0,
                clients: 0,
                suppliers: 0,
            };
        }
    },

    /**
     * Update organization details and branding
     * Converts camelCase to snake_case for backend
     */
    update: async (data: {
        name?: string;
        slug?: string;
        logoUrl?: string | null;
        logoZoom?: number | null;
        primaryColor?: string | null;
        secondaryColor?: string | null;
        accentColor?: string | null;
    }): Promise<Organization> => {
        // Convert camelCase to snake_case for backend
        const backendData: any = {};
        if (data.name !== undefined) backendData.name = data.name;
        if (data.slug !== undefined) backendData.slug = data.slug;
        if (data.logoUrl !== undefined) backendData.logo_url = data.logoUrl;
        if (data.logoZoom !== undefined) backendData.logo_zoom = data.logoZoom;
        if (data.primaryColor !== undefined) backendData.primary_color = data.primaryColor;
        if (data.secondaryColor !== undefined) backendData.secondary_color = data.secondaryColor;
        if (data.accentColor !== undefined) backendData.accent_color = data.accentColor;

        const response = await api.patch<Organization>('/organization', backendData);

        // Handle both wrapped and direct response formats
        if (response.data && 'id' in response.data) {
            // Direct format - transform snake_case to camelCase
            return transformOrganization(response.data);
        }

        return response.data;
    },

    /**
     * Switch to a different organization
     * This will update the user's session and return new tokens
     */
    switchOrganization: async (organizationId: string): Promise<SwitchOrganizationResponse> => {
        console.log('[OrganizationService] switchOrganization - Calling with organizationId:', organizationId);
        const response = await api.post<{ success: boolean; data: SwitchOrganizationResponse['data'] } | SwitchOrganizationResponse['data']>(
            '/auth/switch-organization',
            { organization_id: organizationId } // Fixed: backend expects snake_case
        );
        // Handle both wrapped and direct response formats
        if (response.data && 'success' in response.data) {
            return {
                success: response.data.success,
                data: response.data.data,
            };
        }
        return {
            success: true,
            data: response.data as SwitchOrganizationResponse['data'],
        };
    },

    /**
     * Get all organizations the user belongs to
     */
    getUserOrganizations: async (): Promise<Organization[]> => {
        try {
            console.log('[OrganizationService] Calling /auth/organizations');
            const response = await api.get<{ success: boolean; data: Organization[] } | Organization[]>('/auth/organizations');
            console.log('[OrganizationService] Response:', response.data);
            // Handle both wrapped and direct response formats
            if (Array.isArray(response.data)) {
                console.log(`[OrganizationService] Returning ${response.data.length} organizations (array format)`);
                return response.data;
            }
            const orgs = response.data?.data || [];
            console.log(`[OrganizationService] Returning ${orgs.length} organizations (wrapped format)`);
            return orgs;
        } catch (error: any) {
            // Handle network errors gracefully
            if (error?.code === 'ECONNREFUSED' || error?.message?.includes('Network Error')) {
                console.warn('[OrganizationService] Server unavailable (database might be down)');
                return [];
            }
            
            // Don't log full error details in console to reduce noise
            if (error?.response?.status) {
                console.warn(`[OrganizationService] API error ${error.response.status}:`, error.response.data?.message || 'Unknown error');
            } else {
                console.warn('[OrganizationService] Error fetching organizations:', error?.message || error);
            }
            
            // If endpoint doesn't exist or fails, return empty array
            return [];
        }
    },
};
