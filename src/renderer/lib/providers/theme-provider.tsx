import { createContext, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Theme } from '@shared/app-settings';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { useLocalStorage } from '@renderer/lib/hooks/useLocalStorage';
import { applyThemeToAll } from '@renderer/lib/pty/pty';

type EffectiveTheme = 'emlight' | 'emdark';

type DocumentWithViewTransitions = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'emlight';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'emdark' : 'emlight';
}

function applyTheme(effective: EffectiveTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('emlight', 'emdark');
  root.classList.add(effective);
}

function applyThemeAnimated(effective: EffectiveTheme) {
  if (typeof document === 'undefined') return;
  const doc = document as DocumentWithViewTransitions;
  const swap = () => {
    applyTheme(effective);
    // Update xterm theme inside the transition callback so the "after"
    // snapshot includes the new terminal colors instead of snapping a
    // frame later.
    applyThemeToAll();
  };
  if (typeof doc.startViewTransition !== 'function') {
    swap();
    return;
  }
  doc.startViewTransition(swap);
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  effectiveTheme: EffectiveTheme;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { value: themeValue, isLoading, update } = useAppSettingsKey('theme');
  const [, setCachedTheme] = useLocalStorage<Theme>('emdash-theme', null);
  const hasMountedRef = useRef(false);

  const theme: Theme = themeValue ?? null;
  const effectiveTheme: EffectiveTheme = theme ?? getSystemTheme();

  useLayoutEffect(() => {
    if (isLoading) return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      applyTheme(effectiveTheme);
      return;
    }
    applyThemeAnimated(effectiveTheme);
  }, [effectiveTheme, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    setCachedTheme(theme);
  }, [theme, isLoading, setCachedTheme]);

  // Subscribe to system color scheme changes when no explicit preference is set.
  useEffect(() => {
    if (theme !== null) return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (isLoading) return;
      const newEffective = mq.matches ? 'emdark' : 'emlight';
      applyThemeAnimated(newEffective);
      applyThemeToAll();
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, isLoading]);

  // Re-apply xterm theme after CSS classes have been updated by the effect above.
  useEffect(() => {
    applyThemeToAll();
  }, [effectiveTheme]);

  const setTheme = (newTheme: Theme) => {
    update(newTheme);
  };

  const toggleTheme = () => {
    const next = effectiveTheme === 'emlight' ? 'emdark' : 'emlight';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
