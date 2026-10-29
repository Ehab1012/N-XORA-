import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Download,
  Search,
  X,
  RotateCcw,
  Kanban,
  ListOrdered,
  LayoutGrid,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Calendar,
  CheckSquare,
  FileCheck2,
  Sparkles,
  Layers,
  Trash2,
  Maximize2,
  Minimize2,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Task, User, Milestone } from '../../../shared/types.js';
import {
  TaskStatus,
  TaskPriority,
  TASK_PRIORITIES,
  TASK_PRIORITY_POINTS,
  calculateDaysLate,
  calculateTaskPoints,
} from '../../../shared/const.js';
import { StatusBadge } from '../common/Badges.js';
import { ConfirmModal } from '../common/Modal.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';

interface TaskManagementViewProps {
  projectId: string;
  tasks: Task[];
  users: User[];
  milestones: Milestone[];
  onTaskClick: (task: Task) => void;
  onRequestProofSubmit?: (task: Task) => void;
  onTasksChanged: () => void;
  onOpenCreateTask: (defaultStatus?: TaskStatus, defaultPriority?: TaskPriority) => void;
  onDownloadReport: () => void;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (s: string) => void;
}

type ViewMode = 'list' | 'kanban' | 'priority' | 'ranked_list' | 'grid';

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badge: string; points: string; border: string; bg: string; text: string; lightBg: string }
> = {
  urgent: {
    label: 'Urgent Priority (P0)',
    badge: 'Urgent',
    points: '+60 pts',
    border: 'border-rose-500/40 hover:border-rose-500/80',
    bg: 'bg-rose-950/20',
    text: 'text-rose-400',
    lightBg: 'bg-rose-500/10',
  },
  high: {
    label: 'High Priority (P1)',
    badge: 'High',
    points: '+40 pts',
    border: 'border-amber-500/40 hover:border-amber-500/80',
    bg: 'bg-amber-950/20',
    text: 'text-amber-400',
    lightBg: 'bg-amber-500/10',
  },
  medium: {
    label: 'Medium Priority (P2)',
    badge: 'Medium',
    points: '+25 pts',
    border: 'border-indigo-500/40 hover:border-indigo-500/80',
    bg: 'bg-indigo-950/20',
    text: 'text-indigo-400',
    lightBg: 'bg-indigo-500/10',
  },
  low: {
    label: 'Low Priority (P3)',
    badge: 'Low',
    points: '+15 pts',
    border: 'border-slate-600/40 hover:border-slate-500/80',
    bg: 'bg-slate-900/40',
    text: 'text-slate-400',
    lightBg: 'bg-slate-500/10',
  },
};

const STATUS_COLUMNS: Array<{
  id: TaskStatus;
  title: string;
  mobileTitle: string;
  description: string;
  color: string;
  dotColor: string;
  activeBorder: string;
  activeBg: string;
}> = [
  {
    id: 'backlog',
    title: 'Backlog',
    mobileTitle: 'Backlog',
    description: 'Queued ideas and unscheduled work items awaiting sprint selection.',
    color: 'text-slate-300',
    dotColor: 'bg-slate-400',
    activeBorder: 'border-slate-400/60',
    activeBg: 'bg-slate-800/75',
  },
  {
    id: 'todo',
    title: 'To Do',
    mobileTitle: 'To Do',
    description: 'Committed tasks ready to be picked up and executed.',
    color: 'text-sky-300',
    dotColor: 'bg-sky-400',
    activeBorder: 'border-sky-400/60',
    activeBg: 'bg-sky-950/65',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    mobileTitle: 'In Prog.',
    description: 'Active work items currently under execution by assignees.',
    color: 'text-amber-300',
    dotColor: 'bg-amber-400',
    activeBorder: 'border-amber-400/60',
    activeBg: 'bg-amber-950/55',
  },
  {
    id: 'in_review',
    title: 'In Review',
    mobileTitle: 'Review',
    description: 'Submitted deliverables and proofs awaiting verification.',
    color: 'text-purple-300',
    dotColor: 'bg-purple-400',
    activeBorder: 'border-purple-400/60',
    activeBg: 'bg-purple-950/65',
  },
  {
    id: 'blocked',
    title: 'Blocked',
    mobileTitle: 'Blocked',
    description: 'Items paused on external dependencies or technical blockers.',
    color: 'text-rose-300',
    dotColor: 'bg-rose-400',
    activeBorder: 'border-rose-400/60',
    activeBg: 'bg-rose-950/60',
  },
  {
    id: 'complete',
    title: 'Complete',
    mobileTitle: 'Complete',
    description: 'Verified and closed deliverables credited toward project progress.',
    color: 'text-teal-300',
    dotColor: 'bg-teal-400',
    activeBorder: 'border-teal-400/60',
    activeBg: 'bg-teal-950/60',
  },
];

export function TaskManagementView({
  projectId,
  tasks,
  users,
  milestones,
  onTaskClick,
  onRequestProofSubmit,
  onTasksChanged,
  onOpenCreateTask,
  onDownloadReport,
  searchQuery: propsSearchQuery,
  onSearchQueryChange,
  statusFilter: propsStatusFilter,
  onStatusFilterChange,
}: TaskManagementViewProps) {
  const { user, role } = useAuth();
  const effectiveRole = role || user?.role;
  const isLeaderOrOwner = effectiveRole === 'leader' || effectiveRole === 'co-leader';
  const canDeleteTask = effectiveRole === 'leader' || effectiveRole === 'co-leader';

  // Opens on Focused Status List mode with "To Do" ('todo') as the initial list on both phone & desktop
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedList, setSelectedList] = useState<TaskStatus>(() => {
    if (propsStatusFilter && STATUS_COLUMNS.some((c) => c.id === propsStatusFilter)) {
      return propsStatusFilter as TaskStatus;
    }
    return 'todo';
  });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>('all');

  const searchQuery = propsSearchQuery !== undefined ? propsSearchQuery : internalSearchQuery;
  const setSearchQuery = onSearchQueryChange || setInternalSearchQuery;

  const statusFilter = propsStatusFilter !== undefined ? propsStatusFilter : internalStatusFilter;
  const setStatusFilter = onStatusFilterChange || setInternalStatusFilter;

  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('all');

  // Sync external status jump (e.g. from Project Overview) into selectedList
  useEffect(() => {
    if (propsStatusFilter && propsStatusFilter !== 'all' && STATUS_COLUMNS.some((c) => c.id === propsStatusFilter)) {
      setSelectedList(propsStatusFilter as TaskStatus);
      if (onStatusFilterChange) {
        onStatusFilterChange('all');
      }
    }
  }, [propsStatusFilter, onStatusFilterChange]);

  // Handle Escape key and body scroll lock for Full-Screen List mode
  useEffect(() => {
    if (!isFullScreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const openDialogs = document.querySelectorAll('[role="dialog"]');
        if (openDialogs.length > 0) return;
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverPriority, setDragOverPriority] = useState<string | null>(null);
  const [, setIsUpdating] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Local ordering storage for custom ranking
  const [customRankOrder, setCustomRankOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`nexora_task_ranks_${projectId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const updateRankOrder = (newOrder: string[]) => {
    setCustomRankOrder(newOrder);
    try {
      localStorage.setItem(`nexora_task_ranks_${projectId}`, JSON.stringify(newOrder));
    } catch {
      // ignore
    }
  };

  const secondaryFilterCount =
    (priorityFilter !== 'all' ? 1 : 0) +
    (assigneeFilter !== 'all' ? 1 : 0) +
    (milestoneFilter !== 'all' ? 1 : 0) +
    (viewMode !== 'list' && statusFilter !== 'all' ? 1 : 0);

  const hasActiveFilters = !!searchQuery.trim() || secondaryFilterCount > 0;

  const resetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setMilestoneFilter('all');
  };

  // Debounce search query
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Memoize users lookup map
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  // Base filtered tasks (without status filter so each Status List tab displays accurate live counts)
  const baseFilteredTasks = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.status.toLowerCase().includes(query) ||
        task.status.replace(/_/g, ' ').toLowerCase().includes(query) ||
        (task.tags && task.tags.some((t) => t.toLowerCase().includes(query)));

      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesAssignee =
        assigneeFilter === 'all' ||
        (assigneeFilter === 'unassigned' ? !task.assigneeId : task.assigneeId === assigneeFilter);
      const matchesMilestone =
        milestoneFilter === 'all' ||
        (milestoneFilter === 'unassigned' ? !task.milestoneId : task.milestoneId === milestoneFilter);

      return matchesSearch && matchesPriority && matchesAssignee && matchesMilestone;
    });
  }, [tasks, debouncedSearch, priorityFilter, assigneeFilter, milestoneFilter]);

  // Filtered tasks applying statusFilter for multi-view modes
  const filteredTasks = useMemo(() => {
    if (viewMode === 'list' || statusFilter === 'all') return baseFilteredTasks;
    return baseFilteredTasks.filter((task) => task.status === statusFilter);
  }, [baseFilteredTasks, statusFilter, viewMode]);

  // Counts per status list
  const listCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const col of STATUS_COLUMNS) {
      counts[col.id] = 0;
    }
    for (const t of baseFilteredTasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [baseFilteredTasks]);

  // Ranked tasks
  const rankedTasks = useMemo(() => {
    const priorityWeight: Record<TaskPriority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return [...filteredTasks].sort((a, b) => {
      const indexA = customRankOrder.indexOf(a.id);
      const indexB = customRankOrder.indexOf(b.id);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      const weightDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredTasks, customRankOrder]);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
    setDragOverPriority(null);
  };

  const handleDropOnStatus = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    setIsUpdating(true);
    try {
      await api.updateTask(taskId, { status: targetStatus });
      onTasksChanged();
    } catch (err) {
      console.error('Failed to update task status via drag-and-drop:', err);
    } finally {
      setIsUpdating(false);
      setDraggedTaskId(null);
    }
  };

  const handleDropOnPriority = async (e: React.DragEvent, targetPriority: TaskPriority) => {
    e.preventDefault();
    setDragOverPriority(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.priority === targetPriority) return;

    setIsUpdating(true);
    try {
      await api.updateTask(taskId, { priority: targetPriority });
      onTasksChanged();
    } catch (err) {
      console.error('Failed to update task priority via drag-and-drop:', err);
    } finally {
      setIsUpdating(false);
      setDraggedTaskId(null);
    }
  };

  const handleDropOnRankedItem = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const sourceTaskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!sourceTaskId || sourceTaskId === targetTaskId) return;

    const currentOrder = rankedTasks.map((t) => t.id);
    const fromIndex = currentOrder.indexOf(sourceTaskId);
    const toIndex = currentOrder.indexOf(targetTaskId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const newOrder = [...currentOrder];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      updateRankOrder(newOrder);
    }
    setDraggedTaskId(null);
  };

  const handleQuickPriorityChange = useCallback(
    async (taskId: string, newPriority: TaskPriority) => {
      setIsUpdating(true);
      try {
        await api.updateTask(taskId, { priority: newPriority });
        onTasksChanged();
      } catch (err) {
        console.error('Failed to change priority:', err);
      } finally {
        setIsUpdating(false);
      }
    },
    [onTasksChanged]
  );

  const handleQuickStatusChange = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      setIsUpdating(true);
      try {
        await api.updateTask(taskId, { status: newStatus });
        onTasksChanged();
      } catch (err) {
        console.error('Failed to change status:', err);
      } finally {
        setIsUpdating(false);
      }
    },
    [onTasksChanged]
  );

  const handleMoveStatus = useCallback(
    async (taskId: string, direction: 'prev' | 'next') => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const statusOrder: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'complete'];
      const currentIndex = statusOrder.indexOf(task.status);
      if (currentIndex === -1) return;

      const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (newIndex < 0 || newIndex >= statusOrder.length) return;

      const nextStatus = statusOrder[newIndex];
      setIsUpdating(true);
      try {
        await api.updateTask(taskId, { status: nextStatus });
        onTasksChanged();
      } catch (err) {
        console.error('Failed to transition status:', err);
      } finally {
        setIsUpdating(false);
      }
    },
    [tasks, onTasksChanged]
  );

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    const targetId = taskToDelete.id;
    setIsDeletingTask(true);
    try {
      await api.deleteTask(targetId);
      if (customRankOrder.includes(targetId)) {
        updateRankOrder(customRankOrder.filter((id) => id !== targetId));
      }
      onTasksChanged();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsDeletingTask(false);
      setTaskToDelete(null);
    }
  };

  const activeColConfig = STATUS_COLUMNS.find((c) => c.id === selectedList) || STATUS_COLUMNS[1];
  const activeListTasks = useMemo(
    () => baseFilteredTasks.filter((t) => t.status === selectedList),
    [baseFilteredTasks, selectedList]
  );

  // Clean, strictly-contained Task Card — zero protruding buttons on phone (320px+) or desktop
  const renderDraggableCard = (task: Task, index?: number, showRankBadge = false) => {
    const assignee = task.assigneeId ? userMap.get(task.assigneeId) : undefined;
    const checklistCompleted = task.checklist.filter((c) => c.isCompleted).length;
    const checklistTotal = task.checklist.length;
    const isDragging = draggedTaskId === task.id;

    const isGroup = !!task.isGroupTask;
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
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        onClick={() => onTaskClick(task)}
        className={`group relative w-full min-w-0 max-w-full p-3.5 sm:p-4 rounded-xl bg-[#090e22]/90 border flex flex-col justify-between gap-3 transition-colors duration-150 cursor-pointer overflow-hidden ${
          isDragging
            ? 'opacity-40 border-cyan-400 ring-2 ring-cyan-500/40'
            : 'border-[#1d2546] hover:border-cyan-500/50 hover:bg-[#0c132d]/95 active:bg-[#0f1736]'
        }`}
      >
        <div className="space-y-2 min-w-0">
          {/* Header Row: Drag Handle (desktop), Rank, Readable Title, Contained Delete Button */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex items-start gap-1.5 min-w-0 flex-1">
              <div
                className="hidden sm:block cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-0.5 mt-0.5 rounded transition-colors shrink-0"
                title="Drag to move or reorder"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-4 h-4" />
              </div>

              {showRankBadge && typeof index === 'number' && (
                <span className="shrink-0 mt-0.5 text-xs font-mono font-semibold text-cyan-300 tabular-nums">
                  #{index + 1}
                </span>
              )}

              <h4 className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2 break-words group-hover:text-cyan-200 transition-colors min-w-0 flex-1">
                {task.title}
              </h4>
            </div>

            {canDeleteTask && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTaskToDelete(task);
                }}
                className="shrink-0 min-h-[32px] sm:min-h-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-600 active:bg-rose-600 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
                title="Delete task (Leader & Co-Leader only)"
                aria-label={`Delete task ${task.title}`}
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                <span>Delete</span>
              </button>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed sm:pl-5">
              {task.description}
            </p>
          )}

          {/* Clean Inline Unboxed Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:pl-5 text-[11px] font-mono text-slate-400">
              {task.tags.map((tag, i) => (
                <React.Fragment key={tag}>
                  {i > 0 && <span aria-hidden="true" className="text-slate-600">·</span>}
                  <span className="truncate max-w-[140px]">#{tag}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Progressive Daily Penalty / Merit Outcome Indicator */}
          {task.status === 'complete' ? (
            <div className="sm:pl-5 pt-0.5 text-[11px] font-mono tabular-nums min-w-0">
              {completedDaysLate > 0 || task.isLate ? (
                completedMemberDrain > 0 ? (
                  <div
                    className="inline-flex items-center gap-1.5 text-rose-300 max-w-full min-w-0"
                    title={`Completed ${completedDaysLate}d late: task points reached 0 and -${completedMemberDrain} pts deducted from ${isGroup ? 'each late member' : 'assigned member'} total score`}
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="truncate">
                      Late ({completedDaysLate}d) · 0 task pts · -{completedMemberDrain} {isGroup ? 'pts/member' : 'member pts'}
                    </span>
                  </div>
                ) : (
                  <div
                    className="inline-flex items-center gap-1.5 text-amber-300 max-w-full min-w-0"
                    title={`Completed ${completedDaysLate}d late: +${completedAwardedPts}/${pointCalc.basePoints} pts awarded (-${pointCalc.taskPointsDeducted} task pts eaten)`}
                  >
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">
                      Late ({completedDaysLate}d) · +{completedAwardedPts}/{pointCalc.basePoints} pts (-{pointCalc.dailyPenaltyRate}/d)
                    </span>
                  </div>
                )
              ) : (
                <div className="inline-flex items-center gap-1.5 text-emerald-300 max-w-full min-w-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">On Time · +{completedAwardedPts} pts (+15 bonus)</span>
                </div>
              )}
            </div>
          ) : isOverdue ? (
            <div className="sm:pl-5 pt-0.5 min-w-0">
              {pointCalc.pointsAwarded > 0 ? (
                <div
                  className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/35 space-y-1 text-[10px] font-mono tabular-nums text-amber-200 min-w-0"
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
                  className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/55 border border-rose-500/40 text-[10px] font-mono tabular-nums text-rose-200 min-w-0"
                  title={
                    pointCalc.memberPointsDeducted > 0
                      ? `Task points reached 0 on Day 5. Deducting -${pointCalc.memberPointsDeducted} pts (-${pointCalc.dailyPenaltyRate}/day) directly from ${isGroup ? 'overdue assigned members' : 'assigned member'} total points`
                      : `Task points depleted to 0/${pointCalc.basePoints}. Next day deducts -${pointCalc.dailyPenaltyRate} pts/day from ${isGroup ? 'overdue assigned members' : 'assigned member'} total points`
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
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-2.5 min-w-0">
          {/* Contained 2-Column Status & Priority Controls (Touch-friendly 40px height on Phone) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="grid grid-cols-2 gap-2 w-full min-w-0 pt-0.5"
          >
            <select
              value={task.status}
              onChange={(e) => handleQuickStatusChange(task.id, e.target.value as TaskStatus)}
              aria-label="Change task status list"
              className="w-full min-w-0 min-h-[38px] sm:min-h-0 truncate text-xs sm:text-[11px] font-medium px-2.5 py-2 sm:py-1.5 rounded-lg border border-[#222b52] bg-[#070b1a] text-slate-200 hover:border-cyan-500/40 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {STATUS_COLUMNS.map((st) => (
                <option key={st.id} value={st.id} className="bg-[#0b0f22] text-slate-200">
                  {st.title}
                </option>
              ))}
            </select>

            <select
              value={task.priority}
              onChange={(e) => handleQuickPriorityChange(task.id, e.target.value as TaskPriority)}
              aria-label="Change task priority"
              className={`w-full min-w-0 min-h-[38px] sm:min-h-0 truncate text-xs sm:text-[11px] font-semibold px-2.5 py-2 sm:py-1.5 rounded-lg border bg-[#070b1a] cursor-pointer focus:outline-none ${
                task.priority === 'urgent'
                  ? 'text-rose-300 border-rose-500/40'
                  : task.priority === 'high'
                  ? 'text-amber-300 border-amber-500/40'
                  : task.priority === 'medium'
                  ? 'text-indigo-300 border-indigo-500/40'
                  : 'text-slate-300 border-slate-600/40'
              }`}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p} className="bg-[#0b0f22] text-slate-200">
                  {PRIORITY_CONFIG[p].badge} ({PRIORITY_CONFIG[p].points})
                </option>
              ))}
            </select>
          </div>

          {/* Footer: Due Date & Checklist on Left, Proof Action, Step Movers & Assignee on Right */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#18203e] text-[11px] text-slate-400 font-mono tabular-nums min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                  isOverdue ? 'text-rose-400 font-semibold' : ''
                }`}
              >
                <Calendar className="w-3 h-3 shrink-0" />
                <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </span>

              {checklistTotal > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1 text-slate-400 whitespace-nowrap shrink-0">
                    <CheckSquare className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>
                      {checklistCompleted}/{checklistTotal}
                    </span>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
              {task.proofSubmittedId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick(task);
                  }}
                  className="min-h-[32px] sm:min-h-0 inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-cyan-200 hover:text-white bg-cyan-950/70 hover:bg-cyan-900/80 px-2.5 py-1 rounded-lg border border-cyan-500/40 hover:border-cyan-400 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  title="Inspect deliverable & proof files"
                >
                  <FileCheck2 className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>View Proof</span>
                </button>
              ) : task.status === 'in_progress' || task.status === 'todo' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRequestProofSubmit) onRequestProofSubmit(task);
                  }}
                  className="min-h-[32px] sm:min-h-0 inline-flex items-center gap-1 text-[11px] font-sans font-medium text-cyan-300 hover:text-cyan-100 bg-cyan-950/35 hover:bg-cyan-950/65 px-2.5 py-1 rounded-lg border border-cyan-500/25 hover:border-cyan-400/50 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>Submit Proof</span>
                </button>
              ) : null}

              {/* Step Mover Controls (Touch-ready on Phone + Desktop) */}
              <div className="flex items-center bg-[#0d1228] border border-[#222b52] rounded-lg p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveStatus(task.id, 'prev');
                  }}
                  title="Move to previous list"
                  aria-label="Move task to previous list"
                  className="min-h-[28px] min-w-[28px] sm:min-h-0 sm:min-w-0 p-1 sm:p-0.5 flex items-center justify-center text-slate-400 hover:text-white active:text-cyan-300 rounded hover:bg-[#192246] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveStatus(task.id, 'next');
                  }}
                  title="Advance to next list"
                  aria-label="Advance task to next list"
                  className="min-h-[28px] min-w-[28px] sm:min-h-0 sm:min-w-0 p-1 sm:p-0.5 flex items-center justify-center text-slate-400 hover:text-white active:text-cyan-300 rounded hover:bg-[#192246] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
              </div>

              {assignee ? (
                <div
                  title={`Assignee: ${assignee.name} (${assignee.role})`}
                  className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-400/40 text-cyan-200 flex items-center justify-center text-[10px] font-sans font-bold shrink-0"
                >
                  {assignee.name[0]}
                </div>
              ) : (
                <span className="text-slate-500 font-sans text-[11px] whitespace-nowrap">Unassigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Interactive Status List Selector:
  // - Phone (< sm): Zero-scroll 3x2 tactile chooser grid showing all 6 lists at once + full-width Full Screen action
  // - Tablet/Desktop (sm+): Clean segmented tabs with drag-and-drop + Full Screen toggle
  const renderListSelectorBar = (inFullScreenMode = false) => (
    <div className="p-2.5 sm:p-3 rounded-2xl bg-[#070b1c]/95 border border-[#1d2546] space-y-2.5 sm:space-y-0 sm:flex sm:flex-col xl:flex-row xl:items-center sm:justify-between sm:gap-3">
      {/* Phone 3x2 Tactile List Chooser Grid (< sm) */}
      <div className="grid grid-cols-3 gap-1.5 sm:hidden">
        {STATUS_COLUMNS.map((col) => {
          const isSelected = selectedList === col.id;
          const count = listCounts[col.id] || 0;

          return (
            <button
              key={col.id}
              type="button"
              onClick={() => {
                setSelectedList(col.id);
                if (viewMode !== 'list' && !inFullScreenMode) {
                  setViewMode('list');
                }
              }}
              className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-left flex items-center justify-between gap-1 transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                isSelected
                  ? `${col.activeBg} ${col.activeBorder} text-white shadow-sm`
                  : 'bg-[#0b1128]/70 border-[#182142] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${col.dotColor}`} />
                <span className="text-[11px] font-semibold truncate">{col.mobileTitle}</span>
              </div>
              <span
                className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded shrink-0 ${
                  isSelected ? 'bg-black/40 text-white font-bold' : 'bg-[#121a3a] text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tablet / Desktop Segmented Status Tabs (sm+) */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 xl:pb-0">
        {STATUS_COLUMNS.map((col) => {
          const isSelected = selectedList === col.id;
          const isDropTarget = dragOverColumn === col.id;
          const count = listCounts[col.id] || 0;

          return (
            <button
              key={col.id}
              type="button"
              onClick={() => {
                setSelectedList(col.id);
                if (viewMode !== 'list' && !inFullScreenMode) {
                  setViewMode('list');
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverColumn !== col.id) setDragOverColumn(col.id);
              }}
              onDragLeave={() => {
                if (dragOverColumn === col.id) setDragOverColumn(null);
              }}
              onDrop={(e) => handleDropOnStatus(e, col.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border transition-all duration-150 cursor-pointer ${
                isDropTarget
                  ? 'bg-cyan-950/70 border-cyan-400 text-white ring-2 ring-cyan-400/40'
                  : isSelected
                  ? `${col.activeBg} ${col.activeBorder} text-white shadow-sm`
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101735]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${col.dotColor}`} />
              <span>{col.title}</span>
              <span
                className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-black/35 text-white' : 'bg-[#111834] text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Full Screen Toggle Action (Full-width 44px CTA on Phone outside full screen; inline on sm+) */}
      {!inFullScreenMode ? (
        <button
          type="button"
          onClick={() => setIsFullScreen(true)}
          className="w-full sm:w-auto min-h-[42px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border bg-cyan-950/70 hover:bg-cyan-900/80 active:bg-cyan-900 border-cyan-500/45 hover:border-cyan-400 text-cyan-200 hover:text-white transition-colors cursor-pointer"
          title={`Open ${activeColConfig.title} list in Full Screen`}
        >
          <Maximize2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Open {activeColConfig.title} in Full Screen</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsFullScreen(false)}
          className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border bg-slate-800/90 hover:bg-slate-700 border-slate-600 text-slate-100 transition-colors cursor-pointer"
          title="Exit Full Screen (Esc)"
        >
          <Minimize2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
          <span>Exit Full Screen</span>
        </button>
      )}
    </div>
  );

  // Active Single-List Panel Content (used in both Default Focused List View and Full-Screen Portal)
  const renderFocusedListPanel = (inFullScreenMode = false) => {
    const isDropTarget = dragOverColumn === activeColConfig.id;

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (dragOverColumn !== activeColConfig.id) setDragOverColumn(activeColConfig.id);
        }}
        onDragLeave={() => {
          if (dragOverColumn === activeColConfig.id) setDragOverColumn(null);
        }}
        onDrop={(e) => handleDropOnStatus(e, activeColConfig.id)}
        className={`rounded-2xl border p-3.5 sm:p-6 flex flex-col justify-between gap-4 sm:gap-5 transition-colors duration-150 overflow-hidden ${
          isDropTarget
            ? 'bg-cyan-950/20 border-cyan-400 ring-2 ring-cyan-500/30'
            : 'bg-[#080d1f]/90 border-[#1d2546]'
        } ${inFullScreenMode ? 'min-h-[calc(100dvh-250px)]' : 'min-h-[360px] sm:min-h-[420px]'}`}
      >
        <div className="space-y-4 sm:space-y-5 min-w-0">
          {/* Focused List Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 sm:pb-4 border-b border-[#18203e]">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeColConfig.dotColor}`} />
                <h3 className={`text-base sm:text-lg font-display font-bold tracking-tight truncate ${activeColConfig.color}`}>
                  {activeColConfig.title} List
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap shrink-0">
                  · {activeListTasks.length} {activeListTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{activeColConfig.description}</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {!inFullScreenMode && (
                <button
                  type="button"
                  onClick={() => setIsFullScreen(true)}
                  className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-[#0e1530] hover:bg-[#141e42] border border-[#24305e] hover:border-cyan-500/45 text-slate-200 hover:text-white text-xs font-medium items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Full Screen</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenCreateTask(activeColConfig.id)}
                className="btn-modern-primary w-full sm:w-auto min-h-[42px] sm:min-h-0 px-3.5 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                <span>Add {activeColConfig.title} Task</span>
              </button>
            </div>
          </div>

          {/* Tasks Grid */}
          {activeListTasks.length > 0 ? (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 ${
                inFullScreenMode ? 'xl:grid-cols-3 2xl:grid-cols-4' : 'xl:grid-cols-3'
              } gap-3 sm:gap-4 items-stretch`}
            >
              {activeListTasks.map((task) => renderDraggableCard(task))}
            </div>
          ) : (
            <div
              onClick={() => onOpenCreateTask(activeColConfig.id)}
              className="py-12 sm:py-16 px-4 sm:px-6 border border-dashed border-[#232d56] hover:border-cyan-500/45 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer bg-[#060a18]/60 hover:bg-[#0a1026]/80 active:bg-[#0d1430] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0f1734] border border-[#24305e] flex items-center justify-center text-cyan-400">
                <Plus className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  No tasks in {activeColConfig.title}
                </p>
                <p className="text-xs text-slate-400 max-w-md">
                  Tap here to create a new {activeColConfig.title.toLowerCase()} task, or switch lists above.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contained Bottom Quick-Add Button */}
        <div className="pt-1 sm:pt-2">
          <button
            type="button"
            onClick={() => onOpenCreateTask(activeColConfig.id)}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#0c132b]/80 hover:bg-cyan-950/45 active:bg-cyan-950/65 border border-dashed border-[#26315e] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 text-xs font-medium flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
            <span>Add Task to {activeColConfig.title}</span>
          </button>
        </div>
      </div>
    );
  };

  // True 100vw x 100dvh Full-Screen Portal View for both Phone & Desktop
  const fullScreenOverlay =
    isFullScreen && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="region"
            aria-label={`${activeColConfig.title} List Full Screen View`}
            className="fixed inset-0 z-[70] h-[100dvh] bg-[var(--canvas-bg)] text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-150"
          >
            {/* Full-Screen Top Header (Safe-Area Aware on Phone) */}
            <div
              className="shrink-0 px-3.5 sm:px-8 pb-3 sm:py-4 border-b border-[#1b2448] bg-[#050918]/95 backdrop-blur-xl space-y-2.5 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4"
              style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
            >
              {/* Top Row on Mobile: Title + Add + Exit */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${activeColConfig.dotColor}`} />
                  <h2 className="text-base sm:text-xl font-display font-bold text-white truncate">
                    {activeColConfig.title}
                  </h2>
                  <span className="text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap shrink-0">
                    ({activeListTasks.length})
                  </span>
                </div>

                {/* Mobile Quick Actions (< lg) */}
                <div className="flex lg:hidden items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenCreateTask(activeColConfig.id)}
                    className="btn-modern-primary min-h-[38px] px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                    <span>Add</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFullScreen(false)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    aria-label="Exit Full Screen"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                    <span>Exit</span>
                  </button>
                </div>
              </div>

              {/* Search + Desktop Actions */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 lg:w-72 lg:flex-initial">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter tasks in list..."
                    className="w-full min-h-[38px] sm:min-h-0 bg-[#0a1024] border border-[#222b52] rounded-xl py-1.5 pl-8 pr-8 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenCreateTask(activeColConfig.id)}
                  className="hidden lg:inline-flex btn-modern-primary px-3.5 py-2 text-xs font-bold items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* Full-Screen Scrollable Body (Safe-Area Bottom Clearance on Phone) */}
            <div
              className="flex-1 overflow-y-auto px-3 sm:px-8 py-3.5 sm:py-5 space-y-4 sm:space-y-5"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)' }}
            >
              <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-5">
                {renderListSelectorBar(true)}
                {renderFocusedListPanel(true)}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-8">
      {fullScreenOverlay}

      {/* Clean, Compact Role Visibility Context Line */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#080d20]/90 border border-[#1c2444] flex items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          {!isLeaderOrOwner ? (
            <>
              <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">
                <strong className="text-slate-100">My Tasks:</strong> Assigned, created &amp; group missions.
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">
                <strong className="text-slate-100">Leader Overview:</strong> Full team task visibility &amp; controls.
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
          {tasks.length} total
        </span>
      </div>

      {/* Primary Workspace Controls & Filters */}
      <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-[#1d2546] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
          {/* View Mode Switcher */}
          <div className="max-w-full overflow-x-auto scrollbar-none flex items-center gap-1 p-1 rounded-xl bg-[#070b1a] border border-[#1f284d] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`min-h-[36px] sm:min-h-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111836]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Focused List</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`min-h-[36px] sm:min-h-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111836]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 shrink-0" />
              <span>Board Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('priority')}
              className={`min-h-[36px] sm:min-h-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                viewMode === 'priority'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111836]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Priority Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('ranked_list')}
              className={`min-h-[36px] sm:min-h-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                viewMode === 'ranked_list'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111836]'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 shrink-0" />
              <span>Ranked Queue</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`min-h-[36px] sm:min-h-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111836]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>All Cards</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              id="btn-download-tasks-report"
              type="button"
              onClick={onDownloadReport}
              className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl bg-[#0b1126] border border-[#222b52] hover:border-cyan-500/45 text-slate-200 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors flex-1 sm:flex-initial whitespace-nowrap shrink-0 cursor-pointer"
              title="Download structured JSON audit report"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Report</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenCreateTask(viewMode === 'list' ? selectedList : 'todo')}
              className="btn-modern-primary min-h-[40px] sm:min-h-0 px-3.5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Search + Collapsible Mobile Filters / Full Desktop Filter Row */}
        <div className="space-y-2.5 pt-2.5 border-t border-[#18203e] text-xs">
          {/* Mobile Search + Filter Drawer Toggle (< sm) */}
          <div className="flex sm:hidden items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full min-h-[40px] bg-[#070b1a] border border-[#222b52] rounded-xl py-2 pl-8 pr-8 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  title="Clear task search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                mobileFiltersOpen || secondaryFilterCount > 0
                  ? 'bg-cyan-950/60 border-cyan-500/45 text-cyan-200'
                  : 'bg-[#070b1a] border-[#222b52] text-slate-300'
              }`}
              aria-expanded={mobileFiltersOpen}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Filters</span>
              {secondaryFilterCount > 0 && (
                <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950">
                  {secondaryFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Dropdowns (Collapsible on Phone, Always Inline 5-Col on sm+) */}
          <div
            className={`${
              mobileFiltersOpen ? 'grid grid-cols-1 gap-2 pt-1' : 'hidden'
            } sm:grid sm:grid-cols-2 lg:grid-cols-5 sm:gap-2.5 sm:pt-0`}
          >
            {/* Desktop Search */}
            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                id="task-local-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title or tag..."
                className="w-full bg-[#070b1a] border border-[#222b52] rounded-xl py-1.5 pl-8 pr-8 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title="Clear task search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List / Status Selector */}
            <div>
              <select
                id="task-status-filter-select"
                value={viewMode === 'list' ? selectedList : statusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (viewMode === 'list') {
                    if (val === 'all') {
                      setViewMode('kanban');
                      setStatusFilter('all');
                    } else if (STATUS_COLUMNS.some((c) => c.id === val)) {
                      setSelectedList(val as TaskStatus);
                    }
                  } else {
                    setStatusFilter(val);
                  }
                }}
                className="w-full min-h-[40px] sm:min-h-0 bg-[#070b1a] border border-[#222b52] rounded-xl py-2 sm:py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
              >
                {viewMode !== 'list' && <option value="all">All Statuses</option>}
                {STATUS_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title} ({listCounts[col.id] || 0})
                  </option>
                ))}
                {viewMode === 'list' && <option value="all">View All Lists (Board)</option>}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full min-h-[40px] sm:min-h-0 bg-[#070b1a] border border-[#222b52] rounded-xl py-2 sm:py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs capitalize cursor-pointer"
              >
                <option value="all">All Priorities</option>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p} Priority
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Filter */}
            <div>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full min-h-[40px] sm:min-h-0 bg-[#070b1a] border border-[#222b52] rounded-xl py-2 sm:py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned Only</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Milestone Filter */}
            <div>
              <select
                value={milestoneFilter}
                onChange={(e) => setMilestoneFilter(e.target.value)}
                className="w-full min-h-[40px] sm:min-h-0 bg-[#070b1a] border border-[#222b52] rounded-xl py-2 sm:py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
              >
                <option value="all">All Milestones</option>
                <option value="unassigned">No Milestone</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2 flex-wrap tabular-nums">
                <span className="font-medium text-slate-200">
                  Matching {filteredTasks.length} of {tasks.length} tasks
                </span>
                {searchQuery.trim() && <span>· &ldquo;{searchQuery.trim()}&rdquo;</span>}
                {priorityFilter !== 'all' && <span className="capitalize">· {priorityFilter}</span>}
                {assigneeFilter !== 'all' && (
                  <span>
                    ·{' '}
                    {assigneeFilter === 'unassigned'
                      ? 'Unassigned'
                      : users.find((u) => u.id === assigneeFilter)?.name || assigneeFilter}
                  </span>
                )}
                {milestoneFilter !== 'all' && (
                  <span>
                    ·{' '}
                    {milestoneFilter === 'unassigned'
                      ? 'No Milestone'
                      : milestones.find((m) => m.id === milestoneFilter)?.title || milestoneFilter}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={resetAllFilters}
                className="text-cyan-400 hover:text-cyan-300 hover:underline text-[11px] font-medium shrink-0 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1 (DEFAULT): FOCUSED SINGLE-LIST VIEW — Opens initially on "To Do" on both Phone & Desktop */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {renderListSelectorBar(false)}
          {renderFocusedListPanel(false)}
        </div>
      )}

      {/* VIEW 2: SPACIOUS KANBAN BOARD OVERVIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 items-start">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const isTarget = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColumn !== col.id) setDragOverColumn(col.id);
                }}
                onDragLeave={() => {
                  if (dragOverColumn === col.id) setDragOverColumn(null);
                }}
                onDrop={(e) => handleDropOnStatus(e, col.id)}
                className={`flex flex-col justify-between min-h-[320px] sm:min-h-[420px] rounded-2xl border transition-colors duration-150 p-3.5 sm:p-4 overflow-hidden ${
                  isTarget
                    ? 'bg-cyan-950/20 border-cyan-400 ring-2 ring-cyan-500/30'
                    : 'bg-[#080d1f]/90 border-[#1d2546]'
                }`}
              >
                <div className="space-y-3">
                  {/* Column Header with Open Full Screen button */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#18203e]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedList(col.id);
                        setViewMode('list');
                      }}
                      className="flex items-center gap-2 min-w-0 text-left group cursor-pointer"
                      title={`Focus ${col.title} list`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dotColor}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider truncate ${col.color} group-hover:underline`}>
                        {col.title}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400">
                        ({colTasks.length})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedList(col.id);
                        setIsFullScreen(true);
                      }}
                      className="min-h-[36px] sm:min-h-0 inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg bg-[#0e1530] hover:bg-cyan-950/70 border border-[#232d58] hover:border-cyan-500/45 text-slate-300 hover:text-cyan-200 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      title={`Open ${col.title} list in Full Screen`}
                    >
                      <Maximize2 className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>Full Screen</span>
                    </button>
                  </div>

                  {/* Column Tasks */}
                  <div className="space-y-3">
                    {colTasks.map((task) => renderDraggableCard(task))}

                    {colTasks.length === 0 && (
                      <div
                        onClick={() => onOpenCreateTask(col.id)}
                        className="h-28 sm:h-32 border border-dashed border-[#232d56] rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-cyan-500/45 cursor-pointer p-3 transition-colors text-center"
                      >
                        <Plus className="w-4 h-4 mb-1 text-slate-500" />
                        <span className="text-[11px]">Tap to add {col.title.toLowerCase()} task</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contained Bottom Quick-Add Button */}
                <button
                  type="button"
                  onClick={() => onOpenCreateTask(col.id)}
                  className="mt-4 w-full min-h-[42px] sm:min-h-0 py-2 px-3 rounded-xl bg-[#0c132b]/80 hover:bg-cyan-950/45 active:bg-cyan-950/65 border border-dashed border-[#26315e] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Add {col.title}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: PRIORITY MATRIX */}
      {viewMode === 'priority' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 items-start">
          {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
            const config = PRIORITY_CONFIG[p];
            const pTasks = filteredTasks.filter((t) => t.priority === p);
            const isTarget = dragOverPriority === p;

            return (
              <div
                key={p}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverPriority !== p) setDragOverPriority(p);
                }}
                onDragLeave={() => {
                  if (dragOverPriority === p) setDragOverPriority(null);
                }}
                onDrop={(e) => handleDropOnPriority(e, p)}
                className={`flex flex-col justify-between min-h-[300px] sm:min-h-[400px] rounded-2xl border transition-colors duration-150 p-3.5 sm:p-4 overflow-hidden ${
                  isTarget
                    ? 'bg-cyan-950/20 border-cyan-400 ring-2 ring-cyan-500/30'
                    : 'bg-[#080d1f]/90 border-[#1d2546]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#18203e]">
                    <div className="min-w-0">
                      <h4 className={`text-xs font-bold uppercase tracking-wider truncate ${config.text}`}>
                        {config.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tasks grouped by priority tier
                      </p>
                    </div>
                    <span className={`text-xs font-mono tabular-nums font-bold shrink-0 ${config.text}`}>
                      {pTasks.length} {pTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {pTasks.map((task, idx) => renderDraggableCard(task, idx, true))}

                    {pTasks.length === 0 && (
                      <div
                        onClick={() => onOpenCreateTask('todo', p)}
                        className="h-28 border border-dashed border-[#232d56] rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-cyan-500/45 cursor-pointer p-3 transition-colors text-center"
                      >
                        <Plus className="w-4 h-4 mb-1 text-slate-500" />
                        <span className="text-[11px]">Tap to add {config.badge.toLowerCase()} priority task</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenCreateTask('todo', p)}
                  className="mt-4 w-full min-h-[42px] sm:min-h-0 py-2 px-3 rounded-xl bg-[#0c132b]/80 hover:bg-cyan-950/45 border border-dashed border-[#26315e] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Add {config.badge} Task</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 4: RANKED SEQUENCE QUEUE */}
      {viewMode === 'ranked_list' && (
        <div className="p-3.5 sm:p-5 rounded-2xl glass-panel border border-[#1d2546] space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#18203e]">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Priority Ranked Work Queue ({rankedTasks.length})</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Ordered execution queue by rank and priority weight.
              </p>
            </div>
            <span className="text-xs text-cyan-300 font-mono">Custom Order Saved</span>
          </div>

          <div className="space-y-2.5">
            {rankedTasks.map((task, index) => {
              const assignee = userMap.get(task.assigneeId);
              const isOverdue = new Date(task.dueDate).getTime() < Date.now() && task.status !== 'complete';
              const isDragging = draggedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropOnRankedItem(e, task.id)}
                  onClick={() => onTaskClick(task)}
                  className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer overflow-hidden ${
                    isDragging
                      ? 'opacity-40 bg-cyan-950/20 border-cyan-400'
                      : 'bg-[#090e22]/90 border-[#1d2546] hover:border-cyan-500/45 hover:bg-[#0d1430]'
                  }`}
                >
                  <div className="flex items-start sm:items-center justify-between gap-2 min-w-0 flex-1">
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="hidden sm:block cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-[#141c3c] shrink-0"
                        title="Drag to re-rank"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <span className="text-xs font-mono font-bold tabular-nums text-cyan-300 shrink-0 mt-0.5 sm:mt-0">
                        #{index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-slate-100 line-clamp-2 sm:truncate">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-xs text-slate-400 line-clamp-1 sm:truncate max-w-xl mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {canDeleteTask && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskToDelete(task);
                        }}
                        className="lg:hidden min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/65 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                        aria-label={`Delete task ${task.title}`}
                      >
                        <Trash2 className="w-3 h-3 shrink-0" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>

                  <div
                    className="flex flex-wrap items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#18203e] shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={task.priority}
                        onChange={(e) => handleQuickPriorityChange(task.id, e.target.value as TaskPriority)}
                        className={`min-h-[36px] sm:min-h-0 text-xs font-semibold px-2.5 py-1.5 sm:py-1 rounded-lg border bg-[#070b1a] cursor-pointer ${
                          task.priority === 'urgent'
                            ? 'text-rose-300 border-rose-500/40'
                            : task.priority === 'high'
                            ? 'text-amber-300 border-amber-500/40'
                            : task.priority === 'medium'
                            ? 'text-indigo-300 border-indigo-500/40'
                            : 'text-slate-300 border-slate-600/40'
                        }`}
                      >
                        {TASK_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {PRIORITY_CONFIG[p].badge} ({PRIORITY_CONFIG[p].points})
                          </option>
                        ))}
                      </select>

                      <StatusBadge status={task.status} />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className={isOverdue ? 'text-rose-400 font-semibold' : ''}>
                          {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {assignee ? (
                        <div
                          title={`Assignee: ${assignee.name}`}
                          className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-400/40 text-cyan-200 flex items-center justify-center text-xs font-bold shrink-0"
                        >
                          {assignee.name[0]}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs whitespace-nowrap">Unassigned</span>
                      )}

                      {canDeleteTask && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaskToDelete(task);
                          }}
                          className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/65 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                          title="Delete task (Leader & Co-Leader only)"
                          aria-label={`Delete task ${task.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: ALL CARDS GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredTasks.map((task, idx) => renderDraggableCard(task, idx, true))}
        </div>
      )}

      {viewMode !== 'list' && filteredTasks.length === 0 && (
        <div className="p-10 sm:p-12 text-center border border-dashed border-[#1d2546] rounded-2xl space-y-2">
          <p className="text-sm text-slate-400">No tasks found matching your filter criteria.</p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDeleteTask}
        title="Delete Task"
        message={
          taskToDelete
            ? `Are you sure you want to permanently delete "${taskToDelete.title}"? Associated proof submissions for this task will also be removed. This action cannot be undone.`
            : ''
        }
        confirmLabel={isDeletingTask ? 'Deleting...' : 'Delete Task'}
        destructive={true}
      />
    </div>
  );
}
