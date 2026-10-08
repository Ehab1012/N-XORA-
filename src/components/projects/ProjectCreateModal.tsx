import React, { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { Project, Team } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { PROJECT_STATUSES, ProjectStatus } from '../../../shared/const.js';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onProjectCreated: (proj: Project) => void;
  initialProject?: Project | null;
  onTeamCreated?: (newTeam: Team) => void;
}

export function ProjectCreateModal({
  isOpen,
  onClose,
  teams,
  onProjectCreated,
  initialProject,
  onTeamCreated,
}: ProjectCreateModalProps) {
  const [title, setTitle] = useState(initialProject?.title || '');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [teamId, setTeamId] = useState(initialProject?.teamId || (teams[0]?.id || ''));
  const [status, setStatus] = useState<ProjectStatus>(initialProject?.status || 'planned');
  const [deadline, setDeadline] = useState(
    initialProject?.deadline ? initialProject.deadline.split('T')[0] : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [accentColor, setAccentColor] = useState(initialProject?.accentColor || '#8b5cf6');
  const [visibility, setVisibility] = useState<'workspace' | 'team_only' | 'private_assigned'>(
    initialProject?.visibility || 'workspace'
  );
  const [objectivesInput, setObjectivesInput] = useState(initialProject?.objectives?.join('\n') || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick inline team creation state
  const [isCreatingQuickTeam, setIsCreatingQuickTeam] = useState(false);
  const [quickTeamName, setQuickTeamName] = useState('');
  const [creatingTeamLoading, setCreatingTeamLoading] = useState(false);

  // Synchronize modal state whenever isOpen or initialProject or teams changes
  useEffect(() => {
    if (isOpen) {
      setTitle(initialProject?.title || '');
      setDescription(initialProject?.description || '');

      // Determine valid teamId
      let chosenTeamId = initialProject?.teamId || '';
      if (!chosenTeamId || !teams.some((t) => t.id === chosenTeamId)) {
        chosenTeamId = teams.length > 0 ? teams[0].id : '';
      }
      setTeamId(chosenTeamId);

      setStatus(initialProject?.status || 'planned');
      setDeadline(
        initialProject?.deadline
          ? initialProject.deadline.split('T')[0]
          : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      );
      setAccentColor(initialProject?.accentColor || '#8b5cf6');
      setVisibility(initialProject?.visibility || 'workspace');
      setObjectivesInput(initialProject?.objectives?.join('\n') || '');
      setError(null);
      setIsCreatingQuickTeam(false);
      setQuickTeamName('');
    }
  }, [isOpen, initialProject]);

  // Keep teamId valid when teams array updates asynchronously
  useEffect(() => {
    if (teams.length > 0) {
      if (!teamId || !teams.some((t) => t.id === teamId)) {
        setTeamId(teams[0].id);
      }
    }
  }, [teams, teamId]);

  const handleQuickCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTeamName.trim()) return;

    setCreatingTeamLoading(true);
    setError(null);
    try {
      const created = await api.createTeam({
        name: quickTeamName.trim(),
        description: 'Squad created for project initiatives',
      });
      if (onTeamCreated) {
        onTeamCreated(created);
      }
      setTeamId(created.id);
      setIsCreatingQuickTeam(false);
      setQuickTeamName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create squad');
    } finally {
      setCreatingTeamLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    const effectiveTeamId = teamId || (teams.length > 0 ? teams[0].id : '');

    if (!cleanTitle) {
      setError('Project title is required');
      return;
    }

    if (!effectiveTeamId && teams.length === 0) {
      setError('Please create a squad/team first to assign this project');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const objectives = objectivesInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      let validDeadline = new Date(Date.now() + 30 * 86400000).toISOString();
      if (deadline) {
        const parsed = new Date(deadline);
        if (!isNaN(parsed.getTime())) {
          validDeadline = parsed.toISOString();
        }
      }

      const payload = {
        title: cleanTitle,
        description: description.trim(),
        teamId: effectiveTeamId,
        status,
        deadline: validDeadline,
        accentColor,
        visibility,
        objectives,
      };

      let result: Project;
      if (initialProject) {
        result = await api.updateProject(initialProject.id, payload);
      } else {
        result = await api.createProject(payload);
      }

      onProjectCreated(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialProject ? 'Edit Project Settings' : 'Create New Project'}
      subtitle="Define technical scope, squad assignment, and target milestones"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Project Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Distributed Consensus Verification"
            className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">Assigned Squad / Team *</label>
              {!isCreatingQuickTeam && (
                <button
                  type="button"
                  onClick={() => setIsCreatingQuickTeam(true)}
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>New squad</span>
                </button>
              )}
            </div>

            {isCreatingQuickTeam ? (
              <div className="p-2.5 rounded-lg bg-[#14172a] border border-purple-500/40 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-purple-300 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  <span>Create Squad</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={quickTeamName}
                    onChange={(e) => setQuickTeamName(e.target.value)}
                    placeholder="Squad name..."
                    className="flex-1 px-2.5 py-1.5 text-xs rounded bg-[#0b0c14] border border-[#232746] text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCreateTeam}
                    disabled={creatingTeamLoading || !quickTeamName.trim()}
                    className="px-2.5 py-1.5 text-xs rounded bg-purple-600 hover:bg-purple-500 text-white font-medium disabled:opacity-50 transition-colors"
                  >
                    {creatingTeamLoading ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingQuickTeam(false);
                      setQuickTeamName('');
                    }}
                    className="px-2 py-1.5 text-xs rounded text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : teams.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-1.5">
                <span>No squads found in workspace yet.</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingQuickTeam(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Squad Now</span>
                </button>
              </div>
            ) : (
              <select
                value={teamId || teams[0]?.id || ''}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 focus:border-purple-500 focus:outline-none"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Initial Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 focus:border-purple-500 focus:outline-none capitalize"
            >
              {PROJECT_STATUSES.map((st) => (
                <option key={st} value={st} className="capitalize">
                  {st.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="High-level engineering problem and architectural intent..."
            className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Visibility Scope</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 focus:border-purple-500 focus:outline-none"
            >
              <option value="workspace">Workspace Public</option>
              <option value="team_only">Team Members Only</option>
              <option value="private_assigned">Assigned Contributors Only</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Core Objectives (one per line)
          </label>
          <textarea
            rows={2}
            value={objectivesInput}
            onChange={(e) => setObjectivesInput(e.target.value)}
            placeholder="Deploy 50 simulated edge clusters&#10;Verify zero-knowledge proof validity under 35ms"
            className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none font-mono text-xs"
          />
        </div>

        <div className="pt-4 border-t border-[#202444] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-900/30 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : initialProject ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
