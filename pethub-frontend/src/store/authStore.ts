import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole, TutorProfile, EstablishmentProfile, ProfessionalProfile, AdminProfile } from '@/types';
import { tutors, establishments, professionals, admins } from '@/data/users';

type CurrentUser = TutorProfile | EstablishmentProfile | ProfessionalProfile | AdminProfile;

interface AuthStore {
  currentUser: CurrentUser | null;
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  setUser: (user: CurrentUser) => void;
}

const getRoleDefaultUser = (role: UserRole): CurrentUser => {
  switch (role) {
    case 'tutor':
      return tutors[0];
    case 'estabelecimento':
      return establishments[0];
    case 'profissional':
      return professionals[0];
    case 'admin':
      return admins[0];
  }
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      currentUser: tutors[0], // Default: logged in as tutor for demo
      currentRole: 'tutor',
      isAuthenticated: true,

      login: (role: UserRole) => {
        const user = getRoleDefaultUser(role);
        set({
          currentUser: user,
          currentRole: role,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          currentUser: null,
          currentRole: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: CurrentUser) => {
        set({ currentUser: user });
      },
    }),
    {
      name: 'pethub-auth',
      partialize: (state) => ({
        currentRole: state.currentRole,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
