import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId =
  | 'neural-nexus'
  | 'cyber-violet'
  | 'electric-cyan'
  | 'emerald-matrix'
  | 'solar-amber'
  | 'crimson-ruby'
  | 'arctic-light';

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
    id: 'neural-nexus',
    name: 'Neural Nexus (AI Android)',
    description: 'Cinematic midnight canvas with deep sapphire royal blue & glowing magenta nebula tones.',
    isDark: true,
    accentColor: '#3b82f6',
    gradient: 'from-blue-600 via-indigo-600 to-fuchsia-600',
    previewBg: '#060919',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    id: 'cyber-violet',
    name: 'Cyber Violet',
    description: 'Deep obsidian canvas with luminous violet and indigo neon glows.',
    isDark: true,
    accentColor: '#a855f7',
    gradient: 'from-purple-600 to-indigo-600',
    previewBg: '#0b0c14',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  {
    id: 'electric-cyan',
    name: 'Electric Cyan',
    description: 'Deep ocean navy with vibrant cyan and electric teal accents.',
    isDark: true,
    accentColor: '#06b6d4',
    gradient: 'from-cyan-500 to-blue-600',
    previewBg: '#070f1e',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Onyx',
    description: 'Deep forest charcoal with vibrant jade and mint green highlights.',
    isDark: true,
    accentColor: '#10b981',
    gradient: 'from-emerald-500 to-teal-600',
    previewBg: '#08140f',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    description: 'Warm obsidian espresso with sunset amber and radiant bronze tones.',
    isDark: true,
    accentColor: '#f59e0b',
    gradient: 'from-amber-500 to-orange-600',
    previewBg: '#140e08',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    id: 'crimson-ruby',
    name: 'Crimson Velvet',
    description: 'Midnight garnet dark mode with radiant ruby and rose quartz accents.',
    isDark: true,
    accentColor: '#f43f5e',
    gradient: 'from-rose-500 to-pink-600',
    previewBg: '#14080c',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  {
    id: 'arctic-light',
    name: 'Arctic Titanium',
    description: 'Pristine high-contrast light theme with clean slate surfaces and crisp indigo borders.',
    isDark: false,
    accentColor: '#6366f1',
    gradient: 'from-indigo-600 to-blue-600',
    previewBg: '#f8fafc',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
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
    // Also check legacy 'theme' key if set to 'light'
    if (localStorage.getItem('theme') === 'light') {
      return 'arctic-light';
    }
    return 'neural-nexus'; // Default theme inspired by cinematic AI Android aesthetics
  });

  const activeConfig = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  const setTheme = (themeId: ThemeId) => {
    setCurrentThemeState(themeId);
    localStorage.setItem('nexora-theme', themeId);
    localStorage.setItem('theme', themeId === 'arctic-light' ? 'light' : 'dark');
    applyThemeClass(themeId);
  };

  const applyThemeClass = (themeId: ThemeId) => {
    const root = document.documentElement;
    // Remove old theme classes
    THEME_OPTIONS.forEach((t) => {
      root.classList.remove(`theme-${t.id}`);
    });
    root.classList.remove('light-mode');
    root.classList.remove('dark');

    // Add new theme class
    root.classList.add(`theme-${themeId}`);
    root.setAttribute('data-theme', themeId);

    if (themeId === 'arctic-light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
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
