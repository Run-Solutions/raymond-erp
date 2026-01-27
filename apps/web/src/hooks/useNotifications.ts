import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useOrganizationStore } from '@/store/organization.store';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    read_at: string | null;
    link: string | null;
    metadata: Record<string, any> | null;
    organization_id: string | null;
    created_at: string;
    updated_at: string;
    users?: {
        id: string;
        first_name: string;
        last_name: string;
        avatar_url: string | null;
    };
}

export interface NotificationsResponse {
    data: Notification[];
    total: number;
    limit: number;
    offset: number;
}

export interface NotificationParams {
    type?: string;
    read?: boolean;
    limit?: number;
    offset?: number;
}

export function useNotifications(params?: NotificationParams) {
    const { currentOrganization } = useOrganizationStore();
    
    return useQuery({
        queryKey: ['notifications', currentOrganization?.id, params],
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: NotificationsResponse } | NotificationsResponse>('/notifications', {
                params,
            });
            
            const body = response.data;
            
            // Handle wrapped response
            if (body && 'success' in body && body.success && body.data) {
                return body.data;
            }
            
            // Handle direct response
            if (body && 'data' in body && Array.isArray(body.data)) {
                return body as NotificationsResponse;
            }
            
            return { data: [], total: 0, limit: 20, offset: 0 };
        },
        refetchInterval: 5000, // Poll every 5 seconds for real-time updates
    });
}

export function useUnreadNotificationsCount() {
    const { currentOrganization } = useOrganizationStore();
    
    return useQuery({
        queryKey: ['notifications', 'unread-count', currentOrganization?.id],
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: number } | number>('/notifications/unread/count');
            
            const body = response.data;
            
            // Handle wrapped response
            if (body && typeof body === 'object' && 'success' in body && body.success && typeof body.data === 'number') {
                return body.data;
            }
            
            // Handle direct response
            if (typeof body === 'number') {
                return body;
            }
            
            return 0;
        },
        refetchInterval: 3000, // Poll every 3 seconds for unread count badge
        enabled: !!currentOrganization?.id, // Only fetch when organization is available
        staleTime: 0, // Always consider data stale to ensure frequent updates
    });
}

export function useMarkNotificationAsRead() {
    const queryClient = useQueryClient();
    const { currentOrganization } = useOrganizationStore();
    
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.patch(`/notifications/${id}/read`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', currentOrganization?.id] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', currentOrganization?.id] });
        },
    });
}

export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();
    const { currentOrganization } = useOrganizationStore();
    
    return useMutation({
        mutationFn: async () => {
            const response = await api.patch('/notifications/read-all');
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', currentOrganization?.id] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', currentOrganization?.id] });
        },
    });
}

export function useDeleteNotification() {
    const queryClient = useQueryClient();
    const { currentOrganization } = useOrganizationStore();
    
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/notifications/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', currentOrganization?.id] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', currentOrganization?.id] });
        },
    });
}

