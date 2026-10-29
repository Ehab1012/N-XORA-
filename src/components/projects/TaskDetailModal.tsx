import React, { useState, useEffect } from 'react';
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
  Upload,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { Modal, ConfirmModal } from '../common/Modal.js';
import { Task, User as UserType, Milestone, GroupTaskSubmission, ProofSubmission } from '../../../shared/types.js';
import { StatusBadge, PriorityBadge, ProofBadge } from '../common/Badges.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TaskStatus,
  TaskPriority,
  TASK_PRIORITY_POINTS,
  LATE_DAILY_PENALTY_PERCENTAGE,
  ON_TIME_BONUS_POINTS,
  calculateDaysLate,
  calculateTaskPoints,
  getDailyLatePenalty,
} from '../../../shared/const.js';
import { ProofFilesViewer } from './ProofFilesViewer.js';
import { ProofDeliverableSkeleton } from '../common/Skeleton.js';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  users: UserType[];
  milestones: Milestone[];
  onTaskUpdated: (updated: Task) => void;
  onTaskDeleted?: (deletedId: string) => void;
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
  onTaskDeleted,
  onRequestProofSubmit,
  onRequestProofReview,
}: TaskDetailModalProps) {
  const { user, role } = useAuth();
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Group task submission state
  const [groupNote, setGroupNote] = useState('');
  const [groupProofLinks, setGroupProofLinks] = useState('');
  const [groupFile, setGroupFile] = useState<{ name: string; mimeType: string; dataUrl: string } | null>(null);
  const [isSubmittingGroupPart, setIsSubmittingGroupPart] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  // Delivered Proof of Work state for task
  const [submittedProof, setSubmittedProof] = useState<ProofSubmission | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);

  // Automatically load submitted proof deliverable when viewing task
  useEffect(() => {
    if (!isOpen || !task) {
      setSubmittedProof(null);
      return;
    }

    let isMounted = true;
    if (task.proofSubmittedId) {
      setLoadingProof(true);
      api.getProof(task.proofSubmittedId)
        .then((p) => {
          if (isMounted) setSubmittedProof(p);
        })
        .catch((err) => {
          console.warn('Could not fetch proof by ID, trying query:', err);
          api.getProofs(task.projectId, task.id)
            .then((proofs) => {
              if (isMounted && proofs.length > 0) setSubmittedProof(proofs[0]);
            })
            .catch(() => {});
        })
        .finally(() => {
          if (isMounted) setLoadingProof(false);
        });
    } else {
      // Check if there is a matching proof filed for this task
      api.getProofs(task.projectId, task.id)
        .then((proofs) => {
          if (isMounted && proofs.length > 0) setSubmittedProof(proofs[0]);
          else if (isMounted) setSubmittedProof(null);
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, task?.id, task?.proofSubmittedId]);

  // Participant management for leader
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [reviewNoteInput, setReviewNoteInput] = useState<Record<string, string>>({});
  const [isReviewingUser, setIsReviewingUser] = useState<string | null>(null);
  const [isFinalizingBonus, setIsFinalizingBonus] = useState(false);
  const [isConfirmFinalizeOpen, setIsConfirmFinalizeOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const isGroup = !!task.isGroupTask;
  const participantIds = task.participantIds || [];
  const submissions: GroupTaskSubmission[] = task.submissions || [];
  const individualPts = task.individualPoints || 35;
  const bonusPts = task.groupBonusPoints || 60;

  const assignee = users.find((u) => u.id === task.assigneeId);
  const creator = users.find((u) => u.id === task.creatorId);
  const milestone = milestones.find((m) => m.id === task.milestoneId);

  const effectiveRole = role || user?.role;
  const isLeaderOrOwner = effectiveRole === 'leader' || effectiveRole === 'co-leader';
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
    if (!groupNote.trim() && !groupProofLinks.trim() && !groupFile) {
      setSubmissionFeedback('Please provide a brief note, proof link, or attach a proof file detailing your completed part.');
      return;
    }

    setIsSubmittingGroupPart(true);
    setSubmissionFeedback(null);
    try {
      const proofArray = groupProofLinks
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // If user attached a file, upload it to project files
      if (groupFile) {
        const uploaded = await api.uploadFile(groupFile.name, groupFile.mimeType, groupFile.dataUrl, task.projectId);
        proofArray.push(`/api/files/${uploaded.id}/content?name=${encodeURIComponent(uploaded.name)}`);
      }

      const res = await api.submitGroupTaskPart(task.id, {
        note: groupNote.trim(),
        proofLinks: proofArray,
      });

      onTaskUpdated(res.task);
      setSubmissionFeedback(res.message);
      setGroupNote('');
      setGroupProofLinks('');
      setGroupFile(null);
    } catch (err: any) {
      console.error('Failed to submit group task contribution', err);
      setSubmissionFeedback(err.message || 'Failed to submit group task contribution');
    } finally {
      setIsSubmittingGroupPart(false);
    }
  };

  // Leader finalize group task and trigger collective bonus
  const handleDoFinalize = async () => {
    setIsFinalizingBonus(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.completeGroupTask(task.id);
      onTaskUpdated(res.task);
      setActionSuccess(res.message);
      setIsConfirmFinalizeOpen(false);
    } catch (err: any) {
      console.error('Failed to finalize group task', err);
      setActionError(err.message || 'Failed to finalize group task');
    } finally {
      setIsFinalizingBonus(false);
    }
  };

  // Leader / Co-Leader permanently delete task
  const handleDoDeleteTask = async () => {
    setIsDeletingTask(true);
    setActionError(null);
    try {
      await api.deleteTask(task.id);
      setIsConfirmDeleteOpen(false);
      if (onTaskDeleted) {
        onTaskDeleted(task.id);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to delete task', err);
      setActionError(err.message || 'Failed to delete task');
    } finally {
      setIsDeletingTask(false);
    }
  };

  // Leader review participant submission
  const handleReviewSubmission = async (
    targetUserId: string,
    action: 'approved' | 'rejected' | 'changes_requested'
  ) => {
    setIsReviewingUser(targetUserId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const note = reviewNoteInput[targetUserId] || '';
      const res = await api.reviewGroupTaskSubmission(task.id, {
        userId: targetUserId,
        action,
        reviewNote: note,
      });
      onTaskUpdated(res.task);
      setActionSuccess(`Submission marked as ${action}.`);
    } catch (err: any) {
      console.error('Failed to review submission', err);
      setActionError(err.message || 'Failed to review submission');
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
      setActionError('A group task must have at least one participant.');
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
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={isGroup ? `Collaborative Group Task • ID: ${task.id}` : `Task ID: ${task.id}`}
      maxWidth={isGroup ? 'max-w-4xl' : 'max-w-2xl'}
    >
      <div className="space-y-6">
        {actionError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-emerald-400" />
              {actionSuccess}
            </span>
            <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
            {isGroup && (role === 'leader' || role === 'co-leader') && task.status !== 'complete' && (
              <button
                type="button"
                onClick={() => setIsConfirmFinalizeOpen(true)}
                disabled={isFinalizingBonus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/40 transition-colors cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>{isFinalizingBonus ? 'Finalizing...' : `Finalize Task & Award Bonus (+${bonusPts} pts)`}</span>
              </button>
            )}

            {isGroup && role !== 'leader' && role !== 'co-leader' && task.status !== 'complete' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#131528] border border-[#232748] text-slate-400 text-xs">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Team bonus (+{bonusPts} pts) can only be awarded by the Leader or Co-Leader</span>
              </div>
            )}

            {!isGroup && task.proofSubmittedId ? (
              <button
                onClick={() => {
                  onClose();
                  if (onRequestProofReview) onRequestProofReview(task.proofSubmittedId!);
                }}
                className="btn-modern-secondary px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-cyan-400 icon-anim" />
                <span>Inspect Submitted Proof</span>
              </button>
            ) : !isGroup && (task.status === 'in_progress' || task.status === 'todo') ? (
              <button
                onClick={() => {
                  onClose();
                  if (onRequestProofSubmit) onRequestProofSubmit(task);
                }}
                className="btn-modern-primary px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/40"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-slate-950 icon-anim" />
                <span>Submit Proof of Work</span>
              </button>
            ) : null}

            {isLeaderOrOwner && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                disabled={isDeletingTask}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-rose-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                title="Delete task (Leader & Co-Leader only)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingTask ? 'Deleting...' : 'Delete Task'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Merit Points & Progressive Daily Penalty Accountability Section */}
        {(() => {
          const basePts = isGroup ? individualPts : (TASK_PRIORITY_POINTS[task.priority] || 25);
          const completedDaysLate =
            task.status === 'complete'
              ? (task.daysLate ??
                (task.completedAt && task.dueDate
                  ? calculateDaysLate(task.dueDate, task.completedAt)
                  : task.isLate
                  ? 1
                  : 0))
              : 0;

          const inReviewRef =
            task.status === 'in_review' &&
            (submittedProof?.createdAt || (task.proofSubmittedId ? task.updatedAt : undefined))
              ? submittedProof?.createdAt || task.updatedAt
              : undefined;

          const activeDaysLate =
            task.status !== 'complete' && task.status !== 'cancelled'
              ? calculateDaysLate(task.dueDate, inReviewRef)
              : 0;

          const calc = calculateTaskPoints(
            task.priority,
            task.status === 'complete' ? completedDaysLate : activeDaysLate,
            basePts
          );

          const isOverdue = activeDaysLate > 0;
          const isCompletedLate = task.status === 'complete' && (completedDaysLate > 0 || Boolean(task.isLate));
          const isCompletedOnTime = task.status === 'complete' && !isCompletedLate;
          const awardedTaskPts = task.pointsAwarded ?? calc.pointsAwarded;
          const memberOverflowPts = task.memberPenaltyApplied ?? calc.memberPointsDeducted;
          const remainingPct =
            calc.basePoints > 0
              ? Math.max(0, Math.min(100, Math.round((calc.pointsAwarded / calc.basePoints) * 100)))
              : 0;

          const targetAccountabilityLabel = isGroup
            ? `each overdue unsubmitted member (${participantIds.length} assigned)`
            : assignee
            ? `${assignee.name}'s total score`
            : "the assigned member's total score";

          return (
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c1024] to-[#070a18] border border-cyan-500/25 space-y-3 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2244] pb-2.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white tracking-wide font-mono">
                    Merit Points & Progressive Late Penalty
                  </span>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-cyan-300">
                  {isGroup ? 'Member Base' : 'Task Base'}:{' '}
                  <span className="font-bold text-amber-300">+{basePts} pts</span> · Daily Late Decay:{' '}
                  <span className="font-bold text-rose-300">-{calc.dailyPenaltyRate} pts/day ({LATE_DAILY_PENALTY_PERCENTAGE}%)</span> · On-Time:{' '}
                  <span className="font-bold text-emerald-300">+{ON_TIME_BONUS_POINTS} pts</span>
                </div>
              </div>

              {/* Real-time Status Notice */}
              {isCompletedOnTime && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs text-emerald-300 tabular-nums">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-white">Delivered On Time:</strong> Awarded full{' '}
                      <strong>+{awardedTaskPts} pts</strong> plus{' '}
                      <strong>+{ON_TIME_BONUS_POINTS} pts</strong> on-time delivery bonus (0 penalty).
                    </span>
                  </div>
                  {task.completedAt && (
                    <span className="text-[10px] font-mono text-emerald-400/80 shrink-0">
                      {new Date(task.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {isCompletedLate && (
                <div
                  className={`p-3 rounded-lg border space-y-2 text-xs tabular-nums ${
                    memberOverflowPts > 0
                      ? 'bg-rose-950/65 border-rose-500/45 text-rose-200'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 shrink-0 ${memberOverflowPts > 0 ? 'text-rose-400' : 'text-amber-400'}`} />
                      <span>
                        <strong className="text-white">
                          Turned In {completedDaysLate} Day{completedDaysLate === 1 ? '' : 's'} Late:
                        </strong>{' '}
                        {memberOverflowPts > 0 ? (
                          <>
                            Task points were eaten down to <strong>0/{basePts} pts</strong> and{' '}
                            <strong className="text-rose-300">-{memberOverflowPts} pts</strong> overflow penalty was deducted directly from {targetAccountabilityLabel}.
                          </>
                        ) : (
                          <>
                            Awarded <strong>+{awardedTaskPts}/{basePts} pts</strong> (
                            <strong>-{task.latePenaltyApplied ?? calc.taskPointsDeducted} pts</strong> eaten at -{calc.dailyPenaltyRate} pts/day, no on-time bonus).
                          </>
                        )}
                      </span>
                    </div>
                    {task.completedAt && (
                      <span className="text-[10px] font-mono opacity-80 shrink-0">
                        Completed {new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {!isCompletedOnTime && !isCompletedLate && isOverdue && (
                <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-500/40 space-y-2.5 text-xs text-rose-200 tabular-nums">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div>
                        <strong className="text-white">
                          Day {activeDaysLate} Past Due (-{calc.dailyPenaltyRate} pts/day):
                        </strong>{' '}
                        {calc.pointsAwarded > 0 ? (
                          <>
                            Penalty has eaten <strong>-{calc.taskPointsDeducted} pts</strong> from this task (
                            <strong className="text-amber-300">+{calc.pointsAwarded}/{calc.basePoints} pts remaining</strong>). Once task points reach 0, each extra day deducts{' '}
                            <strong>-{calc.dailyPenaltyRate} pts/day</strong> from {targetAccountabilityLabel}.
                          </>
                        ) : calc.memberPointsDeducted > 0 ? (
                          <>
                            Task points reached <strong>0/{calc.basePoints} pts</strong>. Overflow penalty is now eating{' '}
                            <strong className="text-rose-300">-{calc.memberPointsDeducted} pts</strong> (at -{calc.dailyPenaltyRate} pts/day) directly from {targetAccountabilityLabel}.
                          </>
                        ) : (
                          <>
                            Task points have reached <strong>0/{calc.basePoints} pts</strong> today. Starting tomorrow, each additional late day deducts{' '}
                            <strong className="text-rose-300">-{calc.dailyPenaltyRate} pts/day</strong> directly from {targetAccountabilityLabel}.
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2-Stage Visual Meter: Task Pool -> Member Total Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="p-2 rounded-lg bg-[#090d1f] border border-[#1f2647] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Stage 1 · Task Points Left</span>
                        <span className={calc.pointsAwarded > 0 ? 'text-amber-300 font-bold' : 'text-rose-400 font-bold'}>
                          +{calc.pointsAwarded} / {calc.basePoints} pts
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#151a36] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all"
                          style={{ width: `${remainingPct}%` }}
                        />
                      </div>
                    </div>

                    <div
                      className={`p-2 rounded-lg border flex flex-col justify-between ${
                        calc.memberPointsDeducted > 0
                          ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                          : 'bg-[#090d1f] border-[#1f2647] text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Stage 2 · Member Score Drain</span>
                        <span className={calc.memberPointsDeducted > 0 ? 'text-rose-300 font-bold' : 'text-slate-300 font-semibold'}>
                          -{calc.memberPointsDeducted} pts
                        </span>
                      </div>
                      <div className="text-[10px] opacity-85 truncate">
                        {calc.memberPointsDeducted > 0
                          ? `Actively deducting -${calc.dailyPenaltyRate} pts/day from total score`
                          : `Activates after task hits 0 pts (-${calc.dailyPenaltyRate} pts/day)`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isCompletedOnTime && !isCompletedLate && !isOverdue && (
                <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-2.5 text-xs text-cyan-200 tabular-nums">
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    <strong className="text-white">
                      {task.status === 'in_review' ? 'Submitted On Time (In Review):' : 'On-Time Eligible:'}
                    </strong>{' '}
                    {task.status === 'in_review' ? (
                      <>
                        Deliverable submitted before deadline — locked in for full <strong>+{basePts} pts</strong> +{' '}
                        <strong>+{ON_TIME_BONUS_POINTS} pts</strong> on-time bonus upon approval.
                      </>
                    ) : (
                      <>
                        Submit before <strong>{new Date(task.dueDate).toLocaleDateString()}</strong> for{' '}
                        <strong>+{basePts} pts</strong> + <strong>+{ON_TIME_BONUS_POINTS} pts</strong> bonus. Each late day eats{' '}
                        <strong>-{calc.dailyPenaltyRate} pts/day</strong> until 0, then drains {targetAccountabilityLabel}.
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Priority Ladder Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono tabular-nums">
                {([
                  { prio: 'urgent' as TaskPriority, pts: 60, label: 'Urgent' },
                  { prio: 'high' as TaskPriority, pts: 40, label: 'High' },
                  { prio: 'medium' as TaskPriority, pts: 25, label: 'Medium' },
                  { prio: 'low' as TaskPriority, pts: 15, label: 'Low' },
                ]).map((item) => {
                  const isCurrent = task.priority === item.prio;
                  const dailyDecay = getDailyLatePenalty(item.prio, item.pts);
                  return (
                    <div
                      key={item.prio}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        isCurrent
                          ? 'bg-purple-950/70 border-cyan-400/60 text-white shadow-sm ring-1 ring-cyan-400/40'
                          : 'bg-[#090d1f] border-[#1e2344] text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] font-bold truncate flex items-center justify-center gap-1">
                        <span>{item.label} Priority</span>
                      </div>
                      <div className={`font-bold mt-0.5 ${isCurrent ? 'text-amber-300 text-xs' : 'text-slate-300'}`}>
                        +{item.pts} pts
                      </div>
                      <div className="text-[9px] text-rose-300/80 mt-0.5">
                        -{dailyDecay}/day · 0@5d → score
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Description */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Description</h4>
          <p className="text-sm text-slate-200 leading-relaxed p-3.5 rounded-xl bg-[#0f1122] border border-[#1e2240]">
            {task.description || 'No detailed description provided for this work item.'}
          </p>
        </div>

        {/* ---------------------------------------------------- */}
        {/* DELIVERED PROOF OF WORK & ARTIFACT FILES */}
        {/* ---------------------------------------------------- */}
        {loadingProof && <ProofDeliverableSkeleton />}

        {!loadingProof && !submittedProof && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#090d1c] to-[#050711] border border-cyan-500/30 space-y-3.5 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-cyan-400 icon-anim" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                  Proof of Work Deliverable
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900/60 px-2.5 py-0.5 rounded-full border border-slate-700/40">
                Awaiting Submission
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-[#060914] p-3.5 rounded-xl border border-[#141b34]">
              No cryptographic proof of work or verification artifact files have been submitted for this work item yet.
            </p>
            {onRequestProofSubmit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestProofSubmit(task);
                }}
                className="btn-modern-primary px-4 py-2 text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Upload className="w-3.5 h-3.5 text-slate-950 icon-anim" />
                <span>Submit Deliverable & Attach Proof Files</span>
              </button>
            )}
          </div>
        )}

        {submittedProof && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#091124] to-[#050814] border border-cyan-500/35 space-y-4 shadow-xl shadow-cyan-950/30">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-cyan-400 icon-anim" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                  Delivered Proof of Work
                </h4>
                <ProofBadge status={submittedProof.status} />
              </div>
              <div className="text-xs text-slate-400">
                Submitted by <strong className="text-cyan-300">{users.find((u) => u.id === submittedProof.submittedById)?.name || submittedProof.submittedById}</strong> on{' '}
                {new Date(submittedProof.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Explanation & Methodology */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider font-semibold">
                Methodology & Verification Details
              </span>
              <p className="p-3.5 rounded-xl bg-[#060914] border border-[#141d3b] text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">
                {submittedProof.explanation}
              </p>
            </div>

            {/* Attached Proof Files & Artifacts */}
            <ProofFilesViewer
              attachments={submittedProof.attachments}
              attachmentIds={submittedProof.attachmentIds}
              projectId={task.projectId}
              onAttachFileClick={() => {
                onClose();
                if (onRequestProofSubmit) onRequestProofSubmit(task);
              }}
            />

            {/* Verified External Links */}
            {submittedProof.links && submittedProof.links.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase text-cyan-300 block tracking-wider font-semibold">
                  Verified Verification Links ({submittedProof.links.length})
                </span>
                <div className="space-y-1">
                  {submittedProof.links.map((link, lIdx) => (
                    <a
                      key={lIdx}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-[#060914] border border-[#141d3b] hover:border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs font-mono transition-all hover:-translate-y-0.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 icon-anim" />
                      <span className="truncate">{link}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Review Note Audit Trail */}
            {submittedProof.reviewNote && (
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5 font-mono">
                  <Shield className="w-3.5 h-3.5 icon-anim" />
                  <span>Lead Attestation Decision ({submittedProof.status.replace('_', ' ').toUpperCase()}):</span>
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">{submittedProof.reviewNote}</p>
              </div>
            )}

            {/* Replace & Resubmit Proof for Member / Assignee when changes requested or rejected */}
            {onRequestProofSubmit && (submittedProof.status === 'rejected' || submittedProof.status === 'changes_requested' || !isLeaderOrOwner) && (
              <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] text-amber-300 font-mono">
                  {submittedProof.status === 'rejected' || submittedProof.status === 'changes_requested'
                    ? '⚠️ Changes requested or proof rejected. Please replace with a verified deliverable.'
                    : 'Need to update your proof? You can replace it anytime before final leader approval.'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestProofSubmit(task);
                  }}
                  className="btn-modern-primary px-4 py-2 text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-950 icon-anim" />
                  <span>Replace & Resubmit Proof of Work</span>
                </button>
              </div>
            )}

            {/* Quick Leader Action button */}
            {isLeaderOrOwner && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onRequestProofReview) onRequestProofReview(submittedProof.id);
                  }}
                  className="btn-modern-pill px-4 py-2 text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-slate-950 icon-anim" />
                  <span>Open Attestation & Review Decision</span>
                </button>
              </div>
            )}
          </div>
        )}

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
                      <div className="text-right font-mono tabular-nums">
                        {(() => {
                          if (isSub && sub) {
                            const subDaysLate =
                              sub.daysLate ??
                              (sub.submittedAt
                                ? calculateDaysLate(task.dueDate, sub.submittedAt)
                                : sub.isLate
                                ? 1
                                : 0);
                            const subCalc = calculateTaskPoints(task.priority, subDaysLate, individualPts);
                            const subAwarded = sub.pointsAwarded ?? subCalc.pointsAwarded;
                            const subMemberDrain = sub.memberPenaltyApplied ?? subCalc.memberPointsDeducted;

                            if (subDaysLate > 0 || sub.isLate) {
                              if (subMemberDrain > 0) {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950 border border-rose-500/40 text-rose-300 text-[10px] font-medium"
                                    title={`Submitted ${subDaysLate}d late: 0 task pts and -${subMemberDrain} pts deducted from member total score`}
                                  >
                                    <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                    <span>Late ({subDaysLate}d) · 0 pts (-{subMemberDrain} score)</span>
                                  </span>
                                );
                              }
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950 border border-amber-500/40 text-amber-300 text-[10px] font-medium"
                                  title={`Submitted ${subDaysLate}d past deadline: +${subAwarded}/${individualPts} pts earned`}
                                >
                                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Late ({subDaysLate}d) · +{subAwarded} pts</span>
                                </span>
                              );
                            }

                            return (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-medium"
                                title="Submitted on time"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>Submitted (+{subAwarded} pts)</span>
                              </span>
                            );
                          }

                          const pendingDaysLate =
                            task.status === 'cancelled'
                              ? 0
                              : task.status === 'complete'
                              ? calculateDaysLate(task.dueDate, task.completedAt)
                              : calculateDaysLate(task.dueDate);
                          const pendingCalc = calculateTaskPoints(task.priority, pendingDaysLate, individualPts);

                          if (pendingDaysLate > 0) {
                            return pendingCalc.pointsAwarded === 0 ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-medium"
                                title={`Overdue ${pendingDaysLate}d: 0 task pts left, -${pendingCalc.memberPointsDeducted} pts deducted from member total score (-${pendingCalc.dailyPenaltyRate}/day)`}
                              >
                                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                <span>
                                  Overdue ({pendingDaysLate}d) · -{pendingCalc.memberPointsDeducted} score
                                </span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/75 border border-amber-500/40 text-amber-300 text-[10px] font-medium"
                                title={`Overdue ${pendingDaysLate}d: +${pendingCalc.pointsAwarded}/${individualPts} pts remaining (-${pendingCalc.dailyPenaltyRate}/day)`}
                              >
                                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>
                                  Overdue ({pendingDaysLate}d) · +{pendingCalc.pointsAwarded}/{individualPts} pts
                                </span>
                              </span>
                            );
                          }

                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Pending (+{individualPts} pts)</span>
                            </span>
                          );
                        })()}
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
            {isParticipant && (() => {
              const myLiveDaysLate = isMySubmissionCompleted
                ? (mySubmission?.daysLate ??
                  (mySubmission?.submittedAt ? calculateDaysLate(task.dueDate, mySubmission.submittedAt) : 0))
                : calculateDaysLate(task.dueDate);
              const myLiveCalc = calculateTaskPoints(task.priority, myLiveDaysLate, individualPts);
              const myDisplayPts = isMySubmissionCompleted
                ? (mySubmission?.pointsAwarded ?? myLiveCalc.pointsAwarded)
                : myLiveCalc.pointsAwarded;

              return (
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#131735] via-[#10132c] to-[#15112e] border border-purple-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                        {isMySubmissionCompleted ? 'Update Your Contribution' : 'Submit Your Contribution'}
                      </h5>
                    </div>
                    {myLiveDaysLate > 0 && !isMySubmissionCompleted && myLiveCalc.pointsAwarded === 0 ? (
                      <span className="text-xs font-mono tabular-nums font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                        0 Task Pts · -{myLiveCalc.memberPointsDeducted} Score Drain (-{myLiveCalc.dailyPenaltyRate}/d)
                      </span>
                    ) : (
                      <span className="text-xs font-mono tabular-nums font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                        +{myDisplayPts}/{individualPts} Points{myLiveDaysLate > 0 ? ` (${myLiveDaysLate}d late)` : ' Reward'}
                      </span>
                    )}
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

                    <div>
                      <label className="block text-slate-300 mb-1 font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                          <span>Attach Proof / Deliverable File (Optional)</span>
                        </span>
                      </label>
                      {groupFile ? (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-[#0e101c] border border-teal-500/30 text-teal-300 text-xs">
                          <span className="truncate max-w-[280px] font-mono">{groupFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setGroupFile(null)}
                            className="text-rose-400 hover:text-rose-300 ml-2"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#0c0e1c] border border-dashed border-[#232746] hover:border-purple-500/40 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors text-xs">
                          <Upload className="w-3.5 h-3.5 text-purple-400" />
                          <span>Upload artifact, screenshot, or log (Max 1GB)</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const selected = e.target.files?.[0];
                              if (!selected) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                setGroupFile({
                                  name: selected.name,
                                  mimeType: selected.type || 'application/octet-stream',
                                  dataUrl: reader.result as string,
                                });
                              };
                              reader.readAsDataURL(selected);
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingGroupPart || (!groupNote.trim() && !groupProofLinks.trim() && !groupFile)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/40 disabled:opacity-50 transition-all cursor-pointer tabular-nums"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {isMySubmissionCompleted
                            ? `Update Saved Contribution (+${myDisplayPts} pts)`
                            : myDisplayPts > 0
                            ? `Submit My Part & Claim +${myDisplayPts} Points`
                            : `Submit My Part (Stop -${myLiveCalc.dailyPenaltyRate}/day Score Drain)`}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}
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

        {/* Modal Footer Action Bar */}
        <div className="pt-4 mt-2 border-t border-[#1f223f] flex items-center justify-between gap-3">
          <div>
            {isLeaderOrOwner && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                disabled={isDeletingTask}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-600 border border-rose-500/45 hover:border-rose-400 text-rose-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingTask ? 'Deleting...' : 'Delete Task'}</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-modern-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>

    <ConfirmModal
      isOpen={isConfirmFinalizeOpen}
      onClose={() => setIsConfirmFinalizeOpen(false)}
      onConfirm={handleDoFinalize}
      title="Finalize Group Task"
      message={`Finalize this collaborative task and award the collective bonus (+${bonusPts} pts) to all ${participantIds.length} participants?`}
      confirmLabel={isFinalizingBonus ? 'Finalizing...' : 'Finalize & Award Bonus'}
    />

    <ConfirmModal
      isOpen={isConfirmDeleteOpen}
      onClose={() => setIsConfirmDeleteOpen(false)}
      onConfirm={handleDoDeleteTask}
      title="Delete Task"
      message={`Are you sure you want to permanently delete "${task.title}"? Any proof submissions attached to this task will also be removed. This action cannot be undone.`}
      confirmLabel={isDeletingTask ? 'Deleting...' : 'Delete Task'}
      destructive={true}
    />
  </>
  );
}
