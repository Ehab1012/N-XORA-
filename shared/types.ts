export type { UserRole, TaskStatus, TaskPriority, ProjectStatus, ProofStatus, ResourceCategory } from './const.js';
import { UserRole, TaskStatus, TaskPriority, ProjectStatus, ProofStatus, ResourceCategory } from './const.js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  title?: string;
  bio?: string;
  department?: string;
  location?: string;
  phone?: string;
  skills?: string[];
  githubHandle?: string;
  linkedinUrl?: string;
  timezone?: string;
  statusMessage?: string;
  overallScore?: number;
  createdAt: string;
  lastActiveAt?: string;
}

export interface UserProfileDetails {
  user: User;
  teams: Team[];
  projects: Array<{
    id: string;
    title: string;
    status: ProjectStatus;
    accentColor: string;
    isLeader: boolean;
    isMember: boolean;
    totalTasks: number;
    completedTasks: number;
    deadline: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    projectId: string;
    projectTitle: string;
    dueDate?: string;
  }>;
  stats: {
    totalProjects: number;
    totalTasksAssigned: number;
    completedTasksCount: number;
    inProgressTasksCount: number;
    completionRatePercent: number;
  };
  score: UserScoreDetail & {
    rank?: number;
    totalMembers?: number;
    tier?: string;
  };
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  settings: {
    allowMemberInvites: boolean;
    requireProofApproval: boolean;
    emergencyRecoveryEmail?: string;
    strictIdorChecks: boolean;
  };
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
}

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  leaderId: string;
  coLeaderId?: string;
  memberIds: string[];
  isArchived: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  teamId: string;
  title: string;
  description: string;
  objectives: string[];
  status: ProjectStatus;
  deadline: string; // ISO 8601 UTC
  accentColor: string;
  leaderId: string;
  coLeaderId?: string;
  visibility: 'workspace' | 'team_only' | 'private_assigned';
  memberIds: string[];
  budget?: number;
  expenses?: number;
  expenseItems?: ProjectExpenseItem[];
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory = 'component' | 'service' | 'software' | 'hardware' | 'contractor' | 'other';

export interface ProjectExpenseItem {
  id: string;
  projectId: string;
  title: string;
  category: ExpenseCategory;
  cost: number;
  date: string;
  status?: 'bought' | 'completed' | 'planned';
  vendor?: string;
  notes?: string;
  createdById?: string;
  createdAt: string;
}

export interface TaskChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}

export interface GroupTaskSubmission {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  userRole?: UserRole;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  note?: string;
  proofLinks?: string[];
  pointsAwarded?: number;
  reviewedById?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId?: string;
  creatorId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // ISO 8601 UTC
  milestoneId?: string;
  tags: string[];
  checklist: TaskChecklistItem[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  proofSubmittedId?: string;

  // Group / Collaborative Task Extensions
  isGroupTask?: boolean;
  participantIds?: string[];
  individualPoints?: number; // points each participant gets when submitting their part (e.g. 35 pts)
  groupBonusPoints?: number; // extra points all participants get when final task is complete (e.g. 60 pts)
  submissions?: GroupTaskSubmission[];
  bonusAwarded?: boolean;
  bonusAwardedAt?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string;
  targetDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  ownerId?: string;
  createdAt: string;
}

export interface ProofReviewHistory {
  id: string;
  proofId: string;
  reviewerId: string;
  action: 'approved' | 'rejected' | 'changes_requested';
  reason: string;
  createdAt: string;
}

export interface ProofSubmission {
  id: string;
  taskId: string;
  projectId: string;
  submittedById: string;
  explanation: string;
  links: string[];
  attachmentIds: string[];
  status: ProofStatus;
  reviewNote?: string;
  reviewedById?: string;
  reviewedAt?: string;
  createdAt: string;
  reviewHistory: ProofReviewHistory[];
}

export interface ResourceItem {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  url?: string;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  dataUrl?: string;
  thumbnailUrl?: string;
  previewSnippet?: string;
  category: ResourceCategory;
  createdById: string;
  permissionScope?: 'workspace' | 'team' | 'project_members';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMessage {
  id: string;
  projectId: string;
  senderId: string;
  content: string;
  replyToId?: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'deadline' | 'overdue' | 'proof_review' | 'mention' | 'announcement' | 'score' | 'task_assigned' | 'milestone_reached';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  deadlineReminders: boolean;
  overdueAlerts: boolean;
  proofReviewUpdates: boolean;
  directMessages: boolean;
  projectAnnouncements: boolean;
  weeklySummaries: boolean;
}

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  projectId?: string;
  userId: string;
  action: string;
  entityType: 'project' | 'task' | 'milestone' | 'proof' | 'team' | 'resource' | 'setting' | 'auth';
  entityId: string;
  details: string;
  createdAt: string;
}

export interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedByName?: string;
  projectId?: string;
  dataUrl: string; // Base64 data url or secure internal object path
  thumbnailUrl?: string; // Optional custom thumbnail or preview data
  category?: 'document' | 'image' | 'video' | 'audio' | 'diagram' | 'code' | 'archive' | 'other';
  description?: string;
  tags?: string[];
  createdAt: string;
}

export interface UserScoreDetail {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: UserRole;
  userRole?: UserRole;
  totalScore: number;
  tasksCompleted?: number;
  milestonesCompleted?: number;
  proofsApproved?: number;
  onTimeDeliveries?: number;
  groupTasksCompleted?: number;
  groupBonusCount?: number;
  breakdown: {
    tasksCompleted: number; // 25 pts each
    tasksScore: number;
    milestonesCompleted: number; // 50 pts each
    milestonesScore: number;
    proofsApproved: number; // 40 pts each
    proofsScore: number;
    onTimeDeliveries: number; // 15 pts bonus
    onTimeScore: number;
    groupTasksCompleted?: number; // individual contributions
    groupTasksScore?: number; // individual submission points
    groupBonusCount?: number; // completed group missions
    groupBonusScore?: number; // collective team completion bonus
  };
}

export interface ProjectAnalytics {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  atRiskTasks: number;
  overdueTasks?: number;
  completionRate: number;
  totalMilestones: number;
  completedMilestones: number;
  totalProofs: number;
  approvedProofs: number;
  pendingProofs: number;
  healthStatus: 'healthy' | 'at_risk' | 'critical' | 'completed';
  leaderboard: UserScoreDetail[];
  recentActivities: ActivityEvent[];
}

export interface OnboardingState {
  userId: string;
  hasCompleted: boolean;
  dismissed: boolean;
  step: 'workspace' | 'team' | 'project' | 'notifications' | 'completed';
  invitedTeammates: string[];
}

export interface AuthSession {
  user: User;
  workspace: Workspace;
  role: UserRole;
  token: string;
}

export type RealtimeEventType =
  | 'project:status_changed'
  | 'project:member_assigned'
  | 'project:file_uploaded'
  | 'task:status_changed'
  | 'task:member_assigned'
  | 'milestone:status_changed';

export interface RealtimeEventPayload {
  id: string;
  type: RealtimeEventType;
  projectId: string;
  title: string;
  message: string;
  oldValue?: string;
  newValue?: string;
  entityId?: string;
  entityTitle?: string;
  memberId?: string;
  memberName?: string;
  memberRole?: string;
  actorName: string;
  timestamp: string;
}
