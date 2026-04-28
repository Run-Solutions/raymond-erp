import tallerApi from '@/lib/api-taller';

const API_URL = '/taller-r1/renovados';

export interface RenovadoSolicitud {
    id_solicitud: string;
    serial_equipo: string;
    fecha_produccion: Date;
    fecha_target: Date;
    cliente?: string;
    adc?: string;
    meses_fuera?: string;
    estado: string;
    tecnico_responsable?: string;
    created_at: Date;
    updated_at: Date;
    fases?: RenovadoFase[];
    refacciones?: RenovadoRefaccion[];
    incidencias?: RenovadoIncidencia[];
    _count?: {
        incidencias: number;
    };
}

export interface RenovadoFase {
    id_fase: string;
    id_solicitud: string;
    nombre_fase: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    horas_registradas: number;
    tecnico?: string;
    completado: boolean;
    orden: number;
    comentarios?: string;
    fotos?: string[];
}

export interface RenovadoRefaccion {
    id_refaccion: string;
    id_solicitud: string;
    area?: string;
    descripcion?: string;
    cantidad: number;
    status: string;
}

export interface RenovadoIncidencia {
    id_incidencia: string;
    id_solicitud: string;
    tipo: string;
    fecha_inicio: Date;
    fecha_fin?: Date;
    horas_laborales: number;
    comentarios?: string;
}

export interface CreateRenovadoDto {
    serial_equipo: string;
    fecha_target: Date | string;
    cliente?: string;
    adc?: string;
    meses_fuera: string;
    tecnico_responsable?: string;
    id_estacion?: string;
    comentarios?: string;
}

export interface TechnicianLog {
    id: string;
    id_solicitud: string;
    tecnico_anterior?: string;
    tecnico_nuevo: string;
    motivo?: string;
    usuario_que_cambia: string;
    fecha: Date;
}

const renovadosService = {
    findAll: async () => {
        const response = await tallerApi.get<any>(API_URL);
        return response.data?.data || response.data || [];
    },

    findOne: async (id: string) => {
        const response = await tallerApi.get<any>(`${API_URL}/${id}`);
        return response.data?.data || response.data;
    },

    create: async (dto: CreateRenovadoDto) => {
        const response = await tallerApi.post<any>(API_URL, dto);
        return response.data?.data || response.data;
    },

    getPending: async (): Promise<any[]> => {
        const response = await tallerApi.get<any>(`${API_URL}/pending`);
        return response.data?.data || response.data;
    },

    getEstaciones: async (): Promise<any[]> => {
        const response = await tallerApi.get<any>(`${API_URL}/estaciones`);
        return response.data?.data || response.data;
    },

    startFase: async (id: string, tecnico: string) => {
        const response = await tallerApi.put<any>(`${API_URL}/fase/${id}/start`, { tecnico });
        return response.data?.data || response.data;
    },

    completeFase: async (id: string, nextPhaseName?: string) => {
        const response = await tallerApi.put<any>(`${API_URL}/fase/${id}/complete`, { nextPhaseName });
        return response.data?.data || response.data;
    },

    updateFaseEvidence: async (id: string, dto: { comentarios?: string, fotos?: string[] }) => {
        const response = await tallerApi.put<any>(`${API_URL}/fase/${id}/evidence`, dto);
        return response.data?.data || response.data;
    },

    changeTechnician: async (idSolicitud: string, dto: { tecnicoNuevo: string, motivo: string, usuarioQueCambia: string }) => {
        const response = await tallerApi.put<any>(`${API_URL}/${idSolicitud}/technician`, dto);
        return response.data?.data || response.data;
    },

    changeStation: async (id: string, dto: { estacionId: string, motivo: string, usuarioQueCambia: string }) => {
        const response = await tallerApi.put<any>(`${API_URL}/${id}/station`, dto);
        return response.data?.data || response.data;
    },

    getTechnicianLogs: async (idSolicitud: string): Promise<TechnicianLog[]> => {
        const response = await tallerApi.get<any>(`${API_URL}/${idSolicitud}/technician-logs`);
        return response.data?.data || response.data || [];
    },

    addRefaccion: async (idSolicitud: string, dto: any) => {
        const response = await tallerApi.post<any>(`${API_URL}/${idSolicitud}/refacciones`, dto);
        return response.data?.data || response.data;
    },

    createIncidencia: async (idSolicitud: string, dto: any) => {
        const response = await tallerApi.post<any>(`${API_URL}/${idSolicitud}/incidencias`, dto);
        return response.data?.data || response.data;
    },

    closeIncidencia: async (id: string) => {
        const response = await tallerApi.put<any>(`${API_URL}/incidencia/${id}/close`);
        return response.data?.data || response.data;
    },

    finalize: async (id: string) => {
        const response = await tallerApi.put<any>(`${API_URL}/${id}/finalize`);
        return response.data?.data || response.data;
    },

    startOrder: async (id: string) => {
        const response = await tallerApi.put<any>(`${API_URL}/${id}/start-order`);
        return response.data?.data || response.data;
    }
};

export default renovadosService;
