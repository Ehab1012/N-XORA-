import React, { useState } from 'react';
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
}

export function ProjectCreateModal({
  isOpen,
  onClose,
  teams,
  onProjectCreated,
  initialProject,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !teamId) {
      setError('Title and Team are required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const objectives = objectivesInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        teamId,
        status,
        deadline: new Date(deadline).toISOString(),
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
      subtitle="Define cryptographic, technical, or research scope"
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Distributed Consensus Verification"
            className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Team *</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 focus:border-purple-500 focus:outline-none"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
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
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-900/30 transition-colors"
          >
            {submitting ? 'Saving...' : initialProject ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
