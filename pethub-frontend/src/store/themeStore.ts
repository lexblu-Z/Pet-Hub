import { create } from 'zustand';
import { api } from '@/services/api';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme, skipBackendSync?: boolean) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const THEME_KEY = '@PetHub:theme';

function calculateIsDark(theme: Theme): boolean {
  if (typeof window === 'undefined') return false;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return false;
}

function applyThemeToDocument(theme: Theme): boolean {
  if (typeof window === 'undefined') return false;
  const root = document.documentElement;
  const isDark = calculateIsDark(theme);
  
  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
  return isDark;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  isDark: false,
  setTheme: (theme: Theme, skipBackendSync = false) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors
    }
    const isDark = applyThemeToDocument(theme);
    set({ theme, isDark });

    // Asynchronously sync to backend account preferences if user is authenticated
    if (!skipBackendSync) {
      try {
        const token = localStorage.getItem('pethub-auth');
        if (token && token.includes('"token":')) {
          api.put('/users/me/preferences', { theme }).catch(() => {});
        }
      } catch {
        // ignore sync error
      }
    }
  },
  toggleTheme: () => {
    const current = get().theme;
    const isCurrentlyDark = calculateIsDark(current);
    const next: Theme = isCurrentlyDark ? 'light' : 'dark';
    get().setTheme(next);
  },
  initTheme: () => {
    let saved: Theme = 'light';
    try {
      const stored = localStorage.getItem(THEME_KEY);
      saved = stored === 'dark' ? 'dark' : 'light';
    } catch {
      saved = 'light';
    }
    const isDark = applyThemeToDocument(saved);
    set({ theme: saved, isDark });
  },
}));
