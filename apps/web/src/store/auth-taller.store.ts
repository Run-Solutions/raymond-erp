import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TallerUser {
    id: string;
    username: string;
    email: string;
    role: string;
    sitio: string;
}

interface AuthTallerState {
    user: TallerUser | null;
    token: string | null;
    selectedSite: string | null;
    login: (user: TallerUser, token: string) => void;
    logout: () => void;
    setSelectedSite: (site: string) => void;
}

export const useAuthTallerStore = create<AuthTallerState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            selectedSite: null,
            login: (user, token) => set({ user, token }),
            logout: () => set({ user: null, token: null, selectedSite: null }),
            setSelectedSite: (selectedSite) => {
                console.log('[AuthTallerStore] Setting selectedSite to:', selectedSite);
                set({ selectedSite });
            },
        }),
        {
            name: 'auth-taller-storage',
        }
    )
);
