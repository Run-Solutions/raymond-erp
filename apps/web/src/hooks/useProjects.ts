import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Project } from "@/types";
import { useOrganizationStore } from "@/store/organization.store";

// Transform backend response to match frontend Project interface
function transformProject(project: any): Project {
    return {
        ...project,
        startDate: project.start_date || project.startDate,
        endDate: project.end_date || project.endDate,
        client: project.clients || project.client,
        phase: project.phases || project.phase,
        amountWithTax: project.amount_with_tax || project.amountWithTax,
        amountWithoutTax: project.amount_without_tax || project.amountWithoutTax,
        clientId: project.client_id || project.clientId,
        phaseId: project.phase_id || project.phaseId,
        ownerId: project.owner_id || project.ownerId,
        organizationId: project.organization_id || project.organizationId,
    };
}

export function useProjects(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const { currentOrganization } = useOrganizationStore();
    // CRITICAL: Include organizationId in cache key to prevent cross-org cache pollution
    return useQuery({
        queryKey: ["projects", currentOrganization?.id, params],
        queryFn: async () => {
            console.log('[useProjects] Fetching projects with orgId:', currentOrganization?.id, 'params:', params);
            try {
                const response = await api.get("/projects", {
                    params,
                });
                console.log('[useProjects] Response received:', {
                    status: response.status,
                    hasData: !!response.data,
                    dataType: typeof response.data,
                    dataKeys: response.data ? Object.keys(response.data) : [],
                    fullResponse: response.data
                });
                
                const body = response.data;

                // The TransformInterceptor wraps responses as: { success: true, data: <service_response>, ... }
                // Service returns: { data: projects[], meta: { total, page, limit, totalPages } }
                // Final structure: { success: true, data: { data: [...], meta: {...} }, ... }
                
                // Case 1: Paginated response wrapped in success object (standard format)
                // { success: true, data: { data: [...], meta: {...} } }
                if (body?.success === true && body?.data?.data && Array.isArray(body.data.data)) {
                    console.log('[useProjects] Case 1: Standard paginated format, returning', body.data.data.length, 'items, meta:', body.data.meta);
                    return {
                        data: body.data.data.map(transformProject),
                        meta: body.data.meta || null
                    };
                }

                // Case 2: Service response directly (without interceptor wrapper) - { data: [...], meta: {...} }
                if (body?.data && Array.isArray(body.data) && body.meta) {
                    console.log('[useProjects] Case 2: Direct service response, returning', body.data.length, 'items, meta:', body.meta);
                    return {
                        data: body.data.map(transformProject),
                        meta: body.meta
                    };
                }

                // Case 3: Array wrapped in success object without meta - { success: true, data: [...] }
                if (body?.success === true && body?.data && Array.isArray(body.data)) {
                    console.log('[useProjects] Case 3: Array wrapped without meta, returning', body.data.length, 'items');
                    return { data: body.data.map(transformProject), meta: null };
                }

                // Case 4: Direct Array (legacy format)
                if (Array.isArray(body)) {
                    console.log('[useProjects] Case 4: Direct array (legacy), returning', body.length, 'items');
                    return { data: body.map(transformProject), meta: null };
                }

                // Case 5: Empty response from service (SuperAdmin without org) - { success: true, data: { data: [], meta: {...} } }
                if (body?.success === true && body?.data?.data && Array.isArray(body.data.data) && body.data.data.length === 0) {
                    console.log('[useProjects] Case 5: Empty response (SuperAdmin without org), returning empty array');
                    return {
                        data: [],
                        meta: body.data.meta || { total: 0, page: 1, limit: 20, totalPages: 0 }
                    };
                }

                // Case 6: Empty or unknown structure
                console.warn('[useProjects] Unknown response structure, returning empty array. Body:', JSON.stringify(body, null, 2));
                return { data: [], meta: null };
            } catch (error: any) {
                console.error('[useProjects] Error fetching projects:', {
                    message: error?.message,
                    response: error?.response?.data,
                    status: error?.response?.status,
                    orgId: currentOrganization?.id
                });
                // Return empty data instead of throwing to prevent UI crash
                return { data: [], meta: null };
            }
        },
        // Allow query to run even if no organization (for SuperAdmin to see empty state)
        // The backend will handle returning empty array if no org
        enabled: true, // Always enabled, backend handles organization validation
        retry: 1, // Only retry once on failure
    });
}

export function useProject(id: string) {
    const { currentOrganization } = useOrganizationStore();
    // CRITICAL: Include organizationId in cache key to prevent cross-org cache pollution
    return useQuery<Project>({
        queryKey: ["project", currentOrganization?.id, id],
        queryFn: async () => {
            const response = await api.get(`/projects/${id}`);
            // Handle { success: true, data: { ... } } structure
            if (response.data && response.data.data) {
                return transformProject(response.data.data);
            }
            return transformProject(response.data);
        },
        enabled: !!id,
    });
}

export function useProjectStats(id: string) {
    return useQuery({
        queryKey: ["project-stats", id],
        queryFn: async () => {
            const { data } = await api.get(`/projects/${id}/statistics`);
            return data;
        },
        enabled: !!id,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<Project>) => {
            const response = await api.post("/projects", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            // CRITICAL: Also invalidate by orgId to ensure proper cache clearing
            const orgId = useOrganizationStore.getState().currentOrganization?.id;
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
            }
        },
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
            const response = await api.patch(`/projects/${id}`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            queryClient.invalidateQueries({ queryKey: ["project", variables.id] });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            // CRITICAL: Also invalidate by orgId to ensure proper cache clearing
            const orgId = useOrganizationStore.getState().currentOrganization?.id;
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
            }
        },
    });
}

export function useProjectFinancials(id: string) {
    return useQuery({
        queryKey: ["project-financials", id],
        queryFn: async () => {
            const { data } = await api.get(`/projects/${id}/financial-stats`);
            return data;
        },
        enabled: !!id,
    });
}
