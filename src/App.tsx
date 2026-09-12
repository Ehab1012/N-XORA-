import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { Shell, ActiveTab } from './components/layout/Shell.js';
import { ProjectDashboard } from './components/projects/ProjectDashboard.js';
import { ProjectDetail } from './components/projects/ProjectDetail.js';
import { TeamsView } from './components/teams/TeamsView.js';
import { MessagesView } from './components/messages/MessagesView.js';
import { AnalyticsView } from './components/analytics/AnalyticsView.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { AppLoginView } from './components/auth/AppLoginView.js';
import { CommandPalette } from './components/layout/CommandPalette.js';
import { Loader2 } from 'lucide-react';

function WorkspaceRouter() {
  const { user, loading, refreshMe } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [chatTarget, setChatTarget] = useState<{ type: 'project' | 'direct'; id: string; name?: string } | null>(null);

  // Sync navigation hash for back/forward browser support and deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('messages/dm/')) {
        const uId = hash.replace('messages/dm/', '');
        setChatTarget({ type: 'direct', id: uId });
        setActiveTab('messages');
        setSelectedProjectId(null);
      } else if (hash.startsWith('project/')) {
        const pId = hash.replace('project/', '');
        setSelectedProjectId(pId);
        setActiveTab('projects');
      } else if (['projects', 'teams', 'messages', 'analytics', 'settings'].includes(hash)) {
        setActiveTab(hash as ActiveTab);
        setSelectedProjectId(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (path: string) => {
    window.location.hash = path;
  };

  const handleOpenChat = (userId: string, userName?: string) => {
    setChatTarget({ type: 'direct', id: userId, name: userName });
    setSelectedProjectId(null);
    setActiveTab('messages');
    window.location.hash = `messages/dm/${userId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a14] flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3">
        <Loader2 className="w-7 h-7 text-purple-500 animate-spin" />
        <span className="tracking-wider uppercase text-[11px] text-purple-300">
          Launching NΞXORA App Session...
        </span>
      </div>
    );
  }

  // If logged out, present the dedicated Native App Login view
  if (!user) {
    return <AppLoginView onSignedIn={refreshMe} />;
  }

  // Primary App Workspace Experience
  return (
    <>
      <Shell
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedProjectId(null);
          window.location.hash = tab;
        }}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          if (id) {
            window.location.hash = `project/${id}`;
          } else {
            window.location.hash = 'projects';
          }
        }}
        onSendMessage={handleOpenChat}
      >
        {/* App Page Router */}
        <div className="animate-in fade-in duration-200">
          {activeTab === 'projects' && (
            selectedProjectId ? (
              <ProjectDetail
                projectId={selectedProjectId}
                onBack={() => {
                  setSelectedProjectId(null);
                  window.location.hash = 'projects';
                }}
                onSendMessage={handleOpenChat}
              />
            ) : (
              <ProjectDashboard
                onSelectProject={(pId) => {
                  setSelectedProjectId(pId);
                  window.location.hash = `project/${pId}`;
                }}
              />
            )
          )}

          {activeTab === 'teams' && (
            <TeamsView
              onNavigateToProjects={() => {
                setActiveTab('projects');
                setSelectedProjectId(null);
                window.location.hash = 'projects';
              }}
              onSendMessage={handleOpenChat}
            />
          )}

          {activeTab === 'messages' && <MessagesView initialTarget={chatTarget} />}

          {activeTab === 'analytics' && <AnalyticsView />}

          {activeTab === 'settings' && <SettingsView />}
        </div>
      </Shell>
      <CommandPalette onNavigate={handleNavigate} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WorkspaceRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}
