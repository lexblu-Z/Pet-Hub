import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole, TutorProfile, EstablishmentProfile, ProfessionalProfile, AdminProfile } from '@/types';
import { api } from '@/services/api';

type CurrentUser = TutorProfile | EstablishmentProfile | ProfessionalProfile | AdminProfile;

interface AuthStore {
  currentUser: CurrentUser | null;
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string, user: CurrentUser, role: UserRole) => void;
  logout: () => void;
  setUser: (user: CurrentUser) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentRole: null,
      isAuthenticated: false,
      token: null,

      login: (token: string, user: CurrentUser, role: UserRole) => {
        set({
          token,
          currentUser: user,
          currentRole: role,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          token: null,
          currentUser: null,
          currentRole: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: CurrentUser) => {
        set({ currentUser: user });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await api.get('/auth/me');
          set({ currentUser: response.data, isAuthenticated: true });
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: 'pethub-auth',
      partialize: (state) => ({
        token: state.token,
        currentRole: state.currentRole,
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
      }),
    }
  )
);
