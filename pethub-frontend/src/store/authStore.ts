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
  isAuthReady: boolean;
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
      isAuthReady: false,

      login: (token: string, user: CurrentUser, role: UserRole) => {
        set({
          token,
          currentUser: user,
          currentRole: role,
          isAuthenticated: true,
          isAuthReady: true,
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
          isAuthReady: true,
        });
        try {
          localStorage.removeItem('pethub-auth');
        } catch {
          // ignore
        }
      },

      setUser: (user: CurrentUser) => {
        set({ currentUser: user });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          // Nenhum token armazenado: estado limpo garantido
          set({
            token: null,
            currentUser: null,
            currentRole: null,
            isAuthenticated: false,
            isAuthReady: true,
          });
          return;
        }

        try {
          const response = await api.get('/auth/me');
          const roleMap: Record<string, UserRole> = {
            TUTOR: 'tutor',
            ESTABLISHMENT: 'estabelecimento',
            PROFESSIONAL: 'profissional',
            ADMIN: 'admin',
          };
          const rawRole = response.data?.role;
          const mappedRole = (rawRole ? roleMap[rawRole] || rawRole.toLowerCase() : null) as UserRole | null;

          if (!mappedRole) {
            throw new Error('Função de usuário não reconhecida.');
          }

          set({
            currentUser: { ...get().currentUser, ...response.data },
            currentRole: mappedRole,
            isAuthenticated: true,
            isAuthReady: true,
          });
          if (response.data?.preferences?.theme) {
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
        currentUser: state.currentUser,
        // Nunca persistir isAuthenticated como true sem token e role válidos
        isAuthenticated: Boolean(state.token && state.currentRole),
      }),
      onRehydrateStorage: () => (state) => {
        // Se após reidratação não houver token ou role, garantir logout imediato
        if (!state?.token || !state?.currentRole) {
          state?.logout();
        }
      },
    }
  )
);

