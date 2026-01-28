import api from '@/lib/api';

const API_URL = '/taller-r1/modelos';

export interface Modelo {
    id_modelo: string;
    modelo: string;
    clase_id?: string;
}

export const modelosApi = {
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
            console.error('[ModelosService] getAll failed:', error);
            return [];
        }
    },
    create: async (data: any) => {
        const response = await api.post(API_URL, data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.put(`${API_URL}/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`${API_URL}/${id}`);
        return response.data;
    },
};
