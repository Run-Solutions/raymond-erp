import api from '@/lib/api';

const API_URL = '/taller-r1/ubicaciones';

export interface Ubicacion {
    id_ubicacion: string;
    nombre_ubicacion: string;
    maximo_stock: number;
    Clase?: string;
}

export const ubicacionesApi = {
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
            console.error('[UbicacionesService] getAll failed:', error);
            return [];
        }
    },
    create: async (data: any) => {
        const response = await api.post<any>(API_URL, data);
        return response.data?.data || response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.put<any>(`${API_URL}/${id}`, data);
        return response.data?.data || response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`${API_URL}/${id}`);
        return response.data?.data || response.data;
    },
    getNextSubLocation: async (id_ubicacion: string, entradaId: string, rack?: string) => {
        const queryParams = new URLSearchParams({ entradaId });
        if (rack) queryParams.append('rack', rack);

        const response = await api.get<any>(`${API_URL}/${id_ubicacion}/next-sub-location?${queryParams.toString()}`);
        return response.data?.data || response.data;
    },
    getSubLocations: async (id_ubicacion: string, rack?: string) => {
        const queryParams = new URLSearchParams();
        if (rack) queryParams.append('rack', rack);

        const response = await api.get<any>(`${API_URL}/${id_ubicacion}/sub-locations?${queryParams.toString()}`);
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
    },
};
