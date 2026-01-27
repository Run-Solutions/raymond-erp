import { useState } from 'react';
import { useOrganizationStore } from '@/store/organization.store';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

/**
 * Hook to switch between organizations
 * Handles the full flow of switching organizations including token updates
 */
export function useOrganizationSwitch() {
    const { switchOrganization, isSwitching } = useOrganizationStore();
    const { setUser } = useAuthStore();
    const [isProcessing, setIsProcessing] = useState(false);

    const switchTo = async (organizationId: string) => {
        if (isSwitching || isProcessing) {
            return false;
        }

        setIsProcessing(true);
        
        try {
            const success = await switchOrganization(organizationId);
            
            if (success) {
                // Update user in auth store if needed
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        user.organizationId = organizationId;
                        setUser(user);
                    } catch (e) {
                        console.error('Failed to update user in store:', e);
                    }
                }
                
                toast.success('Organización cambiada exitosamente');
                return true;
            } else {
                toast.error('No se pudo cambiar de organización');
                return false;
            }
        } catch (error: any) {
            const errorMessage = error?.message || 'Error al cambiar de organización';
            toast.error(errorMessage);
            return false;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        switchTo,
        isSwitching: isSwitching || isProcessing,
    };
}
