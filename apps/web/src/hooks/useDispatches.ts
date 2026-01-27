import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Dispatch {
    id: string;
    content: string;
    urgencyLevel: 'NORMAL' | 'URGENT' | 'CRITICAL';
    status: 'SENT' | 'READ' | 'IN_PROGRESS' | 'RESOLVED' | 'CONVERTED_TO_TASK';
    senderId: string;
    recipientId: string;
    taskId?: string | null;
    dueDate?: string | null;
    readAt?: string | null;
    inProgressAt?: string | null;
    resolvedAt?: string | null;
    resolutionNote?: string | null;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    sender: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
        role: {
            name: string;
        };
    };
    recipient: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
        role: {
            name: string;
        };
    };
    task?: {
        id: string;
        title: string;
        status: string;
    } | null;
    _count?: {
        attachments: number;
    };
}

export interface DispatchStats {
    totalSent: number;
    totalReceived: number;
    unreadCount: number;
    urgentCount: number;
}

// Transform dispatch data from backend (snake_case) to frontend (camelCase)
function transformDispatch(dispatch: any): Dispatch {
    return {
        ...dispatch,
        senderId: dispatch.sender_id || dispatch.senderId,
        recipientId: dispatch.recipient_id || dispatch.recipientId,
        taskId: dispatch.task_id || dispatch.taskId,
        dueDate: dispatch.due_date || dispatch.dueDate,
        readAt: dispatch.read_at || dispatch.readAt,
        inProgressAt: dispatch.in_progress_at || dispatch.inProgressAt,
        resolvedAt: dispatch.resolved_at || dispatch.resolvedAt,
        resolutionNote: dispatch.resolution_note || dispatch.resolutionNote,
        organizationId: dispatch.organization_id || dispatch.organizationId,
        createdAt: dispatch.created_at || dispatch.createdAt,
        updatedAt: dispatch.updated_at || dispatch.updatedAt,
        urgencyLevel: dispatch.urgency_level || dispatch.urgencyLevel,
        sender: dispatch.sender ? {
            ...dispatch.sender,
            firstName: dispatch.sender.first_name || dispatch.sender.firstName,
            lastName: dispatch.sender.last_name || dispatch.sender.lastName,
            avatarUrl: dispatch.sender.avatar_url || dispatch.sender.avatarUrl,
            role: dispatch.sender.roles || dispatch.sender.role,
        } : dispatch.sender,
        recipient: dispatch.recipient ? {
            ...dispatch.recipient,
            firstName: dispatch.recipient.first_name || dispatch.recipient.firstName,
            lastName: dispatch.recipient.last_name || dispatch.recipient.lastName,
            avatarUrl: dispatch.recipient.avatar_url || dispatch.recipient.avatarUrl,
            role: dispatch.recipient.roles || dispatch.recipient.role,
        } : dispatch.recipient,
        // Backend returns 'tasks' (plural) relation, but frontend expects 'task' (singular)
        task: dispatch.tasks || dispatch.task,
        _count: dispatch._count ? {
            attachments: dispatch._count.dispatch_attachments || dispatch._count.attachments || 0
        } : undefined,
    };
}

export function useDispatches(params?: {
    page?: number;
    limit?: number;
    status?: string;
    urgencyLevel?: string;
    type?: 'sent' | 'received';
}) {
    return useQuery({
        queryKey: ["dispatches", params],
        queryFn: async () => {
            const response = await api.get("/dispatches", { params });
            const body = response.data;

            // Handle response structure and transform data
            if (body?.data?.data && Array.isArray(body.data.data)) {
                return {
                    data: body.data.data.map(transformDispatch),
                    meta: body.data.meta
                };
            }

            if (body?.data && Array.isArray(body.data)) {
                return { data: body.data.map(transformDispatch), meta: body.meta || null };
            }

            if (Array.isArray(body)) {
                return { data: body.map(transformDispatch), meta: null };
            }

            return { data: [], meta: null };
        },
    });
}

export function useDispatch(id: string) {
    return useQuery<Dispatch | null>({
        queryKey: ["dispatch", id],
        queryFn: async () => {
            const response = await api.get(`/dispatches/${id}`);
            const dispatch = response.data?.data || response.data;
            if (!dispatch) return null;
            return transformDispatch(dispatch);
        },
        enabled: !!id,
    });
}

export function useDispatchStats() {
    return useQuery<DispatchStats>({
        queryKey: ["dispatch-stats"],
        queryFn: async () => {
            const response = await api.get("/dispatches/stats");
            return response.data.data || response.data;
        },
    });
}

export function useCreateDispatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: {
            content: string;
            description?: string;
            link?: string;
            recipientId: string;
            urgencyLevel?: 'NORMAL' | 'URGENT' | 'CRITICAL';
            dueDate?: string;
        }) => {
            // Transform camelCase to snake_case for API
            const apiData = {
                content: data.content,
                description: data.description,
                link: data.link,
                recipient_id: data.recipientId,
                urgency_level: data.urgencyLevel,
                due_date: data.dueDate,
            };
            const response = await api.post("/dispatches", apiData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dispatches"] });
            queryClient.invalidateQueries({ queryKey: ["dispatch-stats"] });
        },
    });
}

export function usePatchDispatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.patch(`/dispatches/${id}`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["dispatches"] });
            queryClient.invalidateQueries({ queryKey: ["dispatch", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["dispatch-stats"] });
        },
    });
}

export function useDeleteDispatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/dispatches/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dispatches"] });
            queryClient.invalidateQueries({ queryKey: ["dispatch-stats"] });
        },
    });
}

export function useMarkAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/dispatches/${id}/read`);
            return response.data;
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: ["dispatches"] });
            queryClient.invalidateQueries({ queryKey: ["dispatch", id] });
            queryClient.invalidateQueries({ queryKey: ["dispatch-stats"] });
        },
    });
}

export function useMarkInProgress() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/dispatches/${id}/progress`);
            return response.data;
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: ["dispatches"] });
            queryClient.invalidateQueries({ queryKey: ["dispatch", id] });
        },
    });
}

export function useResolveDispatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, resolutionNote }: { id: string; resolutionNote?: string }) => {
            const response = await api.post(`/dispatches/${id}/resolve`, { resolutionNote });
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["dispatches"] });
            queryClient.invalidateQueries({ queryKey: ["dispatch", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["dispatch-stats"] });
        },
    });
}

export function useConvertToTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, projectId }: { id: string; projectId?: string }) => {
            const response = await api.post(`/dispatches/${id}/convert-to-task`, {
                project_id: projectId
            });
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['dispatches'] });
            queryClient.invalidateQueries({ queryKey: ["dispatch", variables.id] });
            queryClient.invalidateQueries({ queryKey: ['dispatch-stats'] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}
