import React, { useState } from 'react';
import {
  Cpu,
  FolderGit2,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserCheck,
  Search,
  Sparkles,
  ExternalLink,
  Shield,
  Palette,
  Check,
} from 'lucide-react';
import { PRODUCT_NAME, PRODUCT_STYLIZED_NAME } from '../../../shared/const.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme, THEME_OPTIONS } from '../../contexts/ThemeContext.js';
import { RoleBadge } from '../common/Badges.js';
import { NotificationDrawer } from '../notifications/NotificationDrawer.js';
import { AuthModal } from '../auth/AuthModal.js';
import { MemberProfileModal } from '../profile/MemberProfileModal.js';
import { OnboardingModal } from '../onboarding/OnboardingModal.js';
import { GeminiChatbot } from '../chat/GeminiChatbot.js';
import { Bot } from 'lucide-react';
import { BottomNavBar } from './BottomNavBar.js';

export type ActiveTab = 'projects' | 'teams' | 'messages' | 'analytics' | 'settings';

interface ShellProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  children: React.ReactNode;
  selectedProjectId?: string | null;
  onSelectProject?: (id: string | null) => void;
  onSendMessage?: (userId: string, userName?: string) => void;
}

export function Shell({
  activeTab,
  onSelectTab,
  children,
  selectedProjectId,
  onSelectProject,
  onSendMessage,
}: ShellProps) {
  const { user, workspace, role, unreadCount, availableUsers, switchRole, logout } = useAuth();
  const { currentTheme, setTheme, themeConfig } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [myProfileOpen, setMyProfileOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'teams', label: 'Teams & Members', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics & Scoring', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Audit', icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] bg-[var(--canvas-bg)] text-slate-100 flex flex-col nebula-glow transition-colors duration-300">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 h-16 border-b border-[var(--border-color)] bg-[var(--surface-header)] backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 transition-colors">
        {/* Left branding & Workspace status */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#181b30] transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              if (onSelectProject) onSelectProject(null);
              onSelectTab('projects');
            }}
            className="flex items-center gap-2.5 text-left group shrink-0"
          >
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${themeConfig.gradient} p-0.5 shadow-md shadow-blue-900/30 shrink-0`}>
              <div className="w-full h-full bg-[#0d0f1c] rounded-[10px] flex items-center justify-center">
                <Cpu className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div className="shrink-0">
              <span className="font-sharp font-bold text-base sm:text-lg text-white tracking-tight group-hover:text-blue-300 transition-colors">
                {PRODUCT_NAME}
              </span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50 animate-pulse" />
            <span className="text-xs font-medium text-slate-300 truncate max-w-[140px]">
              {workspace?.name || 'Workspace'}
            </span>
          </div>
        </div>

        {/* Right Controls: Theme Chooser + Role Switcher + Notifications + Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Theme Switcher Dropdown */}
          <div className="relative">
            <button
              id="theme-switcher-btn"
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 h-9 rounded-xl bg-[#121426] border border-[#222646] hover:border-cyan-500/50 hover:bg-[#181b34] text-xs text-slate-200 transition-all shadow-sm"
              title="Change Workspace Theme & Accent Color"
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm shrink-0"
                style={{ backgroundColor: themeConfig.accentColor }}
              />
              <span className="hidden xl:inline text-slate-300 font-medium text-xs">
                {themeConfig.name}
              </span>
              <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {themeMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 glass-panel rounded-xl shadow-2xl border border-cyan-500/30 p-2.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1.5 border-b border-[#202444] mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                    Workspace Theme & Color
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">6 Styles</span>
                </div>
                <div className="space-y-1">
                  {THEME_OPTIONS.map((t) => {
                    const isSelected = currentTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          setThemeMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-[#1a233d] text-white font-semibold border border-cyan-500/40 shadow-sm'
                            : 'hover:bg-[#161a30] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full border border-white/30 shrink-0 shadow-sm"
                            style={{ backgroundColor: t.accentColor }}
                          />
                          <div className="truncate">
                            <div className="text-xs">{t.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{t.description.split('.')[0]}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Gemini AI Co-Pilot Chatbot Button */}
          <button
            onClick={() => setChatbotOpen(!chatbotOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl bg-gradient-to-r from-purple-950/80 via-[#181a38] to-indigo-950/80 border border-purple-500/40 text-purple-200 hover:text-white hover:border-purple-400 shadow-md transition-all font-medium text-xs"
            title="Open Gemini AI Assistant Chatbot"
          >
            <Bot className="w-4 h-4 text-purple-300 animate-pulse" />
            <span className="hidden sm:inline font-bold text-purple-100">AI Co-Pilot</span>
          </button>

          {/* Onboarding Guide Helper */}
          <button
            onClick={() => setOnboardingOpen(true)}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 h-9 rounded-xl text-xs font-medium text-slate-400 hover:text-purple-300 hover:bg-[#161830] transition-colors border border-transparent hover:border-purple-500/30"
            title="Setup Checklist & Guide"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Guide</span>
          </button>

          {/* Notifications button with badge */}
          <button
            id="notifications-bell-btn"
            onClick={() => setNotificationsOpen(true)}
            aria-label="View notifications"
            className="relative p-2 h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#171930] border border-transparent hover:border-[#222646] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-[#0c0e1a] animate-pulse" />
            )}
          </button>

          {/* User Profile & Account Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMyProfileOpen(true)}
              className="flex items-center gap-2 pl-1.5 pr-2 sm:pr-2.5 py-1 h-9 rounded-xl bg-[#121426] border border-[#222646] hover:border-purple-500/50 hover:bg-[#181b34] transition-all group"
              title="View & Edit My Profile"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden group-hover:scale-105 transition-transform shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : user?.name ? (
                  user.name[0].toUpperCase()
                ) : (
                  'U'
                )}
              </div>
              <span className="text-xs font-medium text-slate-200 group-hover:text-purple-300 transition-colors max-w-[90px] truncate hidden md:inline">
                {user?.name}
              </span>
            </button>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="p-2 h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#171930] transition-colors"
              title="Switch Account / Auth Settings"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-60 border-r border-[var(--border-color)] bg-[var(--surface-panel)] backdrop-blur-sm p-4 space-y-1 transition-colors">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 py-2">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  if (item.id === 'projects' && selectedProjectId && onSelectProject) {
                    onSelectProject(null);
                  }
                  onSelectTab(item.id);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-200 border border-blue-500/40 shadow-md shadow-blue-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161830]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="mt-auto pt-4 space-y-3">
            {/* Quick Profile Card in Sidebar */}
            {user && (
              <div
                onClick={() => setMyProfileOpen(true)}
                className="p-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)] hover:border-blue-500/50 cursor-pointer transition-all group hover:shadow-lg hover:shadow-blue-950/20"
                title="View & Edit My Profile"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${themeConfig.gradient} flex items-center justify-center font-bold text-xs text-white flex-shrink-0 shadow-sm`}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      user.name[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 transition-colors truncate">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {user.title || 'Workspace Contributor'}
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] text-blue-300 font-medium">
                  <span>My Profile</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)] text-xs space-y-1">
              <div className="text-[11px] font-mono text-blue-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                NΞXORA AI Core
              </div>
              <div className="text-slate-400 text-[10px]">Zero-trust workspace active</div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-md pt-16 flex flex-col">
            <div className="p-4 space-y-2 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'projects' && onSelectProject) onSelectProject(null);
                      onSelectTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium ${
                      isActive
                        ? 'bg-blue-950/80 text-blue-200 border border-blue-500/40'
                        : 'text-slate-300 hover:bg-[#181b34]'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-blue-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main id="main-content-scroll" className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 pb-36 sm:pb-44 lg:pb-48">
          <div className="max-w-7xl mx-auto">
            {children}
            {/* Generous bottom clear space spacer to prevent floating bottom bar from covering content */}
            <div className="h-12 sm:h-16 w-full pointer-events-none" aria-hidden="true" />
          </div>
        </main>
      </div>

      {/* App Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'projects' && onSelectProject) onSelectProject(null);
          onSelectTab(tab);
        }}
        unreadMessagesCount={unreadCount}
      />

      {/* Slideout Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNavigate={(link) => {
          if (link.includes('projects')) {
            onSelectTab('projects');
          } else if (link.includes('messages')) {
            onSelectTab('messages');
          }
        }}
      />

      {/* Auth & Identity Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* First-Run Onboarding Modal */}
      <OnboardingModal isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />

      {/* Member Profile Modal */}
      <MemberProfileModal
        userId={user?.id || null}
        isOpen={myProfileOpen}
        onClose={() => setMyProfileOpen(false)}
        onOpenProject={(projId) => {
          if (onSelectProject) onSelectProject(projId);
          onSelectTab('projects');
        }}
        onSendMessage={(targetUserId, targetUserName) => {
          if (onSendMessage) {
            onSendMessage(targetUserId, targetUserName);
          } else {
            onSelectTab('messages');
          }
        }}
      />

      {/* Gemini AI Multi-Turn Chatbot */}
      <GeminiChatbot
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        activeProjectId={selectedProjectId || undefined}
      />
    </div>
  );
}
