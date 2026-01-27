'use client'

import { useEffect, ReactNode } from 'react'
import { useOrganizationStore } from '@/store/organization.store'
import { useAuthStore } from '@/store/auth.store'
import { applyBrandColors, resetToDefaultColors, cleanupDynamicStyles } from '@/lib/theme-utils'

interface OrganizationProviderProps {
    children: ReactNode
}

/**
 * Organization Provider
 * Initializes and manages organization context
 * Automatically loads organization when user is authenticated
 * CRITICAL: Handles SuperAdmin users gracefully (they may not have an organization)
 */
export default function OrganizationProvider({ children }: OrganizationProviderProps) {
    const { user } = useAuthStore()
    const { currentOrganization, loadCurrentOrganization, loadUserOrganizations } = useOrganizationStore()

    // Clean up any leftover dynamic styles on mount
    useEffect(() => {
        cleanupDynamicStyles();
    }, [])

    useEffect(() => {
        // Load organization when user is authenticated
        if (user) {
            // CRITICAL: SuperAdmin users may not have an organization_id in their user record,
            // but they can still select and load an organization context via the OrganizationSelector
            const isSuperadmin = user.isSuperadmin === true

            // Load current organization for ALL users (including SuperAdmin)
            // SuperAdmin can select an organization, and it should be loaded into the store
            if (!currentOrganization) {
                loadCurrentOrganization().catch((error) => {
                    // IMPORTANT: For SuperAdmin, it's OK if this fails (they may not have an org yet)
                    // They will use the OrganizationSelector to choose one
                    if (!isSuperadmin) {
                        console.error('[OrganizationProvider] Error loading organization:', error);
                    }
                });
            }

            // Always load user organizations to get latest list (especially for SUPERADMIN)
            loadUserOrganizations().catch((error) => {
                console.error('[OrganizationProvider] Error loading user organizations:', error);
            });
        }
    }, [user, currentOrganization, loadCurrentOrganization, loadUserOrganizations])

    // CRITICAL: Apply brand colors when organization changes (LIGHT MODE ONLY)
    // Dark mode uses universal black/gray theme for ALL organizations
    // Brand colors are applied to light mode and sidebar
    useEffect(() => {
        if (currentOrganization) {
            // Organization has custom brand colors - apply them (light mode + sidebar)
            if (currentOrganization.primaryColor || currentOrganization.secondaryColor || currentOrganization.accentColor) {
                applyBrandColors({
                    primary: currentOrganization.primaryColor,
                    secondary: currentOrganization.secondaryColor,
                    accent: currentOrganization.accentColor,
                });
            } else {
                // No custom colors - reset to RAYMOND defaults
                resetToDefaultColors();
            }
        } else {
            // No organization - reset to defaults
            resetToDefaultColors();
        }
    }, [currentOrganization?.primaryColor, currentOrganization?.secondaryColor, currentOrganization?.accentColor])

    // CRITICAL: DO NOT sync orgId with localStorage
    // The API interceptor gets orgId ONLY from the store to prevent data leaks between organizations

    return <>{children}</>
}
