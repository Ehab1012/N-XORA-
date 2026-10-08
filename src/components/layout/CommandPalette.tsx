import React, { useState, useEffect, useRef } from 'react';
import { Search, Folder, Users, MessageSquare, Settings, Activity, Command, X, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Project, User } from '../../../shared/types.js';
import { useTheme } from '../../contexts/ThemeContext.js';

interface CommandPaletteProps {
  onNavigate: (path: string) => void;
}

export function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const { themeConfig } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      inputRef.current?.focus();
      
      const loadData = async () => {
        setLoading(true);
        try {
          const [projRes, meRes] = await Promise.all([
            api.getProjects(),
            api.getMe(),
          ]);
          setProjects(projRes);
          if (meRes.availableUsers) {
            setUsers(meRes.availableUsers.map((u) => ({ ...u, createdAt: new Date().toISOString() })));
          }
        } catch (err) {
          console.error("Failed to load command palette data:", err);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  
  const staticNavigation = [
    { id: 'nav-projects', label: 'Projects Dashboard', icon: Folder, path: 'projects' },
    { id: 'nav-teams', label: 'Team Directory', icon: Users, path: 'teams' },
    { id: 'nav-messages', label: 'Messages', icon: MessageSquare, path: 'messages' },
    { id: 'nav-analytics', label: 'Analytics', icon: Activity, path: 'analytics' },
    { id: 'nav-settings', label: 'Settings', icon: Settings, path: 'settings' },
  ].filter(nav => nav.label.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (path: string) => {
    setIsOpen(false);
    onNavigate(path);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        style={{
          background: 'var(--surface-panel)',
          borderColor: 'var(--border-color)',
          borderWidth: 1,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px -5px ${themeConfig.accentColor}25`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center px-4 py-3.5 border-b"
          style={{
            background: 'var(--surface-header)',
            borderColor: 'var(--border-color)',
          }}
        >
          <Search className="w-5 h-5 mr-3 transition-colors" style={{ color: themeConfig.accentColor }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, team members, or navigate..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-2 ml-3">
            <span
              className="flex items-center justify-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold"
              style={{
                background: `${themeConfig.accentColor}18`,
                color: themeConfig.accentColor,
                border: `1px solid ${themeConfig.accentColor}40`,
              }}
            >
              ESC
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-none">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400 font-mono">Loading data...</div>
          ) : (
            <div className="space-y-4 p-2">
              
              {/* Static Navigation Navigation */}
              {staticNavigation.length > 0 && (
                <div>
                  <div
                    className="text-[10px] font-mono font-bold uppercase tracking-wider mb-2 px-2"
                    style={{ color: themeConfig.accentColor }}
                  >
                    Navigation
                  </div>
                  <div className="space-y-1">
                    {staticNavigation.map((nav) => (
                      <button
                        key={nav.id}
                        onClick={() => handleSelect(nav.path)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-white/5 text-slate-300 transition-all group cursor-pointer hover:translate-x-1"
                      >
                        <div className="flex items-center gap-3">
                          <nav.icon className="w-4 h-4 text-slate-400 group-hover:text-slate-100 transition-colors" />
                          <span className="text-xs font-semibold">{nav.label}</span>
                        </div>
                        <ArrowRight
                          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1"
                          style={{ color: themeConfig.accentColor }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {filteredProjects.length > 0 && (
                <div>
                  <div
                    className="text-[10px] font-mono font-bold uppercase tracking-wider mb-2 px-2"
                    style={{ color: themeConfig.accentColor }}
                  >
                    Projects
                  </div>
                  <div className="space-y-1">
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleSelect(`project/${project.id}`)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-white/5 text-slate-300 transition-all group cursor-pointer hover:translate-x-1"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center border"
                            style={{
                              background: 'var(--surface-subtle)',
                              borderColor: 'var(--border-color)',
                            }}
                          >
                            <Folder className="w-3.5 h-3.5" style={{ color: themeConfig.accentColor }} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">{project.title}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">{project.status}</span>
                          </div>
                        </div>
                        <ArrowRight
                          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1"
                          style={{ color: themeConfig.accentColor }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Users */}
              {filteredUsers.length > 0 && (
                <div>
                  <div
                    className="text-[10px] font-mono font-bold uppercase tracking-wider mb-2 px-2"
                    style={{ color: themeConfig.accentColor }}
                  >
                    Team Members
                  </div>
                  <div className="space-y-1">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelect(`messages`)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-white/5 text-slate-300 transition-all group cursor-pointer hover:translate-x-1"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center border"
                            style={{
                              background: 'var(--surface-subtle)',
                              borderColor: 'var(--border-color)',
                            }}
                          >
                            <Users className="w-3.5 h-3.5" style={{ color: themeConfig.accentColor }} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">{user.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">{user.role}</span>
                          </div>
                        </div>
                        <ArrowRight
                          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1"
                          style={{ color: themeConfig.accentColor }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {staticNavigation.length === 0 && filteredProjects.length === 0 && filteredUsers.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500">
                  No results found for "{search}"
                </div>
              )}
            </div>
          )}
        </div>
        
        <div
          className="px-4 py-2 border-t flex items-center justify-between text-[10px] font-mono text-slate-500"
          style={{
            background: 'var(--surface-header)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="flex items-center justify-center px-1 rounded border"
              style={{
                background: 'var(--surface-subtle)',
                borderColor: 'var(--border-color)',
              }}
            >
              ↑↓
            </span>
            <span>to navigate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="flex items-center justify-center px-1 rounded border"
              style={{
                background: 'var(--surface-subtle)',
                borderColor: 'var(--border-color)',
              }}
            >
              Enter
            </span>
            <span>to select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
