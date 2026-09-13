import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  FileCheck2,
  BookOpen,
  MessageSquare,
  BarChart3,
  Plus,
  Edit,
  Shield,
  Tag,
  Users,
  ExternalLink,
  Target,
  Bell,
  ChevronDown,
  Activity,
  UserPlus,
  Trash2,
  UserCheck,
  Check,
  Radio,
  Wallet,
  DollarSign,
  Cpu,
  Wrench,
  Package,
  Receipt,
  ShoppingCart,
  MinusCircle,
  AlertTriangle,
  Filter,
  Download,
  FileJson,
  Award,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import {
  Project,
  ProjectExpenseItem,
  ExpenseCategory,
  Task,
  Milestone,
  ProofSubmission,
  ResourceItem,
  User,
  Team,
} from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { StatusBadge } from '../common/Badges.js';
import { TaskCard } from './TaskCard.js';
import { TaskManagementView } from './TaskManagementView.js';
import { TaskDetailModal } from './TaskDetailModal.js';
import { ProofSubmissionModal } from './ProofSubmissionModal.js';
import { ProofReviewModal } from './ProofReviewModal.js';
import { ResourceLibrary } from './ResourceLibrary.js';
import { ProjectDiscussion } from './ProjectDiscussion.js';
import { ProjectAnalyticsView } from './ProjectAnalyticsView.js';
import { ProjectTimeline } from './ProjectTimeline.js';
import { ProjectPDFExport } from './ProjectPDFExport.js';
import { Modal } from '../common/Modal.js';
import { MemberProfileModal } from '../profile/MemberProfileModal.js';
import { ToastContainer } from '../common/Toast.js';
import { TeamInvitationModal } from '../invitations/TeamInvitationModal.js';
import { useProjectRealtime } from '../../hooks/useProjectRealtime.js';
import { TASK_STATUSES, TaskStatus, TASK_PRIORITIES, TaskPriority, PROJECT_STATUSES, ProjectStatus } from '../../../shared/const.js';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  onEditProject?: (proj: Project) => void;
  onSendMessage?: (userId: string, userName?: string) => void;
}

export function ProjectDetail({ projectId, onBack, onEditProject, onSendMessage }: ProjectDetailProps) {
  const { user, role } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [proofs, setProofs] = useState<ProofSubmission[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'timeline' | 'milestones' | 'proofs' | 'resources' | 'discussion' | 'analytics'>('overview');

  // Local task search & filter states
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');

  // Modals state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofSubmitTask, setProofSubmitTask] = useState<Task | null>(null);
  const [reviewProofItem, setReviewProofItem] = useState<ProofSubmission | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [isAssignMemberOpen, setIsAssignMemberOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // Budget Tracker states
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [expensesInput, setExpensesInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Component & Service Expense tracking states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('component');
  const [expenseCost, setExpenseCost] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseStatus, setExpenseStatus] = useState<'bought' | 'completed' | 'planned'>('bought');
  const [expenseVendor, setExpenseVendor] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Member profile state
  const [selectedMemberProfileId, setSelectedMemberProfileId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Real-time notification system hook
  const { toasts, dismissToast, clearAllToasts, connectionStatus, simulateEvent } =
    useProjectRealtime({
      projectId,
      onEventReceived: () => {
        // Automatically sync project state when a status change or member assignment occurs
        fetchData();
      },
    });

  // New task form fields
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');

  // Group task creation fields
  const [isNewTaskGroup, setIsNewTaskGroup] = useState(false);
  const [newTaskParticipants, setNewTaskParticipants] = useState<string[]>([]);
  const [newTaskIndPoints, setNewTaskIndPoints] = useState<number>(35);
  const [newTaskGroupBonusPoints, setNewTaskGroupBonusPoints] = useState<number>(60);

  const handleOpenCreateTask = (defaultStatus?: TaskStatus, defaultPriority?: TaskPriority) => {
    if (defaultStatus) setNewTaskStatus(defaultStatus);
    else setNewTaskStatus('todo');
    if (defaultPriority) setNewTaskPriority(defaultPriority);
    else setNewTaskPriority('medium');
    if (role === 'member' && user) {
      setNewTaskAssignee(user.id);
    } else {
      setNewTaskAssignee('');
    }
    setIsNewTaskGroup(false);
    setNewTaskParticipants(users.map((u) => u.id));
    setNewTaskIndPoints(35);
    setNewTaskGroupBonusPoints(60);
    setIsCreateTaskOpen(true);
  };

  // New milestone form fields
  const [newMileTitle, setNewMileTitle] = useState('');
  const [newMileDesc, setNewMileDesc] = useState('');
  const [newMileTargetDate, setNewMileTargetDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  const fetchData = async () => {
    try {
      const [proj, tList, mList, pList, rList, teamList] = await Promise.all([
        api.getProject(projectId),
        api.getTasks(projectId),
        api.getMilestones(projectId),
        api.getProofs(projectId),
        api.getResources(projectId),
        api.getTeams(),
      ]);

      setProject(proj);
      setTasks(tList);
      setMilestones(mList);
      setProofs(pList);
      setResources(rList);
      setTeams(teamList);

      // Get users from me call or team
      const meRes = await api.getMe();
      if (meRes.availableUsers) {
        setUsers(meRes.availableUsers as any);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  if (loading || !project) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-xs">
        Loading project environment...
      </div>
    );
  }

  const team = teams.find((t) => t.id === project.teamId);
  const leader = users.find((u) => u.id === project.leaderId);
  const isLeaderOrOwner = role === 'leader' || role === 'co-leader';

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tags = newTaskTags.split(',').map((t) => t.trim()).filter(Boolean);
    const created = await api.createTask({
      projectId,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      priority: newTaskPriority,
      status: newTaskStatus,
      assigneeId: isNewTaskGroup ? undefined : (newTaskAssignee || undefined),
      dueDate: new Date(newTaskDueDate).toISOString(),
      milestoneId: newTaskMilestoneId || undefined,
      tags,
      isGroupTask: isNewTaskGroup,
      participantIds: isNewTaskGroup ? newTaskParticipants : undefined,
      individualPoints: isNewTaskGroup ? newTaskIndPoints : undefined,
      groupBonusPoints: isNewTaskGroup ? newTaskGroupBonusPoints : undefined,
    });

    setTasks((prev) => [...prev, created]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskStatus('todo');
    setNewTaskPriority('medium');
    setIsNewTaskGroup(false);
    setIsCreateTaskOpen(false);
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMileTitle.trim()) return;

    const created = await api.createMilestone({
      projectId,
      title: newMileTitle.trim(),
      description: newMileDesc.trim(),
      dueDate: new Date(newMileTargetDate).toISOString(),
      status: 'pending',
    });

    setMilestones((prev) => [...prev, created]);
    setNewMileTitle('');
    setNewMileDesc('');
    setIsCreateMilestoneOpen(false);
  };

  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToAssign) return;
    setIsAssigning(true);
    try {
      const updated = await api.assignProjectMember(projectId, selectedUserToAssign);
      setProject(updated);
      setIsAssignMemberOpen(false);
      setSelectedUserToAssign('');
    } catch (err) {
      console.error('Failed to assign member', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove member from project assignment?')) return;
    try {
      const updated = await api.removeProjectMember(projectId, userId);
      setProject(updated);
    } catch (err) {
      console.error('Failed to remove member', err);
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project || project.status === newStatus) return;
    setIsStatusUpdating(true);
    try {
      const updated = await api.updateProject(projectId, { status: newStatus });
      setProject(updated);
    } catch (err) {
      console.error('Failed to update project status', err);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setIsSavingBudget(true);
    try {
      const updated = await api.updateProject(projectId, { 
        budget: Number(budgetInput) || 0,
      });
      setProject(updated);
      setIsEditBudgetOpen(false);
    } catch (err) {
      console.error('Failed to update project budget', err);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !expenseTitle.trim() || !expenseCost) return;
    setIsSavingExpense(true);
    try {
      const res = await api.addProjectExpense(projectId, {
        title: expenseTitle.trim(),
        category: expenseCategory,
        cost: Math.max(0, parseFloat(expenseCost) || 0),
        date: expenseDate || new Date().toISOString().split('T')[0],
        status: expenseStatus,
        vendor: expenseVendor.trim() || undefined,
        notes: expenseNotes.trim() || undefined,
      });

      setProject(res.project);
      setExpenseTitle('');
      setExpenseCost('');
      setExpenseVendor('');
      setExpenseNotes('');
      setExpenseCategory('component');
      setExpenseStatus('bought');
      setIsAddExpenseOpen(false);
    } catch (err) {
      console.error('Failed to add project expense', err);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!project) return;
    if (confirm('Are you sure you want to remove this purchased component or service? The cost will be refunded to the budget.')) {
      setDeletingExpenseId(expenseId);
      try {
        const res = await api.deleteProjectExpense(projectId, expenseId);
        setProject(res.project);
      } catch (err) {
        console.error('Failed to delete expense', err);
      } finally {
        setDeletingExpenseId(null);
      }
    }
  };

  const completedTasksCount = tasks.filter((t) => t.status === 'complete').length;
  const rawProgressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
  const progressPercent = Number.isFinite(rawProgressPercent) ? Math.max(0, Math.min(100, rawProgressPercent)) : 0;

  // Budget & Expense calculations
  const hasBudget = project.budget !== undefined && project.budget > 0;
  const budget = project.budget || 0;
  const expenseItems = project.expenseItems || [];
  const itemizedExpenses = expenseItems.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  const totalExpenses = expenseItems.length > 0 ? itemizedExpenses : (project.expenses || 0);
  const budgetRemaining = budget - totalExpenses;
  const budgetPercentRaw = budget > 0 ? (totalExpenses / budget) * 100 : 0;
  const budgetPercent = Math.min(100, Math.max(0, budgetPercentRaw));
  const isOverBudget = totalExpenses > budget;

  // Category subtotals for bought components & services
  const categoryTotals = expenseItems.reduce((acc, item) => {
    const cat = item.category || 'other';
    acc[cat] = (acc[cat] || 0) + (Number(item.cost) || 0);
    return acc;
  }, {} as Record<string, number>);

  const filteredExpenseItems = expenseCategoryFilter === 'all'
    ? expenseItems
    : expenseItems.filter((item) => item.category === expenseCategoryFilter);

  // Unassigned available users for assignment picker
  const assignedMemberIds = new Set(project.memberIds || []);
  const availableUsersToAssign = users.filter((u) => !assignedMemberIds.has(u.id));

  // Export structured project tasks and status report as JSON
  const handleDownloadReport = () => {
    if (!project) return;
    const teamObj = teams.find((t) => t.id === project.teamId);
    const assignedUsers = users.filter((u) => project.memberIds?.includes(u.id));
    const projectLeader = users.find((u) => u.id === project.leaderId);

    const taskStatusCounts = {
      backlog: tasks.filter((t) => t.status === 'backlog').length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      in_review: tasks.filter((t) => t.status === 'in_review').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      complete: tasks.filter((t) => t.status === 'complete').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
    };

    const auditReport = {
      schema: 'nexora.audit.project_report.v1',
      reportType: 'PROJECT_AUDIT_REPORT',
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        objectives: project.objectives || [],
        status: project.status,
        deadline: project.deadline,
        visibility: project.visibility,
        team: {
          id: project.teamId,
          name: teamObj?.name || 'Unassigned',
        },
        leader: projectLeader
          ? {
              id: projectLeader.id,
              name: projectLeader.name,
              email: projectLeader.email,
              role: projectLeader.role,
              title: projectLeader.title || '',
            }
          : null,
        membersCount: assignedUsers.length,
        members: assignedUsers.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          title: m.title || '',
          department: m.department || '',
        })),
        financials: {
          budget: budget,
          totalExpenses: totalExpenses,
          budgetRemaining: budgetRemaining,
          isOverBudget: isOverBudget,
          expenseItemsCount: expenseItems.length,
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      auditSummary: {
        totalTasks: tasks.length,
        completedTasks: taskStatusCounts.complete,
        inProgressTasks: taskStatusCounts.in_progress,
        inReviewTasks: taskStatusCounts.in_review,
        todoTasks: taskStatusCounts.todo,
        backlogTasks: taskStatusCounts.backlog,
        blockedTasks: taskStatusCounts.blocked,
        cancelledTasks: taskStatusCounts.cancelled,
        taskStatusBreakdown: taskStatusCounts,
        completionRatePercent: tasks.length > 0 ? Math.round((taskStatusCounts.complete / tasks.length) * 100) : 0,
        totalMilestones: milestones.length,
        completedMilestones: milestones.filter((m) => m.status === 'completed').length,
        totalProofsSubmitted: proofs.length,
        verifiedProofsCount: proofs.filter((p) => p.status === 'approved').length,
      },
      tasks: tasks.map((task) => {
        const assignee = users.find((u) => u.id === task.assigneeId);
        const taskMilestone = milestones.find((m) => m.id === task.milestoneId);
        const taskProofs = proofs.filter((p) => p.taskId === task.id);
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          completedAt: task.completedAt || null,
          tags: task.tags || [],
          checklist: (task.checklist || []).map((c) => ({
            id: c.id,
            title: c.title,
            isCompleted: c.isCompleted,
          })),
          assignee: assignee
            ? {
                id: assignee.id,
                name: assignee.name,
                email: assignee.email,
                role: assignee.role,
                title: assignee.title || '',
              }
            : null,
          milestone: taskMilestone
            ? {
                id: taskMilestone.id,
                title: taskMilestone.title,
                status: taskMilestone.status,
                dueDate: taskMilestone.dueDate,
              }
            : null,
          proofs: taskProofs.map((p) => ({
            id: p.id,
            explanation: p.explanation,
            status: p.status,
            createdAt: p.createdAt,
            reviewedById: p.reviewedById || null,
          })),
        };
      }),
      milestones: milestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        dueDate: m.dueDate,
        targetDate: m.targetDate,
        status: m.status,
        createdAt: m.createdAt,
      })),
      expenseItems: expenseItems.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        cost: e.cost,
        date: e.date,
        status: e.status,
        vendor: e.vendor || null,
        notes: e.notes || null,
      })),
    };

    const jsonString = JSON.stringify(auditReport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedTitle = (project.title || 'project')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const dateStamp = new Date().toISOString().split('T')[0];
    a.download = `audit-report-${sanitizedTitle}-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#1c1f38]">
        <div className="flex items-start sm:items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-[#14162a] border border-[#232746] text-slate-400 hover:text-slate-100 hover:bg-[#1b1e38] transition-colors mt-0.5 sm:mt-0"
            title="Back to projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-100">
                {project.title}
              </h1>

              {/* Status Selector or Badge */}
              {isLeaderOrOwner ? (
                <div className="flex items-center gap-1.5 bg-[#14162a] border border-[#272c50] px-2 py-0.5 rounded-lg shadow-sm">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Status:</span>
                  <select
                    id="project-status-selector"
                    value={project.status}
                    disabled={isStatusUpdating}
                    onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                    className="bg-transparent text-xs font-mono text-purple-300 font-semibold focus:outline-none cursor-pointer capitalize"
                  >
                    {PROJECT_STATUSES.map((st) => (
                      <option key={st} value={st} className="bg-[#0e101f] text-slate-200 capitalize">
                        {st.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <StatusBadge status={project.status} />
              )}

              {/* Live Real-Time Sync Indicator */}
              <div
                id="realtime-status-pill"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border bg-[#0d1024]/90 border-[#20254c] text-slate-300 shadow-sm"
                title={`Real-Time Engine: ${connectionStatus}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                      : connectionStatus === 'connecting'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-rose-400'
                  }`}
                />
                <span className="font-semibold text-[10px] tracking-wider uppercase">
                  {connectionStatus === 'connected'
                    ? 'Live Sync'
                    : connectionStatus === 'connecting'
                    ? 'Connecting...'
                    : 'Offline'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
              <span>Team: <strong className="text-slate-300">{team?.name || 'Unassigned'}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{project.memberIds?.length || 0} Team Members</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right side controls: Test Alerts dropdown, Assign Member & New Task */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Real-time Alert Simulation Menu */}
          <div className="relative group">
            <button
              id="test-realtime-alert-btn"
              className="px-3 py-2 rounded-lg bg-[#14162a] border border-[#272b50] hover:border-purple-500/50 text-purple-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              title="Test real-time alert toast notifications"
            >
              <Bell className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
              <span>Simulate Alert</span>
              <ChevronDown className="w-3 h-3 text-purple-400 opacity-70" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-60 rounded-xl bg-[#0d1024] border border-[#252a55] shadow-2xl p-1.5 hidden group-hover:block z-50">
              <div className="text-[10px] font-mono text-slate-400 px-2.5 py-1 uppercase tracking-wider border-b border-white/5 mb-1">
                Trigger Real-Time Toast
              </div>
              <button
                id="trigger-status-alert-btn"
                onClick={() => simulateEvent('status_change')}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:bg-violet-950/70 hover:text-violet-200 flex items-center gap-2 transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-violet-400" />
                <div>
                  <div className="font-medium">Status Change Alert</div>
                  <div className="text-[10px] text-slate-400">Broadcasts status transition toast</div>
                </div>
              </button>
              <button
                id="trigger-member-alert-btn"
                onClick={() => simulateEvent('member_assignment')}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:bg-emerald-950/70 hover:text-emerald-200 flex items-center gap-2 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <div className="font-medium">New Member Alert</div>
                  <div className="text-[10px] text-slate-400">Broadcasts team assignment toast</div>
                </div>
              </button>
            </div>
          </div>

          <button
            id="invite-members-header-btn"
            onClick={() => setIsInviteModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600/90 to-indigo-600/90 border border-purple-500/50 hover:border-purple-400 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-purple-950/40"
            title="Generate unique invite links or email invitations"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Members</span>
          </button>

          {isLeaderOrOwner && (
            <button
              id="assign-member-header-btn"
              onClick={() => setIsAssignMemberOpen(true)}
              className="px-3 py-2 rounded-lg bg-[#14162a] border border-[#232748] text-emerald-300 hover:text-emerald-200 hover:border-emerald-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              title="Assign team member to this project"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Assign Member</span>
            </button>
          )}

          <button
            id="btn-download-project-report"
            onClick={handleDownloadReport}
            className="px-3 py-2 rounded-lg bg-[#14162a] border border-[#232748] hover:border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            title="Download structured JSON audit report with all tasks, priorities, and statuses"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download Report</span>
          </button>

          <button
            onClick={() => setIsExporting(true)}
            disabled={isExporting}
            className="px-3 py-2 rounded-lg bg-[#14162a] border border-[#232748] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Export Project Summary"
          >
            {isExporting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
            <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {isLeaderOrOwner && (
            <button
              onClick={() => onEditProject && onEditProject(project)}
              className="px-3 py-2 rounded-lg bg-[#14162a] border border-[#232748] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {isLeaderOrOwner && (
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                  try {
                    await api.deleteProject(projectId);
                    onBack();
                  } catch (err) {
                    console.error('Failed to delete project', err);
                    alert('Failed to delete project');
                  }
                }
              }}
              className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateTaskOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-purple-900/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Local Task Quick Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#0e1022] border border-[#1e2242]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="project-detail-header-search"
              type="text"
              value={taskSearchQuery}
              onChange={(e) => setTaskSearchQuery(e.target.value)}
              placeholder="Search tasks by name or status..."
              className="w-full bg-[#14162e] border border-[#222648] rounded-lg py-1.5 pl-8 pr-8 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500 transition-colors"
            />
            {taskSearchQuery && (
              <button
                type="button"
                onClick={() => setTaskSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                title="Clear task search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            id="project-detail-header-status-filter"
            value={taskStatusFilter}
            onChange={(e) => setTaskStatusFilter(e.target.value)}
            className="bg-[#14162e] border border-[#222648] rounded-lg py-1.5 px-2.5 text-slate-200 text-xs focus:outline-none focus:border-purple-500 capitalize shrink-0"
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

        {(taskSearchQuery.trim() || taskStatusFilter !== 'all') && (
          <div className="flex items-center gap-2 text-xs shrink-0 flex-wrap justify-between sm:justify-end">
            <span className="text-slate-400 text-[11px]">
              {tasks.filter((t) => {
                const q = taskSearchQuery.trim().toLowerCase();
                const matchesQ =
                  !q ||
                  t.title.toLowerCase().includes(q) ||
                  t.description.toLowerCase().includes(q) ||
                  t.status.toLowerCase().includes(q) ||
                  t.status.replace(/_/g, ' ').toLowerCase().includes(q);
                const matchesS = taskStatusFilter === 'all' || t.status === taskStatusFilter;
                return matchesQ && matchesS;
              }).length}{' '}
              matching task(s)
            </span>
            <button
              onClick={() => {
                setTaskSearchQuery('');
                setTaskStatusFilter('all');
              }}
              className="text-purple-400 hover:text-purple-300 underline text-[11px] font-medium"
            >
              Clear
            </button>
            {activeTab !== 'tasks' && (
              <button
                onClick={() => setActiveTab('tasks')}
                className="px-2 py-1 rounded bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[11px] font-medium hover:bg-purple-600/50 transition-colors"
              >
                View in Tasks Tab →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 border-b border-[#1c1f38] text-xs font-medium scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: Target },
          { id: 'tasks', label: `Tasks (${tasks.length})`, icon: Layers },
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'milestones', label: `Milestones (${milestones.length})`, icon: Target },
          { id: 'proofs', label: `Proof of Work (${proofs.length})`, icon: FileCheck2 },
          { id: 'resources', label: `Resources (${resources.length})`, icon: BookOpen },
          { id: 'discussion', label: 'Discussion', icon: MessageSquare },
          { id: 'analytics', label: 'Analytics & Scoring', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-950/80 text-purple-200 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#14162a]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary & Progress Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-[#202444] space-y-4">
              <h3 className="text-base font-display font-semibold text-slate-100">
                Scope & Intent
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {project.description || 'No detailed scope description provided.'}
              </p>

              {project.objectives && project.objectives.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-2">
                    Key Technical Objectives
                  </h4>
                  <ul className="space-y-1.5">
                    {project.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-[#202444] space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Deliverable Progress
                </h4>
                <div className="text-3xl font-bold font-display text-slate-100 mb-2">
                  {progressPercent}%
                </div>
                <div className="w-full bg-[#16182e] h-2 rounded-full overflow-hidden mb-3">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Closed Tasks:</span>
                    <span className="font-mono text-slate-200">{completedTasksCount} / {tasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verified Proofs:</span>
                    <span className="font-mono text-teal-300">
                      {proofs.filter((p) => p.status === 'approved').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1e223f] text-xs">
                <span className="text-slate-500 block text-[11px]">Visibility Scope:</span>
                <span className="text-purple-300 font-mono capitalize">{project.visibility.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Assigned Project Team Members & Roster */}
          <div className="glass-panel p-6 rounded-2xl border border-[#202444] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-display font-semibold text-slate-100">
                  Assigned Project Team
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {project.memberIds?.length || 0} Assigned
                </span>
              </div>

              {isLeaderOrOwner && (
                <button
                  id="assign-member-overview-btn"
                  onClick={() => setIsAssignMemberOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Assign Member</span>
                </button>
              )}
            </div>

            {(!project.memberIds || project.memberIds.length === 0) ? (
              <div className="p-6 rounded-xl bg-[#0e101f]/60 border border-dashed border-[#232748] text-center text-xs text-slate-400">
                <span>No members individually assigned to this project yet.</span>
                {isLeaderOrOwner && (
                  <button
                    onClick={() => setIsAssignMemberOpen(true)}
                    className="mt-2 block mx-auto text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    Assign a team member now →
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {project.memberIds.map((mId) => {
                  const memberUser = users.find((u) => u.id === mId);
                  const isProjLeader = mId === project.leaderId;
                  return (
                    <div
                      key={mId}
                      onClick={() => {
                        setSelectedMemberProfileId(mId);
                        setIsProfileModalOpen(true);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#121427] border border-[#202444] hover:border-purple-500/50 hover:bg-[#161830] transition-all cursor-pointer group"
                      title="Click to view full member profile"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-xs text-white shrink-0 group-hover:scale-105 transition-transform">
                          {memberUser?.name ? memberUser.name[0]?.toUpperCase() : mId.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-200 truncate flex items-center gap-1.5 group-hover:text-purple-300 transition-colors">
                            <span>{memberUser?.name || `User (${mId})`}</span>
                            {isProjLeader && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Leader
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {memberUser?.email || memberUser?.title || 'Team Member'}
                          </div>
                        </div>
                      </div>

                      {isLeaderOrOwner && !isProjLeader && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMember(mId);
                          }}
                          title="Remove from project"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-2 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Budget Tracker & Deductions */}
          <div className="glass-panel p-6 rounded-2xl border border-[#202444] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1c1f38]">
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-display font-semibold text-slate-100">
                    Budget Tracker & Deductions
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track bought components and completed services subtracted automatically from total budget.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isLeaderOrOwner && (
                  <>
                    <button
                      onClick={() => {
                        setBudgetInput(budget.toString());
                        setIsEditBudgetOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#161933] hover:bg-[#20254b] text-slate-300 border border-[#2a2f55] text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Configure total allocated budget cap"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{hasBudget ? 'Adjust Budget Cap' : 'Set Budget Cap'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setExpenseTitle('');
                        setExpenseCost('');
                        setExpenseVendor('');
                        setExpenseNotes('');
                        setExpenseCategory('component');
                        setExpenseStatus('bought');
                        setExpenseDate(new Date().toISOString().split('T')[0]);
                        setIsAddExpenseOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#090a14] font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-amber-900/30 transition-colors"
                      title="Add a purchased component or completed service to subtract from budget"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Component / Service</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {!hasBudget ? (
              <div className="p-8 rounded-xl bg-[#0e101f]/60 border border-dashed border-[#232748] text-center space-y-3">
                <Wallet className="w-10 h-10 text-amber-400/40 mx-auto" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">No Budget Allocated Yet</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Set a total budget for this project to start recording purchased components and services with automatic deductions.
                  </p>
                </div>
                {isLeaderOrOwner && (
                  <button
                    onClick={() => {
                      setBudgetInput('50000');
                      setIsEditBudgetOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#090a14] font-semibold text-xs inline-flex items-center gap-2 shadow-md shadow-amber-900/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Set Initial Budget</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* 4-Column Overview Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#121427] border border-[#202444]">
                    <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center justify-between">
                      <span>Total Allocated</span>
                      <DollarSign className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-xl font-mono font-bold text-slate-100">
                      ${budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Project approved cap</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121427] border border-[#202444]">
                    <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center justify-between">
                      <span>Total Deductions</span>
                      <MinusCircle className="w-3 h-3 text-rose-400" />
                    </div>
                    <div className="text-xl font-mono font-bold text-rose-400">
                      -${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {expenseItems.length} {expenseItems.length === 1 ? 'item' : 'items'} bought/done
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121427] border border-[#202444]">
                    <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center justify-between">
                      <span>Remaining Balance</span>
                      <Wallet className="w-3 h-3 text-emerald-400" />
                    </div>
                    <div className={`text-xl font-mono font-bold ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {budgetRemaining < 0 ? '-' : ''}${Math.abs(budgetRemaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {isOverBudget ? 'Over budget by ' + Math.abs(budgetRemaining).toLocaleString() : 'Available to spend'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121427] border border-[#202444]">
                    <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center justify-between">
                      <span>Budget Usage</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isOverBudget ? 'bg-rose-950/80 text-rose-300 border border-rose-600/40' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/40'}`}>
                        {isOverBudget ? 'Deficit' : 'On Track'}
                      </span>
                    </div>
                    <div className={`text-xl font-mono font-bold ${isOverBudget ? 'text-rose-400' : 'text-slate-100'}`}>
                      {budgetPercent.toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {isOverBudget ? 'Exceeded by ' + (budgetPercentRaw - 100).toFixed(1) + '%' : `${(100 - budgetPercent).toFixed(1)}% funds free`}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 p-3 rounded-xl bg-[#0d0f1e] border border-[#1b1e38]">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Spent: <strong className="text-rose-400 font-mono">${totalExpenses.toLocaleString()}</strong></span>
                    <span>Remaining: <strong className={isOverBudget ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>${budgetRemaining.toLocaleString()}</strong></span>
                  </div>
                  <div className="w-full bg-[#181b33] rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-amber-500 to-amber-300'}`}
                      style={{ width: `${budgetPercent}%` }}
                    />
                  </div>
                </div>

                {/* Category Breakdown Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-400 font-medium">Spending Breakdown:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#14172f] border border-[#232850] text-slate-300 inline-flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Components:</span>
                    <strong className="font-mono text-white">${(categoryTotals['component'] || 0).toLocaleString()}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#14172f] border border-[#232850] text-slate-300 inline-flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-violet-400" />
                    <span>Services:</span>
                    <strong className="font-mono text-white">${(categoryTotals['service'] || 0).toLocaleString()}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#14172f] border border-[#232850] text-slate-300 inline-flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hardware:</span>
                    <strong className="font-mono text-white">${(categoryTotals['hardware'] || 0).toLocaleString()}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#14172f] border border-[#232850] text-slate-300 inline-flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Software:</span>
                    <strong className="font-mono text-white">${(categoryTotals['software'] || 0).toLocaleString()}</strong>
                  </span>
                </div>

                {/* Purchased Components & Services Deductions Table */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-200">
                        Purchased Components & Completed Services
                      </h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#1c2042] text-amber-300 font-mono">
                        {expenseItems.length}
                      </span>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0e101f] border border-[#1e2244] text-[11px] overflow-x-auto">
                      {['all', 'component', 'service', 'hardware', 'software', 'contractor'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setExpenseCategoryFilter(f)}
                          className={`px-2.5 py-1 rounded-md capitalize whitespace-nowrap transition-colors ${
                            expenseCategoryFilter === f
                              ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List / Table of Deductions */}
                  {filteredExpenseItems.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#0c0e1b] border border-dashed border-[#1f223f] text-center text-xs text-slate-400">
                      <span>No items recorded in this category. Click "Add Component / Service" above to record an expense and deduct it from the budget.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#1e2240] bg-[#0c0e1b]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#121528] text-slate-400 border-b border-[#1e2240] uppercase font-mono text-[10px]">
                          <tr>
                            <th className="px-4 py-3">Item / Service</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Vendor / Provider</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Cost (Deducted)</th>
                            {isLeaderOrOwner && <th className="px-3 py-3 text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#171a33]">
                          {filteredExpenseItems.map((item) => {
                            const isDeleting = deletingExpenseId === item.id;
                            return (
                              <tr key={item.id} className="hover:bg-[#13162b] transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-100">
                                  <div>
                                    <span className="font-semibold">{item.title}</span>
                                    {item.notes && (
                                      <p className="text-[11px] text-slate-400 font-normal mt-0.5 max-w-md">
                                        {item.notes}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono capitalize bg-[#161a35] text-slate-300 border border-[#232954]">
                                    {item.category === 'component' && <Cpu className="w-3 h-3 text-cyan-400" />}
                                    {item.category === 'service' && <Wrench className="w-3 h-3 text-violet-400" />}
                                    {item.category === 'hardware' && <Package className="w-3 h-3 text-amber-400" />}
                                    {item.category === 'software' && <FileCheck2 className="w-3 h-3 text-emerald-400" />}
                                    {item.category === 'contractor' && <Users className="w-3 h-3 text-rose-400" />}
                                    {item.category === 'other' && <Receipt className="w-3 h-3 text-slate-400" />}
                                    <span>{item.category}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                                  {item.vendor || '—'}
                                </td>
                                <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                                  {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                    item.status === 'bought' || item.status === 'completed'
                                      ? 'bg-emerald-950/70 border border-emerald-700/40 text-emerald-300'
                                      : 'bg-amber-950/70 border border-amber-700/40 text-amber-300'
                                  }`}>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="capitalize">{item.status === 'bought' ? 'Bought' : item.status === 'completed' ? 'Done' : item.status}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-rose-400 text-sm">
                                  -${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                {isLeaderOrOwner && (
                                  <td className="px-3 py-3 text-center">
                                    <button
                                      type="button"
                                      disabled={isDeleting}
                                      onClick={() => handleDeleteExpense(item.id)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                      title="Remove item and restore cost to budget"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Active Tasks Preview */}
          <div className="glass-panel p-6 rounded-2xl border border-[#202444] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Active Work Items</span>
              </h3>
              <button
                onClick={() => setActiveTab('tasks')}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                View all tasks →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.slice(0, 3).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  users={users}
                  onClick={() => setSelectedTask(task)}
                  onRequestProofSubmit={(t) => setProofSubmitTask(t)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tasks (Integrated Drag & Drop Kanban & Priority Ranking System) */}
      {activeTab === 'tasks' && (
        <TaskManagementView
          projectId={projectId}
          tasks={tasks}
          users={users}
          milestones={milestones}
          onTaskClick={(t) => setSelectedTask(t)}
          onRequestProofSubmit={(t) => setProofSubmitTask(t)}
          onTasksChanged={fetchData}
          onOpenCreateTask={handleOpenCreateTask}
          onDownloadReport={handleDownloadReport}
          searchQuery={taskSearchQuery}
          onSearchQueryChange={setTaskSearchQuery}
          statusFilter={taskStatusFilter}
          onStatusFilterChange={setTaskStatusFilter}
        />
      )}

      {/* Tab: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase text-slate-400">
              Cryptographic & Technical Milestones ({milestones.length})
            </h3>
            {isLeaderOrOwner && (
              <button
                onClick={() => setIsCreateMilestoneOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Milestone</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {milestones.map((m) => {
              const mTasks = tasks.filter((t) => t.milestoneId === m.id);
              const mDone = mTasks.filter((t) => t.status === 'complete').length;
              const rawMPct = mTasks.length > 0 ? Math.round((mDone / mTasks.length) * 100) : 0;
              const mPct = Number.isFinite(rawMPct) ? Math.max(0, Math.min(100, rawMPct)) : 0;
              const targetDateStr = m.dueDate || m.targetDate || '';
              const validTargetDate = targetDateStr && !isNaN(new Date(targetDateStr).getTime())
                ? new Date(targetDateStr).toLocaleDateString()
                : 'No target date';

              return (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl glass-panel border border-[#1f223f] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-base font-semibold text-slate-100">{m.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">
                        Target: {validTargetDate}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          m.status === 'completed'
                            ? 'bg-teal-950/60 border-teal-500/40 text-teal-300'
                            : 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                        }`}
                      >
                        {m.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-[#16182e] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-400 h-full rounded-full transition-all"
                      style={{ width: `${mPct}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {mDone} of {mTasks.length} milestone tasks completed ({mPct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Proof of Work */}
      {activeTab === 'proofs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-display font-semibold text-slate-100">
                Verifiable Proof Deliverables ({proofs.length})
              </h3>
              <p className="text-xs text-slate-400">
                Member-submitted benchmarks, code references, and artifacts subject to leadership review.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {proofs.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-[#1f223f] rounded-2xl text-slate-500 font-mono text-xs">
                No deliverables or proofs submitted yet for this project.
              </div>
            ) : (
              proofs.map((proof) => {
                const submitter = users.find((u) => u.id === proof.submittedById);
                const task = tasks.find((t) => t.id === proof.taskId);
                return (
                  <div
                    key={proof.id}
                    onClick={() => setReviewProofItem(proof)}
                    className="p-5 rounded-2xl glass-panel border border-[#1f223f] hover:border-purple-500/40 cursor-pointer transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-100">
                            {task ? task.title : 'Task Work Item'}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161830] text-slate-400 border border-[#232746]">
                            {proof.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Submitted by <strong className="text-purple-300">{submitter ? submitter.name : proof.submittedById}</strong> on{' '}
                          {new Date(proof.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          proof.status === 'approved'
                            ? 'bg-teal-950/60 border-teal-500/40 text-teal-300'
                            : proof.status === 'rejected'
                            ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                            : proof.status === 'changes_requested'
                            ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                            : 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                        }`}
                      >
                        {proof.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-[#0c0d18] p-3 rounded-xl border border-[#191b32]">
                      {proof.explanation}
                    </p>

                    {proof.reviewNote && (
                      <div className="p-2.5 rounded-lg bg-[#14162a] border border-purple-500/20 text-xs text-purple-200">
                        <strong className="text-purple-300">Lead Attestation: </strong>
                        {proof.reviewNote}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: Resources */}
      {activeTab === 'resources' && (
        <ResourceLibrary
          projectId={projectId}
          resources={resources}
          onResourceChanged={fetchData}
        />
      )}

      {/* Tab: Discussion */}
      {activeTab === 'discussion' && (
        <ProjectDiscussion projectId={projectId} users={users} />
      )}

      {/* Tab: Analytics & Scoring */}
      {activeTab === 'analytics' && <ProjectAnalyticsView projectId={projectId} />}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <ProjectTimeline tasks={tasks} milestones={milestones} />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        users={users}
        milestones={milestones}
        onTaskUpdated={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTask(updated);
        }}
        onRequestProofSubmit={(t) => {
          setSelectedTask(null);
          setProofSubmitTask(t);
        }}
        onRequestProofReview={(proofId) => {
          const p = proofs.find((item) => item.id === proofId);
          if (p) {
            setSelectedTask(null);
            setReviewProofItem(p);
          }
        }}
      />

      {/* Proof Submission Modal */}
      <ProofSubmissionModal
        isOpen={!!proofSubmitTask}
        onClose={() => setProofSubmitTask(null)}
        task={proofSubmitTask}
        onProofSubmitted={fetchData}
      />

      {/* Proof Review Modal */}
      <ProofReviewModal
        isOpen={!!reviewProofItem}
        onClose={() => setReviewProofItem(null)}
        proof={reviewProofItem}
        users={users}
        onReviewCompleted={fetchData}
      />

      {/* Create Task Modal */}
      <Modal isOpen={isCreateTaskOpen} onClose={() => setIsCreateTaskOpen(false)} title="Create Work Item">
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Title *</label>
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Implement zero-knowledge verification endpoint"
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              placeholder="Provide technical criteria, references, and expected output..."
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Status</label>
              <select
                value={newTaskStatus}
                onChange={(e) => setNewTaskStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none capitalize"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none capitalize"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">{p} Priority</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 flex items-center justify-between">
                <span>Assignee</span>
                {!isLeaderOrOwner && (
                  <span className="text-[10px] text-amber-300 font-mono font-normal">
                    (Self-assigned • Leaders assign to others)
                  </span>
                )}
              </label>
              <select
                value={newTaskAssignee}
                disabled={!isLeaderOrOwner}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Due Date</label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Milestone</label>
              <select
                value={newTaskMilestoneId}
                onChange={(e) => setNewTaskMilestoneId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
              >
                <option value="">None</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={newTaskTags}
              onChange={(e) => setNewTaskTags(e.target.value)}
              placeholder="crypto, backend, p1"
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Group Task Toggle & Points Config */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/80 via-[#131530] to-purple-950/80 border border-indigo-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Collaborative Group Task</span>
                  <span className="text-[10px] text-slate-400 block">
                    Multiple members submit work individually to earn points, then all earn a team bonus when finalized!
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNewTaskGroup}
                  onChange={(e) => setIsNewTaskGroup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#1c1e38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            {isNewTaskGroup && (
              <div className="space-y-3 pt-2 border-t border-indigo-500/20 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    Participating Team Members ({newTaskParticipants.length} selected)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-lg bg-[#090b16] border border-[#1b1f3d]">
                    {users.map((u) => {
                      const isChecked = newTaskParticipants.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                            isChecked ? 'bg-indigo-900/40 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTaskParticipants((prev) => [...prev, u.id]);
                              } else {
                                if (newTaskParticipants.length <= 1) {
                                  alert('At least one participant is required for a group task.');
                                  return;
                                }
                                setNewTaskParticipants((prev) => prev.filter((id) => id !== u.id));
                              }
                            }}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{u.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Individual Submission Pts</span>
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="200"
                      value={newTaskIndPoints}
                      onChange={(e) => setNewTaskIndPoints(Number(e.target.value) || 35)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#090b16] border border-[#1b1f3d] text-amber-300 font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Team Completion Bonus Pts</span>
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={newTaskGroupBonusPoints}
                      onChange={(e) => setNewTaskGroupBonusPoints(Number(e.target.value) || 60)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#090b16] border border-[#1b1f3d] text-indigo-300 font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#202444] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateTaskOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-900/30"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Milestone Modal */}
      <Modal isOpen={isCreateMilestoneOpen} onClose={() => setIsCreateMilestoneOpen(false)} title="Create Milestone">
        <form onSubmit={handleCreateMilestone} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Milestone Title *</label>
            <input
              type="text"
              required
              value={newMileTitle}
              onChange={(e) => setNewMileTitle(e.target.value)}
              placeholder="e.g. Testnet Alpha Deployment"
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={newMileDesc}
              onChange={(e) => setNewMileDesc(e.target.value)}
              placeholder="Milestone validation criteria..."
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Target Date</label>
            <input
              type="date"
              value={newMileTargetDate}
              onChange={(e) => setNewMileTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-[#202444] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateMilestoneOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium"
            >
              Create Milestone
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Member Modal */}
      <Modal
        isOpen={isAssignMemberOpen}
        onClose={() => {
          setIsAssignMemberOpen(false);
          setSelectedUserToAssign('');
        }}
        title="Assign Team Member to Project"
      >
        <form onSubmit={handleAssignMember} className="space-y-4 text-xs">
          <p className="text-slate-300">
            Select a team member to assign to <strong className="text-slate-100">{project.title}</strong>.
            Assigned members receive real-time notification alerts for task transitions and scope adjustments.
          </p>

          <div>
            <label className="block text-slate-300 mb-1.5 font-medium">Available Team Members</label>
            {availableUsersToAssign.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-400 text-xs">
                All workspace members are already assigned to this project.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {availableUsersToAssign.map((u) => (
                  <label
                    key={u.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedUserToAssign === u.id
                        ? 'bg-purple-950/40 border-purple-500/60 text-white'
                        : 'bg-[#0e101c] border-[#232746] hover:border-[#343b68] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="assigneeUser"
                        value={u.id}
                        checked={selectedUserToAssign === u.id}
                        onChange={() => setSelectedUserToAssign(u.id)}
                        className="text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <div>
                        <div className="font-medium text-slate-200">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 capitalize">
                      {u.role}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#202444] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAssignMemberOpen(false);
                setSelectedUserToAssign('');
              }}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedUserToAssign || isAssigning}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
            >
              {isAssigning ? 'Assigning...' : 'Assign to Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Budget Modal */}
      <Modal
        isOpen={isEditBudgetOpen}
        onClose={() => setIsEditBudgetOpen(false)}
        title="Project Budget Allocation"
      >
        <form onSubmit={handleUpdateBudget} className="space-y-4 text-xs">
          <p className="text-slate-300">
            Set or adjust the total approved budget cap for <strong className="text-slate-100">{project.title}</strong>.
            Purchased components and completed services will automatically be subtracted from this amount.
          </p>

          <div>
            <label className="block text-slate-300 mb-1.5 font-medium">Total Allocated Budget ($)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-500">$</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="50000.00"
                className="w-full bg-[#0e101c] border border-[#232746] rounded-xl py-2 pl-7 pr-3 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Current deductions summary info */}
          <div className="p-3 rounded-xl bg-[#121528] border border-[#1e2240] space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>Active Deductions ({expenseItems.length} items):</span>
              <span className="font-mono text-rose-400">-${totalExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#1a1e38] font-medium">
              <span>Estimated Remaining Balance:</span>
              <span className={`font-mono ${((Number(budgetInput) || 0) - totalExpenses) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${((Number(budgetInput) || 0) - totalExpenses).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#202444] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditBudgetOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingBudget}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#090a14] font-semibold flex items-center gap-1.5 shadow-md shadow-amber-900/20"
            >
              {isSavingBudget ? 'Saving...' : 'Save Budget Cap'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Purchased Component / Completed Service Modal */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="Add Component or Service (Subtract from Budget)"
      >
        <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
          <p className="text-slate-300">
            Record a component bought or service completed for <strong className="text-slate-100">{project.title}</strong>.
            The cost will immediately be subtracted from the total remaining budget.
          </p>

          <div>
            <label className="block text-slate-300 mb-1.5 font-medium">Component / Service Name *</label>
            <input
              type="text"
              required
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              placeholder="e.g. AWS Multi-Region GPU Cluster or Smart Contract Audit"
              className="w-full bg-[#0e101c] border border-[#232746] rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1.5 font-medium">Category *</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-[#0e101c] border border-[#232746] rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-amber-500 capitalize"
              >
                <option value="component">Component (Cloud, Servers, DB)</option>
                <option value="service">Service (Audits, Pentest, Review)</option>
                <option value="hardware">Hardware (Appliances, HSMs, Devices)</option>
                <option value="software">Software (Licenses, SaaS, APIs)</option>
                <option value="contractor">Contractor / Specialized Team</option>
                <option value="other">Other Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-medium">Cost to Subtract ($) *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500">$</span>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={expenseCost}
                  onChange={(e) => setExpenseCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0e101c] border border-[#232746] rounded-xl py-2 pl-7 pr-3 text-slate-200 focus:outline-none focus:border-amber-500 font-mono font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1.5 font-medium">Vendor / Supplier</label>
              <input
                type="text"
                value={expenseVendor}
                onChange={(e) => setExpenseVendor(e.target.value)}
                placeholder="e.g. AWS, Trail of Bits, Cloudflare"
                className="w-full bg-[#0e101c] border border-[#232746] rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-medium">Date Done or Bought</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-[#0e101c] border border-[#232746] rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1.5 font-medium">Fulfillment Status</label>
              <select
                value={expenseStatus}
                onChange={(e) => setExpenseStatus(e.target.value as any)}
                className="w-full bg-[#0e101c] border border-[#232746] rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-amber-500 capitalize"
              >
                <option value="bought">Bought (Hardware/Component/License)</option>
                <option value="completed">Done / Completed (Service/Audit)</option>
                <option value="planned">Planned (Committed Reservation)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-medium">Notes / PO Reference</label>
              <input
                type="text"
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                placeholder="PO-2026-9921, scope or invoice ref"
                className="w-full bg-[#0e101c] border border-[#232746] rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Live Calculation Preview */}
          {expenseCost && !isNaN(parseFloat(expenseCost)) && (
            <div className="p-3 rounded-xl bg-[#121528] border border-amber-500/30 space-y-1.5">
              <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                <span>Live Budget Deduction Calculation:</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Remaining Budget:</span>
                <span className="font-mono text-slate-200">${budgetRemaining.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-medium">
                <span>Deduction for this item:</span>
                <span className="font-mono">-${parseFloat(expenseCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#1e2240] font-semibold">
                <span className="text-slate-300">New Remaining Balance:</span>
                <span className={`font-mono text-sm ${(budgetRemaining - parseFloat(expenseCost)) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ${(budgetRemaining - parseFloat(expenseCost)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#202444] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddExpenseOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingExpense || !expenseTitle || !expenseCost}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#090a14] font-semibold flex items-center gap-1.5 shadow-md shadow-amber-900/30"
            >
              <MinusCircle className="w-3.5 h-3.5" />
              <span>{isSavingExpense ? 'Deducting...' : 'Deduct from Budget'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Real-time Toast Notifications Alert System */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onClearAll={clearAllToasts}
      />

      {/* Member Profile Modal */}
      <MemberProfileModal
        userId={selectedMemberProfileId}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedMemberProfileId(null);
        }}
        onSendMessage={onSendMessage}
        onProfileUpdated={() => {
          fetchData();
        }}
      />

      {/* PDF Export Component */}
      {isExporting && (
        <ProjectPDFExport 
          project={project} 
          tasks={tasks} 
          milestones={milestones} 
          onComplete={() => setIsExporting(false)} 
        />
      )}

      {/* Team Invitation Modal */}
      {project && (
        <TeamInvitationModal
          project={project}
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onInvitationCreated={fetchData}
        />
      )}
    </div>
  );
}
