import React from 'react';
import { Calendar, CheckSquare, FileCheck2, Users, Award, CheckCircle2, Clock, Upload, AlertTriangle, Trash2 } from 'lucide-react';
import { Task, User } from '../../../shared/types.js';
import { TASK_PRIORITY_POINTS, calculateDaysLate, calculateTaskPoints } from '../../../shared/const.js';
import { StatusBadge, PriorityBadge } from '../common/Badges.js';
import { useAuth } from '../../contexts/AuthContext.js';

interface TaskCardProps {
  key?: React.Key;
  task: Task;
  users: User[];
  onClick: () => void;
  onRequestProofSubmit?: (task: Task) => void;
  onOpenGroupSubmit?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

export function TaskCard({ task, users, onClick, onRequestProofSubmit, onOpenGroupSubmit, onDeleteTask }: TaskCardProps) {
  const { user: currentUser, role } = useAuth();
  const effectiveRole = role || currentUser?.role;
  const canDeleteTask = effectiveRole === 'leader' || effectiveRole === 'co-leader';
  const assignee = users.find((u) => u.id === task.assigneeId);
  const checklistCompleted = task.checklist.filter((c) => c.isCompleted).length;
  const checklistTotal = task.checklist.length;

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

  // Progressive daily penalty & member score overflow calculation
  const basePts = isGroup
    ? task.individualPoints || TASK_PRIORITY_POINTS[task.priority] || 35
    : TASK_PRIORITY_POINTS[task.priority] || 25;

  const completedDaysLate =
    task.status === 'complete'
      ? (task.daysLate ??
        (task.completedAt && task.dueDate
          ? calculateDaysLate(task.dueDate, task.completedAt)
          : task.isLate
          ? 1
          : 0))
      : 0;

  const activeRefDate =
    task.status === 'in_review' && task.proofSubmittedId ? task.updatedAt : undefined;
  const activeDaysLate =
    task.status !== 'complete' && task.status !== 'cancelled'
      ? calculateDaysLate(task.dueDate, activeRefDate)
      : 0;

  const isOverdue = activeDaysLate > 0;
  const pointCalc = calculateTaskPoints(
    task.priority,
    task.status === 'complete' ? completedDaysLate : activeDaysLate,
    basePts
  );
  const completedAwardedPts = task.pointsAwarded ?? pointCalc.pointsAwarded;
  const completedMemberDrain = task.memberPenaltyApplied ?? pointCalc.memberPointsDeducted;
  const remainingRatio =
    pointCalc.basePoints > 0
      ? Math.max(0, Math.min(100, Math.round((pointCalc.pointsAwarded / pointCalc.basePoints) * 100)))
      : 0;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl bg-[#060b1c]/85 backdrop-blur-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-950/40 space-y-3 cursor-pointer group select-none overflow-hidden relative ${
        isGroup
          ? 'border-indigo-500/35 hover:border-cyan-400/60 bg-gradient-to-br from-[#0e1634]/90 via-[#090e24]/90 to-[#121c38]/90'
          : 'border-cyan-500/20 hover:border-cyan-400/60 hover:bg-[#081028]/90'
      }`}
    >
      {/* Top card hover shimmer line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Group task mission banner */}
      {isGroup && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-medium text-cyan-200">
          <div className="flex items-center gap-1.5 shrink-0">
            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-semibold tracking-wide whitespace-nowrap">Group Mission</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-amber-300 font-mono tabular-nums">
            <Award className="w-3 h-3 text-amber-400 shrink-0" />
            <span>
              +{task.individualPoints || 35} ea · +{task.groupBonusPoints || 60} bonus
            </span>
          </div>
        </div>
      )}

      {/* Header: Title + Delete (for Leader & Co-Leader) */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors line-clamp-2 min-w-0 flex-1 leading-snug">
          {task.title}
        </h4>
        {canDeleteTask && onDeleteTask && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTask(task);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            title="Delete task (Leader & Co-Leader only)"
            aria-label={`Delete task ${task.title}`}
          >
            <Trash2 className="w-3 h-3 shrink-0" />
            <span>Delete</span>
          </button>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {/* Priority Points & Progressive Daily Late Penalty status */}
      {task.status === 'complete' ? (
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums pt-0.5 min-w-0">
          {completedDaysLate > 0 || task.isLate ? (
            completedMemberDrain > 0 ? (
              <span
                className="inline-flex items-center gap-1.5 text-rose-300 truncate min-w-0"
                title={`Completed ${completedDaysLate} day(s) late: task points reduced to 0 and -${completedMemberDrain} pts deducted from ${isGroup ? 'each late member' : 'assigned member'} total score`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">
                  Late ({completedDaysLate}d) · 0 task pts · -{completedMemberDrain} {isGroup ? 'pts/member' : 'member pts'}
                </span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-amber-300 truncate min-w-0"
                title={`Completed ${completedDaysLate} day(s) late: +${completedAwardedPts} pts awarded (-${pointCalc.taskPointsDeducted} task pts eaten)`}
              >
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">
                  Late ({completedDaysLate}d) · +{completedAwardedPts}/{pointCalc.basePoints} pts (-{pointCalc.dailyPenaltyRate}/d)
                </span>
              </span>
            )
          ) : (
            <span
              className="inline-flex items-center gap-1.5 text-emerald-300 truncate min-w-0"
              title={`Completed on time: +${completedAwardedPts} pts (+15 on-time bonus)`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">On Time · +{completedAwardedPts} pts (+15 bonus)</span>
            </span>
          )}
        </div>
      ) : isOverdue ? (
        pointCalc.pointsAwarded > 0 ? (
          <div
            className="px-2.5 py-1.5 rounded-lg bg-amber-950/45 border border-amber-500/35 space-y-1.5 text-[10px] font-mono tabular-nums text-amber-200 min-w-0"
            title={`Day ${activeDaysLate} past due: -${pointCalc.dailyPenaltyRate} pts/day eats task points until 0, then deducts from ${isGroup ? 'assigned members' : 'assigned member'} total points`}
          >
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1 text-amber-300 font-semibold truncate min-w-0">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">Day {activeDaysLate} late · +{pointCalc.pointsAwarded}/{pointCalc.basePoints} pts left</span>
              </span>
              <span className="text-rose-300 shrink-0">-{pointCalc.dailyPenaltyRate}/d</span>
            </div>
            <div className="w-full h-1 rounded-full bg-[#141933] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all"
                style={{ width: `${remainingRatio}%` }}
              />
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[10px] font-mono tabular-nums text-rose-200 min-w-0"
            title={
              pointCalc.memberPointsDeducted > 0
                ? `Task points reached 0 on Day 5. Currently deducting -${pointCalc.memberPointsDeducted} pts (-${pointCalc.dailyPenaltyRate}/day) directly from ${isGroup ? 'overdue assigned members' : 'assigned member'} total points`
                : `Task points depleted to 0/${pointCalc.basePoints}. Starting tomorrow, -${pointCalc.dailyPenaltyRate} pts/day deducts from ${isGroup ? 'overdue assigned members' : 'assigned member'} total points`
            }
          >
            <span className="inline-flex items-center gap-1.5 truncate min-w-0 font-semibold text-rose-300">
              <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="truncate">
                {pointCalc.memberPointsDeducted > 0
                  ? `Day ${activeDaysLate} late · 0 task pts · -${pointCalc.memberPointsDeducted} ${isGroup ? 'pts/member' : 'member pts'}`
                  : `Day ${activeDaysLate} late · 0/${pointCalc.basePoints} task pts (next: -${pointCalc.dailyPenaltyRate} score/d)`}
              </span>
            </span>
            <span className="text-rose-300/90 shrink-0">-{pointCalc.dailyPenaltyRate}/d</span>
          </div>
        )
      ) : null}

      {/* Progress, Priority & Submission indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>

        {isGroup ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md font-medium whitespace-nowrap shrink-0 tabular-nums ${
                submittedCount === totalParticipants && totalParticipants > 0
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-950/50 text-indigo-300 border border-indigo-500/20'
              }`}
            >
              {submittedCount === totalParticipants && totalParticipants > 0 ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
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
                className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 px-2.5 py-1 rounded-lg border border-amber-500/40 whitespace-nowrap shrink-0 transition-colors shadow-sm cursor-pointer"
              >
                Submit Part
              </button>
            )}
          </div>
        ) : task.proofSubmittedId ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="inline-flex items-center gap-1.5 text-[11px] text-cyan-200 hover:text-white font-semibold bg-cyan-950/70 hover:bg-cyan-900/80 px-2.5 py-1.5 sm:py-1 rounded-lg border border-cyan-500/40 hover:border-cyan-400 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            title="Inspect submitted deliverable & proof files"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>View Proof</span>
          </button>
        ) : task.status === 'in_progress' || task.status === 'todo' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onRequestProofSubmit) onRequestProofSubmit(task);
            }}
            className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-100 bg-cyan-950/35 hover:bg-cyan-950/60 px-2.5 py-1.5 sm:py-1 rounded-lg border border-cyan-500/25 hover:border-cyan-400/50 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Upload className="w-3 h-3 shrink-0" />
            <span>Submit Proof</span>
          </button>
        ) : null}
      </div>

      {/* Footer / Assignees & Checklist */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1c1f38] text-[11px] text-slate-400 font-mono tabular-nums min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          {checklistTotal > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-400 whitespace-nowrap shrink-0">
              <CheckSquare className="w-3 h-3 text-purple-400 shrink-0" />
              <span>
                {checklistCompleted}/{checklistTotal}
              </span>
            </span>
          )}

          <span className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${isOverdue ? 'text-rose-400 font-semibold' : ''}`}>
            <Calendar className="w-3 h-3 shrink-0" />
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
