import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { THEMES, type ThemeId } from '@classbook/shared';
import { settingsApi } from './api';
import { useAuth } from './auth';
import { updateThemePreference } from './theme-api';

const STORAGE_KEY = 'classbook:theme';
const FALLBACK_THEME: ThemeId = 'warm';
const THEME_IDS = new Set<string>(THEMES.map((theme) => theme.id));

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value);
}

function readStoredTheme(): ThemeId | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isThemeId(value) ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const meta = THEMES.find((item) => item.id === theme);
  if (meta) root.style.colorScheme = meta.mode;
}

interface ThemeContextValue {
  theme: ThemeId;
  preference: ThemeId | null;
  defaultTheme: ThemeId;
  setTheme: (theme: ThemeId | null) => void;
  themes: typeof THEMES;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preference, setPreference] = useState<ThemeId | null>(() => readStoredTheme());
  const [defaultTheme, setDefaultTheme] = useState<ThemeId>(FALLBACK_THEME);

  useEffect(() => {
    let active = true;
    settingsApi
      .getPublic()
      .then((settings) => {
        if (active && settings.defaultTheme && isThemeId(settings.defaultTheme)) {
          setDefaultTheme(settings.defaultTheme);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user && isThemeId(user.theme)) {
      setPreference(user.theme);
    }
  }, [user]);

  const theme = preference ?? defaultTheme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: ThemeId | null) => {
      setPreference(next);
      try {
        if (next) localStorage.setItem(STORAGE_KEY, next);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        // 隐私模式下 localStorage 可能不可用
      }
      if (user) {
        void updateThemePreference(next).catch(() => {});
      }
    },
    [user],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference, defaultTheme, setTheme, themes: THEMES }),
    [theme, preference, defaultTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用');
  }
  return context;
}
