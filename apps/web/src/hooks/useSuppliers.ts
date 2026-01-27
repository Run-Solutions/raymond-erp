import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useOrganizationStore } from "@/store/organization.store";

export interface Supplier {
    id: string;
    nombre: string;
    runProveedor: string | null;
    rfc: string | null;
    email: string | null;
    countryCode: string | null;
    telefono: string | null;
    contacto: string | null;
    isActive: boolean;
    datosBancarios: string | null;
    direccion: string | null;
    _count?: {
        accountsPayable: number;
    };
}

// Transform supplier data from backend (snake_case) to frontend (camelCase)
function transformSupplier(supplier: any): Supplier {
    return {
        ...supplier,
        runProveedor: supplier.run_proveedor || supplier.runProveedor,
        countryCode: supplier.country_code || supplier.countryCode,
        isActive: supplier.is_active !== undefined ? supplier.is_active : supplier.isActive,
        datosBancarios: supplier.datos_bancarios || supplier.datosBancarios,
        _count: supplier._count ? {
            accountsPayable: supplier._count.accounts_payable || supplier._count.accountsPayable || 0
        } : undefined,
    };
}

export function useSuppliers(params?: { page?: number; limit?: number; search?: string }) {
    const { currentOrganization } = useOrganizationStore();
    // CRITICAL: Include organizationId in cache key to prevent cross-org cache pollution
    return useQuery({
        queryKey: ["suppliers", currentOrganization?.id, params],
        queryFn: async () => {
            const response = await api.get("/suppliers", { params });
            const body = response.data;

            // Case 1: Paginated response wrapped in success object
            if (body?.data?.data && Array.isArray(body.data.data)) {
                return {
                    data: body.data.data.map(transformSupplier),
                    meta: body.data.meta
                };
            }

            // Case 2: Array wrapped in success object
            if (body?.data && Array.isArray(body.data)) {
                return { data: body.data.map(transformSupplier), meta: null };
            }

            // Case 3: Direct Array
            if (Array.isArray(body)) {
                return { data: body.map(transformSupplier), meta: null };
            }

            return { data: [], meta: null };
        },
    });
}

export function useSupplier(id: string) {
    const { currentOrganization } = useOrganizationStore();
    // CRITICAL: Include organizationId in cache key to prevent cross-org cache pollution
    return useQuery({
        queryKey: ["supplier", currentOrganization?.id, id],
        queryFn: async () => {
            const { data } = await api.get<any>(`/suppliers/${id}`);
            const supplier = data.data || data;
            if (!supplier) return null;
            return transformSupplier(supplier);
        },
        enabled: !!id,
    });
}

export function useSupplierStats(id: string) {
    return useQuery({
        queryKey: ["supplier-stats", id],
        queryFn: async () => {
            const { data } = await api.get(`/suppliers/${id}/statistics`);
            return data;
        },
        enabled: !!id,
    });
}

export function useCreateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Supplier>) => {
            const response = await api.post("/suppliers", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            // CRITICAL: Also invalidate by orgId to ensure proper cache clearing
            const orgId = useOrganizationStore.getState().currentOrganization?.id;
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: ["suppliers", orgId] });
            }
        },
    });
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
            const response = await api.patch(`/suppliers/${id}`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            queryClient.invalidateQueries({ queryKey: ["supplier", variables.id] });
        },
    });
}

export function useDeleteSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/suppliers/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            // CRITICAL: Also invalidate by orgId to ensure proper cache clearing
            const orgId = useOrganizationStore.getState().currentOrganization?.id;
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: ["suppliers", orgId] });
            }
        },
    });
}
