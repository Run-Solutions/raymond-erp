import api from '@/lib/api';

export const dashboardApi = {
    getStats: async (site: string) => {
        try {
            const response = await api.get(`/${site}/dashboard/stats`, {
                headers: { 'x-site-id': site }
            });
            return response.data?.data || response.data || null;
        } catch (error) {
            console.error('[dashboardApi] Error fetching stats:', error);
            throw error;
        }
    }
};
