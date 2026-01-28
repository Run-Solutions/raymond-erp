import api from '@/lib/api';

const API_URL = '/taller-r1/equipo-ubicacion';

export interface EquipoUbicacion {
    id_equipo_ubicacion: string;
    id_equipos?: string;
    id_ubicacion?: string;
    stock: string;
    id_sub_ubicacion?: string;
    estado?: string;
    fecha_entrada?: string;
    serial_equipo?: string;
    vendedor?: string;
}

export const equipoUbicacionApi = {
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
            console.error('[EquipoUbicacionService] getAll failed:', error);
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
