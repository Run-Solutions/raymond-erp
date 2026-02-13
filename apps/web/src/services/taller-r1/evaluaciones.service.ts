import api from '@/lib/api';

const API_URL = '/taller-r1/evaluaciones';

export const evaluacionesApi = {
    saveEquipoEvaluation: async (data: any) => {
        const response = await api.post(`${API_URL}/equipo`, data);
        return response.data;
    },
    getEquipoEvaluation: async (id_detalle: string) => {
        const response = await api.get(`${API_URL}/equipo/${id_detalle}`);
        return response.data;
    },
    saveAccesorioEvaluation: async (data: any) => {
        const response = await api.post(`${API_URL}/accesorio`, data);
        return response.data;
    },
    getAccesorioEvaluation: async (id_accesorio: string) => {
        const response = await api.get(`${API_URL}/accesorio/${id_accesorio}`);
        return response.data;
    },
    registerCharge: async (id_accesorio: string, comentarios?: string) => {
        const response = await api.post(`${API_URL}/accesorio/${id_accesorio}/carga`, { comentarios });
        return response.data;
    },
    getChargeHistory: async (id_accesorio: string) => {
        const response = await api.get(`${API_URL}/accesorio/${id_accesorio}/historial-cargas`);
        return response.data;
    }
};

export const mantenimientoApi = {
    getAlertas: async () => {
        const response = await api.get('/taller-r1/mantenimiento/alertas');
        return response.data;
    }
};
