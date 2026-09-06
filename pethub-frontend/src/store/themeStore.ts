import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const THEME_KEY = '@PetHub:theme';

function applyThemeToDocument(theme: Theme) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  setTheme: (theme: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors
    }
    applyThemeToDocument(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const current = get().theme;
    const isCurrentlyDark =
      current === 'dark' ||
      (current === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next: Theme = isCurrentlyDark ? 'light' : 'dark';
    get().setTheme(next);
  },
  initTheme: () => {
    let saved: Theme = 'system';
    try {
      saved = (localStorage.getItem(THEME_KEY) as Theme) || 'system';
    } catch {
      saved = 'system';
    }
    applyThemeToDocument(saved);
    set({ theme: saved });

    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        if (get().theme === 'system') {
          applyThemeToDocument('system');
        }
      };
      mediaQuery.removeEventListener('change', handler);
      mediaQuery.addEventListener('change', handler);
    }
  },
}));
