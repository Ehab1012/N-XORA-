import React, { useState, useMemo } from 'react';
import {
  Plus,
  Download,
  Filter,
  Search,
  X,
  RotateCcw,
  Kanban,
  ListOrdered,
  LayoutGrid,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User as UserIcon,
  Calendar,
  CheckSquare,
  FileCheck2,
  Sparkles,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import { Task, User, Milestone } from '../../../shared/types.js';
import { TaskStatus, TaskPriority, TASK_STATUSES, TASK_PRIORITIES } from '../../../shared/const.js';
import { PriorityBadge, StatusBadge } from '../common/Badges.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Lock, ShieldCheck, Users as UsersGroup } from 'lucide-react';

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

type ViewMode = 'kanban' | 'priority' | 'ranked_list' | 'grid';

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badge: string; border: string; bg: string; text: string; lightBg: string }
> = {
  urgent: {
    label: 'Urgent Priority (P0)',
    badge: 'Urgent',
    border: 'border-rose-500/40 hover:border-rose-500/80',
    bg: 'bg-rose-950/20',
    text: 'text-rose-400',
    lightBg: 'bg-rose-500/10',
  },
  high: {
    label: 'High Priority (P1)',
    badge: 'High',
    border: 'border-amber-500/40 hover:border-amber-500/80',
    bg: 'bg-amber-950/20',
    text: 'text-amber-400',
    lightBg: 'bg-amber-500/10',
  },
  medium: {
    label: 'Medium Priority (P2)',
    badge: 'Medium',
    border: 'border-indigo-500/40 hover:border-indigo-500/80',
    bg: 'bg-indigo-950/20',
    text: 'text-indigo-400',
    lightBg: 'bg-indigo-500/10',
  },
  low: {
    label: 'Low Priority (P3)',
    badge: 'Low',
    border: 'border-slate-600/40 hover:border-slate-500/80',
    bg: 'bg-slate-900/40',
    text: 'text-slate-400',
    lightBg: 'bg-slate-500/10',
  },
};

const STATUS_COLUMNS: Array<{ id: TaskStatus; title: string; color: string; dotColor: string }> = [
  { id: 'backlog', title: 'Backlog', color: 'text-slate-400', dotColor: 'bg-slate-500' },
  { id: 'todo', title: 'To Do', color: 'text-blue-400', dotColor: 'bg-blue-400' },
  { id: 'in_progress', title: 'In Progress', color: 'text-amber-400', dotColor: 'bg-amber-400' },
  { id: 'in_review', title: 'In Review', color: 'text-purple-400', dotColor: 'bg-purple-400' },
  { id: 'blocked', title: 'Blocked', color: 'text-rose-400', dotColor: 'bg-rose-400' },
  { id: 'complete', title: 'Complete', color: 'text-teal-400', dotColor: 'bg-teal-400' },
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
  const isLeaderOrOwner = role === 'leader' || role === 'co-leader';
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>('all');

  const searchQuery = propsSearchQuery !== undefined ? propsSearchQuery : internalSearchQuery;
  const setSearchQuery = onSearchQueryChange || setInternalSearchQuery;

  const statusFilter = propsStatusFilter !== undefined ? propsStatusFilter : internalStatusFilter;
  const setStatusFilter = onStatusFilterChange || setInternalStatusFilter;

  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('all');

  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverPriority, setDragOverPriority] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const hasActiveFilters =
    !!searchQuery.trim() ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    milestoneFilter !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setMilestoneFilter('all');
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = searchQuery.trim().toLowerCase();

      // Matches task title, description, tags, or status
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.status.toLowerCase().includes(query) ||
        task.status.replace(/_/g, ' ').toLowerCase().includes(query) ||
        (task.tags && task.tags.some((t) => t.toLowerCase().includes(query)));

      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesAssignee =
        assigneeFilter === 'all' ||
        (assigneeFilter === 'unassigned' ? !task.assigneeId : task.assigneeId === assigneeFilter);
      const matchesMilestone =
        milestoneFilter === 'all' ||
        (milestoneFilter === 'unassigned' ? !task.milestoneId : task.milestoneId === milestoneFilter);

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesMilestone;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, milestoneFilter]);

  // Ranked tasks: order by custom rank if present, then priority weight
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

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // Fallback: priority weight descending, then creation date
      const weightDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredTasks, customRankOrder]);

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  // Handle Drag End
  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
    setDragOverPriority(null);
  };

  // Handle Drop on Status Column (Kanban)
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

  // Handle Drop on Priority Tier (Priority Board)
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

  // Handle Drop on Ranked List Item (Reordering sequence)
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

  // Quick Priority Shift
  const handleQuickPriorityChange = async (taskId: string, newPriority: TaskPriority) => {
    setIsUpdating(true);
    try {
      await api.updateTask(taskId, { priority: newPriority });
      onTasksChanged();
    } catch (err) {
      console.error('Failed to change priority:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Quick Status Transition (Move left/right in status pipeline)
  const handleMoveStatus = async (taskId: string, direction: 'prev' | 'next') => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const statusOrder: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'complete'];
    const currentIndex = statusOrder.indexOf(task.status);
    if (currentIndex === -1) return;

    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
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
  };

  // Render a Drag-and-Drop Task Card
  const renderDraggableCard = (task: Task, index?: number, showRankBadge = false) => {
    const assignee = users.find((u) => u.id === task.assigneeId);
    const checklistCompleted = task.checklist.filter((c) => c.isCompleted).length;
    const checklistTotal = task.checklist.length;
    const isOverdue = new Date(task.dueDate).getTime() < Date.now() && task.status !== 'complete';
    const isDragging = draggedTaskId === task.id;

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        onClick={() => onTaskClick(task)}
        className={`group relative p-4 rounded-xl glass-panel border transition-all duration-150 cursor-pointer ${
          isDragging
            ? 'opacity-40 scale-95 border-purple-500 ring-2 ring-purple-500/50'
            : 'border-[#1f223f] hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-950/20'
        }`}
      >
        {/* Top bar: Drag handle, Rank, Title, Priority */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
              title="Drag to reorder or move status/priority"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {showRankBadge && typeof index === 'number' && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#14162a] border border-purple-500/30 text-purple-300">
                #{index + 1}
              </span>
            )}

            <h4 className="text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-purple-300 transition-colors">
              {task.title}
            </h4>
          </div>

          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <select
              value={task.priority}
              onChange={(e) => handleQuickPriorityChange(task.id, e.target.value as TaskPriority)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-[#0f1122] cursor-pointer focus:outline-none focus:ring-1 ${
                task.priority === 'urgent'
                  ? 'text-rose-400 border-rose-500/40'
                  : task.priority === 'high'
                  ? 'text-amber-400 border-amber-500/40'
                  : task.priority === 'medium'
                  ? 'text-indigo-400 border-indigo-500/40'
                  : 'text-slate-400 border-slate-600/40'
              }`}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p} className="bg-[#0f1122] text-slate-200 capitalize">
                  {p} Priority
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Task description */}
        {task.description && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mt-2">{task.description}</p>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[#14162c] text-slate-400 border border-[#232746]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Middle status & proof filing */}
        <div className="flex items-center justify-between gap-2 pt-2 text-xs">
          <StatusBadge status={task.status} />

          {task.proofSubmittedId ? (
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
              className="text-[11px] text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Submit Proof</span>
            </button>
          ) : null}
        </div>

        {/* Bottom meta: Checklist, Due date, Assignee, Quick Movers */}
        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[#1c1f38] text-[11px] text-slate-400">
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

          <div className="flex items-center gap-2">
            {/* Quick step mover buttons */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-[#121426] border border-[#232746] rounded-md p-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveStatus(task.id, 'prev');
                }}
                title="Move to Previous Status"
                className="p-1 hover:text-white rounded hover:bg-[#1f2244]"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveStatus(task.id, 'next');
                }}
                title="Advance to Next Status"
                className="p-1 hover:text-white rounded hover:bg-[#1f2244]"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {assignee ? (
              <div
                title={`Assignee: ${assignee.name} (${assignee.role})`}
                className="w-5 h-5 rounded-full bg-purple-900 border border-purple-400/40 text-purple-200 flex items-center justify-center text-[10px] font-bold shrink-0"
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
  };

  return (
    <div className="space-y-4">
      {/* Role-based Task Visibility Banner */}
      {!isLeaderOrOwner ? (
        <div className="px-4 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between gap-3 text-xs text-purple-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong className="text-purple-100">My Tasks View:</strong> You are viewing your assigned tasks, created tasks, and group missions.
            </span>
          </div>
          <span className="text-[10px] font-mono text-purple-300/70 shrink-0 hidden sm:inline">
            Leaders & Co-Leaders see all members' tasks
          </span>
        </div>
      ) : (
        <div className="px-4 py-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs text-indigo-200 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong className="text-indigo-100">Team Leader Overview:</strong> You are viewing all team members' tasks and can assign tasks to any member.
            </span>
          </div>
          <span className="text-[10px] font-mono text-indigo-300/70 shrink-0 hidden sm:inline">
            Full Task Visibility
          </span>
        </div>
      )}

      {/* Top Controls: View Selector, Search, Filters, Add Task, Download Report */}
      <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-[#1f223f] space-y-3.5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="max-w-full overflow-x-auto scrollbar-none flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-[#0e101f] border border-[#232748] shrink-0">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#171932]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Kanban Board</span>
              <span className="sm:hidden">Kanban</span>
            </button>

            <button
              onClick={() => setViewMode('priority')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                viewMode === 'priority'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#171932]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Priority Matrix</span>
              <span className="sm:hidden">Priority</span>
            </button>

            <button
              onClick={() => setViewMode('ranked_list')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                viewMode === 'ranked_list'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#171932]'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Ranked Sequence</span>
              <span className="sm:hidden">Ranked</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#171932]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Grid View</span>
              <span className="sm:hidden">Grid</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              id="btn-download-tasks-report"
              onClick={onDownloadReport}
              className="px-3 py-1.5 rounded-xl bg-[#14162a] border border-[#232748] hover:border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm flex-1 sm:flex-initial whitespace-nowrap"
              title="Download structured JSON audit report"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Download Report</span>
            </button>

            <button
              onClick={() => onOpenCreateTask()}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/30 transition-colors flex-1 sm:flex-initial whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="space-y-2.5 pt-2 border-t border-[#1c1f38] text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Search box for name or status */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                id="task-local-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks by name or status..."
                className="w-full bg-[#0d0f1e] border border-[#222646] rounded-xl py-1.5 pl-8 pr-8 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Clear task search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div>
              <select
                id="task-status-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#0d0f1e] border border-[#222646] rounded-xl py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="blocked">Blocked</option>
                <option value="complete">Complete</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Priority filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full bg-[#0d0f1e] border border-[#222646] rounded-xl py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-purple-500 text-xs capitalize"
              >
                <option value="all">All Priorities</option>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p} Priority
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee filter */}
            <div>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full bg-[#0d0f1e] border border-[#222646] rounded-xl py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
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

            {/* Milestone filter */}
            <div>
              <select
                value={milestoneFilter}
                onChange={(e) => setMilestoneFilter(e.target.value)}
                className="w-full bg-[#0d0f1e] border border-[#222646] rounded-xl py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
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

          {/* Search result summary & Reset filters bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 bg-[#0e1022]/60 p-2 rounded-xl border border-[#1e2242]">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-medium text-slate-200 shrink-0">
                  Showing {filteredTasks.length} of {tasks.length} tasks:
                </span>
                {searchQuery.trim() && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/50 font-mono truncate max-w-[180px]">
                    Name: "{searchQuery.trim()}"
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 font-mono capitalize">
                    Status: {statusFilter.replace('_', ' ')}
                  </span>
                )}
                {priorityFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/50 font-mono capitalize">
                    Priority: {priorityFilter}
                  </span>
                )}
                {assigneeFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 font-mono">
                    Assignee: {assigneeFilter === 'unassigned' ? 'Unassigned' : (users.find(u => u.id === assigneeFilter)?.name || assigneeFilter)}
                  </span>
                )}
                {milestoneFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-teal-950/80 text-teal-300 border border-teal-800/50 font-mono">
                    Milestone: {milestoneFilter === 'unassigned' ? 'No Milestone' : (milestones.find(m => m.id === milestoneFilter)?.title || milestoneFilter)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={resetAllFilters}
                className="text-purple-400 hover:text-purple-300 hover:underline text-[11px] font-medium shrink-0 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: DRAG-AND-DROP KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
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
                className={`flex flex-col min-h-[500px] rounded-2xl border transition-all duration-150 p-3 ${
                  isTarget
                    ? 'bg-purple-950/20 border-purple-500 ring-2 ring-purple-500/40 scale-[1.01]'
                    : 'bg-[#0d0f1e]/80 border-[#1f223f]'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1c1f38] mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>
                      {col.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#15172b] text-slate-400 border border-[#232746]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task items list */}
                <div className="flex-1 space-y-2.5">
                  {colTasks.map((task) => renderDraggableCard(task))}

                  {colTasks.length === 0 && (
                    <div
                      onClick={() => onOpenCreateTask(col.id)}
                      className="h-32 border border-dashed border-[#232748] rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-purple-500/50 cursor-pointer p-3 transition-colors text-center"
                    >
                      <Plus className="w-4 h-4 mb-1 text-slate-500" />
                      <span className="text-[11px]">Drop task here or click to add</span>
                    </div>
                  )}
                </div>

                {/* Bottom quick add button */}
                <button
                  onClick={() => onOpenCreateTask(col.id)}
                  className="mt-3 w-full py-1.5 rounded-lg border border-dashed border-[#232746] hover:border-purple-500/40 text-slate-400 hover:text-purple-300 text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {col.title}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: PRIORITY MATRIX & RANKING SYSTEM */}
      {viewMode === 'priority' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
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
                className={`flex flex-col min-h-[520px] rounded-2xl border transition-all duration-150 p-3.5 ${
                  isTarget
                    ? 'bg-purple-950/20 border-purple-500 ring-2 ring-purple-500/40 scale-[1.01]'
                    : `bg-[#0d0f1e]/90 border-[#1f223f]`
                }`}
              >
                {/* Priority Tier Header */}
                <div className={`flex items-center justify-between pb-3 border-b border-[#1c1f38] mb-3`}>
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>
                      {config.label}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Drag to promote or demote rank tier
                    </p>
                  </div>
                  <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full ${config.lightBg} ${config.text} border border-current/20 font-bold`}>
                    {pTasks.length}
                  </span>
                </div>

                {/* Priority Cards */}
                <div className="flex-1 space-y-2.5">
                  {pTasks.map((task, idx) => renderDraggableCard(task, idx, true))}

                  {pTasks.length === 0 && (
                    <div
                      onClick={() => onOpenCreateTask(undefined, p)}
                      className="h-32 border border-dashed border-[#232748] rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-purple-500/50 cursor-pointer p-3 transition-colors text-center"
                    >
                      <Plus className="w-4 h-4 mb-1 text-slate-500" />
                      <span className="text-[11px]">Drop task to set {config.badge} priority</span>
                    </div>
                  )}
                </div>

                {/* Quick Add at Priority */}
                <button
                  onClick={() => onOpenCreateTask(undefined, p)}
                  className="mt-3 w-full py-1.5 rounded-lg border border-dashed border-[#232746] hover:border-purple-500/40 text-slate-400 hover:text-purple-300 text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {config.badge} Task</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: RANKED SEQUENCE LIST */}
      {viewMode === 'ranked_list' && (
        <div className="p-4 rounded-2xl glass-panel border border-[#1f223f] space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1f38]">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-purple-400" />
                <span>Priority Ranked Work Queue ({rankedTasks.length})</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag any row using the handle to reorder the execution queue order.
              </p>
            </div>
            <span className="text-xs text-purple-300 font-mono">
              Custom Order Preserved
            </span>
          </div>

          <div className="space-y-2">
            {rankedTasks.map((task, index) => {
              const assignee = users.find((u) => u.id === task.assigneeId);
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
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isDragging
                      ? 'opacity-40 bg-purple-950/20 border-purple-500'
                      : 'bg-[#0e101f] border-[#1e2240] hover:border-purple-500/50 hover:bg-[#13162a]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-[#1a1c34]"
                      title="Drag to re-rank priority"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-950/60 border border-purple-500/40 text-purple-300 shrink-0">
                      Rank #{index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-100 truncate group-hover:text-purple-300">
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-slate-400 truncate max-w-md">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.priority}
                      onChange={(e) => handleQuickPriorityChange(task.id, e.target.value as TaskPriority)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border bg-[#0d0f1e] cursor-pointer ${
                        task.priority === 'urgent'
                          ? 'text-rose-400 border-rose-500/40'
                          : task.priority === 'high'
                          ? 'text-amber-400 border-amber-500/40'
                          : task.priority === 'medium'
                          ? 'text-indigo-400 border-indigo-500/40'
                          : 'text-slate-400 border-slate-600/40'
                      }`}
                    >
                      {TASK_PRIORITIES.map((p) => (
                        <option key={p} value={p} className="capitalize">
                          {p}
                        </option>
                      ))}
                    </select>

                    <StatusBadge status={task.status} />

                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className={isOverdue ? 'text-rose-400 font-semibold' : ''}>
                        {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {assignee ? (
                      <div
                        title={`Assignee: ${assignee.name}`}
                        className="w-6 h-6 rounded-full bg-purple-900 border border-purple-400/40 text-purple-200 flex items-center justify-center text-xs font-bold"
                      >
                        {assignee.name[0]}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs">Unassigned</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: GRID CARD VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task, idx) => renderDraggableCard(task, idx, true))}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="p-12 text-center border border-dashed border-[#1f223f] rounded-2xl space-y-2">
          <p className="text-sm text-slate-400">No tasks found matching your filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setPriorityFilter('all');
              setAssigneeFilter('all');
              setMilestoneFilter('all');
            }}
            className="text-xs text-purple-400 hover:text-purple-300 underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
