import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole, TutorProfile, EstablishmentProfile, ProfessionalProfile, AdminProfile } from '@/types';
import { api } from '@/services/api';
import { useThemeStore } from '@/store/themeStore';

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
        if ((user as any)?.preferences?.theme) {
          useThemeStore.getState().setTheme((user as any).preferences.theme, true);
        }
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
          const roleMap: Record<string, UserRole> = {
            TUTOR: 'tutor',
            ESTABLISHMENT: 'estabelecimento',
            PROFESSIONAL: 'profissional',
            ADMIN: 'admin',
          };
          const mappedRole = roleMap[response.data.role] || (response.data.role?.toLowerCase() as UserRole) || get().currentRole;
          set({
            currentUser: { ...get().currentUser, ...response.data },
            currentRole: mappedRole,
            isAuthenticated: true,
          });
          if (response.data.preferences?.theme) {
            useThemeStore.getState().setTheme(response.data.preferences.theme, true);
          }
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
