import api from '@/lib/api';

const API_URL = '/taller-r1/accesorios';

export interface Accesorio {
    id_accesorio: string;
    tipo?: string;
    modelo?: string;
    serial?: string;
    rack?: string;
    estado_acc?: string;
    fecha_ingreso?: Date;
    evidencia?: string;
    estado?: string;
    ubicacion?: string;
    sub_ubicacion?: string;
}

export const accesoriosApi = {
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
            console.error('[AccesoriosService] getAll failed:', error);
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
