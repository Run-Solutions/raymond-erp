import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface TallerUsuario {
    IDUsuarios: string;
    Correo: string;
    Usuario: string;
    UsuarioBloqueado: boolean;
    Rol: string;
    TallerAsignado?: string;
}

export const useTallerUsuarios = () => {
    return useQuery<TallerUsuario[]>({
        queryKey: ['taller-usuarios'],
        queryFn: async () => {
            const response = await api.get('/taller-r1/usuarios');
            const body = response.data;
            if (Array.isArray(body)) return body;
            if (body?.data && Array.isArray(body.data)) return body.data;
            return [];
        },
    });
};

export const useCreateTallerUsuario = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<TallerUsuario> & { ContrasenaUsuario: string }) => {
            const response = await api.post('/taller-r1/usuarios', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taller-usuarios'] });
            toast.success('Usuario creado exitosamente');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al crear usuario');
        },
    });
};

export const useUpdateTallerUsuario = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<TallerUsuario> & { ContrasenaUsuario?: string } }) => {
            const response = await api.put(`/taller-r1/usuarios/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taller-usuarios'] });
            toast.success('Usuario actualizado exitosamente');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al actualizar usuario');
        },
    });
};
