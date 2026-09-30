import axios from 'axios';
import { reportarError } from './error-reporter';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api',
    headers: {
        'Content-Type': 'application/json',
    },
    // Sin esto una peticion puede quedarse colgada indefinidamente y la pantalla
    // muestra el spinner para siempre sin explicar nada. 30s es suficiente para
    // los reportes mas pesados (presupuestos, dashboard) y corta antes de que el
    // usuario piense que la aplicacion se congeló.
    timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 30000),
});

// Request Interceptor
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken');
            if (token && token !== 'undefined' && token !== 'null') {
                config.headers.Authorization = `Bearer ${token}`;

                // CRITICAL: Get orgId from store (primary source of truth)
                // Fallback to JWT token orgId ONLY if store doesn't have it yet (during initial load)
                // This prevents stale organization IDs from localStorage while ensuring requests work during initial load
                let orgId = null;
                try {
                    // PRIMARY source of truth: organization store
                    const orgStore = require('@/store/organization.store').useOrganizationStore.getState();
                    orgId = orgStore.currentOrganization?.id;

                    // FALLBACK 1: If store doesn't have orgId yet, try to get it from JWT token
                    // This only happens during initial page load, before organization is loaded into store
                    if (!orgId && token) {
                        try {
                            const tokenParts = token.split('.');
                            if (tokenParts.length === 3) {
                                const payload = JSON.parse(atob(tokenParts[1]));
                                if (payload.orgId && payload.orgId !== 'null' && payload.orgId !== 'undefined') {
                                    orgId = payload.orgId;
                                    console.log('[API] Using orgId from JWT token (fallback during initial load)');
                                }
                            }
                        } catch (e) {
                            // Ignore JWT parsing errors
                        }
                    }

                    // FALLBACK 2: If still no orgId, try user object in localStorage
                    if (!orgId) {
                        try {
                            const userStr = localStorage.getItem('user');
                            if (userStr && userStr !== 'null' && userStr !== 'undefined') {
                                const userObj = JSON.parse(userStr);
                                const userOrgId = userObj.organizationId || userObj.organization_id;
                                if (userOrgId && userOrgId !== 'null' && userOrgId !== 'undefined') {
                                    orgId = userOrgId;
                                    console.log('[API] Using orgId from user localStorage (ultimate fallback)');
                                }
                            }
                        } catch (e) {
                            // Ignore
                        }
                    }
                } catch (e) {
                    // If store not available, try JWT fallback
                    console.warn('[API] Could not access organization store, trying JWT fallback:', e);
                    try {
                        const tokenParts = token.split('.');
                        if (tokenParts.length === 3) {
                            const payload = JSON.parse(atob(tokenParts[1]));
                            if (payload.orgId && payload.orgId !== 'null' && payload.orgId !== 'undefined') {
                                orgId = payload.orgId;
                            }
                        }
                    } catch (parseError) {
                        // Ignore
                    }
                    // FALLBACK 2 (store exception): user localStorage
                    if (!orgId) {
                        try {
                            const userStr = localStorage.getItem('user');
                            if (userStr && userStr !== 'null' && userStr !== 'undefined') {
                                const userObj = JSON.parse(userStr);
                                const userOrgId = userObj.organizationId || userObj.organization_id;
                                if (userOrgId && userOrgId !== 'null' && userOrgId !== 'undefined') {
                                    orgId = userOrgId;
                                }
                            }
                        } catch (parseError) {
                            // Ignore
                        }
                    }
                }

                // Only add header if we have a valid orgId
                // For SuperAdmin without a selected org (orgId = null), no header is sent (allows global access)
                if (orgId && orgId !== 'undefined' && orgId !== 'null') {
                    config.headers['x-org-id'] = orgId;
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[API] Sending x-org-id header: ${orgId}`);
                    }
                } else {
                    if (process.env.NODE_ENV === 'development') {
                        console.log('[API] No x-org-id header sent (no orgId available or SuperAdmin mode)');
                    }
                }
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

const processPendingRequests = (token: string) => {
    pendingRequests.forEach((cb) => cb(token));
    pendingRequests = [];
};

// Response Interceptor — Auto Token Refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only handle 401 errors that haven't already been retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Skip refresh for auth endpoints to avoid infinite loops
            if (
                originalRequest.url?.includes('/auth/login') ||
                originalRequest.url?.includes('/auth/refresh') ||
                originalRequest.url?.includes('/auth/logout') ||
                originalRequest.url?.includes('/auth/setup-password')
            ) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Queue the request and resolve it when token is refreshed
                return new Promise((resolve) => {
                    pendingRequests.push((token: string) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const storedRefreshToken = typeof window !== 'undefined'
                    ? localStorage.getItem('refreshToken')
                    : null;

                if (!storedRefreshToken || storedRefreshToken === 'null' || storedRefreshToken === 'undefined') {
                    throw new Error('No refresh token available');
                }

                // Call refresh endpoint directly (without interceptor looping)
                const refreshResponse = await api.post<{ success: boolean; data: any }>(
                    '/auth/refresh',
                    { refreshToken: storedRefreshToken }
                );

                const resData = refreshResponse.data;
                const newAccessToken = resData?.data?.accessToken || (resData as any)?.accessToken;
                const newRefreshToken = resData?.data?.refreshToken || (resData as any)?.refreshToken;

                if (!newAccessToken) {
                    throw new Error('No access token returned');
                }

                // Store new tokens
                localStorage.setItem('accessToken', newAccessToken);
                if (newRefreshToken) {
                    localStorage.setItem('refreshToken', newRefreshToken);
                }

                // Update auth store in memory
                try {
                    const { useAuthStore } = require('@/store/auth.store');
                    useAuthStore.setState({
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken || storedRefreshToken,
                    });
                } catch (_) { /* store may not be available */ }

                // Resolve any queued requests
                processPendingRequests(newAccessToken);

                // Retry the original failed request
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed — session is expired, force logout
                pendingRequests = [];

                if (typeof window !== 'undefined') {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');

                    // Clear auth store
                    try {
                        const { useAuthStore } = require('@/store/auth.store');
                        useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
                    } catch (_) { /* ignore */ }

                    // Redirect to login
                    const currentPath = window.location.pathname;
                    if (!currentPath.includes('/login') && !currentPath.includes('/auth')) {
                        window.location.href = '/login';
                    }
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Cualquier fallo que llega hasta aqui se manda a la consola del backend.
// El toast NO se dispara aqui a proposito: lo pone quien lo pide (mostrarError),
// para no duplicar avisos cuando un mismo error lo reporta el interceptor y la
// consulta que lo origino. Aqui solo queda el registro.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.config?.url?.includes('/auth/refresh')) {
            return Promise.reject(error);
        }
        if (error?.config?.url?.includes('/logs/client-error')) {
            return Promise.reject(error);
        }
        reportarError(error, 'peticion');
        return Promise.reject(error);
    }
);

// Antes este bloque tapaba cualquier error marcado como `silent`, lo que hacia
// imposible depurar. Ahora solo se calla el caso de sesion expirada, que ya
// redirige a /login y es esperado; todo lo demas llega a consola y al backend.
if (typeof window !== 'undefined') {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
        const esSesionExpirada = args.some(arg =>
            (typeof arg === 'object' && arg !== null && arg.isSessionExpired) ||
            (typeof arg === 'string' && arg.includes('No access token returned'))
        );

        if (esSesionExpirada) return;
        originalConsoleError.apply(console, args);
    };
}

export default api;
