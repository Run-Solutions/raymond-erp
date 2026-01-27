import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";

export interface UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const { user, setUser } = useAuthStore();

    return useMutation({
        mutationFn: async (data: UpdateProfileDto) => {
            // Transform camelCase to snake_case for backend
            const backendData: any = {};
            if (data.firstName !== undefined) {
                backendData.first_name = data.firstName;
            }
            if (data.lastName !== undefined) {
                backendData.last_name = data.lastName;
            }
            if (data.avatarUrl !== undefined) {
                backendData.avatar_url = data.avatarUrl;
            }

            console.log('[useUpdateProfile] Updating profile via /users/me endpoint');

            // Use the dedicated /users/me endpoint for profile updates
            // This endpoint uses req.user.id internally, so no need to pass user ID
            // It also doesn't require users:update permission
            const response = await api.patch(`/users/me`, backendData);
            const responseData = response.data?.data || response.data;
            
            // Transform snake_case to camelCase for frontend
            if (responseData) {
                return {
                    firstName: responseData.first_name || responseData.firstName,
                    lastName: responseData.last_name || responseData.lastName,
                    avatarUrl: responseData.avatar_url || responseData.avatarUrl,
                    email: responseData.email,
                };
            }
            return responseData;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
            // Update auth store with new user data
            if (data && user) {
                setUser({ 
                    ...user, 
                    firstName: data.firstName || user.firstName,
                    lastName: data.lastName || user.lastName,
                    avatarUrl: data.avatarUrl || user.avatarUrl,
                });
            }
            toast.success("Perfil actualizado exitosamente");
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || "Error al actualizar perfil";
            toast.error(message);
        },
    });
}

export function useChangePassword() {
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (data: ChangePasswordDto) => {
            if (!user?.id) {
                throw new Error("User not found");
            }
            // Validate passwords match
            if (data.newPassword !== data.confirmPassword) {
                throw new Error("Las contraseñas no coinciden");
            }
            // Use the dedicated change-password endpoint
            const response = await api.patch(`/users/${user.id}/change-password`, {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });
            return response.data;
        },
        onSuccess: () => {
            toast.success("Contraseña actualizada exitosamente");
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || error.message || "Error al cambiar contraseña";
            toast.error(message);
        },
    });
}
