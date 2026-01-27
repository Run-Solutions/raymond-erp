import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useOrganizationStore } from "@/store/organization.store";

export interface Client {
    id: string;
    nombre: string;
    rfc: string | null;
    email: string | null;
    telefono: string | null;
    country_code: string | null;
    contacto: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    projects: any[]; // We can refine this type later
    _count?: {
        projects: number;
    };
}

interface ClientsResponse {
    data: Client[];
    meta: {
        total: number;
        page: number;
        lastPage: number;
    };
}

export function useClients(params?: { page?: number; limit?: number; search?: string }) {
    const { currentOrganization } = useOrganizationStore();
    // CRITICAL: Include organizationId in cache key to prevent cross-org cache pollution
    return useQuery({
        queryKey: ["clients", currentOrganization?.id, params],
        queryFn: async () => {
            const response = await api.get("/clients", {
                params,
            });
            console.log('[useClients] Full API Response:', response);
            console.log('[useClients] Response data structure:', response.data);
            const body = response.data; // { success: true, data: { ... } }

            // Case 1: Paginated response wrapped in success object
            // body.data -> { data: [], meta: {} }
            if (body?.data?.data && Array.isArray(body.data.data)) {
                console.log('[useClients] Using Case 1 - Paginated response');
                console.log('[useClients] First client:', body.data.data[0]);
                return {
                    data: body.data.data,
                    meta: body.data.meta
                };
            }

            // Case 2: Array wrapped in success object
            // body.data -> []
            if (body?.data && Array.isArray(body.data)) {
                console.log('[useClients] Using Case 2 - Array wrapped');
                return { data: body.data, meta: null };
            }

            // Case 3: Direct Paginated (if interceptor didn't wrap, unlikely but possible)
            if (body?.data && Array.isArray(body.data)) {
                console.log('[useClients] Using Case 3 - Direct paginated');
                return { data: body.data, meta: body.meta || null };
            }

            // Case 4: Direct Array
            if (Array.isArray(body)) {
                console.log('[useClients] Using Case 4 - Direct array');
                return { data: body, meta: null };
            }

            console.log('[useClients] No matching case, returning empty array');
            return { data: [], meta: null };
        },
    });
}

export function useClient(id: string) {
    const { currentOrganization } = useOrganizationStore();
    // CRITICAL: Include organizationId in cache key to prevent cross-org cache pollution
    return useQuery({
        queryKey: ["client", currentOrganization?.id, id],
        queryFn: async () => {
            const { data } = await api.get<Client>(`/clients/${id}`);
            console.log('[useClient] API Response:', data);
            // @ts-ignore - Handle potential nested data structure
            return data.data || data;
        },
        enabled: !!id,
    });
}

export function useClientStats(id: string) {
    return useQuery({
        queryKey: ["client-stats", id],
        queryFn: async () => {
            const { data } = await api.get(`/clients/${id}/statistics`);
            return data;
        },
    });
}

export function useCreateClient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Client>) => {
            const response = await api.post("/clients", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            // CRITICAL: Also invalidate by orgId to ensure proper cache clearing
            const orgId = useOrganizationStore.getState().currentOrganization?.id;
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: ["clients", orgId] });
            }
        },
    });
}

export function useUpdateClient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
            const response = await api.patch(`/clients/${id}`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["client", variables.id] });
        },
    });
}

export function useDeleteClient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/clients/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            // CRITICAL: Also invalidate by orgId to ensure proper cache clearing
            const orgId = useOrganizationStore.getState().currentOrganization?.id;
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: ["clients", orgId] });
            }
        },
    });
}
