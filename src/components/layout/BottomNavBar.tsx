import React from 'react';
import {
  FolderGit2,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
} from 'lucide-react';
import { ActiveTab } from './Shell.js';
import { useTheme } from '../../contexts/ThemeContext.js';

interface BottomNavBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  unreadMessagesCount?: number;
  activeProjectsCount?: number;
}

export function BottomNavBar({
  activeTab,
  onSelectTab,
  unreadMessagesCount = 0,
  activeProjectsCount = 0,
}: BottomNavBarProps) {
  const { themeConfig } = useTheme();

  const tabs: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
  }> = [
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderGit2,
      badge: activeProjectsCount > 0 ? activeProjectsCount : undefined,
    },
    {
      id: 'teams',
      label: 'Teams',
      icon: Users,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav
      id="bottom-app-bar"
      aria-label="App Bottom Navigation"
      className="fixed bottom-0 sm:bottom-4 left-0 sm:left-1/2 sm:-translate-x-1/2 right-0 sm:right-auto z-40 w-full sm:w-auto sm:min-w-[420px] bg-[var(--surface-panel)] backdrop-blur-2xl border-t sm:border border-[var(--border-color)] px-2 sm:px-4 py-1.5 sm:py-2 sm:rounded-2xl shadow-2xl shadow-black/90 transition-all"
    >
      <div className="flex items-center justify-around gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`bottom-nav-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'text-blue-200 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#14172f]/60'
              }`}
            >
              {/* Active pill indicator at top */}
              {isActive && (
                <span
                  className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r ${themeConfig.gradient} rounded-full shadow-sm`}
                />
              )}

              {/* Icon Container with Badge */}
              <div className="relative p-1">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive
                      ? 'scale-110 text-blue-400 stroke-[2.25]'
                      : 'group-hover:scale-105'
                  }`}
                />

                {tab.badge && (
                  <span
                    className={`absolute -top-0.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r ${themeConfig.gradient} text-white font-mono text-[9px] font-bold flex items-center justify-center border border-[#0c0e1c] shadow-sm`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] tracking-tight font-medium mt-0.5 transition-colors ${
                  isActive ? 'font-semibold text-blue-200' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
