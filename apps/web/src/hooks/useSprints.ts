import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Sprint } from "@/types";
import { useOrganizationStore } from "@/store/organization.store";

// Transform sprint data from backend (snake_case) to frontend (camelCase)
function transformSprint(sprint: any): Sprint {
    return {
        ...sprint,
        startDate: sprint.start_date || sprint.startDate,
        endDate: sprint.end_date || sprint.endDate,
        projectId: sprint.project_id || sprint.projectId,
        organizationId: sprint.organization_id || sprint.organizationId,
        project: sprint.projects || sprint.project, // Prisma returns 'projects' (plural)
        members: sprint.users?.map((user: any) => ({
            ...user,
            firstName: user.first_name || user.firstName,
            lastName: user.last_name || user.lastName,
            avatarUrl: user.avatar_url || user.avatarUrl,
        })) || sprint.members,
    };
}

export function useSprints(params?: { page?: number; limit?: number; projectId?: string; startDateFrom?: string; startDateTo?: string }) {
    const { currentOrganization } = useOrganizationStore();
    // CRITICAL: Include organizationId in cache key to prevent cross-org cache pollution
    return useQuery({
        queryKey: ["sprints", currentOrganization?.id, params],
        queryFn: async () => {
            const response = await api.get("/sprints", {
                params,
            });
            const body = response.data;

            // Case 1: Paginated response wrapped in success object
            if (body?.data?.data && Array.isArray(body.data.data)) {
                return {
                    data: body.data.data.map(transformSprint),
                    meta: body.data.meta
                };
            }

            // Case 2: Array wrapped in success object
            if (body?.data && Array.isArray(body.data)) {
                return { data: body.data.map(transformSprint), meta: null };
            }

            // Case 3: Direct Paginated
            if (body?.data && Array.isArray(body.data)) {
                return { data: body.data.map(transformSprint), meta: body.meta || null };
            }

            // Case 4: Direct Array
            if (Array.isArray(body)) {
                return { data: body.map(transformSprint), meta: null };
            }

            return { data: [], meta: null };
        },
    });
}

export function useSprint(id: string) {
    return useQuery<Sprint | null>({
        queryKey: ["sprint", id],
        queryFn: async () => {
            const response = await api.get(`/sprints/${id}`);
            // Handle { success: true, data: { ... } } structure
            let sprint;
            if (response.data && response.data.data) {
                sprint = response.data.data;
            } else {
                sprint = response.data;
            }
            // Return null if sprint is undefined/null
            if (!sprint) return null;
            return transformSprint(sprint);
        },
        enabled: !!id,
    });
}

export function useSprintStats(id: string) {
    return useQuery({
        queryKey: ["sprint-stats", id],
        queryFn: async () => {
            const { data } = await api.get(`/sprints/${id}/statistics`);
            return data;
        },
        enabled: !!id,
    });
}

export function useSprintBurndown(id: string) {
    return useQuery({
        queryKey: ["sprint-burndown", id],
        queryFn: async () => {
            const { data } = await api.get(`/sprints/${id}/burndown`);
            return data;
        },
        enabled: !!id,
    });
}

export function useSprintVelocity(id: string) {
    return useQuery({
        queryKey: ["sprint-velocity", id],
        queryFn: async () => {
            const { data } = await api.get(`/sprints/${id}/velocity`);
            return data;
        },
        enabled: !!id,
    });
}

export function useCreateSprint() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<Sprint>) => {
            const response = await api.post("/sprints", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sprints"] });
        },
    });
}

export function useUpdateSprint() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Sprint> }) => {
            const response = await api.patch(`/sprints/${id}`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["sprints"] });
            queryClient.invalidateQueries({ queryKey: ["sprint", variables.id] });
        },
    });
}

export function useDeleteSprint() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/sprints/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sprints"] });
        },
    });
}
