import api from '@/lib/api';

export interface CreateOrganizationDto {
    name: string;
    slug?: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    adminPassword: string;
}

export interface UpdateOrganizationDto {
    name?: string;
    slug?: string;
    is_active?: boolean;
}

export interface OrganizationDetails {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    _count: {
        users: number;
        projects: number;
        clients: number;
        suppliers: number;
        accounts_payable?: number;
        accounts_receivable?: number;
    };
    users?: Array<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        is_active: boolean;
        roles: {
            name: string;
        };
    }>;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    _count: {
        users: number;
        projects: number;
        clients: number;
        suppliers: number;
    };
}

export interface GlobalAnalytics {
    organizations: {
        total: number;
        active: number;
        inactive: number;
    };
    users: number;
    projects: number;
    tasks: number;
    clients: number;
}

export const SuperadminService = {
    /**
     * Get all organizations in the system
     * CRITICAL: Only accessible to SuperAdmin users
     */
    getAllOrganizations: async (): Promise<Organization[]> => {
        const response = await api.get<{ success: boolean; data: Organization[] }>('/superadmin/organizations');
        return response.data.data;
    },

    /**
     * Get detailed information about a specific organization
     * CRITICAL: Only accessible to SuperAdmin users
     */
    getOrganizationDetails: async (organizationId: string): Promise<OrganizationDetails> => {
        const response = await api.get<{ success: boolean; data: OrganizationDetails }>(
            `/superadmin/organizations/${organizationId}`
        );
        return response.data.data;
    },

    /**
     * Create a new organization with an admin user
     * CRITICAL: Only accessible to SuperAdmin users
     */
    createOrganization: async (dto: CreateOrganizationDto): Promise<{ organization: Organization; adminUser: any }> => {
        const response = await api.post<{ success: boolean; data: { organization: Organization; adminUser: any }; message: string }>(
            '/superadmin/organizations',
            dto
        );
        return response.data.data;
    },

    /**
     * Update an organization
     * CRITICAL: Only accessible to SuperAdmin users
     */
    updateOrganization: async (organizationId: string, dto: UpdateOrganizationDto): Promise<Organization> => {
        const response = await api.patch<{ success: boolean; data: Organization }>(
            `/superadmin/organizations/${organizationId}`,
            dto
        );
        return response.data.data;
    },

    /**
     * Get global system analytics
     * CRITICAL: Only accessible to SuperAdmin users
     */
    getGlobalAnalytics: async (): Promise<GlobalAnalytics> => {
        const response = await api.get<{ success: boolean; data: GlobalAnalytics }>('/superadmin/analytics');
        return response.data.data;
    },

    /**
     * Delete an organization and all its related data
     * CRITICAL: Only accessible to SuperAdmin users
     * WARNING: This operation is irreversible
     */
    deleteOrganization: async (organizationId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete<{ success: boolean; data: { success: boolean; message: string } }>(
            `/superadmin/organizations/${organizationId}`
        );
        return response.data.data;
    },
};

