import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useOrganizationStore } from "@/store/organization.store";

export enum ProspectStatus {
    NEW = 'NEW',
    CONTACTED = 'CONTACTED',
    QUALIFIED = 'QUALIFIED',
    PROPOSAL_SENT = 'PROPOSAL_SENT',
    NEGOTIATION = 'NEGOTIATION',
    WON = 'WON',
    LOST = 'LOST',
}

export interface Prospect {
    id: string;
    nombre: string;
    rfc: string | null;
    direccion: string | null;
    email: string | null;
    telefono: string | null;
    country_code: string | null;
    contacto: string | null;
    status: ProspectStatus;
    source: string | null;
    estimated_value: number | null;
    probability: number | null;
    expected_close_date: string | null;
    notes: string | null;
    assigned_to_id: string | null;
    converted_to_client_id: string | null;
    converted_at: string | null;
    organization_id: string;
    created_at: string;
    updated_at: string;
    assigned_to?: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        avatar_url: string | null;
    } | null;
    converted_to_client?: {
        id: string;
        nombre: string;
        rfc: string | null;
        email: string | null;
    } | null;
}

interface ProspectsResponse {
    data: Prospect[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

interface ProspectQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProspectStatus;
    statuses?: ProspectStatus[];
    assigned_to_id?: string;
    expected_close_date_from?: string;
    expected_close_date_to?: string;
}

export function useProspects(params?: ProspectQueryParams) {
    const { currentOrganization } = useOrganizationStore();
    return useQuery({
        queryKey: ["prospects", currentOrganization?.id, params],
        queryFn: async () => {
            const response = await api.get("/prospects", {
                params,
            });
            const body = response.data;

            if (body?.data?.data && Array.isArray(body.data.data)) {
                return {
                    data: body.data.data,
                    meta: body.data.meta
                };
            }

            if (body?.data && Array.isArray(body.data)) {
                return { data: body.data, meta: null };
            }

            if (body?.data && Array.isArray(body.data)) {
                return { data: body.data, meta: body.meta || null };
            }

            if (Array.isArray(body)) {
                return { data: body, meta: null };
            }

            return { data: [], meta: null };
        },
    });
}

export function useProspect(id: string) {
    const { currentOrganization } = useOrganizationStore();
    return useQuery({
        queryKey: ["prospect", currentOrganization?.id, id],
        queryFn: async () => {
            const { data } = await api.get<{ data: Prospect } | Prospect>(`/prospects/${id}`);
            return (data as any).data || data;
        },
        enabled: !!id,
    });
}

export function useProspectStats(id: string) {
    return useQuery({
        queryKey: ["prospect-stats", id],
        queryFn: async () => {
            const { data } = await api.get(`/prospects/${id}/statistics`);
            return data.data || data;
        },
        enabled: !!id,
    });
}

export function useProspectOrganizationStats() {
    const { currentOrganization } = useOrganizationStore();
    return useQuery({
        queryKey: ["prospect-org-stats", currentOrganization?.id],
        queryFn: async () => {
            const { data } = await api.get("/prospects/statistics");
            return data.data || data;
        },
        enabled: !!currentOrganization?.id,
    });
}

export function useCreateProspect() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Prospect>) => {
            const response = await api.post("/prospects", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["prospects"] });
            const orgId = useOrganizationStore.getState().currentOrganization?.id;
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: ["prospects", orgId] });
            }
        },
    });
}

export function useUpdateProspect() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Prospect> }) => {
            const response = await api.patch(`/prospects/${id}`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["prospects"] });
            queryClient.invalidateQueries({ queryKey: ["prospect", variables.id] });
        },
    });
}

export function useDeleteProspect() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/prospects/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["prospects"] });
            const orgId = useOrganizationStore.getState().currentOrganization?.id;
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: ["prospects", orgId] });
            }
        },
    });
}

export function useChangeProspectStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: ProspectStatus }) => {
            const response = await api.patch(`/prospects/${id}/status`, { status });
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["prospects"] });
            queryClient.invalidateQueries({ queryKey: ["prospect", variables.id] });
        },
    });
}

export function useAssignProspect() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, assigned_to_id }: { id: string; assigned_to_id?: string | null }) => {
            const response = await api.patch(`/prospects/${id}/assign`, { assigned_to_id });
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["prospects"] });
            queryClient.invalidateQueries({ queryKey: ["prospect", variables.id] });
        },
    });
}

export function useConvertProspectToClient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data?: Partial<Prospect> }) => {
            const response = await api.post(`/prospects/${id}/convert`, data || {});
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["prospects"] });
            queryClient.invalidateQueries({ queryKey: ["prospect", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            const orgId = useOrganizationStore.getState().currentOrganization?.id;
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: ["prospects", orgId] });
                queryClient.invalidateQueries({ queryKey: ["clients", orgId] });
            }
        },
    });
}

