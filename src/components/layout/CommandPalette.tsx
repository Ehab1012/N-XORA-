import React, { useState, useEffect, useRef } from 'react';
import { Search, Folder, Users, MessageSquare, Settings, Activity, Command, X, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Project, User } from '../../../shared/types.js';

interface CommandPaletteProps {
  onNavigate: (path: string) => void;
}

export function CommandPalette({ onNavigate }: CommandPaletteProps) {
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-[#0b0d1a] border border-[#23274c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-[#1c1f38] bg-[#0f1224]/80">
          <Search className="w-5 h-5 text-purple-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, team members, or navigate..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-2 ml-3">
            <span className="flex items-center justify-center px-1.5 py-0.5 rounded bg-[#161830] border border-[#23274c] text-[10px] font-mono text-slate-400">
              ESC
            </span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-none">
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400 font-mono">Loading data...</div>
          ) : (
            <div className="space-y-4 p-2">
              
              {/* Static Navigation Navigation */}
              {staticNavigation.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Navigation</div>
                  <div className="space-y-1">
                    {staticNavigation.map((nav) => (
                      <button
                        key={nav.id}
                        onClick={() => handleSelect(nav.path)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[#141830] hover:text-purple-300 text-slate-300 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <nav.icon className="w-4 h-4 text-slate-400 group-hover:text-purple-400" />
                          <span className="text-sm">{nav.label}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {filteredProjects.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Projects</div>
                  <div className="space-y-1">
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleSelect(`project/${project.id}`)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[#141830] hover:text-teal-300 text-slate-300 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded bg-[#090b17] border border-[#23274c] flex items-center justify-center">
                            <Folder className="w-3 h-3 text-teal-400" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm">{project.title}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-mono">{project.status}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-teal-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Users */}
              {filteredUsers.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Team Members</div>
                  <div className="space-y-1">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelect(`messages`)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[#141830] hover:text-sky-300 text-slate-300 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#090b17] border border-[#23274c] flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 text-sky-400" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm">{user.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-mono">{user.role}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-sky-400" />
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
        
        <div className="px-4 py-2 border-t border-[#1c1f38] bg-[#0c0e1e] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center justify-center px-1 rounded bg-[#161830] border border-[#23274c]">↑↓</span>
            <span>to navigate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center justify-center px-1 rounded bg-[#161830] border border-[#23274c]">Enter</span>
            <span>to select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
