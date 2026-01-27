import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
    type OrganizationWithStats, 
    type OrganizationStats,
    type SwitchOrganizationResponse 
} from '@/services/organization.service';
import { OrganizationService } from '@/services/organization.service';
import { Organization } from '@/types';

interface OrganizationState {
    // Current organization
    currentOrganization: OrganizationWithStats | null;
    organizations: Organization[];
    
    // Loading states
    isLoading: boolean;
    isSwitching: boolean;
    
    // Error state
    error: string | null;
    
    // Actions
    setCurrentOrganization: (org: OrganizationWithStats | null) => void;
    setOrganizations: (orgs: Organization[]) => void;
    loadCurrentOrganization: () => Promise<void>;
    loadUserOrganizations: () => Promise<void>;
    switchOrganization: (organizationId: string) => Promise<boolean>;
    updateOrganization: (data: {
        name?: string;
        slug?: string;
        logoUrl?: string | null;
        logoZoom?: number | null;
        primaryColor?: string | null;
        secondaryColor?: string | null;
        accentColor?: string | null;
    }) => Promise<boolean>;
    refreshStats: () => Promise<void>;
    refresh: () => Promise<void>;
    clear: () => void;
    clearCache: () => void;
}

const STORAGE_KEY = 'raymond-organization-store';

export const useOrganizationStore = create<OrganizationState>()(
    persist(
        (set, get) => ({
            currentOrganization: null,
            organizations: [],
            isLoading: false,
            isSwitching: false,
            error: null,

            setCurrentOrganization: (org) => {
                set({ currentOrganization: org, error: null });
                // CRITICAL: DO NOT use localStorage for orgId
                // The API interceptor gets orgId ONLY from the store to prevent data leaks
            },

            setOrganizations: (orgs) => {
                set({ organizations: orgs });
            },

            loadCurrentOrganization: async () => {
                set({ isLoading: true, error: null });
                try {
                    const org = await OrganizationService.getCurrent();
                    
                    // CRITICAL: Handle SuperAdmin without organization context
                    if (!org || !org.id) {
                        console.log('[OrganizationStore] No organization context (SuperAdmin or no org assigned)');
                        set({ 
                            currentOrganization: null,
                            isLoading: false,
                            error: null
                        });
                        return;
                    }
                    
                    // Load stats only if we have a valid organization
                    const stats = await OrganizationService.getStats(org.id).catch(() => null);
                    
                    const orgWithStats: OrganizationWithStats = {
                        ...org,
                        stats: stats || undefined,
                    };
                    
                    set({ 
                        currentOrganization: orgWithStats,
                        isLoading: false 
                    });
                } catch (error: any) {
                    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load organization';
                    set({ 
                        error: errorMessage,
                        isLoading: false,
                        currentOrganization: null
                    });
                    console.error('Failed to load organization:', error);
                }
            },

            loadUserOrganizations: async () => {
                try {
                    console.log('[OrganizationStore] loadUserOrganizations called');
                    const orgs = await OrganizationService.getUserOrganizations();
                    console.log(`[OrganizationStore] Setting ${orgs.length} organizations in store`);
                    set({ organizations: orgs });
                } catch (error: any) {
                    console.error('[OrganizationStore] Failed to load user organizations:', error);
                    console.error('[OrganizationStore] Error details:', error?.response?.data || error?.message);
                    // Don't set error state here as it's not critical
                }
            },

            switchOrganization: async (organizationId: string) => {
                set({ isSwitching: true, error: null });
                try {
                    // CRITICAL: Clear cache BEFORE switching to prevent data pollution
                    get().clearCache();

                    const response = await OrganizationService.switchOrganization(organizationId);

                    // Update tokens in localStorage
                    if (response.data.accessToken) {
                        localStorage.setItem('accessToken', response.data.accessToken);
                        if (response.data.refreshToken) {
                            localStorage.setItem('refreshToken', response.data.refreshToken);
                        }
                        // CRITICAL: DO NOT store orgId in localStorage
                        // The API interceptor gets orgId ONLY from the store to prevent data leaks
                    }

                    // Update current organization
                    const orgWithStats: OrganizationWithStats = {
                        ...response.data.organization,
                        isActive: response.data.organization.isActive ?? true,
                    };

                    set({
                        currentOrganization: orgWithStats,
                        isSwitching: false
                    });

                    // Reload page to refresh all data and invalidate ALL caches
                    if (typeof window !== 'undefined') {
                        window.location.reload();
                    }

                    return true;
                } catch (error: any) {
                    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to switch organization';
                    set({
                        error: errorMessage,
                        isSwitching: false
                    });
                    console.error('Failed to switch organization:', error);
                    return false;
                }
            },

            updateOrganization: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const updated = await OrganizationService.update(data);
                    const current = get().currentOrganization;
                    
                    if (current) {
                        set({ 
                            currentOrganization: {
                                ...current,
                                ...updated,
                            },
                            isLoading: false 
                        });
                    }
                    
                    return true;
                } catch (error: any) {
                    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update organization';
                    set({ 
                        error: errorMessage,
                        isLoading: false 
                    });
                    console.error('Failed to update organization:', error);
                    return false;
                }
            },

            refreshStats: async () => {
                const current = get().currentOrganization;
                // CRITICAL: Don't try to refresh stats if no organization
                if (!current?.id) {
                    console.log('[OrganizationStore] Cannot refresh stats - no organization context');
                    return;
                }

                try {
                    const stats = await OrganizationService.getStats(current.id);
                    set({
                        currentOrganization: {
                            ...current,
                            stats,
                        }
                    });
                } catch (error) {
                    console.error('Failed to refresh stats:', error);
                }
            },

            refresh: async () => {
                await get().loadCurrentOrganization();
                await get().refreshStats();
            },

            clear: () => {
                set({
                    currentOrganization: null,
                    organizations: [],
                    error: null,
                    isLoading: false,
                    isSwitching: false,
                });
            },

            clearCache: () => {
                // Clear all organization-related data from memory
                // This should be called when switching organizations to prevent data pollution
                set({
                    currentOrganization: null,
                    organizations: [],
                    error: null,
                });
            },
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            // CRITICAL: DO NOT persist organization data to prevent stale data across sessions
            // Only persist in-memory during active session
            partialize: (state) => ({
                // DO NOT persist currentOrganization or organizations
                // This prevents cross-org data pollution from localStorage
            }),
        }
    )
);
