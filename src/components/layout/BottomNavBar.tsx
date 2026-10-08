import React from 'react';
import {
  FolderGit2,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  User,
} from 'lucide-react';
import { ActiveTab } from './Shell.js';
import { useTheme } from '../../contexts/ThemeContext.js';

interface BottomNavBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  unreadMessagesCount?: number;
  activeProjectsCount?: number;
  onOpenProfile?: () => void;
  user?: {
    name?: string;
    avatarUrl?: string;
    role?: string;
  } | null;
}

export function BottomNavBar({
  activeTab,
  onSelectTab,
  unreadMessagesCount = 0,
  activeProjectsCount = 0,
  onOpenProfile,
  user,
}: BottomNavBarProps) {
  const { themeConfig } = useTheme();

  const tabs: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    hoverAnimClass: string;
  }> = [
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderGit2,
      badge: activeProjectsCount > 0 ? activeProjectsCount : undefined,
      hoverAnimClass: 'group-hover:scale-125 group-hover:-translate-y-1 group-hover:rotate-6',
    },
    {
      id: 'teams',
      label: 'Teams',
      icon: Users,
      hoverAnimClass: 'group-hover:scale-125 group-hover:-translate-y-1 group-hover:-rotate-6',
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      hoverAnimClass: 'group-hover:scale-125 group-hover:-translate-y-1 group-hover:animate-icon-wiggle',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      hoverAnimClass: 'group-hover:scale-125 group-hover:-translate-y-1.5 group-hover:text-emerald-400',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      hoverAnimClass: 'group-hover:scale-125 group-hover:-translate-y-0.5 group-hover:rotate-90',
    },
  ];

  return (
    <nav
      id="bottom-app-bar"
      aria-label="App Bottom Navigation"
      className="fixed bottom-0 sm:bottom-4 left-0 sm:left-1/2 sm:-translate-x-1/2 right-0 sm:right-auto z-40 w-full sm:w-auto sm:min-w-[500px] backdrop-blur-3xl border-t sm:border px-2.5 sm:px-6 pt-2.5 sm:py-2.5 sm:rounded-3xl transition-all duration-300"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)',
        background: 'var(--surface-header)',
        borderColor: 'var(--border-color)',
        boxShadow: `0 20px 50px -10px rgba(0,0,0,0.95), 0 0 35px -5px ${themeConfig.accentColor}40`,
      }}
    >
      {/* Top subtle border neon reflection */}
      <div
        className="absolute top-0 inset-x-6 h-px pointer-events-none opacity-90 transition-all duration-300"
        style={{
          background: `linear-gradient(to right, transparent, ${themeConfig.accentColor}, transparent)`,
          boxShadow: `0 0 8px ${themeConfig.accentColor}`,
        }}
      />

      <div className="flex items-center justify-around gap-1 sm:gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`bottom-nav-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 px-2 sm:px-3.5 rounded-2xl transition-all duration-300 ease-out group cursor-pointer select-none overflow-hidden ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:-translate-y-1 active:scale-90 active:translate-y-0.5'
              }`}
              style={
                isActive
                  ? {
                      background: `linear-gradient(to bottom, ${themeConfig.accentColor}30, transparent)`,
                      boxShadow: `inset 0 1px 1px ${themeConfig.accentColor}60`,
                    }
                  : undefined
              }
            >
              {/* Subtle hover background glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, ${themeConfig.accentColor}15, transparent)`,
                }}
              />

              {/* Active neon indicator beam at top */}
              {isActive && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                  <span
                    className="w-10 h-1 rounded-full animate-in fade-in zoom-in-90 duration-300"
                    style={{
                      background: `linear-gradient(to right, transparent, ${themeConfig.accentColor}, transparent)`,
                      boxShadow: `0 0 14px ${themeConfig.accentColor}`,
                    }}
                  />
                  <span
                    className="w-5 h-2 blur-sm rounded-full -mt-0.5"
                    style={{ backgroundColor: `${themeConfig.accentColor}60` }}
                  />
                </div>
              )}

              {/* Icon Container with Badge & Custom Dynamic Motion */}
              <div className="relative p-1">
                <Icon
                  className={`w-5 h-5 transition-all duration-300 cubic-bezier(0.16,1,0.3,1) ${
                    isActive
                      ? 'scale-120 stroke-[2.4] animate-float-slow'
                      : `text-slate-400 group-hover:scale-125 ${tab.hoverAnimClass}`
                  }`}
                  style={
                    isActive
                      ? {
                          color: themeConfig.accentColor,
                          filter: `drop-shadow(0 0 12px ${themeConfig.accentColor})`,
                        }
                      : undefined
                  }
                />

                {tab.badge && (
                  <div className="absolute -top-1 -right-2 flex items-center justify-center">
                    <span
                      className="absolute w-4 h-4 rounded-full opacity-75 animate-ping"
                      style={{ backgroundColor: themeConfig.accentColor }}
                    />
                    <span
                      className={`relative min-w-[17px] h-4 px-1 rounded-full bg-gradient-to-r ${themeConfig.gradient} text-white font-mono text-[9px] font-black flex items-center justify-center border shadow-md`}
                      style={{
                        borderColor: 'var(--canvas-bg)',
                        boxShadow: `0 0 10px ${themeConfig.accentColor}`,
                      }}
                    >
                      {tab.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Label with micro-typography and active glow */}
              <span
                className={`text-[10px] tracking-tight font-medium mt-0.5 transition-all duration-200 select-none ${
                  isActive
                    ? 'font-bold scale-105'
                    : 'text-slate-400 group-hover:text-white group-hover:font-semibold group-hover:scale-105'
                }`}
                style={
                  isActive
                    ? {
                        color: themeConfig.accentColor,
                        textShadow: `0 0 8px ${themeConfig.accentColor}80`,
                      }
                    : undefined
                }
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* User Profile Navigation Button with enhanced animation */}
        {onOpenProfile && (
          <button
            id="bottom-nav-profile"
            onClick={onOpenProfile}
            className="relative flex-1 flex flex-col items-center justify-center py-2 px-2 sm:px-3 rounded-2xl transition-all duration-300 ease-out group text-slate-400 hover:text-white hover:-translate-y-1 active:scale-90 active:translate-y-0.5 cursor-pointer overflow-hidden"
            title="My Profile"
          >
            {/* Subtle hover background glow */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `linear-gradient(to top, ${themeConfig.accentColor}15, transparent)`,
              }}
            />

            <div className="relative p-0.5">
              <div
                className={`w-6 h-6 rounded-xl bg-gradient-to-tr ${themeConfig.gradient} flex items-center justify-center text-[10px] font-black text-white overflow-hidden group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 border shadow-md`}
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  boxShadow: `0 0 12px ${themeConfig.accentColor}70`,
                }}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.[0]?.toUpperCase() || <User className="w-3.5 h-3.5" />
                )}
              </div>
            </div>
            <span
              className="text-[10px] tracking-tight font-medium mt-0.5 group-hover:text-white group-hover:font-semibold group-hover:scale-105 transition-all select-none"
            >
              Profile
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
