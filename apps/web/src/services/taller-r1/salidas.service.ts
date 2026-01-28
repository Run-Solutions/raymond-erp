import api from '@/lib/api';

const API_URL = '/taller-r1/salidas';

export interface Salida {
    id_salida: string;
    folio: string;
    fecha_transporte: Date;
    numero_transporte?: string;
    estado: string;
    cliente?: string;
    firma?: string;
    evidencia?: string;
    usuario_asignado?: string;
    firma_usuario?: string;
    comentario?: string;
    nombre_recibe?: string;
    pdf?: boolean;
    fecha_creacion?: Date;
    elemento?: string;
    carta_instruccion?: string;
    pedido?: string;
    razon_social?: string;
    direccion_cliente?: string;
    rfc?: string;
    contacto?: string;
    telefono?: string;
    remision?: string;
    adc?: string;
    oc?: string;
    observaciones?: string;
    PDF_Carta?: string;
    remision_confirmacion?: number;
}

export interface CreateSalidaDto {
    folio: string;
    fecha_transporte: Date;
    numero_transporte?: string;
    estado: string;
    cliente?: string;
    firma?: string;
    evidencia?: string;
    usuario_asignado?: string;
    firma_usuario?: string;
    comentario?: string;
    nombre_recibe?: string;
    elemento?: string;
    carta_instruccion?: string;
    pedido?: string;
    razon_social?: string;
    direccion_cliente?: string;
    rfc?: string;
    contacto?: string;
    telefono?: string;
    remision?: string;
    adc?: string;
    oc?: string;
    observaciones?: string;
}

export interface UpdateSalidaDto {
    fecha_transporte?: Date;
    numero_transporte?: string;
    estado?: string;
    cliente?: string;
    firma?: string;
    evidencia?: string;
    usuario_asignado?: string;
    firma_usuario?: string;
    comentario?: string;
    nombre_recibe?: string;
    elemento?: string;
    carta_instruccion?: string;
    pedido?: string;
    razon_social?: string;
    direccion_cliente?: string;
    rfc?: string;
    contacto?: string;
    telefono?: string;
    remision?: string;
    adc?: string;
    oc?: string;
    observaciones?: string;
    remision_confirmacion?: number;
}

export const salidasApi = {
    // Obtener todas las salidas
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
            console.error('[SalidasService] getAll failed:', error);
            return [];
        }
    },

    // Obtener una salida por ID
    getById: async (id: string) => {
        const response = await api.get<Salida>(`${API_URL}/${id}`);
        return response.data;
    },

    // Obtener detalles de una salida
    getDetalles: async (id: string) => {
        const response = await api.get(`${API_URL}/${id}/detalles`);
        return response.data;
    },

    // Crear una nueva salida
    create: async (data: CreateSalidaDto) => {
        const response = await api.post<Salida>(API_URL, data);
        return response.data;
    },

    // Actualizar una salida
    update: async (id: string, data: UpdateSalidaDto) => {
        const response = await api.put<Salida>(`${API_URL}/${id}`, data);
        return response.data;
    },

    // Eliminar una salida
    delete: async (id: string) => {
        const response = await api.delete(`${API_URL}/${id}`);
        return response.data;
    },
};
