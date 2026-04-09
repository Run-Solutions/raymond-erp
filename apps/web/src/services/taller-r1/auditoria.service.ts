import api from '@/lib/api';

export interface CreateAuditoriaDto {
    fecha_auditoria?: Date;
    usuario_auditor: string;
    comentarios?: string;
    id_ubicacion?: string;
}

export const auditoriaApi = {
    getAll: async (site: string) => {
        const response = await api.get(`/${site}/auditoria`, { headers: { 'x-site-id': site } });
        return response.data?.data || response.data;
    },

    getReport: async (site: string, id: string) => {
        const response = await api.get(`/${site}/auditoria/${id}/report`, { headers: { 'x-site-id': site } });
        return response.data?.data || response.data;
    },

    create: async (site: string, data: CreateAuditoriaDto) => {
        const response = await api.post(`/${site}/auditoria`, data, { headers: { 'x-site-id': site } });
        return response.data?.data || response.data;
    },

    scanEquipo: async (site: string, id: string, serial: string) => {
        const response = await api.post(`/${site}/auditoria/${id}/scan`, { serial }, { headers: { 'x-site-id': site } });
        return response.data?.data || response.data;
    }
};
