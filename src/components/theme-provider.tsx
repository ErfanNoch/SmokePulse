import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

type Theme = 'dark' | 'light' | 'system';

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
  themes: string[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
  themes: ['light', 'dark', 'system'],
});

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark',
  storageKey = 'theme',
  attribute = 'class',
  enableSystem = false,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        return stored;
      }
    } catch {
      // Storage fallback
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    if (theme === 'system') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return theme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;

    let targetTheme: 'dark' | 'light' = 'dark';
    if (theme === 'system') {
      targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      targetTheme = theme === 'light' ? 'light' : 'dark';
    }

    setResolvedTheme(targetTheme);

    if (attribute === 'class') {
      if (targetTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    } else {
      root.setAttribute(attribute, targetTheme);
    }
  }, [theme, attribute]);

  useEffect(() => {
    if (!enableSystem) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(newTheme);
        const root = document.documentElement;
        if (newTheme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.remove('dark');
          root.classList.add('light');
        }
      }
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme, enableSystem]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch {
      // Storage fallback
    }
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      themes: ['light', 'dark', 'system'],
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
