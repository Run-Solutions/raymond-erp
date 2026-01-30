import axios from 'axios';
import { useAuthTallerStore } from '@/store/auth-taller.store';

const tallerApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

tallerApi.interceptors.request.use(config => {
    const { token } = useAuthTallerStore.getState();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default tallerApi;
