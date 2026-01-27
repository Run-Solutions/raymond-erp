import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
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
                    
                    // FALLBACK: If store doesn't have orgId yet, try to get it from JWT token
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

// Response Interceptor (Refresh Token)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loop
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    // Use a separate axios instance to avoid interceptor loop
                    const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });

                    // Handle both response formats (wrapped or direct)
                    const newAccessToken = data?.accessToken || data?.data?.accessToken;
                    const newRefreshToken = data?.refreshToken || data?.data?.refreshToken;
                    
                    if (!newAccessToken) {
                        // Silent failure - session expired (don't throw Error, use object to avoid stack trace)
                        throw { silent: true, type: 'SESSION_EXPIRED', message: 'Session expired' };
                    }

                    localStorage.setItem('accessToken', newAccessToken);
                    if (newRefreshToken) {
                        localStorage.setItem('refreshToken', newRefreshToken);
                    }

                    api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

                    return api(originalRequest);
                }
            } catch (refreshError: any) {
                // Check if this is a silent session expiration
                const isSessionExpired = refreshError?.silent || refreshError?.type === 'SESSION_EXPIRED';
                
                // Silently handle refresh failure - session expired
                // Clean up local storage
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('orgId');
                localStorage.removeItem('user');
                
                // Store a flag to show a friendly message on login page
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('sessionExpired', 'true');
                    
                    // Redirect to login smoothly (after a small delay to allow cleanup)
                    setTimeout(() => {
                        const currentPath = window.location.pathname;
                        const locale = currentPath.split('/').filter(Boolean)[0] || 'es';
                        window.location.replace(`/${locale}/login`);
                    }, 100);
                }
                
                // Return a silent rejection to prevent error from bubbling up
                // This prevents the error from showing in console
                return Promise.reject({
                    silent: true,
                    isSessionExpired: true,
                    suppressError: true,
                    message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                });
            }
            
            // If no refresh token available, redirect to login
            if (!localStorage.getItem('refreshToken') && typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('orgId');
                localStorage.removeItem('user');
                sessionStorage.setItem('sessionExpired', 'true');
                
                setTimeout(() => {
                    const currentPath = window.location.pathname;
                    const locale = currentPath.split('/').filter(Boolean)[0] || 'es';
                    window.location.replace(`/${locale}/login`);
                }, 100);
                
                return Promise.reject({
                    silent: true,
                    isSessionExpired: true,
                    suppressError: true
                });
            }
        }
        
        // Filter out silent errors before they bubble up
        if (error?.silent || error?.isSessionExpired || error?.suppressError) {
            // Return silent error that won't show in console
            return Promise.reject({
                ...error,
                suppressError: true,
                // Override toString to return empty string (won't show in console)
                toString: () => '',
                message: error?.message || 'Session expired'
            });
        }
        
        return Promise.reject(error);
    }
);

// Global error handler to suppress silent errors in console
if (typeof window !== 'undefined') {
    // Override console.error to filter out silent errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
        // Check if any argument is a silent error
        const hasSilentError = args.some(arg => 
            (typeof arg === 'object' && arg !== null && (arg.silent || arg.isSessionExpired || arg.suppressError)) ||
            (typeof arg === 'string' && arg.includes('Refresh failed: No access token returned'))
        );
        
        // Don't log silent errors
        if (!hasSilentError) {
            originalConsoleError.apply(console, args);
        }
    };
    
    // Also catch unhandled promise rejections for silent errors
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        if (error?.silent || error?.isSessionExpired || error?.suppressError) {
            event.preventDefault();
            // Don't show in console
        }
    });
}

export default api;
