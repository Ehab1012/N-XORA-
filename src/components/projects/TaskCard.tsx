import React from 'react';
import { Calendar, CheckSquare, FileCheck2, Users, Award, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { Task, User } from '../../../shared/types.js';
import { StatusBadge, PriorityBadge } from '../common/Badges.js';
import { useAuth } from '../../contexts/AuthContext.js';

interface TaskCardProps {
  key?: React.Key;
  task: Task;
  users: User[];
  onClick: () => void;
  onRequestProofSubmit?: (task: Task) => void;
  onOpenGroupSubmit?: (task: Task) => void;
}

export function TaskCard({ task, users, onClick, onRequestProofSubmit, onOpenGroupSubmit }: TaskCardProps) {
  const { user: currentUser } = useAuth();
  const assignee = users.find((u) => u.id === task.assigneeId);
  const checklistCompleted = task.checklist.filter((c) => c.isCompleted).length;
  const checklistTotal = task.checklist.length;

  const isOverdue = new Date(task.dueDate).getTime() < Date.now() && task.status !== 'complete';

  // Group task calculations
  const isGroup = !!task.isGroupTask;
  const participantIds = task.participantIds || [];
  const submissions = task.submissions || [];
  const submittedCount = submissions.filter((s) => s.status === 'submitted' || s.status === 'approved').length;
  const totalParticipants = participantIds.length;
  const currentMemberSubmitted = currentUser
    ? submissions.some((s) => s.userId === currentUser.id && (s.status === 'submitted' || s.status === 'approved'))
    : false;
  const isCurrentMemberParticipant = currentUser ? participantIds.includes(currentUser.id) : false;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl glass-panel border transition-all hover:translate-y-[-1px] space-y-3 cursor-pointer ${
        isGroup
          ? 'border-indigo-500/30 hover:border-indigo-400/60 bg-gradient-to-br from-[#12142d]/80 via-[#0d0f22]/90 to-[#14122d]/80'
          : 'border-[#1f223f] hover:border-purple-500/40'
      }`}
    >
      {/* Group task mission banner */}
      {isGroup && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-500/30 text-[11px] font-medium text-indigo-300">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold tracking-wide">Group Mission</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-amber-300 font-mono">
            <Award className="w-3 h-3 text-amber-400" />
            <span>
              +{task.individualPoints || 35} ea / +{task.groupBonusPoints || 60} team bonus
            </span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">{task.title}</h4>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {/* Progress & Submission indicators */}
      <div className="flex items-center justify-between gap-2 pt-1 text-xs">
        <StatusBadge status={task.status} />

        {isGroup ? (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium ${
                submittedCount === totalParticipants && totalParticipants > 0
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-950/50 text-indigo-300 border border-indigo-500/20'
              }`}
            >
              {submittedCount === totalParticipants && totalParticipants > 0 ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <Clock className="w-3 h-3 text-indigo-400" />
              )}
              <span>
                {submittedCount}/{totalParticipants} Ready
              </span>
            </span>

            {isCurrentMemberParticipant && !currentMemberSubmitted && task.status !== 'complete' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenGroupSubmit) onOpenGroupSubmit(task);
                  else onClick();
                }}
                className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 px-2 py-0.5 rounded border border-amber-500/40 transition-colors shadow-sm"
              >
                Submit My Part
              </button>
            )}
          </div>
        ) : task.proofSubmittedId ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-teal-400 font-medium">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Proof Filed</span>
          </span>
        ) : task.status === 'in_progress' || task.status === 'todo' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onRequestProofSubmit) onRequestProofSubmit(task);
            }}
            className="text-[11px] text-purple-400 hover:text-purple-300 hover:underline"
          >
            Submit Proof
          </button>
        ) : null}
      </div>

      {/* Footer / Assignees & Checklist */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1c1f38] text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          {checklistTotal > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <CheckSquare className="w-3 h-3 text-purple-400" />
              <span>
                {checklistCompleted}/{checklistTotal}
              </span>
            </span>
          )}

          <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-400 font-semibold' : ''}`}>
            <Calendar className="w-3 h-3" />
            <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </span>
        </div>

        {/* User Avatars: Multi-participant stack for group tasks, single avatar for regular tasks */}
        <div className="flex items-center gap-1.5">
          {isGroup ? (
            <div className="flex items-center -space-x-1.5" title={`Participants: ${participantIds.length} members`}>
              {participantIds.slice(0, 4).map((pId) => {
                const u = users.find((user) => user.id === pId);
                const sub = submissions.find((s) => s.userId === pId);
                const isSubDone = sub?.status === 'submitted' || sub?.status === 'approved';
                return (
                  <div
                    key={pId}
                    title={`${u?.name || pId} - ${isSubDone ? 'Contribution Submitted' : 'Pending Submission'}`}
                    className={`relative w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-transform hover:scale-110 ${
                      isSubDone
                        ? 'bg-emerald-900 border-emerald-400 text-emerald-200'
                        : 'bg-indigo-900 border-indigo-400/60 text-indigo-200'
                    }`}
                  >
                    {u?.name ? u.name[0] : pId[0]}
                    {isSubDone && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0d0f22]" />
                    )}
                  </div>
                );
              })}
              {participantIds.length > 4 && (
                <div className="w-5 h-5 rounded-full bg-[#1e2246] border border-[#2d3260] text-slate-300 flex items-center justify-center text-[8px] font-mono">
                  +{participantIds.length - 4}
                </div>
              )}
            </div>
          ) : assignee ? (
            <div
              title={`Assignee: ${assignee.name}`}
              className="w-5 h-5 rounded-full bg-purple-900 border border-purple-400/40 text-purple-200 flex items-center justify-center text-[10px] font-bold"
            >
              {assignee.name[0]}
            </div>
          ) : (
            <span className="text-slate-500 text-[10px]">Unassigned</span>
          )}
        </div>
      </div>
    </div>
  );
}
