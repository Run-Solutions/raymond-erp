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
    detalles?: any[];
    accesorios?: any[];
}

export interface CreateSalidaDto {
    tiene_remision: boolean;
    numero_remision?: string;
    numero_transporte?: string;
    pedido_venta?: string;
    cliente?: string;
    tipo_elemento: 'Equipos' | 'Accesorios';
    observaciones?: string;
    evidencia?: string;
    razon_social?: string;
    direccion_cliente?: string;
    rfc?: string;
    contacto?: string;
    telefono?: string;
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

export interface CreateDetalleDto {
    id_equipo: string;
    tipo_salida: 'Renta' | 'Venta' | 'Embarque';
    serial_equipos?: string;
    id_ubicacion?: string;
    id_sub_ubicacion?: string;
    aditamentos?: string;
}

export interface CreateAccesorioDto {
    id_accesorio: string;
    modelo?: string;
    serial?: string;
    voltaje?: number;
    aditamentos?: string;
}

export const salidasApi = {
    // Obtener todas las salidas
    getAll: async (estado?: string) => {
        const params = estado ? { estado } : {};
        try {
            const response = await api.get<any>(API_URL, { params });
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

    // Obtener una salida por ID con detalles y accesorios
    getById: async (id: string) => {
        const response = await api.get<Salida>(`${API_URL}/${id}`);
        return response.data;
    },

    // Obtener equipos disponibles (estado = Ingresado)
    getAvailableEquipos: async () => {
        const response = await api.get<any[]>(`${API_URL}/available-equipos`);
        return response.data;
    },

    // Obtener accesorios disponibles (estado_acc = Ingresado)
    getAvailableAccesorios: async () => {
        const response = await api.get<any[]>(`${API_URL}/available-accesorios`);
        return response.data;
    },

    // Escanear QR - buscar por serial
    scanSerial: async (serial: string) => {
        const response = await api.get<any>(`${API_URL}/scan/${serial}`);
        return response.data;
    },

    // Obtener siguiente folio
    getNextFolio: async () => {
        const response = await api.get<{ folio: string }>(`${API_URL}/next-folio/generate`);
        return response.data;
    },

    // Crear una nueva salida
    create: async (data: CreateSalidaDto) => {
        const response = await api.post<Salida>(API_URL, data);
        return response.data;
    },

    // Agregar equipo a la salida
    addDetalle: async (id_salida: string, data: CreateDetalleDto) => {
        const response = await api.post(`${API_URL}/${id_salida}/detalles`, data);
        return response.data;
    },

    // Agregar accesorio a la salida
    addAccesorio: async (id_salida: string, data: CreateAccesorioDto) => {
        const response = await api.post(`${API_URL}/${id_salida}/accesorios`, data);
        return response.data;
    },

    // Actualizar remisión y cambiar estado
    updateRemision: async (id: string, remision: string) => {
        const response = await api.patch(`${API_URL}/${id}/remision`, { remision });
        return response.data;
    },

    // Cerrar folio
    cerrarFolio: async (id: string) => {
        const response = await api.patch(`${API_URL}/${id}/cerrar`);
        return response.data;
    },

    // Actualizar una salida (patch)
    update: async (id: string, data: UpdateSalidaDto) => {
        const response = await api.patch<Salida>(`${API_URL}/${id}`, data);
        return response.data;
    },

    // Eliminar una salida
    delete: async (id: string) => {
        const response = await api.delete(`${API_URL}/${id}`);
        return response.data;
    },

    // Obtener detalles de una salida (legacy support if needed)
    getDetalles: async (id: string) => {
        const response = await api.get(`${API_URL}/${id}/detalles`);
        return response.data;
    },
};
