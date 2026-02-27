import axios from 'axios';
import { useAuthTallerStore } from '@/store/auth-taller.store';

const tallerApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

tallerApi.interceptors.request.use(config => {
    const { token, selectedSite, user } = useAuthTallerStore.getState();

    console.log('[api-taller] Request to:', config.url);
    console.log('[api-taller] Store selectedSite:', selectedSite);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (selectedSite) {
        config.headers['x-site-id'] = selectedSite;
        console.log('[api-taller] Setting x-site-id header to:', selectedSite);
    } else {
        console.log('[api-taller] No selectedSite in store, header not set');
    }
    if (user?.username) {
        config.headers['x-taller-username'] = user.username;
    }
    return config;
});

export default tallerApi;
