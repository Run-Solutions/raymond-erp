import tallerApi from '@/lib/api-taller';

export const authTallerService = {
    login: async (credentials: { username: string; password: string }) => {
        const response = await tallerApi.post('/taller-r1/auth/login', credentials);
        return response.data;
    },
    register: async (data: { email: string; username: string; password: string; sitio?: string }) => {
        const response = await tallerApi.post('/taller-r1/auth/register', data);
        return response.data;
    },
};
