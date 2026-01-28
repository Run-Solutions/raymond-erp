import api from '@/lib/api';

const API_URL = '/taller-r1/equipos';

export interface Equipo {
    id_equipos: string;
    numero_serie?: string;
    clase: string;
    modelo?: string;
    descripcion?: string;
    estado: string;
    marca?: string;
}

export interface CreateEquipoDto {
    numero_serie?: string;
    clase: string;
    modelo?: string;
    descripcion?: string;
    estado: string;
    marca?: string;
}

export const equiposApi = {
    getAll: async () => {
        try {
            const response = await api.get<any>(API_URL);
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
                return response.data.data;
            }
            if (Array.isArray(response.data)) {
                return response.data;
            }
            return [];
        } catch (error) {
            console.error('[EquiposService] getAll failed:', error);
            return [];
        }
    },

    getById: async (id: string) => {
        const response = await api.get<Equipo>(`${API_URL}/${id}`);
        return response.data;
    },

    create: async (data: CreateEquipoDto) => {
        const response = await api.post<Equipo>(API_URL, data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateEquipoDto>) => {
        const response = await api.put<Equipo>(`${API_URL}/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`${API_URL}/${id}`);
        return response.data;
    },
};
