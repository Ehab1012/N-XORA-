import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Square,
  Tag,
  User,
  Shield,
  FileCheck2,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  Users,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  Check,
  X,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { Task, User as UserType, Milestone, GroupTaskSubmission } from '../../../shared/types.js';
import { StatusBadge, PriorityBadge } from '../common/Badges.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { TASK_STATUSES, TASK_PRIORITIES, TaskStatus, TaskPriority } from '../../../shared/const.js';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  users: UserType[];
  milestones: Milestone[];
  onTaskUpdated: (updated: Task) => void;
  onRequestProofSubmit?: (task: Task) => void;
  onRequestProofReview?: (proofId: string) => void;
}

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  users,
  milestones,
  onTaskUpdated,
  onRequestProofSubmit,
  onRequestProofReview,
}: TaskDetailModalProps) {
  const { user, role } = useAuth();
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Group task submission state
  const [groupNote, setGroupNote] = useState('');
  const [groupProofLinks, setGroupProofLinks] = useState('');
  const [isSubmittingGroupPart, setIsSubmittingGroupPart] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  // Participant management for leader
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [reviewNoteInput, setReviewNoteInput] = useState<Record<string, string>>({});
  const [isReviewingUser, setIsReviewingUser] = useState<string | null>(null);
  const [isFinalizingBonus, setIsFinalizingBonus] = useState(false);

  if (!isOpen || !task) return null;

  const isGroup = !!task.isGroupTask;
  const participantIds = task.participantIds || [];
  const submissions: GroupTaskSubmission[] = task.submissions || [];
  const individualPts = task.individualPoints || 35;
  const bonusPts = task.groupBonusPoints || 60;

  const assignee = users.find((u) => u.id === task.assigneeId);
  const creator = users.find((u) => u.id === task.creatorId);
  const milestone = milestones.find((m) => m.id === task.milestoneId);

  const isLeaderOrOwner = role === 'owner' || role === 'leader' || role === 'co-leader';
  const isParticipant = user ? participantIds.includes(user.id) : false;
  const canEdit = isLeaderOrOwner || task.assigneeId === user?.id || isParticipant;

  const mySubmission = user ? submissions.find((s) => s.userId === user.id) : undefined;
  const isMySubmissionCompleted = mySubmission?.status === 'submitted' || mySubmission?.status === 'approved';
  const submittedCount = submissions.filter((s) => s.status === 'submitted' || s.status === 'approved').length;
  const totalParticipants = participantIds.length;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsUpdating(true);
    try {
      const updated = await api.updateTask(task.id, { status: newStatus });
      onTaskUpdated(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    setIsUpdating(true);
    try {
      const updated = await api.updateTask(task.id, { priority: newPriority });
      onTaskUpdated(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    setIsUpdating(true);
    try {
      const updated = await api.updateTask(task.id, { assigneeId: newAssigneeId || undefined });
      onTaskUpdated(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleChecklist = async (index: number) => {
    const updatedChecklist = [...task.checklist];
    updatedChecklist[index].isCompleted = !updatedChecklist[index].isCompleted;

    setIsUpdating(true);
    try {
      const updated = await api.updateTask(task.id, { checklist: updatedChecklist });
      onTaskUpdated(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;

    const newItem = {
      id: 'cl_' + Date.now(),
      taskId: task.id,
      title: newChecklistTitle.trim(),
      isCompleted: false,
      sortOrder: task.checklist.length,
    };

    const updatedChecklist = [...task.checklist, newItem];
    setNewChecklistTitle('');
    setIsUpdating(true);
    try {
      const updated = await api.updateTask(task.id, { checklist: updatedChecklist });
      onTaskUpdated(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit current user contribution to group task
  const handleSubmitGroupContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNote.trim() && !groupProofLinks.trim()) {
      alert('Please provide a brief note or proof link detailing your completed part.');
      return;
    }

    setIsSubmittingGroupPart(true);
    setSubmissionFeedback(null);
    try {
      const proofArray = groupProofLinks
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const res = await api.submitGroupTaskPart(task.id, {
        note: groupNote.trim(),
        proofLinks: proofArray,
      });

      onTaskUpdated(res.task);
      setSubmissionFeedback(res.message);
      setGroupNote('');
      setGroupProofLinks('');
    } catch (err: any) {
      console.error('Failed to submit group task contribution', err);
      alert(err.message || 'Failed to submit group task contribution');
    } finally {
      setIsSubmittingGroupPart(false);
    }
  };

  // Leader finalize group task and trigger collective bonus
  const handleFinalizeGroupTask = async () => {
    if (
      !confirm(
        `Finalize this group task and award the collective bonus (+${bonusPts} pts) to all ${participantIds.length} participants?`
      )
    ) {
      return;
    }

    setIsFinalizingBonus(true);
    try {
      const res = await api.completeGroupTask(task.id);
      onTaskUpdated(res.task);
      alert(res.message);
    } catch (err: any) {
      console.error('Failed to finalize group task', err);
      alert(err.message || 'Failed to finalize group task');
    } finally {
      setIsFinalizingBonus(false);
    }
  };

  // Leader review participant submission
  const handleReviewSubmission = async (
    targetUserId: string,
    action: 'approved' | 'rejected' | 'changes_requested'
  ) => {
    setIsReviewingUser(targetUserId);
    try {
      const note = reviewNoteInput[targetUserId] || '';
      const res = await api.reviewGroupTaskSubmission(task.id, {
        userId: targetUserId,
        action,
        reviewNote: note,
      });
      onTaskUpdated(res.task);
    } catch (err: any) {
      console.error('Failed to review submission', err);
      alert(err.message || 'Failed to review submission');
    } finally {
      setIsReviewingUser(null);
    }
  };

  // Leader add participant
  const handleAddParticipant = async () => {
    if (!selectedUserToAdd || participantIds.includes(selectedUserToAdd)) return;
    const updatedParticipants = [...participantIds, selectedUserToAdd];
    setIsUpdating(true);
    try {
      const updated = await api.updateTask(task.id, { participantIds: updatedParticipants });
      onTaskUpdated(updated);
      setSelectedUserToAdd('');
    } finally {
      setIsUpdating(false);
    }
  };

  // Leader remove participant
  const handleRemoveParticipant = async (pId: string) => {
    if (participantIds.length <= 1) {
      alert('A group task must have at least one participant.');
      return;
    }
    const updatedParticipants = participantIds.filter((id) => id !== pId);
    setIsUpdating(true);
    try {
      const updated = await api.updateTask(task.id, { participantIds: updatedParticipants });
      onTaskUpdated(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={isGroup ? `Collaborative Group Task • ID: ${task.id}` : `Task ID: ${task.id}`}
      maxWidth={isGroup ? 'max-w-4xl' : 'max-w-2xl'}
    >
      <div className="space-y-6">
        {/* Collaborative Mission Banner */}
        {isGroup && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/90 via-[#181636] to-purple-950/80 border border-indigo-500/40 space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-wide">Collaborative Group Task</h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-400/40 text-[10px] font-mono text-indigo-200">
                      {totalParticipants} Members
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/80">
                    Each participant submits their work for individual points. When all members complete, everyone receives the team completion bonus!
                  </p>
                </div>
              </div>

              {/* Points Gamification Pill */}
              <div className="flex items-center gap-2">
                <div className="p-2 px-3 rounded-lg bg-[#0e1022]/90 border border-amber-500/40 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Point Distribution</div>
                    <div className="text-xs font-bold text-amber-300">
                      +{individualPts} pts submit • +{bonusPts} pts bonus
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-indigo-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Team Readiness: {submittedCount} of {totalParticipants} members submitted</span>
                </span>
                <span className="font-mono text-amber-300 font-semibold">
                  {totalParticipants > 0 ? Math.round((submittedCount / totalParticipants) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900/80 overflow-hidden border border-indigo-500/30">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${totalParticipants > 0 ? (submittedCount / totalParticipants) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Bonus Awarded Banner */}
            {task.bonusAwarded && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">
                    Mission Complete! All participants earned +{bonusPts} extra team bonus points!
                  </span>
                </div>
                {task.bonusAwardedAt && (
                  <span className="text-[10px] font-mono text-emerald-400/80">
                    Awarded {new Date(task.bonusAwardedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Top Status & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0f1122] border border-[#202444]">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Current State</span>
              <select
                value={task.status}
                disabled={!canEdit || isUpdating}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="bg-[#151830] border border-[#272b4c] text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:border-purple-500 focus:outline-none"
              >
                {TASK_STATUSES.map((st) => (
                  <option key={st} value={st} className="capitalize">
                    {st.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Priority</span>
              <select
                value={task.priority}
                disabled={!canEdit || isUpdating}
                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                className="bg-[#151830] border border-[#272b4c] text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:border-purple-500 focus:outline-none"
              >
                {TASK_PRIORITIES.map((pr) => (
                  <option key={pr} value={pr} className="capitalize">
                    {pr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isGroup && isLeaderOrOwner && task.status !== 'complete' && (
              <button
                type="button"
                onClick={handleFinalizeGroupTask}
                disabled={isFinalizingBonus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/40 transition-colors"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Finalize Task & Award Bonus (+{bonusPts} pts)</span>
              </button>
            )}

            {!isGroup && task.proofSubmittedId ? (
              <button
                onClick={() => {
                  onClose();
                  if (onRequestProofReview) onRequestProofReview(task.proofSubmittedId!);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 text-teal-300 text-xs font-medium transition-colors"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Inspect Submitted Proof</span>
              </button>
            ) : !isGroup && (task.status === 'in_progress' || task.status === 'todo') ? (
              <button
                onClick={() => {
                  onClose();
                  if (onRequestProofSubmit) onRequestProofSubmit(task);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-md shadow-purple-900/30 transition-colors"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Submit Proof of Work</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Description</h4>
          <p className="text-sm text-slate-200 leading-relaxed p-3.5 rounded-xl bg-[#0f1122] border border-[#1e2240]">
            {task.description || 'No detailed description provided for this work item.'}
          </p>
        </div>

        {/* ---------------------------------------------------- */}
        {/* GROUP MISSION: Member Submissions & Participation Table */}
        {/* ---------------------------------------------------- */}
        {isGroup && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Participating Members & Individual Submissions ({submittedCount}/{totalParticipants})</span>
              </h4>
            </div>

            {/* Participants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {participantIds.map((pId) => {
                const u = users.find((user) => user.id === pId);
                const sub = submissions.find((s) => s.userId === pId);
                const isSub = sub?.status === 'submitted' || sub?.status === 'approved';
                const isMe = user?.id === pId;

                return (
                  <div
                    key={pId}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      isSub
                        ? 'bg-[#101428] border-emerald-500/30'
                        : 'bg-[#0e101f] border-[#222646]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                            isSub
                              ? 'bg-emerald-900 border-emerald-400 text-emerald-200'
                              : 'bg-indigo-900 border-indigo-400/60 text-indigo-200'
                          }`}
                        >
                          {u?.name ? u.name[0] : pId[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-100">
                              {u?.name || pId}
                            </span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-400/40 text-[9px] text-purple-200 font-mono">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 capitalize">{u?.role || 'Member'}</span>
                        </div>
                      </div>

                      {/* Status badge & Points */}
                      <div className="text-right">
                        {isSub ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Submitted (+{sub.pointsAwarded || individualPts} pts)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Submission content if submitted */}
                    {sub && sub.note && (
                      <div className="p-2 rounded-lg bg-[#0a0c18] border border-[#1b1f3c] text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-mono">Contribution Deliverable</span>
                          {sub.submittedAt && (
                            <span>{new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                        <p className="text-slate-200 text-xs leading-relaxed">{sub.note}</p>
                        {sub.proofLinks && sub.proofLinks.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1.5">
                            {sub.proofLinks.map((link, lIdx) => (
                              <a
                                key={lIdx}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 hover:underline bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate max-w-[140px]">{link}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Leader Review Controls */}
                    {isLeaderOrOwner && isSub && (
                      <div className="pt-1 border-t border-[#1a1e3a] flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-400 text-[10px]">Review Status: <strong className="text-slate-200 capitalize">{sub.status}</strong></span>
                        <div className="flex items-center gap-1">
                          {sub.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(pId, 'approved')}
                              disabled={isReviewingUser === pId}
                              className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[10px] font-medium"
                            >
                              Approve
                            </button>
                          )}
                          {sub.status === 'approved' && (
                            <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Approved
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Leader: Add Participant Picker */}
            {isLeaderOrOwner && (
              <div className="p-3 rounded-xl bg-[#0c0e1c] border border-[#1e2242] flex items-center justify-between gap-2 flex-wrap text-xs">
                <span className="text-slate-300 font-medium">Add Team Participant:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedUserToAdd}
                    onChange={(e) => setSelectedUserToAdd(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#14162a] border border-[#252849] text-slate-200 text-xs focus:outline-none"
                  >
                    <option value="">Select member...</option>
                    {users
                      .filter((u) => !participantIds.includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedUserToAdd || isUpdating}
                    onClick={handleAddParticipant}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs disabled:opacity-50"
                  >
                    Add Participant
                  </button>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* CURRENT USER ACTION: Submit My Contribution (+X Points) */}
            {/* ---------------------------------------------------- */}
            {isParticipant && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#131735] via-[#10132c] to-[#15112e] border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                      {isMySubmissionCompleted ? 'Update Your Contribution' : 'Submit Your Contribution'}
                    </h5>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                    +{individualPts} Points Reward
                  </span>
                </div>

                {submissionFeedback && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{submissionFeedback}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitGroupContribution} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">
                      Summary of Your Completed Work *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={groupNote}
                      onChange={(e) => setGroupNote(e.target.value)}
                      placeholder="Describe what you implemented, tested, or deployed..."
                      className="w-full px-3 py-2 rounded-lg bg-[#0c0e1c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">
                      Proof / Deliverable Links (Optional, one per line)
                    </label>
                    <input
                      type="text"
                      value={groupProofLinks}
                      onChange={(e) => setGroupProofLinks(e.target.value)}
                      placeholder="https://github.com/... or https://telemetry.internal/..."
                      className="w-full px-3 py-2 rounded-lg bg-[#0c0e1c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingGroupPart || (!groupNote.trim() && !groupProofLinks.trim())}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/40 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {isMySubmissionCompleted
                          ? `Re-submit & Save Contribution (+${individualPts} pts)`
                          : `Submit My Part & Claim +${individualPts} Points`}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Metadata Grid (for single assignee or project references) */}
        {!isGroup && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-[#0e101f] border border-[#1f223f] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Assignee</span>
                </span>
                <select
                  value={task.assigneeId || ''}
                  disabled={!canEdit}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="bg-[#14162a] border border-[#252849] rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due Date</span>
                </span>
                <span className="text-slate-200 font-mono">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0e101f] border border-[#1f223f] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Associated Milestone</span>
                <span className="text-purple-300 font-medium truncate max-w-[150px]">
                  {milestone ? milestone.title : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created By</span>
                <span className="text-slate-300 font-medium">
                  {creator ? creator.name : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Subtask Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Subtask Checklist ({task.checklist.filter((c) => c.isCompleted).length}/{task.checklist.length})</span>
            </h4>
          </div>

          <div className="space-y-1.5 mb-3">
            {task.checklist.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => handleToggleChecklist(idx)}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#0e101f] border border-[#1f223f] hover:border-purple-500/30 cursor-pointer text-xs transition-colors"
              >
                {item.isCompleted ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={`flex-1 ${item.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>

          {/* Add checklist item */}
          <form onSubmit={handleAddChecklistItem} className="flex gap-2">
            <input
              type="text"
              placeholder="Add validation subtask..."
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newChecklistTitle.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#181b36] hover:bg-[#202446] border border-[#262a50] text-purple-300 text-xs font-medium transition-colors"
            >
              Add Item
            </button>
          </form>
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            {task.tags.map((tg) => (
              <span
                key={tg}
                className="px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/20 text-purple-300 text-[11px] font-mono"
              >
                #{tg}
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
