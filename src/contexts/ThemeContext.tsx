import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'normal' | 'dark' | 'light';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  accentColor: string;
  gradient: string;
  previewBg: string;
  badgeBg: string;
}

export const THEME_OPTIONS: ThemeConfig[] = [
  {
    id: 'normal',
    name: 'Normal (Cyber Midnight & Cyan)',
    description: 'Immersive dark canvas with electric cyan and sapphire blue accents.',
    isDark: true,
    accentColor: '#06b6d4',
    gradient: 'from-cyan-400 via-teal-400 to-indigo-500',
    previewBg: '#060b1c',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'dark',
    name: 'Dark Theme (Pure Black & Blue)',
    description: 'Pure obsidian black background with electric blue neon highlights.',
    isDark: true,
    accentColor: '#3b82f6',
    gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    previewBg: '#000000',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    id: 'light',
    name: 'Light Theme (Pure White & Blue)',
    description: 'Pristine pure white background with clean blue surfaces and indigo borders.',
    isDark: false,
    accentColor: '#2563eb',
    gradient: 'from-blue-600 to-indigo-600',
    previewBg: '#ffffff',
    badgeBg: 'bg-blue-500/10 text-blue-700 border-blue-200',
  },
];

interface ThemeContextType {
  currentTheme: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  isDark: boolean;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('nexora-theme');
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      return saved as ThemeId;
    }
    if (localStorage.getItem('theme') === 'light') {
      return 'light';
    }
    return 'normal';
  });

  const activeConfig = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  const setTheme = (themeId: ThemeId) => {
    setCurrentThemeState(themeId);
    localStorage.setItem('nexora-theme', themeId);
    localStorage.setItem('theme', themeId === 'light' ? 'light' : 'dark');
    applyThemeClass(themeId);
  };

  const applyThemeClass = (themeId: ThemeId) => {
    const root = document.documentElement;
    THEME_OPTIONS.forEach((t) => {
      root.classList.remove(`theme-${t.id}`);
    });
    root.classList.remove('light-mode');
    root.classList.remove('dark');
    root.classList.remove('light');

    root.classList.add(`theme-${themeId}`);
    root.setAttribute('data-theme', themeId);

    if (themeId === 'light') {
      root.classList.add('light');
    } else {
      root.classList.add('dark');
    }
  };

  useEffect(() => {
    applyThemeClass(currentTheme);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        isDark: activeConfig.isDark,
        themeConfig: activeConfig,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
