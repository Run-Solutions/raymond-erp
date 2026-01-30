import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TallerUser {
    id: string;
    username: string;
    email: string;
    role: string;
}

interface AuthTallerState {
    user: TallerUser | null;
    token: string | null;
    login: (user: TallerUser, token: string) => void;
    logout: () => void;
}

export const useAuthTallerStore = create<AuthTallerState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            login: (user, token) => set({ user, token }),
            logout: () => set({ user: null, token: null }),
        }),
        {
            name: 'auth-taller-storage',
        }
    )
);
