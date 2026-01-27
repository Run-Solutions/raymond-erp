import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useOrganizationStore } from "@/store/organization.store";

export interface Phase {
    id: string;
    name: string;
    description?: string;
    color?: string;
    order: number;
    organization_id: string;
    created_at: string;
    updated_at: string;
}

interface PhasesResponse {
    data: Phase[];
    meta: {
        total: number;
    };
}

export function usePhases(params?: { search?: string }) {
    const { currentOrganization } = useOrganizationStore();

    return useQuery({
        queryKey: ["phases", currentOrganization?.id, params],
        queryFn: async () => {
            const response = await api.get("/phases", { params });
            const body = response.data;

            // Handle { success: true, data: { data: [...], meta: {...} } }
            if (body?.success && body?.data?.data) {
                return {
                    data: body.data.data,
                    meta: body.data.meta
                };
            }

            // Handle { data: [...], meta: {...} }
            if (body?.data && Array.isArray(body.data)) {
                return { data: body.data, meta: body.meta || { total: body.data.length } };
            }

            return { data: [], meta: { total: 0 } };
        },
        enabled: !!currentOrganization?.id,
    });
}

export function useCreatePhase() {
    const queryClient = useQueryClient();
    const { currentOrganization } = useOrganizationStore();

    return useMutation({
        mutationFn: async (data: { name: string; description?: string; color?: string; order?: number }) => {
            const response = await api.post("/phases", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["phases"] });
            if (currentOrganization?.id) {
                queryClient.invalidateQueries({ queryKey: ["phases", currentOrganization.id] });
            }
        },
    });
}

export function useUpdatePhase() {
    const queryClient = useQueryClient();
    const { currentOrganization } = useOrganizationStore();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Phase> }) => {
            const response = await api.patch(`/phases/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["phases"] });
            if (currentOrganization?.id) {
                queryClient.invalidateQueries({ queryKey: ["phases", currentOrganization.id] });
            }
        },
    });
}

export function useDeletePhase() {
    const queryClient = useQueryClient();
    const { currentOrganization } = useOrganizationStore();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/phases/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["phases"] });
            if (currentOrganization?.id) {
                queryClient.invalidateQueries({ queryKey: ["phases", currentOrganization.id] });
            }
        },
    });
}
