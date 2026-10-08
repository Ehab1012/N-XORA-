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
import { ConfirmModal } from '../common/Modal.js';
import { PROJECT_STATUSES, ProjectStatus } from '../../../shared/const.js';

interface ProjectDashboardProps {
  onSelectProject: (projectId: string) => void;
}

export function ProjectDashboard({ onSelectProject }: ProjectDashboardProps) {
  const { role, user, workspace } = useAuth();
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

  // Delete modal state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const canCreate = !!user;

  const canDeleteProject = (proj: Project) => {
    if (!user) return false;
    if (role === 'leader' || role === 'co-leader') return true;
    if (workspace && workspace.ownerId === user.id) return true;
    if (proj.leaderId === user.id) return true;
    if (proj.memberIds?.includes(user.id)) return true;
    return false;
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteProject(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete project', err);
      setDeleteError(err.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
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
          <h1 className="text-2xl sm:text-3xl font-sharp font-bold text-slate-100 tracking-tight flex items-center gap-3">
            <span>Projects Workspace</span>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)] animate-pulse hidden sm:inline-block" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
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
            className="btn-modern-primary px-4 py-2.5 text-xs flex items-center gap-2 group cursor-pointer shadow-lg shadow-cyan-950/40"
          >
            <Plus className="w-4 h-4 text-slate-950 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-90" />
            <span>Create New Project</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-[#060b1e]/85 backdrop-blur-xl border border-cyan-500/25 shadow-lg shadow-black/40 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-cyan-400/70 absolute left-3.5 top-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:scale-110" />
          <input
            type="text"
            placeholder="Search projects by title, scope, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#030612]/90 border border-cyan-500/20 text-slate-100 placeholder-slate-500 text-xs focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#030612]/90 border border-cyan-500/20 text-slate-300 text-xs focus:border-cyan-400 focus:outline-none capitalize transition-all cursor-pointer"
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
            className="px-3 py-2 rounded-xl bg-[#030612]/90 border border-cyan-500/20 text-slate-300 text-xs focus:border-cyan-400 focus:outline-none transition-all cursor-pointer"
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
                className="group relative p-5 rounded-2xl bg-[#060b1c]/80 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/60 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-950/50 flex flex-col justify-between overflow-hidden"
              >
                {/* Top card hover shimmer line */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <StatusBadge status={project.status} />
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono flex items-center gap-1 ${urgency.color}`}>
                        <Clock className="w-3 h-3" />
                        <span>{urgency.label}</span>
                      </span>
                      {canDeleteProject(project) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            setProjectToDelete(project);
                          }}
                          className="text-slate-500 hover:text-red-400 p-1 -mr-1 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-sharp font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1.5 flex items-center justify-between">
                    <span>{project.title}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 text-cyan-400 shrink-0" />
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {project.description || 'No detailed scope provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#121b36] flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.7)]" />
                    <span className="truncate max-w-[140px] text-slate-300 font-medium">{team?.name || 'Assigned Team'}</span>
                  </div>

                  <span className="font-mono text-[11px] text-slate-400">
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
        onTeamCreated={(newTeam) => {
          setTeams((prev) => [...prev, newTeam]);
        }}
        onProjectCreated={(newProj) => {
          fetchData();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!projectToDelete}
        onClose={() => {
          if (!isDeleting) {
            setProjectToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        message={
          deleteError
            ? `Failed to delete project: ${deleteError}`
            : `Are you sure you want to permanently delete "${projectToDelete?.title}"? All associated tasks, milestones, proofs, and discussion history will be permanently removed.`
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Project Permanently'}
        destructive
      />
    </div>
  );
}
