
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LOCAL_STORAGE_THEME_KEY = 'adagio-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as Theme | null;
    // Respect system preference if no theme is stored
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    setThemeState(initialTheme);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  }, [theme, isMounted]);

  const toggleTheme = useCallback(() => {
    if (!isMounted) return;
    setThemeState((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, [isMounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (!isMounted) return;
    setThemeState(newTheme);
  }, [isMounted]);

  // To prevent flash of unstyled content or incorrect theme before hydration,
  // we can conditionally render children or apply a class based on initial detection.
  // However, `suppressHydrationWarning` on <html> in layout.tsx helps manage this.
  // The initial `useEffect` will set the correct theme quickly after mount.

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
