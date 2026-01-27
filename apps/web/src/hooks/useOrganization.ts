import { useEffect } from 'react';
import { useOrganizationStore } from '@/store/organization.store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OrganizationService } from '@/services/organization.service';
import { useAuthStore } from '@/store/auth.store';
import { applyBrandColors } from '@/lib/theme-utils';

/**
 * Hook to access and manage current organization
 * Automatically loads organization on mount if not already loaded
 */
export function useOrganization() {
    const {
        currentOrganization,
        isLoading,
        error,
        loadCurrentOrganization,
        refreshStats,
    } = useOrganizationStore();

    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // CRITICAL: SuperAdmin may not have an organization context
    const isSuperadmin = user?.isSuperadmin === true;

    // Load organization if not already loaded (skip for SuperAdmin without org)
    useEffect(() => {
        if (!currentOrganization && !isLoading && !isSuperadmin) {
            loadCurrentOrganization();
        }
    }, [currentOrganization, isLoading, isSuperadmin, loadCurrentOrganization]);

    // React Query for automatic refetching and caching
    // CRITICAL: queryKey includes orgId to prevent cross-org cache pollution
    // Disabled for SuperAdmin without organization context
    const { data: orgData, refetch: refetchOrg } = useQuery({
        queryKey: ['organization', 'current', currentOrganization?.id],
        queryFn: () => OrganizationService.getCurrent(),
        enabled: !isSuperadmin && (!!currentOrganization || !isLoading),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });

    // Sync React Query data with Zustand store
    useEffect(() => {
        // CRITICAL: Handle null case for SuperAdmin without organization
        if (orgData && !currentOrganization && !isSuperadmin) {
            useOrganizationStore.getState().setCurrentOrganization(orgData);
        } else if (orgData === null && !isSuperadmin) {
            // If orgData is explicitly null, clear the store
            console.log('[useOrganization] Organization is null, clearing store');
            useOrganizationStore.getState().setCurrentOrganization(null);
        }
    }, [orgData, currentOrganization, isSuperadmin]);

    // Apply brand colors when organization loads or changes
    useEffect(() => {
        const org = currentOrganization || orgData;
        if (org) {
            console.log('[useOrganization] Applying brand colors:', {
                primary: org.primaryColor,
                secondary: org.secondaryColor,
                accent: org.accentColor,
            });
            applyBrandColors({
                primary: org.primaryColor,
                secondary: org.secondaryColor,
                accent: org.accentColor,
            });
        }
    }, [currentOrganization, orgData]);

    return {
        organization: currentOrganization || orgData,
        isLoading,
        error,
        refresh: async () => {
            // Invalidate all organization queries to prevent cache pollution
            queryClient.invalidateQueries({ queryKey: ['organization'] });

            await Promise.all([
                loadCurrentOrganization(),
                refetchOrg(),
                refreshStats(),
            ]);
        },
        refreshStats,
        // Method to clear cache when switching organizations
        clearCache: () => {
            queryClient.invalidateQueries({ queryKey: ['organization'] });
        },
    };
}

/**
 * Hook to get organization statistics
 */
export function useOrganizationStats(organizationId?: string) {
    const { currentOrganization } = useOrganizationStore();
    const orgId = organizationId || currentOrganization?.id;

    return useQuery({
        queryKey: ['organization', 'stats', orgId],
        queryFn: () => OrganizationService.getStats(orgId!), // Safe: query only runs when orgId exists (enabled: !!orgId)
        enabled: !!orgId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Hook to get all user organizations
 */
export function useUserOrganizations() {
    const { organizations, loadUserOrganizations } = useOrganizationStore();
    const { user } = useAuthStore();

    // CRITICAL: queryKey includes userId to prevent cross-user cache pollution
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['organization', 'user-organizations', user?.id],
        queryFn: () => {
            console.log('[useUserOrganizations] Fetching organizations from API');
            return OrganizationService.getUserOrganizations();
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
        enabled: !!user?.id, // Only fetch if user is logged in
    });

    useEffect(() => {
        if (data && data.length > 0) {
            console.log(`[useUserOrganizations] Received ${data.length} organizations from API`);
            useOrganizationStore.getState().setOrganizations(data);
        }
    }, [data]);

    return {
        organizations: data && data.length > 0 ? data : organizations, // Prefer fresh data from API
        isLoading,
        refetch: async () => {
            await Promise.all([loadUserOrganizations(), refetch()]);
        },
    };
}
