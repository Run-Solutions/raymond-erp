import api from '@/lib/api';

const API_URL = '/taller-r1/entradas';

export interface Entrada {
    // ... (rest of the interface stays as is)
    id_entrada: string;
    folio: string;
    fecha_creacion: Date;
    usuario_asignado?: string;
    comentario?: string;
    evidencia_1?: string;
    evidencia_2?: string;
    estado: string;
    fecha_cierre?: Date;
    prioridad?: string;
    fecha_asignacion?: Date;
    usuario_encargado?: string;
    cliente?: string;
    elemento?: string;
    factura?: string;
    distribuidor?: string;
    cliente_origen?: string;
    adc?: string;
}

export interface CreateEntradaDto {
    folio: string;
    distribuidor?: string;
    factura?: string;
    cliente_origen?: string;
    adc?: string;
    cliente?: string;
    fecha_creacion: Date;
    elemento?: string;
    comentario?: string;
    evidencia_1?: string;
    usuario_asignado?: string;
    estado: string;
    prioridad?: string;
}

export interface UpdateEntradaDto {
    usuario_asignado?: string;
    comentario?: string;
    evidencia_1?: string;
    evidencia_2?: string;
    estado?: string;
    fecha_cierre?: Date;
    prioridad?: string;
    fecha_asignacion?: Date;
    usuario_encargado?: string;
    cliente?: string;
}

export const entradasApi = {
    // Obtener todas las entradas
    getAll: async (estado?: string) => {
        const params = estado ? { estado } : {};
        try {
            const response = await api.get<any>(API_URL, { params });
            // Handle both wrapped and direct responses
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
                return response.data.data;
            }
            if (Array.isArray(response.data)) {
                return response.data;
            }
            return [];
        } catch (error) {
            console.error('[EntradasService] getAll failed:', error);
            return [];
        }
    },

    // Obtener una entrada por ID
    getById: async (id: string) => {
        const response = await api.get<Entrada>(`${API_URL}/${id}`);
        return response.data;
    },

    // Obtener detalles de una entrada
    getDetalles: async (id: string) => {
        const response = await api.get(`${API_URL}/${id}/detalles`);
        return response.data;
    },

    // Obtener accesorios de una entrada
    getAccesorios: async (id: string) => {
        const response = await api.get(`${API_URL}/${id}/accesorios`);
        return response.data;
    },

    // Crear una nueva entrada
    create: async (data: CreateEntradaDto) => {
        const response = await api.post<Entrada>(API_URL, data);
        return response.data;
    },

    // Actualizar una entrada
    update: async (id: string, data: UpdateEntradaDto) => {
        const response = await api.put<Entrada>(`${API_URL}/${id}`, data);
        return response.data;
    },

    // Eliminar una entrada
    delete: async (id: string) => {
        const response = await api.delete(`${API_URL}/${id}`);
        return response.data;
    },
};
