import React, { useState, useEffect } from 'react';
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
  User as UserIcon,
  RotateCcw,
  Zap,
  ChevronLeft,
  ChevronRight,
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
import { ConfirmModal } from '../common/Modal.js';
import { api } from '../../lib/api.js';
import { Bot } from 'lucide-react';
import { BottomNavBar } from './BottomNavBar.js';
import { CommandPalette } from './CommandPalette.js';
import { Logo } from '../common/Logo.js';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Environment state
  const [envInfo, setEnvInfo] = useState<{ isDev: boolean; currentCollection: string } | null>(null);
  const [isRevertingEnv, setIsRevertingEnv] = useState(false);
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);

  useEffect(() => {
    api.getEnvironmentInfo().then(setEnvInfo).catch(() => {});
  }, []);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'teams', label: 'Teams & Members', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics & Scoring', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Audit', icon: Settings },
  ];

  const handleCommandNavigate = (path: string) => {
    if (path.startsWith('/projects/')) {
      const projId = path.replace('/projects/', '');
      if (onSelectProject) onSelectProject(projId);
      onSelectTab('projects');
    } else if (path.includes('teams')) {
      onSelectTab('teams');
    } else if (path.includes('messages')) {
      onSelectTab('messages');
    } else if (path.includes('analytics')) {
      onSelectTab('analytics');
    } else if (path.includes('settings')) {
      onSelectTab('settings');
    } else {
      onSelectTab('projects');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--canvas-bg)] text-slate-100 flex flex-col nebula-glow transition-colors duration-300">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 h-16 border-b border-cyan-500/25 bg-[#040714]/92 backdrop-blur-2xl px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(6,182,212,0.12)]">
        {/* Subtle top header neon accent reflection */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_10px_rgba(34,211,238,0.75)] pointer-events-none" />

        {/* Left branding & Workspace status */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-[#0c1328] border border-cyan-500/20 transition-all cursor-pointer active:scale-95"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 icon-anim" /> : <Menu className="w-5 h-5 icon-anim" />}
          </button>

          <button
            onClick={() => {
              if (onSelectProject) onSelectProject(null);
              onSelectTab('projects');
            }}
            className="flex items-center gap-2.5 text-left group shrink-0 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-teal-500 to-indigo-600 p-[1.5px] shadow-lg shadow-cyan-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shrink-0">
              <div className="w-full h-full bg-[#050814] rounded-[10px] flex items-center justify-center">
                <Logo className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" size={24} />
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="font-sharp font-bold text-base sm:text-lg text-white tracking-wider group-hover:text-cyan-300 transition-colors">
                {PRODUCT_NAME}
              </span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-cyan-500/25">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)] animate-pulse" />
            <span className="text-xs font-semibold text-slate-300 truncate max-w-[130px]">
              {workspace?.name || 'Workspace'}
            </span>
          </div>

          {envInfo?.isDev && (
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono text-[10px] font-bold">Dev Sandbox</span>
            </div>
          )}
        </div>



        {/* Right Controls: Command Palette + Theme + AI Co-Pilot + Notifications + Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Command Palette Launcher */}
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 h-9 rounded-xl bg-[#060a1a] border border-cyan-500/25 hover:border-cyan-400/70 hover:bg-[#0c142e] text-xs text-slate-400 hover:text-cyan-200 transition-all duration-200 cursor-pointer shadow-sm group hover:-translate-y-0.5 active:scale-95"
            title="Search workspace items (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400 transition-transform duration-300 group-hover:scale-120 group-hover:rotate-12" />
            <span className="text-slate-400 group-hover:text-slate-200 font-medium">Search...</span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-500/35 rounded-md font-bold shadow-inner">
              ⌘K
            </kbd>
          </button>

          {/* Quick Theme Switcher Dropdown */}
          <div className="relative">
            <button
              id="theme-switcher-btn"
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 h-9 rounded-xl bg-[#070b1c] border border-cyan-500/25 hover:border-cyan-400/60 hover:bg-[#0f1738] text-xs text-slate-200 transition-all duration-200 shadow-sm cursor-pointer group hover:-translate-y-0.5 active:scale-95"
              title="Change Workspace Theme & Palette"
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/50 shadow-sm shrink-0 group-hover:scale-125 transition-transform"
                style={{ backgroundColor: themeConfig.accentColor }}
              />
              <span className="hidden xl:inline text-slate-300 font-semibold text-xs">
                {themeConfig.name}
              </span>
              <Palette className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300 group-hover:rotate-45 transition-all duration-300 shrink-0" />
            </button>

            {themeMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 glass-panel rounded-2xl shadow-2xl border border-cyan-500/40 p-2.5 z-50 animate-in fade-in zoom-in-95 bg-[#060a18]/96 backdrop-blur-2xl">
                <div className="px-2.5 py-1.5 border-b border-[#1c2648] mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
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
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#121c38] text-white font-semibold border border-cyan-500/45 shadow-sm'
                            : 'hover:bg-[#0f162e] text-slate-300 hover:translate-x-1'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full border border-white/40 shrink-0 shadow-sm"
                            style={{ backgroundColor: t.accentColor }}
                          />
                          <div className="truncate">
                            <div className="text-xs font-semibold">{t.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{t.description.split('.')[0]}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2 animate-in zoom-in" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Gemini AI Co-Pilot Chatbot Button with Pulse Glow */}
          <button
            onClick={() => setChatbotOpen(!chatbotOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl bg-gradient-to-r from-cyan-950/90 via-[#0b1532] to-blue-950/90 border border-cyan-500/45 text-cyan-200 hover:text-white hover:border-cyan-300 shadow-md transition-all font-semibold text-xs cursor-pointer group hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95"
            title="Open Gemini AI Assistant Chatbot"
          >
            <Bot className="w-4 h-4 text-cyan-400 group-hover:scale-120 group-hover:rotate-12 transition-transform duration-300" />
            <span className="hidden sm:inline font-bold text-cyan-100">AI Co-Pilot</span>
          </button>

          {/* Notifications button with animated bell */}
          <button
            id="notifications-bell-btn"
            onClick={() => setNotificationsOpen(true)}
            aria-label="View notifications"
            className="relative p-2 h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-[#0c1328] border border-cyan-500/20 hover:border-cyan-500/45 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 active:scale-95"
          >
            <Bell className="w-4 h-4 transition-transform duration-300 group-hover:scale-120 group-hover:rotate-12" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              </span>
            )}
          </button>

          {/* User Profile & Account Controls */}
          <div className="flex items-center gap-1.5">
            <button
              id="my-profile-header-btn"
              onClick={() => setMyProfileOpen(true)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 h-9 rounded-xl bg-[#060a1a] border border-cyan-500/25 hover:border-cyan-400/60 hover:bg-[#0c142e] transition-all group shadow-sm cursor-pointer hover:-translate-y-0.5 active:scale-95"
              title="View & Edit My Profile"
            >
              <div className="relative">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-400 via-teal-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-slate-950 overflow-hidden group-hover:scale-110 group-hover:rotate-6 transition-transform shrink-0 shadow-sm border border-cyan-400/40">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : user?.name ? (
                    user.name[0].toUpperCase()
                  ) : (
                    <UserIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#070c1e] shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              </div>
              <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-200 transition-colors max-w-[100px] truncate hidden sm:inline">
                {user?.name || 'Profile'}
              </span>
            </button>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="p-2 h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-[#0c1328] border border-cyan-500/20 hover:border-cyan-500/45 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 active:scale-95"
              title="Switch Account / Auth Settings"
            >
              <Shield className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-120 group-hover:rotate-12" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-20' : 'w-64'} border-r border-cyan-500/20 bg-[#030614]/90 backdrop-blur-2xl p-3 sm:p-4 space-y-1.5 transition-all duration-300 relative`}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 px-2 py-1 font-bold flex items-center justify-between">
            {!sidebarCollapsed && <span>WORKSPACE NAVIGATION</span>}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-xl bg-[#070d22] border border-cyan-500/25 text-cyan-300 hover:bg-[#0c142e] transition-all cursor-pointer mx-auto md:mx-0 shadow-sm"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
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
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/80 to-[#0c142e] text-cyan-100 border-l-2 border-cyan-400 shadow-md shadow-cyan-950/50 font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#0a1128] hover:translate-x-1.5'
                } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-cyan-300 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-slate-500 group-hover:text-cyan-400 group-hover:scale-120 group-hover:rotate-6'}`} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          <div className="mt-auto pt-4 space-y-3">
            {/* Quick Profile Card in Sidebar */}
            {user && (
              <div
                onClick={() => setMyProfileOpen(true)}
                className={`p-3 rounded-2xl bg-[#060a1a] border border-cyan-500/25 hover:border-cyan-400/70 cursor-pointer transition-all duration-200 group hover:shadow-lg hover:shadow-cyan-950/50 hover:-translate-y-0.5 active:scale-98 ${
                  sidebarCollapsed ? 'flex justify-center p-2' : ''
                }`}
                title={sidebarCollapsed ? `${user.name} (${user.title || 'Contributor'}) - Click to view profile` : "View & Edit My Profile"}
              >
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-xs text-slate-950 flex-shrink-0 shadow-md shadow-cyan-500/30 overflow-hidden group-hover:scale-110 transition-transform">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name[0]?.toUpperCase()
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-200 transition-colors truncate">
                        {user.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {user.title || 'Workspace Contributor'}
                      </div>
                    </div>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <div className="mt-2.5 pt-2 border-t border-[#141e3a] flex items-center justify-between text-[11px] text-cyan-300 font-semibold">
                    <span>My Profile</span>
                    <span className="group-hover:translate-x-1.5 transition-transform">→</span>
                  </div>
                )}
              </div>
            )}

            {!sidebarCollapsed && (
              <div className="p-3 rounded-xl bg-[#040714] border border-cyan-500/20 text-xs space-y-1 shadow-inner">
                <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                  NΞXORA Protocol Active
                </div>
                <div className="text-slate-400 text-[10px]">Zero-trust workspace verified</div>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/85 backdrop-blur-xl pt-16 flex flex-col animate-in fade-in duration-200">
            <div className="p-4 space-y-2 flex-1 overflow-y-auto">
              {/* My Profile Quick Card on Mobile */}
              {user && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setMyProfileOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-[#0c142e] to-[#080d22] border border-cyan-500/40 text-left mb-3 group shadow-md active:scale-98 transition-all"
                  title="View & Edit My Profile"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-sm text-slate-950 overflow-hidden shrink-0 shadow-sm">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        user.name?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0c0e1a] shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-cyan-300/80 font-mono capitalize flex items-center gap-1.5">
                      <span>{user.role || 'Member'}</span>
                      <span>•</span>
                      <span className="text-slate-400">My Profile</span>
                    </div>
                  </div>
                  <span className="text-xs text-cyan-400 group-hover:translate-x-1.5 transition-transform">→</span>
                </button>
              )}

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
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-base font-semibold transition-all duration-200 active:scale-98 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-950/80 to-[#0e1634] text-cyan-200 border border-cyan-500/50 shadow-md shadow-cyan-950/40'
                        : 'text-slate-300 hover:bg-[#0c142e] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
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
        onOpenProfile={() => setMyProfileOpen(true)}
        user={user}
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

      {/* Revert Development to Published Snapshot Confirmation */}
      <ConfirmModal
        isOpen={isRevertConfirmOpen}
        onClose={() => {
          if (!isRevertingEnv) setIsRevertConfirmOpen(false);
        }}
        onConfirm={async () => {
          setIsRevertingEnv(true);
          try {
            await api.revertToPublished();
            window.location.reload();
          } catch (err: any) {
            console.error('Failed to revert to published state:', err);
          } finally {
            setIsRevertingEnv(false);
          }
        }}
        title="Revert to Published Version?"
        message="This will restore your development workspace from the published version (ais-pre). Any testing changes made here will be reset to match what you published. Your published application will NOT be modified or affected."
        confirmLabel={isRevertingEnv ? 'Reverting...' : 'Revert Dev Workspace'}
      />
    </div>
  );
}
