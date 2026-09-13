import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  Search,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
} from 'lucide-react';
import { Project, Team, User } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { StatusBadge } from '../common/Badges.js';
import { EmptyState } from '../common/EmptyState.js';
import { ProjectCreateModal } from './ProjectCreateModal.js';
import { PROJECT_STATUSES, ProjectStatus } from '../../../shared/const.js';

interface ProjectDashboardProps {
  onSelectProject: (projectId: string) => void;
}

export function ProjectDashboard({ onSelectProject }: ProjectDashboardProps) {
  const { role, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Create/Edit modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchData = async () => {
    try {
      const [projList, teamList] = await Promise.all([
        api.getProjects(),
        api.getTeams(),
      ]);
      setProjects(projList);
      setTeams(teamList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const canCreate = role === 'leader' || role === 'co-leader';
  const isLeader = role === 'leader';

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await api.deleteProject(projectId);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } catch (err) {
        console.error('Failed to delete project', err);
        alert('Failed to delete project');
      }
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesTeam = teamFilter === 'all' || p.teamId === teamFilter;
    return matchesSearch && matchesStatus && matchesTeam;
  });

  const getUrgency = (deadlineStr: string, status: string) => {
    if (status === 'complete') return { label: 'Completed', color: 'text-teal-400' };
    if (!deadlineStr) return { label: 'No deadline', color: 'text-slate-400' };
    const now = Date.now();
    const deadline = new Date(deadlineStr).getTime();
    if (isNaN(deadline)) return { label: 'No deadline', color: 'text-slate-400' };
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays)) return { label: 'No deadline', color: 'text-slate-400' };

    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d overdue`, color: 'text-rose-400 font-bold' };
    }
    if (diffDays <= 7) {
      return { label: `Due in ${diffDays}d`, color: 'text-amber-400 font-medium' };
    }
    return { label: `Due in ${diffDays}d`, color: 'text-slate-400' };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-100 tracking-tight">
            Projects Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Scoped initiatives with coordinated tasks, milestones, and verifiable proof of work.
          </p>
        </div>

        {canCreate && (
          <button
            id="new-project-btn"
            onClick={() => {
              setEditingProject(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-2xl glass-panel border border-[#1f223f] flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by title, scope, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0b0c14] border border-[#232746] text-slate-100 placeholder-slate-500 text-xs focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232746] text-slate-300 text-xs focus:border-purple-500 focus:outline-none capitalize"
          >
            <option value="all">All Statuses</option>
            {PROJECT_STATUSES.map((st) => (
              <option key={st} value={st} className="capitalize">
                {st.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Team filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232746] text-slate-300 text-xs focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs">
          Loading workspace projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects found"
          description="No projects match your current search query or active filter criteria."
          actionLabel={canCreate ? 'Create First Project' : undefined}
          onAction={canCreate ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const team = teams.find((t) => t.id === project.teamId);
            const urgency = getUrgency(project.deadline, project.status);

            return (
              <div
                key={project.id}
                id={`project-card-${project.id}`}
                onClick={() => onSelectProject(project.id)}
                className="group relative p-5 rounded-2xl glass-panel border border-[#1f223f] hover:border-purple-500/50 cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-purple-950/20 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <StatusBadge status={project.status} />
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono flex items-center gap-1 ${urgency.color}`}>
                        <Clock className="w-3 h-3" />
                        <span>{urgency.label}</span>
                      </span>
                      {isLeader && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="text-slate-500 hover:text-red-400 p-1 -mr-1 rounded hover:bg-red-500/10 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-display font-semibold text-slate-100 group-hover:text-purple-300 transition-colors line-clamp-1 mb-1.5 flex items-center justify-between">
                    <span>{project.title}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400 shrink-0" />
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {project.description || 'No detailed scope provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1c1f38] flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="truncate max-w-[140px] text-slate-300">{team?.name || 'Assigned Team'}</span>
                  </div>

                  <span className="font-mono text-[11px] text-slate-500">
                    {new Date(project.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      <ProjectCreateModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingProject(null);
        }}
        teams={teams}
        initialProject={editingProject}
        onProjectCreated={(newProj) => {
          fetchData();
        }}
      />
    </div>
  );
}
