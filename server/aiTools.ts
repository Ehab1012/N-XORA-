import { FunctionDeclaration, Type } from '@google/genai';
import { db, DatabaseSchema } from './db.js';
import { logActivity } from './auth.js';
import { realtimeHub } from './realtime.js';
import { calculateUserOverallScore } from './analytics.js';
import {
  ROLES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  PROJECT_STATUSES,
  TASK_PRIORITY_POINTS,
  calculateTaskPointsByDates,
} from '../shared/const.js';
import {
  AiExecutedAction,
  BonusAward,
  Milestone,
  Project,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
  User,
  UserRole,
  Workspace,
} from '../shared/types.js';

export interface AiActorContext {
  user: User;
  role: UserRole;
  workspace: Workspace;
  activeProjectId?: string;
}

export interface AiToolExecutionOutcome {
  toolResponse: Record<string, unknown>;
  actionRecord: AiExecutedAction;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

function isLeaderOrCoLeader(role: UserRole): boolean {
  return role === ROLES.LEADER || role === ROLES.CO_LEADER;
}

function formatRoleLabel(role: UserRole): string {
  if (role === ROLES.LEADER) return 'Leader';
  if (role === ROLES.CO_LEADER) return 'Co-Leader';
  return 'Member';
}

function isSelfReference(query: string, actorUser: User): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (q === 'me' || q === 'myself' || q === 'self' || q === 'my account') return true;
  if (q === actorUser.id.toLowerCase()) return true;
  if (q === actorUser.email.toLowerCase()) return true;
  if (q === actorUser.name.toLowerCase()) return true;
  return false;
}

export function getVisibleProjectsForActor(data: DatabaseSchema, actor: AiActorContext): Project[] {
  const workspaceProjects = data.projects.filter((p) => p.workspaceId === actor.workspace.id);
  if (actor.role === ROLES.MEMBER) {
    return workspaceProjects.filter(
      (p) =>
        p.visibility === 'workspace' ||
        p.memberIds.includes(actor.user.id) ||
        p.leaderId === actor.user.id ||
        p.coLeaderId === actor.user.id
    );
  }
  return workspaceProjects;
}

export function getVisibleTasksForActor(
  data: DatabaseSchema,
  actor: AiActorContext,
  projectId?: string
): Task[] {
  const visibleProjectIds = new Set(getVisibleProjectsForActor(data, actor).map((p) => p.id));
  let tasks = data.tasks.filter((t) => visibleProjectIds.has(t.projectId));

  if (projectId) {
    tasks = tasks.filter((t) => t.projectId === projectId);
  }

  if (actor.role === ROLES.MEMBER) {
    tasks = tasks.filter(
      (t) =>
        t.assigneeId === actor.user.id ||
        t.creatorId === actor.user.id ||
        (t.isGroupTask && Array.isArray(t.participantIds) && t.participantIds.includes(actor.user.id))
    );
  }

  return tasks;
}

function resolveUser(data: DatabaseSchema, identifier: string, actorUser?: User): User | null {
  const clean = (identifier || '').trim();
  if (!clean) return null;

  if (actorUser && isSelfReference(clean, actorUser)) {
    return data.users.find((u) => u.id === actorUser.id) || actorUser;
  }

  const lower = clean.toLowerCase();

  // 1. Exact ID, email, or full name
  const exact = data.users.find(
    (u) =>
      u.id.toLowerCase() === lower ||
      u.email.toLowerCase() === lower ||
      u.name.toLowerCase() === lower
  );
  if (exact) return exact;

  // 2. Exact first name match
  const firstNameMatches = data.users.filter(
    (u) => u.name.trim().split(/\s+/)[0]?.toLowerCase() === lower
  );
  if (firstNameMatches.length === 1) return firstNameMatches[0];

  // 3. Partial name or email match
  const partialMatches = data.users.filter(
    (u) => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower)
  );
  if (partialMatches.length >= 1) return partialMatches[0];

  return null;
}

function resolveAccessibleProject(
  data: DatabaseSchema,
  projectRef: string | undefined,
  actor: AiActorContext
): { project: Project | null; forbidden?: boolean } {
  const clean = (projectRef || '').trim();
  const visibleProjects = getVisibleProjectsForActor(data, actor);

  if (!clean) {
    if (actor.activeProjectId) {
      const active = visibleProjects.find((p) => p.id === actor.activeProjectId);
      if (active) return { project: active };

      const hiddenActive = data.projects.find((p) => p.id === actor.activeProjectId);
      if (hiddenActive) return { project: null, forbidden: true };
    }
    if (visibleProjects.length > 0) {
      return { project: visibleProjects[0] };
    }
    return { project: null };
  }

  const lower = clean.toLowerCase();
  const exactVisible = visibleProjects.find(
    (p) => p.id.toLowerCase() === lower || p.title.toLowerCase() === lower
  );
  if (exactVisible) return { project: exactVisible };

  const partialVisible = visibleProjects.find((p) => p.title.toLowerCase().includes(lower));
  if (partialVisible) return { project: partialVisible };

  // Check if project exists in workspace but actor lacks access
  const existsInWorkspace = data.projects.find(
    (p) =>
      p.workspaceId === actor.workspace.id &&
      (p.id.toLowerCase() === lower ||
        p.title.toLowerCase() === lower ||
        p.title.toLowerCase().includes(lower))
  );
  if (existsInWorkspace) {
    return { project: null, forbidden: true };
  }

  return { project: null };
}

function resolveTaskForActor(
  data: DatabaseSchema,
  taskRef: string,
  actor: AiActorContext,
  projectId?: string
): { task: Task | null; forbiddenOtherMemberTask?: boolean } {
  const clean = (taskRef || '').trim();
  if (!clean) return { task: null };
  const lower = clean.toLowerCase();

  const visibleTasks = getVisibleTasksForActor(data, actor, projectId);
  const exactVisible = visibleTasks.find(
    (t) => t.id.toLowerCase() === lower || t.title.toLowerCase() === lower
  );
  if (exactVisible) return { task: exactVisible };

  const partialVisible = visibleTasks.find((t) => t.title.toLowerCase().includes(lower));
  if (partialVisible) return { task: partialVisible };

  // Check if task exists in workspace but belongs to another member (for clear RBAC messaging)
  const allMatching = data.tasks.filter(
    (t) =>
      (!projectId || t.projectId === projectId) &&
      (t.id.toLowerCase() === lower ||
        t.title.toLowerCase() === lower ||
        t.title.toLowerCase().includes(lower))
  );
  if (allMatching.length > 0 && actor.role === ROLES.MEMBER) {
    return { task: null, forbiddenOtherMemberTask: true };
  }

  return { task: null };
}

function normalizeDueDateIso(rawDueDate?: string, defaultDaysFromNow = 7): string {
  if (rawDueDate && rawDueDate.trim()) {
    const trimmed = rawDueDate.trim();
    // Relative shorthand support e.g. "+3d" or "3 days"
    const relDaysMatch = trimmed.match(/^\+?(\d+)\s*d(?:ays?)?$/i);
    if (relDaysMatch) {
      const days = Math.max(1, Number(relDaysMatch[1]));
      return new Date(Date.now() + days * 86_400_000).toISOString();
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date(Date.now() + defaultDaysFromNow * 86_400_000).toISOString();
}

function createAssignmentNotificationsInDb(
  data: DatabaseSchema,
  task: Task,
  actor: AiActorContext,
  assignedUserIds: string[],
  isGroupTask: boolean
) {
  const project = data.projects.find((p) => p.id === task.projectId);
  const projectName = project?.title || 'Project';
  const roleTitle = formatRoleLabel(actor.role);

  for (const userId of assignedUserIds) {
    if (!userId || userId === actor.user.id) continue;

    const existing = data.notifications.find(
      (n) => n.userId === userId && n.type === 'task_assigned' && n.link?.includes(task.id) && !n.isRead
    );
    if (existing) continue;

    data.notifications.unshift({
      id: makeId('notif'),
      userId,
      title: isGroupTask ? 'Assigned to Group Task' : 'New Task Assigned',
      message: isGroupTask
        ? `${roleTitle} ${actor.user.name} assigned you to group task "${task.title}" in ${projectName}.`
        : `${roleTitle} ${actor.user.name} assigned you to task "${task.title}" in ${projectName}.`,
      type: 'task_assigned',
      isRead: false,
      link: `/projects/${task.projectId}?task=${task.id}`,
      createdAt: new Date().toISOString(),
    });
  }
}

function createMilestoneReachedNotificationsInDb(
  data: DatabaseSchema,
  milestoneTitle: string,
  projectId: string,
  memberIdsToNotify: string[],
  isGroupTaskMilestone = true,
  taskId?: string
) {
  const project = data.projects.find((p) => p.id === projectId);
  const projectName = project?.title || 'Project';
  const recipients =
    memberIdsToNotify.length > 0
      ? Array.from(new Set(memberIdsToNotify))
      : project?.memberIds || [];

  for (const userId of recipients) {
    if (!userId) continue;
    data.notifications.unshift({
      id: makeId('notif'),
      userId,
      title: isGroupTaskMilestone ? 'Group Task Milestone Reached' : 'Milestone Achieved',
      message: isGroupTaskMilestone
        ? `Group milestone "${milestoneTitle}" reached in ${projectName}! All member deliverables verified.`
        : `Milestone "${milestoneTitle}" has been completed in ${projectName}.`,
      type: 'milestone_reached',
      isRead: false,
      link: `/projects/${projectId}${taskId ? `?task=${taskId}` : '?tab=milestones'}`,
      createdAt: new Date().toISOString(),
    });
  }
}

function checkAndCompleteMilestoneInDb(
  data: DatabaseSchema,
  projectId: string,
  milestoneId: string | undefined,
  actorName: string
) {
  if (!milestoneId) return;
  const milestone = data.milestones.find((m) => m.id === milestoneId);
  if (!milestone || milestone.status === 'completed') return;

  const milestoneTasks = data.tasks.filter(
    (t) => t.projectId === projectId && t.milestoneId === milestoneId
  );
  if (milestoneTasks.length > 0 && milestoneTasks.every((t) => t.status === 'complete')) {
    milestone.status = 'completed';
    const project = data.projects.find((p) => p.id === projectId);
    createMilestoneReachedNotificationsInDb(
      data,
      milestone.title,
      projectId,
      project?.memberIds || [],
      true
    );

    realtimeHub.broadcast(projectId, {
      id: makeId('rt'),
      type: 'milestone:status_changed',
      projectId,
      title: 'Group Task Milestone Reached',
      message: `Milestone "${milestone.title}" reached! All associated task deliverables have been completed.`,
      entityId: milestone.id,
      entityTitle: milestone.title,
      actorName,
      timestamp: new Date().toISOString(),
    });
  }
}

function permissionDeniedOutcome(
  toolName: string,
  errorMessage: string,
  summary: string
): AiToolExecutionOutcome {
  return {
    toolResponse: {
      success: false,
      permissionDenied: true,
      error: errorMessage,
    },
    actionRecord: {
      toolName,
      success: false,
      permissionDenied: true,
      summary,
    },
  };
}

/**
 * Builds an authoritative, role-scoped system context block describing the logged-in
 * user's identity, exact RBAC capabilities, workspace team roster, and visible projects/tasks.
 */
export function buildRoleAwareSystemContext(actor: AiActorContext): string {
  const data = db.getRawData();
  const userMap = new Map(data.users.map((u) => [u.id, u]));
  const visibleProjects = getVisibleProjectsForActor(data, actor);
  const visibleTasks = getVisibleTasksForActor(data, actor, actor.activeProjectId);
  const activeProject = actor.activeProjectId
    ? visibleProjects.find((p) => p.id === actor.activeProjectId)
    : visibleProjects[0];

  const rosterLines = data.users
    .map((u) => `- ${u.name} (ID: ${u.id}, Role: ${u.role}, Email: ${u.email}${u.title ? `, Title: ${u.title}` : ''})`)
    .join('\n');

  const projectLines = visibleProjects
    .slice(0, 12)
    .map(
      (p) =>
        `- ${p.title} (ID: ${p.id}, Status: ${p.status}, Members: ${p.memberIds.length}, Deadline: ${p.deadline.slice(0, 10)})`
    )
    .join('\n');

  const taskLines = visibleTasks
    .slice(0, 20)
    .map((t) => {
      const assigneeLabel = t.isGroupTask
        ? `Group: ${(t.participantIds || []).map((id) => userMap.get(id)?.name || id).join(', ')}`
        : t.assigneeId
        ? userMap.get(t.assigneeId)?.name || t.assigneeId
        : 'Unassigned';
      return `- "${t.title}" (ID: ${t.id}, Project: ${t.projectId}, Status: ${t.status}, Priority: ${t.priority}, Assigned: ${assigneeLabel}, Due: ${t.dueDate.slice(0, 10)})`;
    })
    .join('\n');

  const roleRules =
    actor.role === ROLES.LEADER
      ? `ACCOUNT PERMISSIONS (ROLE: LEADER — FULL WORKSPACE AUTHORITY):
- You act directly on behalf of ${actor.user.name} (Leader).
- ALLOWED: Create and assign tasks to ANY workspace member (individual tasks or multi-member collaborative group tasks), reassign or update any task, delete tasks, create/update/delete project milestones, review/approve/reject proof submissions, award merit bonus points (1-1000 pts), add/remove project members, update project status, manage workspace squads/teams, and change other members' ranks.
- When ${actor.user.name} asks you to assign tasks, update tasks, award bonuses, manage milestones, or perform any workspace operation, EXECUTE IT IMMEDIATELY using your function tools rather than only giving text instructions.`
      : actor.role === ROLES.CO_LEADER
      ? `ACCOUNT PERMISSIONS (ROLE: CO-LEADER — OPERATIONAL LEADERSHIP AUTHORITY):
- You act directly on behalf of ${actor.user.name} (Co-Leader).
- ALLOWED: Create and assign tasks to ANY workspace member (individual tasks or multi-member collaborative group tasks), reassign or update any task, delete tasks, create/update/delete project milestones, review/approve/reject proof submissions, award merit bonus points (1-1000 pts), add/remove project members, and adjust member/co-leader ranks (excluding Leaders).
- FORBIDDEN: Deleting workspace squads/teams, deleting user accounts, or demoting Leaders (Leader-only actions).
- When ${actor.user.name} asks you to assign tasks to members or perform any Co-Leader operation, EXECUTE IT IMMEDIATELY using your function tools.`
      : `ACCOUNT PERMISSIONS (ROLE: MEMBER — INDIVIDUAL CONTRIBUTOR AUTHORITY ONLY):
- You act strictly with the permissions of ${actor.user.name} (Member). You DO NOT have Leader or Co-Leader privileges.
- ALLOWED: View your own assigned/participating tasks and accessible projects, create personal tasks assigned ONLY to yourself (${actor.user.name}), update status or details ONLY on tasks assigned to you, submit proof of work or your group-task contribution, send project or direct messages as ${actor.user.name}, and update ONLY ${actor.user.name}'s own profile.
- STRICTLY FORBIDDEN FOR MEMBER:
  1. You CANNOT assign tasks to other team members or create collaborative group tasks for others.
  2. You CANNOT reassign tasks, modify other members' tasks, finalize group tasks, or delete tasks.
  3. You CANNOT create/update/delete milestones, review/approve proofs, award merit bonuses, manage project/team rosters, or change user ranks.
- CRITICAL RULE: If ${actor.user.name} asks you to assign a task to another member (or perform any Leader/Co-Leader action), DO NOT create a self-assigned task as a workaround—clearly explain that their account role is Member and only Leaders or Co-Leaders can assign tasks to other members.`;

  return `
=== AUTHENTICATED ACCOUNT & RBAC SCOPE ===
Current Date (UTC): ${new Date().toISOString()}
Logged-In User: ${actor.user.name} (${actor.user.email})
User ID: ${actor.user.id}
Account Role: ${actor.role}
Workspace: ${actor.workspace.name} (${actor.workspace.id})
Active Open Project: ${activeProject ? `${activeProject.title} (${activeProject.id})` : 'None selected (use project parameter or default workspace project)'}

${roleRules}

=== WORKSPACE TEAM MEMBERS ===
${rosterLines || 'No members found.'}

=== ACCESSIBLE PROJECTS ===
${projectLines || 'No accessible projects.'}

=== VISIBLE TASKS (${actor.role === ROLES.MEMBER ? 'Only Your Assigned / Created / Group Tasks' : 'Workspace / Active Project Tasks'}) ===
${taskLines || 'No visible tasks.'}
`.trim();
}

/**
 * Returns the exact set of Gemini FunctionDeclarations permitted for the logged-in user's role.
 */
export function getAiFunctionDeclarationsForRole(actor: AiActorContext): FunctionDeclaration[] {
  const privileged = isLeaderOrCoLeader(actor.role);

  const getWorkspaceSnapshotTool: FunctionDeclaration = {
    name: 'get_workspace_snapshot',
    description:
      'Retrieve up-to-date projects, tasks visible to the current user, milestones, team members, and current merit score.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        project: {
          type: Type.STRING,
          description: 'Optional project ID or project title to filter tasks and milestones.',
        },
        statusFilter: {
          type: Type.STRING,
          description: `Optional task status filter (${TASK_STATUSES.join(', ')}).`,
        },
      },
    },
  };

  const createTaskTool: FunctionDeclaration = privileged
    ? {
        name: 'create_task',
        description:
          'Create a new task in a project and optionally assign it to a team member (or multiple members as a collaborative group task).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            project: {
              type: Type.STRING,
              description:
                'Project ID or project title (optional if an active project is open).',
            },
            title: {
              type: Type.STRING,
              description: 'Clear, concise title for the task.',
            },
            description: {
              type: Type.STRING,
              description: 'Detailed task description or acceptance criteria.',
            },
            assignee: {
              type: Type.STRING,
              description:
                'User ID, name, or email of the member to assign this task to (or "me" for yourself). Omit if creating a multi-member group task.',
            },
            priority: {
              type: Type.STRING,
              description: `Task priority: ${TASK_PRIORITIES.join(', ')}. Defaults to medium.`,
            },
            dueDate: {
              type: Type.STRING,
              description:
                'Due date in ISO 8601 format (YYYY-MM-DD) or relative days like "+5d". Defaults to 7 days from now.',
            },
            isGroupTask: {
              type: Type.BOOLEAN,
              description:
                'Set to true when assigning a collaborative group task to multiple team members.',
            },
            participants: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Array of member names, emails, or IDs participating in a collaborative group task.',
            },
            individualPoints: {
              type: Type.NUMBER,
              description: 'Points awarded per participant submission on a group task (default 35).',
            },
            groupBonusPoints: {
              type: Type.NUMBER,
              description: 'Team bonus points awarded when a group task is finalized (default 60).',
            },
            milestone: {
              type: Type.STRING,
              description: 'Optional milestone ID or title to link this task to.',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Optional short topic tags.',
            },
          },
          required: ['title'],
        },
      }
    : {
        name: 'create_task',
        description: `Create a personal task assigned ONLY to yourself (${actor.user.name}). Members CANNOT assign tasks to other team members. If the user named another person as assignee, pass their name in \`assignee\` (which will trigger server role enforcement) or refuse directly—never silently assign someone else's task to yourself.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            project: {
              type: Type.STRING,
              description: 'Accessible project ID or title (optional if an active project is open).',
            },
            title: {
              type: Type.STRING,
              description: 'Title of your personal task.',
            },
            description: {
              type: Type.STRING,
              description: 'Task description or notes.',
            },
            assignee: {
              type: Type.STRING,
              description: `Must be omitted or "${actor.user.name}" / "me". Passing any other member will be rejected because Members cannot assign tasks to others.`,
            },
            priority: {
              type: Type.STRING,
              description: `Task priority: ${TASK_PRIORITIES.join(', ')}. Defaults to medium.`,
            },
            dueDate: {
              type: Type.STRING,
              description: 'Due date in ISO 8601 format (YYYY-MM-DD) or relative days like "+5d".',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Optional tags for the task.',
            },
          },
          required: ['title'],
        },
      };

  const updateTaskTool: FunctionDeclaration = privileged
    ? {
        name: 'update_task',
        description:
          'Update any task status, priority, due date, title, description, or reassign it.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            task: {
              type: Type.STRING,
              description: 'Task ID or task title to update.',
            },
            project: {
              type: Type.STRING,
              description: 'Optional project ID or title to disambiguate the task.',
            },
            status: {
              type: Type.STRING,
              description: `New status: ${TASK_STATUSES.join(', ')}.`,
            },
            priority: {
              type: Type.STRING,
              description: `New priority: ${TASK_PRIORITIES.join(', ')}.`,
            },
            dueDate: {
              type: Type.STRING,
              description: 'Updated due date (ISO 8601 or "+Nd").',
            },
            title: {
              type: Type.STRING,
              description: 'Updated task title.',
            },
            description: {
              type: Type.STRING,
              description: 'Updated task description.',
            },
            assignee: {
              type: Type.STRING,
              description: 'Optional member ID, name, or email to reassign this task to.',
            },
          },
          required: ['task'],
        },
      }
    : {
        name: 'update_task',
        description: `Update status or description ONLY on a task assigned to you (${actor.user.name}). Members cannot edit other members' tasks, reassign tasks, or finalize collaborative group tasks.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            task: {
              type: Type.STRING,
              description: 'ID or title of your assigned task.',
            },
            status: {
              type: Type.STRING,
              description: `New status for your task (${TASK_STATUSES.join(', ')}).`,
            },
            description: {
              type: Type.STRING,
              description: 'Optional updated description or progress notes.',
            },
          },
          required: ['task'],
        },
      };

  const submitTaskProofTool: FunctionDeclaration = {
    name: 'submit_task_proof',
    description:
      'Submit proof of work for an assigned task (moves task to in_review) or submit your individual contribution on a collaborative group task.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        task: {
          type: Type.STRING,
          description: 'Task ID or title you are submitting proof for.',
        },
        explanation: {
          type: Type.STRING,
          description: 'Explanation of the completed work, verification steps, or deliverable summary.',
        },
        links: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Optional evidence URLs (PR links, deployment URLs, artifacts).',
        },
      },
      required: ['task', 'explanation'],
    },
  };

  const sendMessageTool: FunctionDeclaration = {
    name: 'send_workspace_message',
    description:
      'Post a message to an accessible project discussion channel or send a direct message to a workspace teammate as the current user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        channelType: {
          type: Type.STRING,
          description: '"project" to post in a project discussion channel, or "direct" to DM a teammate.',
        },
        target: {
          type: Type.STRING,
          description:
            'Project ID/title (when channelType is "project") or recipient user ID/name/email (when channelType is "direct").',
        },
        content: {
          type: Type.STRING,
          description: 'Message text to send.',
        },
      },
      required: ['channelType', 'content'],
    },
  };

  const updateMyProfileTool: FunctionDeclaration = {
    name: 'update_my_profile',
    description: `Update your own personal profile (${actor.user.name}). Cannot edit any other member's profile.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Your professional role title.' },
        bio: { type: Type.STRING, description: 'Your short bio.' },
        statusMessage: { type: Type.STRING, description: 'Your current workspace status message.' },
        department: { type: Type.STRING, description: 'Your department name.' },
        location: { type: Type.STRING, description: 'Your location / timezone label.' },
        skills: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Updated array of skill tags.',
        },
      },
    },
  };

  const declarations: FunctionDeclaration[] = [
    getWorkspaceSnapshotTool,
    createTaskTool,
    updateTaskTool,
    submitTaskProofTool,
    sendMessageTool,
    updateMyProfileTool,
  ];

  // Leader & Co-Leader operational tools
  if (privileged) {
    declarations.push(
      {
        name: 'assign_task_to_members',
        description:
          'Assign or reassign an existing task to a workspace member, or assign multiple participants to a collaborative group task (Leader / Co-Leader only).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            task: {
              type: Type.STRING,
              description: 'Existing task ID or title to assign.',
            },
            assignee: {
              type: Type.STRING,
              description: 'Single member ID, name, or email to assign the task to.',
            },
            participants: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Multiple member IDs, names, or emails if converting/assigning as a collaborative group task.',
            },
          },
          required: ['task'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete a task from a project (Leader and Co-Leader only).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            task: {
              type: Type.STRING,
              description: 'Task ID or title to delete.',
            },
            project: {
              type: Type.STRING,
              description: 'Optional project ID or title to disambiguate.',
            },
          },
          required: ['task'],
        },
      },
      {
        name: 'manage_milestone',
        description:
          'Create, update status/details, or delete a project milestone (Leader and Co-Leader only).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: '"create", "update", or "delete".',
            },
            project: {
              type: Type.STRING,
              description: 'Project ID or title (used when creating or disambiguating).',
            },
            milestone: {
              type: Type.STRING,
              description: 'Existing milestone ID or title (required for "update" or "delete").',
            },
            title: {
              type: Type.STRING,
              description: 'Milestone title (required for "create", optional for "update").',
            },
            description: {
              type: Type.STRING,
              description: 'Milestone description.',
            },
            dueDate: {
              type: Type.STRING,
              description: 'Target due date in ISO 8601 format or "+Nd".',
            },
            status: {
              type: Type.STRING,
              description: '"pending", "in_progress", or "completed" (for "update").',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'review_proof_submission',
        description:
          'Approve, reject, or request changes on a pending proof of work submission (Leader and Co-Leader only).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            proofOrTask: {
              type: Type.STRING,
              description: 'Proof ID, task ID, or task title whose pending proof is being reviewed.',
            },
            decision: {
              type: Type.STRING,
              description: '"approved", "rejected", or "changes_requested".',
            },
            reason: {
              type: Type.STRING,
              description: 'Review feedback note for the submitter.',
            },
          },
          required: ['proofOrTask', 'decision'],
        },
      },
      {
        name: 'award_merit_bonus',
        description:
          'Award discretionary merit bonus points (1 to 1000) to a team member or co-leader (Leader and Co-Leader only).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            recipient: {
              type: Type.STRING,
              description: 'Recipient user ID, name, or email.',
            },
            points: {
              type: Type.NUMBER,
              description: 'Whole-number bonus points between 1 and 1000.',
            },
            reason: {
              type: Type.STRING,
              description: 'Reason for the merit bonus award.',
            },
            project: {
              type: Type.STRING,
              description: 'Optional project ID or title associated with the achievement.',
            },
          },
          required: ['recipient', 'points'],
        },
      },
      {
        name: 'manage_project_member',
        description:
          'Add or remove a member on a project, or update a project operational status (Leader and Co-Leader only).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            project: {
              type: Type.STRING,
              description: 'Project ID or title.',
            },
            member: {
              type: Type.STRING,
              description: 'User ID, name, or email to add or remove from the project.',
            },
            memberAction: {
              type: Type.STRING,
              description: '"add" or "remove" when modifying project membership.',
            },
            newProjectStatus: {
              type: Type.STRING,
              description: `Optional new project status (${PROJECT_STATUSES.join(', ')}).`,
            },
          },
        },
      },
      {
        name: 'update_member_rank',
        description:
          'Change another workspace user role/rank between member, co-leader, and leader (cannot alter your own rank).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            member: {
              type: Type.STRING,
              description: 'Target user ID, name, or email.',
            },
            newRole: {
              type: Type.STRING,
              description: '"member", "co-leader", or "leader".',
            },
          },
          required: ['member', 'newRole'],
        },
      }
    );
  }

  // Leader-only squad administration tool
  if (actor.role === ROLES.LEADER) {
    declarations.push({
      name: 'manage_squad_team',
      description:
        'Create a new squad/team, delete a squad/team, or add/remove squad members (Leader ONLY).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: '"create", "delete", "add_member", or "remove_member".',
          },
          team: {
            type: Type.STRING,
            description: 'Team ID or team name (for delete, add_member, remove_member, or new team name for create).',
          },
          description: {
            type: Type.STRING,
            description: 'Squad description when creating a new team.',
          },
          member: {
            type: Type.STRING,
            description: 'User ID, name, or email when action is add_member or remove_member.',
          },
        },
        required: ['action', 'team'],
      },
    });
  }

  return declarations;
}

/**
 * Executes a Gemini function call under strict server-side RBAC enforcement for `actor`.
 * Even if a prompt injection or unexpected tool call occurs, `actor.role` and `actor.user.id`
 * are verified before any read or write touches `db`.
 */
export async function executeAiToolCall(
  toolName: string,
  rawArgs: Record<string, any> | undefined,
  actor: AiActorContext
): Promise<AiToolExecutionOutcome> {
  const args = rawArgs && typeof rawArgs === 'object' ? rawArgs : {};

  // ------------------------------------------------------------------
  // 1. get_workspace_snapshot (Role-filtered read)
  // ------------------------------------------------------------------
  if (toolName === 'get_workspace_snapshot') {
    const data = db.getRawData();
    const userMap = new Map(data.users.map((u) => [u.id, u]));
    const { project, forbidden } = args.project
      ? resolveAccessibleProject(data, String(args.project), actor)
      : { project: null, forbidden: false };

    if (forbidden) {
      return permissionDeniedOutcome(
        toolName,
        'Permission denied: You do not have access to that private project.',
        'Blocked access to restricted project'
      );
    }

    const visibleProjects = getVisibleProjectsForActor(data, actor);
    let visibleTasks = getVisibleTasksForActor(data, actor, project?.id);
    if (args.statusFilter && TASK_STATUSES.includes(args.statusFilter)) {
      visibleTasks = visibleTasks.filter((t) => t.status === args.statusFilter);
    }

    const visibleProjectIds = new Set(visibleProjects.map((p) => p.id));
    const milestones = data.milestones.filter(
      (m) => visibleProjectIds.has(m.projectId) && (!project || m.projectId === project.id)
    );

    const pendingProofs = isLeaderOrCoLeader(actor.role)
      ? data.proofSubmissions
          .filter((p) => p.status === 'pending' && (!project || p.projectId === project.id))
          .map((p) => ({
            id: p.id,
            taskId: p.taskId,
            taskTitle: data.tasks.find((t) => t.id === p.taskId)?.title || p.taskId,
            submittedBy: userMap.get(p.submittedById)?.name || p.submittedById,
            explanation: p.explanation,
            createdAt: p.createdAt,
          }))
      : [];

    const myScore = calculateUserOverallScore(actor.user.id, actor.workspace.id);

    return {
      toolResponse: {
        success: true,
        actor: {
          id: actor.user.id,
          name: actor.user.name,
          role: actor.role,
          totalScore: myScore.totalScore,
        },
        members: data.users.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          email: u.email,
          title: u.title,
        })),
        projects: visibleProjects.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          deadline: p.deadline,
          memberCount: p.memberIds.length,
        })),
        tasks: visibleTasks.map((t) => ({
          id: t.id,
          projectId: t.projectId,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          assignee: t.assigneeId ? userMap.get(t.assigneeId)?.name || t.assigneeId : null,
          isGroupTask: !!t.isGroupTask,
          participants: (t.participantIds || []).map((id) => userMap.get(id)?.name || id),
        })),
        milestones: milestones.map((m) => ({
          id: m.id,
          projectId: m.projectId,
          title: m.title,
          status: m.status,
          dueDate: m.dueDate,
        })),
        ...(isLeaderOrCoLeader(actor.role) ? { pendingProofs } : {}),
      },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'query',
        summary: `Inspected workspace data (${visibleTasks.length} visible tasks)`,
      },
    };
  }

  // ------------------------------------------------------------------
  // 2. create_task (Leader/Co-Leader can assign anyone; Member ONLY self)
  // ------------------------------------------------------------------
  if (toolName === 'create_task') {
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    if (!title) {
      return {
        toolResponse: { success: false, error: 'Task title is required.' },
        actionRecord: { toolName, success: false, summary: 'Task creation failed: missing title' },
      };
    }

    const rawData = db.getRawData();

    // STRICT MEMBER ENFORCEMENT: Members cannot assign tasks to anyone else or create group tasks for others
    if (actor.role === ROLES.MEMBER) {
      if (args.isGroupTask || (Array.isArray(args.participants) && args.participants.length > 0)) {
        const nonSelfParticipant = Array.isArray(args.participants)
          ? args.participants.some((p: string) => !isSelfReference(String(p), actor.user))
          : true;
        if (args.isGroupTask || nonSelfParticipant) {
          return permissionDeniedOutcome(
            toolName,
            `Permission denied: Your account role is Member (${actor.user.name}). Only Leaders and Co-Leaders can create collaborative group tasks or assign tasks to other team members.`,
            'Blocked: Members cannot assign group tasks to team members'
          );
        }
      }

      if (typeof args.assignee === 'string' && args.assignee.trim()) {
        if (!isSelfReference(args.assignee, actor.user)) {
          const targetUser = resolveUser(rawData, args.assignee, actor.user);
          const targetLabel = targetUser ? targetUser.name : args.assignee.trim();
          return permissionDeniedOutcome(
            toolName,
            `Permission denied: As a Member (${actor.user.name}), you cannot assign tasks to ${targetLabel}. Only Leaders and Co-Leaders have permission to assign tasks to other members. You can only create tasks for yourself.`,
            `Blocked: Member cannot assign task to ${targetLabel}`
          );
        }
      }
    }

    // Resolve accessible target project
    const { project, forbidden } = resolveAccessibleProject(
      rawData,
      typeof args.project === 'string' ? args.project : undefined,
      actor
    );
    if (forbidden) {
      return permissionDeniedOutcome(
        toolName,
        'Permission denied: You do not have access to create tasks in that private project.',
        'Blocked: No access to target project'
      );
    }
    if (!project) {
      return {
        toolResponse: {
          success: false,
          error: 'Could not find a matching project. Please specify a valid project name or ID.',
        },
        actionRecord: { toolName, success: false, summary: 'Task creation failed: project not found' },
      };
    }

    // Resolve assignee(s)
    const rawParticipants: string[] = Array.isArray(args.participants)
      ? args.participants.map((p: unknown) => String(p).trim()).filter(Boolean)
      : [];

    const isGroup =
      actor.role !== ROLES.MEMBER && (Boolean(args.isGroupTask) || rawParticipants.length > 1);

    let resolvedAssigneeUser: User | null = null;
    const resolvedParticipantUsers: User[] = [];

    if (actor.role === ROLES.MEMBER) {
      resolvedAssigneeUser = actor.user;
    } else if (isGroup) {
      const candidateRefs =
        rawParticipants.length > 0
          ? rawParticipants
          : typeof args.assignee === 'string' && args.assignee.trim()
          ? args.assignee.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

      for (const ref of candidateRefs) {
        const u = resolveUser(rawData, ref, actor.user);
        if (!u) {
          return {
            toolResponse: {
              success: false,
              error: `Could not find workspace member matching "${ref}". Available members: ${rawData.users.map((usr) => usr.name).join(', ')}.`,
            },
            actionRecord: {
              toolName,
              success: false,
              summary: `Could not resolve member "${ref}"`,
            },
          };
        }
        if (!resolvedParticipantUsers.some((existing) => existing.id === u.id)) {
          resolvedParticipantUsers.push(u);
        }
      }

      if (resolvedParticipantUsers.length === 0) {
        return {
          toolResponse: {
            success: false,
            error: 'At least one valid participant is required for a collaborative group task.',
          },
          actionRecord: {
            toolName,
            success: false,
            summary: 'Group task creation failed: no participants specified',
          },
        };
      }
    } else if (typeof args.assignee === 'string' && args.assignee.trim()) {
      const found = resolveUser(rawData, args.assignee, actor.user);
      if (!found) {
        return {
          toolResponse: {
            success: false,
            error: `Could not find workspace member matching "${args.assignee}". Available members: ${rawData.users.map((usr) => usr.name).join(', ')}.`,
          },
          actionRecord: {
            toolName,
            success: false,
            summary: `Could not resolve assignee "${args.assignee}"`,
          },
        };
      }
      resolvedAssigneeUser = found;
    }

    const priority: TaskPriority = TASK_PRIORITIES.includes(args.priority)
      ? args.priority
      : 'medium';
    const dueDate = normalizeDueDateIso(args.dueDate, 7);
    const description = typeof args.description === 'string' ? args.description.trim() : '';
    const tags = Array.isArray(args.tags)
      ? args.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];

    // Optional milestone resolution
    let resolvedMilestoneId: string | undefined;
    if (typeof args.milestone === 'string' && args.milestone.trim()) {
      const mLower = args.milestone.trim().toLowerCase();
      const matchedMs = rawData.milestones.find(
        (m) =>
          m.projectId === project.id &&
          (m.id.toLowerCase() === mLower || m.title.toLowerCase().includes(mLower))
      );
      if (matchedMs) resolvedMilestoneId = matchedMs.id;
    }

    const indPoints = Number(args.individualPoints) > 0 ? Math.round(Number(args.individualPoints)) : 35;
    const bonusPoints = Number(args.groupBonusPoints) > 0 ? Math.round(Number(args.groupBonusPoints)) : 60;
    const participantIds = resolvedParticipantUsers.map((u) => u.id);

    const createdTask = await db.mutateAsync((data) => {
      const taskId = makeId('task');
      const projInDb = data.projects.find((p) => p.id === project.id);

      // Ensure assigned members are part of project.memberIds so they have visibility
      if (projInDb) {
        const usersToEnsure = isGroup
          ? participantIds
          : resolvedAssigneeUser
          ? [resolvedAssigneeUser.id]
          : [];
        for (const uid of usersToEnsure) {
          if (uid && !projInDb.memberIds.includes(uid)) {
            projInDb.memberIds.push(uid);
          }
        }
      }

      const initialSubmissions = isGroup
        ? resolvedParticipantUsers.map((u) => ({
            id: `gsub_${taskId}_${u.id}`,
            taskId,
            userId: u.id,
            userName: u.name,
            userAvatar: u.avatarUrl,
            userRole: u.role,
            status: 'pending' as const,
          }))
        : undefined;

      const newTask: Task = {
        id: taskId,
        projectId: project.id,
        title,
        description,
        assigneeId: isGroup ? undefined : resolvedAssigneeUser?.id,
        creatorId: actor.user.id,
        status: 'todo',
        priority,
        dueDate,
        milestoneId: resolvedMilestoneId,
        tags,
        checklist: [],
        isGroupTask: isGroup,
        participantIds: isGroup ? participantIds : undefined,
        individualPoints: isGroup ? indPoints : undefined,
        groupBonusPoints: isGroup ? bonusPoints : undefined,
        submissions: initialSubmissions,
        bonusAwarded: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      data.tasks.push(newTask);

      const notifyUserIds = isGroup
        ? participantIds
        : resolvedAssigneeUser
        ? [resolvedAssigneeUser.id]
        : [];
      createAssignmentNotificationsInDb(data, newTask, actor, notifyUserIds, isGroup);

      return newTask;
    });

    // Broadcast real-time update
    if (createdTask.isGroupTask && participantIds.length > 0) {
      const names = resolvedParticipantUsers.map((u) => u.name).join(', ');
      realtimeHub.broadcast(project.id, {
        id: makeId('rt'),
        type: 'task:member_assigned',
        projectId: project.id,
        title: 'New Collaborative Group Task',
        message: `Group task "${createdTask.title}" assigned to: ${names}.`,
        entityId: createdTask.id,
        entityTitle: createdTask.title,
        actorName: actor.user.name,
        timestamp: new Date().toISOString(),
      });
    } else if (resolvedAssigneeUser) {
      realtimeHub.broadcast(project.id, {
        id: makeId('rt'),
        type: 'task:member_assigned',
        projectId: project.id,
        title: 'New Work Item Assigned',
        message: `${resolvedAssigneeUser.name} was assigned to task "${createdTask.title}"`,
        memberId: resolvedAssigneeUser.id,
        memberName: resolvedAssigneeUser.name,
        memberRole: resolvedAssigneeUser.role,
        entityId: createdTask.id,
        entityTitle: createdTask.title,
        actorName: actor.user.name,
        timestamp: new Date().toISOString(),
      });
    }

    logActivity({
      workspaceId: actor.workspace.id,
      projectId: project.id,
      userId: actor.user.id,
      action: createdTask.isGroupTask ? 'AI Co-Pilot: Created group task' : 'AI Co-Pilot: Created task',
      entityType: 'task',
      entityId: createdTask.id,
      details: createdTask.isGroupTask
        ? `${actor.user.name} (${actor.role}) assigned group task "${createdTask.title}" to ${resolvedParticipantUsers.map((u) => u.name).join(', ')}`
        : `${actor.user.name} (${actor.role}) created task "${createdTask.title}"${resolvedAssigneeUser ? ` assigned to ${resolvedAssigneeUser.name}` : ''}`,
    });

    const summary = createdTask.isGroupTask
      ? `Assigned group task "${createdTask.title}" to ${resolvedParticipantUsers.map((u) => u.name).join(', ')} in ${project.title}`
      : resolvedAssigneeUser
      ? resolvedAssigneeUser.id === actor.user.id
        ? `Created personal task "${createdTask.title}" in ${project.title}`
        : `Assigned task "${createdTask.title}" to ${resolvedAssigneeUser.name} in ${project.title}`
      : `Created task "${createdTask.title}" in ${project.title}`;

    return {
      toolResponse: {
        success: true,
        task: {
          id: createdTask.id,
          title: createdTask.title,
          projectId: project.id,
          projectTitle: project.title,
          priority: createdTask.priority,
          status: createdTask.status,
          dueDate: createdTask.dueDate,
          assignee: resolvedAssigneeUser ? resolvedAssigneeUser.name : null,
          isGroupTask: Boolean(createdTask.isGroupTask),
          participants: resolvedParticipantUsers.map((u) => u.name),
        },
        message: summary,
      },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'task',
        entityId: createdTask.id,
        projectId: project.id,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 3. assign_task_to_members (Leader & Co-Leader ONLY)
  // ------------------------------------------------------------------
  if (toolName === 'assign_task_to_members') {
    if (!isLeaderOrCoLeader(actor.role)) {
      return permissionDeniedOutcome(
        toolName,
        `Permission denied: Your account role is Member (${actor.user.name}). Only Leaders and Co-Leaders can assign or reassign tasks to team members.`,
        'Blocked: Member cannot assign tasks to members'
      );
    }

    const rawData = db.getRawData();
    const { task: existingTask } = resolveTaskForActor(rawData, String(args.task || ''), actor);
    if (!existingTask) {
      return {
        toolResponse: { success: false, error: `Task "${args.task}" was not found.` },
        actionRecord: { toolName, success: false, summary: `Task "${args.task}" not found` },
      };
    }

    const rawParticipants: string[] = Array.isArray(args.participants)
      ? args.participants.map((p: unknown) => String(p).trim()).filter(Boolean)
      : [];

    if (rawParticipants.length > 0) {
      const resolvedUsers: User[] = [];
      for (const ref of rawParticipants) {
        const u = resolveUser(rawData, ref, actor.user);
        if (!u) {
          return {
            toolResponse: { success: false, error: `Could not find workspace member "${ref}".` },
            actionRecord: { toolName, success: false, summary: `Member "${ref}" not found` },
          };
        }
        if (!resolvedUsers.some((x) => x.id === u.id)) resolvedUsers.push(u);
      }

      const newParticipantIds = resolvedUsers.map((u) => u.id);
      const oldParticipants = existingTask.participantIds || [];

      const updated = await db.mutateAsync((data) => {
        const t = data.tasks.find((item) => item.id === existingTask.id);
        if (!t) return null;

        const proj = data.projects.find((p) => p.id === t.projectId);
        if (proj) {
          for (const uid of newParticipantIds) {
            if (!proj.memberIds.includes(uid)) proj.memberIds.push(uid);
          }
        }

        t.isGroupTask = true;
        delete t.assigneeId;
        t.participantIds = newParticipantIds;
        t.individualPoints = t.individualPoints || 35;
        t.groupBonusPoints = t.groupBonusPoints || 60;
        if (!Array.isArray(t.submissions)) t.submissions = [];
        for (const u of resolvedUsers) {
          if (!t.submissions.some((s) => s.userId === u.id)) {
            t.submissions.push({
              id: `gsub_${t.id}_${u.id}`,
              taskId: t.id,
              userId: u.id,
              userName: u.name,
              userAvatar: u.avatarUrl,
              userRole: u.role,
              status: 'pending',
            });
          }
        }
        t.updatedAt = new Date().toISOString();

        const newlyAdded = newParticipantIds.filter((id) => !oldParticipants.includes(id));
        if (newlyAdded.length > 0) {
          createAssignmentNotificationsInDb(data, t, actor, newlyAdded, true);
        }
        return t;
      });

      if (!updated) {
        return {
          toolResponse: { success: false, error: 'Failed to update task assignment.' },
          actionRecord: { toolName, success: false, summary: 'Failed to update task assignment' },
        };
      }

      const names = resolvedUsers.map((u) => u.name).join(', ');
      realtimeHub.broadcast(updated.projectId, {
        id: makeId('rt'),
        type: 'task:member_assigned',
        projectId: updated.projectId,
        title: 'Group Task Participants Assigned',
        message: `"${updated.title}" assigned to: ${names}`,
        entityId: updated.id,
        entityTitle: updated.title,
        actorName: actor.user.name,
        timestamp: new Date().toISOString(),
      });

      logActivity({
        workspaceId: actor.workspace.id,
        projectId: updated.projectId,
        userId: actor.user.id,
        action: 'AI Co-Pilot: Assigned group task participants',
        entityType: 'task',
        entityId: updated.id,
        details: `Assigned "${updated.title}" to ${names}`,
      });

      const summary = `Assigned group task "${updated.title}" to ${names}`;
      return {
        toolResponse: { success: true, message: summary, taskId: updated.id, participants: resolvedUsers.map((u) => u.name) },
        actionRecord: { toolName, success: true, entityType: 'task', entityId: updated.id, projectId: updated.projectId, summary },
      };
    }

    const assigneeRef = typeof args.assignee === 'string' ? args.assignee.trim() : '';
    if (!assigneeRef) {
      return {
        toolResponse: { success: false, error: 'Please provide an assignee or participants list.' },
        actionRecord: { toolName, success: false, summary: 'Missing assignee for task assignment' },
      };
    }

    const targetUser = resolveUser(rawData, assigneeRef, actor.user);
    if (!targetUser) {
      return {
        toolResponse: {
          success: false,
          error: `Could not find workspace member "${assigneeRef}". Available members: ${rawData.users.map((u) => u.name).join(', ')}.`,
        },
        actionRecord: { toolName, success: false, summary: `Member "${assigneeRef}" not found` },
      };
    }

    const oldAssigneeId = existingTask.assigneeId;
    const updated = await db.mutateAsync((data) => {
      const t = data.tasks.find((item) => item.id === existingTask.id);
      if (!t) return null;

      const proj = data.projects.find((p) => p.id === t.projectId);
      if (proj && !proj.memberIds.includes(targetUser.id)) {
        proj.memberIds.push(targetUser.id);
      }

      t.isGroupTask = false;
      t.assigneeId = targetUser.id;
      t.updatedAt = new Date().toISOString();

      if (targetUser.id !== oldAssigneeId) {
        createAssignmentNotificationsInDb(data, t, actor, [targetUser.id], false);
      }
      return t;
    });

    if (!updated) {
      return {
        toolResponse: { success: false, error: 'Task not found during update.' },
        actionRecord: { toolName, success: false, summary: 'Task assignment failed' },
      };
    }

    realtimeHub.broadcast(updated.projectId, {
      id: makeId('rt'),
      type: 'task:member_assigned',
      projectId: updated.projectId,
      title: 'Task Assignee Updated',
      message: `${targetUser.name} was assigned to "${updated.title}"`,
      memberId: targetUser.id,
      memberName: targetUser.name,
      memberRole: targetUser.role,
      entityId: updated.id,
      entityTitle: updated.title,
      actorName: actor.user.name,
      timestamp: new Date().toISOString(),
    });

    logActivity({
      workspaceId: actor.workspace.id,
      projectId: updated.projectId,
      userId: actor.user.id,
      action: 'AI Co-Pilot: Assigned task',
      entityType: 'task',
      entityId: updated.id,
      details: `${actor.user.name} assigned "${updated.title}" to ${targetUser.name}`,
    });

    const summary = `Assigned task "${updated.title}" to ${targetUser.name}`;
    return {
      toolResponse: {
        success: true,
        message: summary,
        task: { id: updated.id, title: updated.title, assignee: targetUser.name, projectId: updated.projectId },
      },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'task',
        entityId: updated.id,
        projectId: updated.projectId,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 4. update_task (Role-scoped: Leader/Co-Leader any task; Member own task only, no reassignment)
  // ------------------------------------------------------------------
  if (toolName === 'update_task') {
    const rawData = db.getRawData();

    // Prevent Member from attempting task reassignment through update_task
    if (actor.role === ROLES.MEMBER && typeof args.assignee === 'string' && args.assignee.trim()) {
      if (!isSelfReference(args.assignee, actor.user)) {
        return permissionDeniedOutcome(
          toolName,
          `Permission denied: Members cannot reassign tasks to other team members. Only Leaders and Co-Leaders can reassign tasks.`,
          'Blocked: Member cannot reassign tasks'
        );
      }
    }

    let filterProjectId: string | undefined;
    if (typeof args.project === 'string' && args.project.trim()) {
      const { project } = resolveAccessibleProject(rawData, args.project, actor);
      filterProjectId = project?.id;
    }

    const { task: existingTask, forbiddenOtherMemberTask } = resolveTaskForActor(
      rawData,
      String(args.task || ''),
      actor,
      filterProjectId
    );

    if (forbiddenOtherMemberTask) {
      return permissionDeniedOutcome(
        toolName,
        `Permission denied: As a Member (${actor.user.name}), you can only modify tasks assigned to you.`,
        'Blocked: Cannot modify another member’s task'
      );
    }

    if (!existingTask) {
      return {
        toolResponse: { success: false, error: `Could not find task matching "${args.task}".` },
        actionRecord: { toolName, success: false, summary: `Task "${args.task}" not found` },
      };
    }

    // Additional strict ownership check for Member
    if (actor.role === ROLES.MEMBER) {
      const isMine =
        existingTask.assigneeId === actor.user.id ||
        existingTask.creatorId === actor.user.id ||
        (existingTask.isGroupTask && existingTask.participantIds?.includes(actor.user.id));

      if (!isMine) {
        return permissionDeniedOutcome(
          toolName,
          'Permission denied: You can only update tasks assigned to your account.',
          'Blocked: Task is not assigned to current member'
        );
      }

      if (existingTask.isGroupTask && args.status === 'complete' && existingTask.status !== 'complete') {
        return permissionDeniedOutcome(
          toolName,
          'Permission denied: Only Leaders and Co-Leaders can finalize collaborative group tasks and award team bonuses. Use submit_task_proof to submit your individual contribution.',
          'Blocked: Member cannot finalize collaborative group task'
        );
      }

      // Members cannot alter priority or dueDate on tasks created by Leaders for them unless they created the task themselves
      if (
        existingTask.creatorId !== actor.user.id &&
        (args.priority !== undefined || args.dueDate !== undefined || args.title !== undefined)
      ) {
        return permissionDeniedOutcome(
          toolName,
          'Permission denied: Members can update progress status and notes on leader-assigned tasks, but cannot alter the task title, priority, or deadline set by leadership.',
          'Blocked: Member cannot alter leader-defined deadline or priority'
        );
      }
    }

    // Resolve optional new assignee for Leader / Co-Leader
    let newAssigneeUser: User | null = null;
    if (isLeaderOrCoLeader(actor.role) && typeof args.assignee === 'string' && args.assignee.trim()) {
      newAssigneeUser = resolveUser(rawData, args.assignee, actor.user);
      if (!newAssigneeUser) {
        return {
          toolResponse: { success: false, error: `Could not find member "${args.assignee}".` },
          actionRecord: { toolName, success: false, summary: `Assignee "${args.assignee}" not found` },
        };
      }
    }

    const nextStatus: TaskStatus | undefined =
      typeof args.status === 'string' && TASK_STATUSES.includes(args.status as TaskStatus)
        ? (args.status as TaskStatus)
        : undefined;
    const nextPriority: TaskPriority | undefined =
      typeof args.priority === 'string' && TASK_PRIORITIES.includes(args.priority as TaskPriority)
        ? (args.priority as TaskPriority)
        : undefined;

    const oldStatus = existingTask.status;
    const oldAssigneeId = existingTask.assigneeId;

    const updated = await db.mutateAsync((data) => {
      const t = data.tasks.find((item) => item.id === existingTask.id);
      if (!t) return null;

      if (typeof args.title === 'string' && args.title.trim()) {
        t.title = args.title.trim();
      }
      if (typeof args.description === 'string') {
        t.description = args.description.trim();
      }
      if (newAssigneeUser) {
        t.assigneeId = newAssigneeUser.id;
        const proj = data.projects.find((p) => p.id === t.projectId);
        if (proj && !proj.memberIds.includes(newAssigneeUser.id)) {
          proj.memberIds.push(newAssigneeUser.id);
        }
        if (newAssigneeUser.id !== oldAssigneeId) {
          createAssignmentNotificationsInDb(data, t, actor, [newAssigneeUser.id], false);
        }
      }
      if (nextPriority) {
        t.priority = nextPriority;
      }
      if (typeof args.dueDate === 'string' && args.dueDate.trim()) {
        t.dueDate = normalizeDueDateIso(args.dueDate);
      }
      if (nextStatus && nextStatus !== t.status) {
        t.status = nextStatus;
        if (nextStatus === 'complete') {
          t.completedAt = t.completedAt || new Date().toISOString();
          const associatedProof = data.proofSubmissions.find((p) => p.taskId === t.id);
          const effectiveTurnInDate = associatedProof?.createdAt || t.completedAt;
          const pointCalc = calculateTaskPointsByDates({
            priority: t.priority,
            dueDate: t.dueDate,
            referenceDate: effectiveTurnInDate,
          });
          t.isLate = !pointCalc.isOnTime;
          t.daysLate = pointCalc.daysLate;
          t.pointsAwarded = pointCalc.pointsAwarded;
          t.latePenaltyApplied = pointCalc.penaltyPoints;
          t.memberPenaltyApplied = pointCalc.memberPointsDeducted;

          if (t.isGroupTask && !t.bonusAwarded) {
            t.bonusAwarded = true;
            t.bonusAwardedAt = new Date().toISOString();
            if (Array.isArray(t.participantIds) && t.participantIds.length > 0) {
              createMilestoneReachedNotificationsInDb(
                data,
                t.title,
                t.projectId,
                t.participantIds,
                true,
                t.id
              );
            }
          }
          checkAndCompleteMilestoneInDb(data, t.projectId, t.milestoneId, actor.user.name);
        } else {
          delete t.completedAt;
          delete t.isLate;
          delete t.daysLate;
          delete t.pointsAwarded;
          delete t.latePenaltyApplied;
          delete t.memberPenaltyApplied;
          if (t.isGroupTask) {
            t.bonusAwarded = false;
            delete t.bonusAwardedAt;
          }
        }
      }

      t.updatedAt = new Date().toISOString();
      return t;
    });

    if (!updated) {
      return {
        toolResponse: { success: false, error: 'Task could not be updated.' },
        actionRecord: { toolName, success: false, summary: 'Task update failed' },
      };
    }

    if (nextStatus && nextStatus !== oldStatus) {
      realtimeHub.broadcast(updated.projectId, {
        id: makeId('rt'),
        type: 'task:status_changed',
        projectId: updated.projectId,
        title: 'Task Status Updated',
        message: `"${updated.title}" moved from "${oldStatus.replace('_', ' ')}" to "${updated.status.replace('_', ' ')}"`,
        oldValue: oldStatus,
        newValue: updated.status,
        entityId: updated.id,
        entityTitle: updated.title,
        actorName: actor.user.name,
        timestamp: new Date().toISOString(),
      });
    }

    if (newAssigneeUser && newAssigneeUser.id !== oldAssigneeId) {
      realtimeHub.broadcast(updated.projectId, {
        id: makeId('rt'),
        type: 'task:member_assigned',
        projectId: updated.projectId,
        title: 'Task Assignee Updated',
        message: `${newAssigneeUser.name} was assigned to "${updated.title}"`,
        memberId: newAssigneeUser.id,
        memberName: newAssigneeUser.name,
        memberRole: newAssigneeUser.role,
        entityId: updated.id,
        entityTitle: updated.title,
        actorName: actor.user.name,
        timestamp: new Date().toISOString(),
      });
    }

    logActivity({
      workspaceId: actor.workspace.id,
      projectId: updated.projectId,
      userId: actor.user.id,
      action: 'AI Co-Pilot: Updated task',
      entityType: 'task',
      entityId: updated.id,
      details: `${actor.user.name} updated "${updated.title}" (status: ${updated.status})`,
    });

    const summary = nextStatus
      ? `Updated "${updated.title}" status to ${updated.status.replace('_', ' ')}`
      : newAssigneeUser
      ? `Reassigned "${updated.title}" to ${newAssigneeUser.name}`
      : `Updated task "${updated.title}"`;

    return {
      toolResponse: {
        success: true,
        task: {
          id: updated.id,
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
          dueDate: updated.dueDate,
          assigneeId: updated.assigneeId,
        },
        message: summary,
      },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'task',
        entityId: updated.id,
        projectId: updated.projectId,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 5. delete_task (Leader & Co-Leader ONLY)
  // ------------------------------------------------------------------
  if (toolName === 'delete_task') {
    if (!isLeaderOrCoLeader(actor.role)) {
      return permissionDeniedOutcome(
        toolName,
        `Permission denied: Your account role is Member (${actor.user.name}). Only Leaders and Co-Leaders can delete tasks.`,
        'Blocked: Member cannot delete tasks'
      );
    }

    const rawData = db.getRawData();
    let filterProjectId: string | undefined;
    if (typeof args.project === 'string' && args.project.trim()) {
      const { project } = resolveAccessibleProject(rawData, args.project, actor);
      filterProjectId = project?.id;
    }

    const { task: targetTask } = resolveTaskForActor(
      rawData,
      String(args.task || ''),
      actor,
      filterProjectId
    );
    if (!targetTask) {
      return {
        toolResponse: { success: false, error: `Task "${args.task}" was not found.` },
        actionRecord: { toolName, success: false, summary: `Task "${args.task}" not found` },
      };
    }

    const deleted = await db.mutateAsync((data) => {
      const idx = data.tasks.findIndex((t) => t.id === targetTask.id);
      if (idx === -1) return null;
      const removed = data.tasks[idx];
      data.tasks.splice(idx, 1);

      if (Array.isArray(data.proofSubmissions)) {
        data.proofSubmissions = data.proofSubmissions.filter((p) => p.taskId !== removed.id);
      }
      if (Array.isArray(data.notifications)) {
        data.notifications = data.notifications.filter(
          (n) => !(n.link && n.link.includes(`task=${removed.id}`) && !n.isRead)
        );
      }
      if (removed.milestoneId) {
        checkAndCompleteMilestoneInDb(data, removed.projectId, removed.milestoneId, actor.user.name);
      }
      return removed;
    });

    if (!deleted) {
      return {
        toolResponse: { success: false, error: 'Task not found.' },
        actionRecord: { toolName, success: false, summary: 'Task deletion failed' },
      };
    }

    realtimeHub.broadcast(deleted.projectId, {
      id: makeId('rt'),
      type: 'task:deleted',
      projectId: deleted.projectId,
      title: 'Task Deleted',
      message: `${formatRoleLabel(actor.role)} ${actor.user.name} deleted task "${deleted.title}"`,
      entityId: deleted.id,
      entityTitle: deleted.title,
      actorName: actor.user.name,
      timestamp: new Date().toISOString(),
    });

    logActivity({
      workspaceId: actor.workspace.id,
      projectId: deleted.projectId,
      userId: actor.user.id,
      action: 'AI Co-Pilot: Deleted task',
      entityType: 'task',
      entityId: deleted.id,
      details: `${formatRoleLabel(actor.role)} ${actor.user.name} deleted task "${deleted.title}"`,
    });

    const summary = `Deleted task "${deleted.title}"`;
    return {
      toolResponse: { success: true, deletedId: deleted.id, deletedTitle: deleted.title, message: summary },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'task',
        entityId: deleted.id,
        projectId: deleted.projectId,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 6. submit_task_proof (Role-scoped: submits actor's own proof or group part)
  // ------------------------------------------------------------------
  if (toolName === 'submit_task_proof') {
    const explanation = typeof args.explanation === 'string' ? args.explanation.trim() : '';
    if (!explanation) {
      return {
        toolResponse: { success: false, error: 'Proof explanation is required.' },
        actionRecord: { toolName, success: false, summary: 'Proof submission failed: missing explanation' },
      };
    }

    const rawData = db.getRawData();
    const { task: targetTask, forbiddenOtherMemberTask } = resolveTaskForActor(
      rawData,
      String(args.task || ''),
      actor
    );

    if (forbiddenOtherMemberTask) {
      return permissionDeniedOutcome(
        toolName,
        'Permission denied: You can only submit proof of work for tasks assigned to you.',
        'Blocked: Cannot submit proof for another member’s task'
      );
    }

    if (!targetTask) {
      return {
        toolResponse: { success: false, error: `Could not find task "${args.task}".` },
        actionRecord: { toolName, success: false, summary: `Task "${args.task}" not found` },
      };
    }

    const links = Array.isArray(args.links)
      ? args.links.map((l: unknown) => String(l).trim()).filter(Boolean)
      : [];

    // Group task contribution flow
    if (targetTask.isGroupTask) {
      if (
        actor.role === ROLES.MEMBER &&
        Array.isArray(targetTask.participantIds) &&
        !targetTask.participantIds.includes(actor.user.id)
      ) {
        return permissionDeniedOutcome(
          toolName,
          'Permission denied: You are not an assigned participant on this collaborative group task.',
          'Blocked: Not a participant on group task'
        );
      }

      const submittedAtIso = new Date().toISOString();
      const baseIndivPts =
        targetTask.individualPoints || TASK_PRIORITY_POINTS[targetTask.priority] || 35;
      const subCalc = calculateTaskPointsByDates({
        priority: targetTask.priority,
        dueDate: targetTask.dueDate,
        referenceDate: submittedAtIso,
        customBasePoints: baseIndivPts,
      });

      let bonusAwarded = false;
      const updatedTask = await db.mutateAsync((data) => {
        const t = data.tasks.find((item) => item.id === targetTask.id);
        if (!t) return null;
        if (!Array.isArray(t.submissions)) t.submissions = [];
        if (!Array.isArray(t.participantIds)) t.participantIds = [];
        if (!t.participantIds.includes(actor.user.id)) {
          t.participantIds.push(actor.user.id);
        }

        let sub = t.submissions.find((s) => s.userId === actor.user.id);
        if (!sub) {
          t.submissions.push({
            id: `gsub_${t.id}_${actor.user.id}`,
            taskId: t.id,
            userId: actor.user.id,
            userName: actor.user.name,
            userAvatar: actor.user.avatarUrl,
            userRole: actor.role,
            status: 'submitted',
            submittedAt: submittedAtIso,
            note: explanation,
            proofLinks: links,
            pointsAwarded: subCalc.pointsAwarded,
            isLate: !subCalc.isOnTime,
            daysLate: subCalc.daysLate,
            latePenaltyApplied: subCalc.penaltyPoints,
            memberPenaltyApplied: subCalc.memberPointsDeducted,
          });
        } else {
          sub.status = 'submitted';
          sub.submittedAt = submittedAtIso;
          sub.note = explanation;
          sub.proofLinks = links;
          sub.pointsAwarded = subCalc.pointsAwarded;
          sub.isLate = !subCalc.isOnTime;
          sub.daysLate = subCalc.daysLate;
          sub.latePenaltyApplied = subCalc.penaltyPoints;
          sub.memberPenaltyApplied = subCalc.memberPointsDeducted;
        }

        const submittedCount = t.submissions.filter(
          (s) =>
            (s.status === 'submitted' || s.status === 'approved') &&
            t.participantIds?.includes(s.userId)
        ).length;
        const allDone = t.participantIds.length > 0 && submittedCount >= t.participantIds.length;

        if (t.status === 'todo') t.status = 'in_progress';
        if (allDone && t.status !== 'complete') {
          t.status = 'complete';
          t.completedAt = submittedAtIso;
          t.bonusAwarded = true;
          t.bonusAwardedAt = submittedAtIso;
          bonusAwarded = true;
          createMilestoneReachedNotificationsInDb(
            data,
            t.title,
            t.projectId,
            t.participantIds,
            true,
            t.id
          );
          checkAndCompleteMilestoneInDb(data, t.projectId, t.milestoneId, actor.user.name);
        }

        t.updatedAt = submittedAtIso;
        return t;
      });

      if (!updatedTask) {
        return {
          toolResponse: { success: false, error: 'Failed to submit group task contribution.' },
          actionRecord: { toolName, success: false, summary: 'Group contribution submission failed' },
        };
      }

      realtimeHub.broadcast(updatedTask.projectId, {
        id: makeId('rt'),
        type: 'task:status_changed',
        projectId: updatedTask.projectId,
        title: 'Group Task Contribution Submitted',
        message: `${actor.user.name} submitted their deliverable for "${updatedTask.title}"`,
        entityId: updatedTask.id,
        entityTitle: updatedTask.title,
        actorName: actor.user.name,
        timestamp: new Date().toISOString(),
      });

      const summary = `Submitted group task contribution for "${updatedTask.title}" (+${subCalc.pointsAwarded} pts)`;
      return {
        toolResponse: {
          success: true,
          taskId: updatedTask.id,
          pointsAwarded: subCalc.pointsAwarded,
          bonusAwarded,
          message: summary,
        },
        actionRecord: {
          toolName,
          success: true,
          entityType: 'proof',
          entityId: updatedTask.id,
          projectId: updatedTask.projectId,
          summary,
        },
      };
    }

    // Standard individual task proof flow
    const createdProof = await db.mutateAsync((data) => {
      const proofId = makeId('proof');
      const proof = {
        id: proofId,
        taskId: targetTask.id,
        projectId: targetTask.projectId,
        submittedById: actor.user.id,
        explanation,
        links,
        attachmentIds: [],
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        reviewHistory: [],
      };
      data.proofSubmissions.unshift(proof);

      const t = data.tasks.find((item) => item.id === targetTask.id);
      if (t) {
        t.status = 'in_review';
        t.proofSubmittedId = proofId;
        t.updatedAt = proof.createdAt;
      }

      const proj = data.projects.find((p) => p.id === targetTask.projectId);
      if (proj && proj.leaderId && proj.leaderId !== actor.user.id) {
        data.notifications.unshift({
          id: makeId('notif'),
          userId: proj.leaderId,
          title: 'Proof Submitted for Review',
          message: `${actor.user.name} submitted proof for "${targetTask.title}"`,
          type: 'proof_review',
          isRead: false,
          link: `/projects/${targetTask.projectId}?tab=proofs`,
          createdAt: new Date().toISOString(),
        });
      }

      return proof;
    });

    realtimeHub.broadcast(targetTask.projectId, {
      id: makeId('rt'),
      type: 'task:status_changed',
      projectId: targetTask.projectId,
      title: 'Proof Submitted for Review',
      message: `${actor.user.name} submitted proof for "${targetTask.title}"`,
      entityId: targetTask.id,
      entityTitle: targetTask.title,
      actorName: actor.user.name,
      timestamp: new Date().toISOString(),
    });

    logActivity({
      workspaceId: actor.workspace.id,
      projectId: targetTask.projectId,
      userId: actor.user.id,
      action: 'AI Co-Pilot: Submitted proof of work',
      entityType: 'proof',
      entityId: createdProof.id,
      details: `${actor.user.name} submitted proof for "${targetTask.title}"`,
    });

    const summary = `Submitted proof of work for "${targetTask.title}"`;
    return {
      toolResponse: {
        success: true,
        proofId: createdProof.id,
        taskId: targetTask.id,
        taskStatus: 'in_review',
        message: summary,
      },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'proof',
        entityId: createdProof.id,
        projectId: targetTask.projectId,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 7. review_proof_submission (Leader & Co-Leader ONLY)
  // ------------------------------------------------------------------
  if (toolName === 'review_proof_submission') {
    if (!isLeaderOrCoLeader(actor.role)) {
      return permissionDeniedOutcome(
        toolName,
        `Permission denied: Your account role is Member (${actor.user.name}). Only Leaders and Co-Leaders can review and approve proof submissions.`,
        'Blocked: Member cannot review proof submissions'
      );
    }

    const decision = String(args.decision || '').trim();
    if (!['approved', 'rejected', 'changes_requested'].includes(decision)) {
      return {
        toolResponse: {
          success: false,
          error: 'Decision must be "approved", "rejected", or "changes_requested".',
        },
        actionRecord: { toolName, success: false, summary: 'Invalid proof review decision' },
      };
    }

    const queryRef = String(args.proofOrTask || '').trim().toLowerCase();
    const rawData = db.getRawData();
    const matchedProof =
      rawData.proofSubmissions.find((p) => p.id.toLowerCase() === queryRef) ||
      rawData.proofSubmissions.find((p) => {
        const t = rawData.tasks.find((item) => item.id === p.taskId);
        return (
          p.taskId.toLowerCase() === queryRef ||
          (t && t.title.toLowerCase().includes(queryRef))
        );
      });

    if (!matchedProof) {
      return {
        toolResponse: {
          success: false,
          error: `No proof submission found matching "${args.proofOrTask}".`,
        },
        actionRecord: { toolName, success: false, summary: 'Proof submission not found' },
      };
    }

    const reason = typeof args.reason === 'string' ? args.reason.trim() : '';
    const updatedProof = await db.mutateAsync((data) => {
      const proof = data.proofSubmissions.find((p) => p.id === matchedProof.id);
      if (!proof) return null;

      proof.status = decision as 'approved' | 'rejected' | 'changes_requested';
      proof.reviewNote = reason;
      proof.reviewedById = actor.user.id;
      proof.reviewedAt = new Date().toISOString();
      proof.reviewHistory.unshift({
        id: makeId('prh'),
        proofId: proof.id,
        reviewerId: actor.user.id,
        action: decision as 'approved' | 'rejected' | 'changes_requested',
        reason,
        createdAt: proof.reviewedAt,
      });

      const task = data.tasks.find((t) => t.id === proof.taskId);
      if (task) {
        if (decision === 'approved') {
          task.status = 'complete';
          task.completedAt = task.completedAt || new Date().toISOString();
          const pointCalc = calculateTaskPointsByDates({
            priority: task.priority,
            dueDate: task.dueDate,
            referenceDate: proof.createdAt || task.completedAt,
          });
          task.isLate = !pointCalc.isOnTime;
          task.daysLate = pointCalc.daysLate;
          task.pointsAwarded = pointCalc.pointsAwarded;
          task.latePenaltyApplied = pointCalc.penaltyPoints;
          task.memberPenaltyApplied = pointCalc.memberPointsDeducted;
          checkAndCompleteMilestoneInDb(data, task.projectId, task.milestoneId, actor.user.name);
        } else if (decision === 'changes_requested') {
          task.status = 'in_progress';
        } else {
          task.status = 'blocked';
        }
        task.updatedAt = new Date().toISOString();
      }

      data.notifications.unshift({
        id: makeId('notif'),
        userId: proof.submittedById,
        title: `Proof ${decision === 'approved' ? 'Approved' : decision === 'changes_requested' ? 'Changes Requested' : 'Rejected'}`,
        message: `${actor.user.name} reviewed your proof: "${reason || decision}"`,
        type: decision === 'approved' ? 'score' : 'proof_review',
        isRead: false,
        link: `/projects/${proof.projectId}?tab=proofs`,
        createdAt: new Date().toISOString(),
      });

      return proof;
    });

    if (!updatedProof) {
      return {
        toolResponse: { success: false, error: 'Failed to update proof review.' },
        actionRecord: { toolName, success: false, summary: 'Proof review failed' },
      };
    }

    const associatedTaskTitle =
      rawData.tasks.find((t) => t.id === updatedProof.taskId)?.title || updatedProof.taskId;

    realtimeHub.broadcast(updatedProof.projectId, {
      id: makeId('rt'),
      type: 'task:status_changed',
      projectId: updatedProof.projectId,
      title: 'Proof Reviewed',
      message: `${actor.user.name} marked proof for "${associatedTaskTitle}" as ${decision.replace('_', ' ')}`,
      entityId: updatedProof.taskId,
      entityTitle: associatedTaskTitle,
      actorName: actor.user.name,
      timestamp: new Date().toISOString(),
    });

    logActivity({
      workspaceId: actor.workspace.id,
      projectId: updatedProof.projectId,
      userId: actor.user.id,
      action: `AI Co-Pilot: Proof ${decision}`,
      entityType: 'proof',
      entityId: updatedProof.id,
      details: `${actor.user.name} (${actor.role}) reviewed proof for "${associatedTaskTitle}": ${decision}`,
    });

    const summary = `Reviewed proof for "${associatedTaskTitle}" (${decision.replace('_', ' ')})`;
    return {
      toolResponse: { success: true, proofId: updatedProof.id, decision, message: summary },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'proof',
        entityId: updatedProof.id,
        projectId: updatedProof.projectId,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 8. manage_milestone (Leader & Co-Leader ONLY)
  // ------------------------------------------------------------------
  if (toolName === 'manage_milestone') {
    if (!isLeaderOrCoLeader(actor.role)) {
      return permissionDeniedOutcome(
        toolName,
        `Permission denied: Your account role is Member (${actor.user.name}). Only Leaders and Co-Leaders can create, update, or delete project milestones.`,
        'Blocked: Member cannot manage milestones'
      );
    }

    const action = String(args.action || '').trim().toLowerCase();
    const rawData = db.getRawData();

    if (action === 'create') {
      const title = typeof args.title === 'string' ? args.title.trim() : '';
      if (!title) {
        return {
          toolResponse: { success: false, error: 'Milestone title is required.' },
          actionRecord: { toolName, success: false, summary: 'Milestone creation failed: missing title' },
        };
      }
      const { project } = resolveAccessibleProject(rawData, args.project, actor);
      if (!project) {
        return {
          toolResponse: { success: false, error: 'Target project not found.' },
          actionRecord: { toolName, success: false, summary: 'Milestone creation failed: project not found' },
        };
      }

      const dueDate = normalizeDueDateIso(args.dueDate, 14);
      const created = await db.mutateAsync((data) => {
        const ms: Milestone = {
          id: makeId('ms'),
          projectId: project.id,
          title,
          description: typeof args.description === 'string' ? args.description.trim() : '',
          dueDate,
          status: 'pending',
          ownerId: actor.user.id,
          createdAt: new Date().toISOString(),
        };
        data.milestones.push(ms);
        return ms;
      });

      logActivity({
        workspaceId: actor.workspace.id,
        projectId: project.id,
        userId: actor.user.id,
        action: 'AI Co-Pilot: Created milestone',
        entityType: 'milestone',
        entityId: created.id,
        details: `Created milestone "${created.title}" in ${project.title}`,
      });

      const summary = `Created milestone "${created.title}" in ${project.title}`;
      return {
        toolResponse: { success: true, milestone: created, message: summary },
        actionRecord: {
          toolName,
          success: true,
          entityType: 'milestone',
          entityId: created.id,
          projectId: project.id,
          summary,
        },
      };
    }

    const msQuery = String(args.milestone || args.title || '').trim().toLowerCase();
    const existingMs = rawData.milestones.find(
      (m) => m.id.toLowerCase() === msQuery || m.title.toLowerCase().includes(msQuery)
    );
    if (!existingMs) {
      return {
        toolResponse: { success: false, error: `Milestone "${args.milestone || args.title}" not found.` },
        actionRecord: { toolName, success: false, summary: 'Milestone not found' },
      };
    }

    if (action === 'delete') {
      await db.mutateAsync((data) => {
        data.milestones = data.milestones.filter((m) => m.id !== existingMs.id);
        for (const t of data.tasks) {
          if (t.milestoneId === existingMs.id) delete t.milestoneId;
        }
      });

      logActivity({
        workspaceId: actor.workspace.id,
        projectId: existingMs.projectId,
        userId: actor.user.id,
        action: 'AI Co-Pilot: Deleted milestone',
        entityType: 'milestone',
        entityId: existingMs.id,
        details: `Deleted milestone "${existingMs.title}"`,
      });

      const summary = `Deleted milestone "${existingMs.title}"`;
      return {
        toolResponse: { success: true, deletedId: existingMs.id, message: summary },
        actionRecord: {
          toolName,
          success: true,
          entityType: 'milestone',
          entityId: existingMs.id,
          projectId: existingMs.projectId,
          summary,
        },
      };
    }

    // update milestone
    const oldStatus = existingMs.status;
    const updatedMs = await db.mutateAsync((data) => {
      const m = data.milestones.find((item) => item.id === existingMs.id);
      if (!m) return null;
      if (typeof args.title === 'string' && args.title.trim()) m.title = args.title.trim();
      if (typeof args.description === 'string') m.description = args.description.trim();
      if (typeof args.dueDate === 'string' && args.dueDate.trim()) {
        m.dueDate = normalizeDueDateIso(args.dueDate, 14);
      }
      if (args.status && ['pending', 'in_progress', 'completed'].includes(args.status)) {
        m.status = args.status;
        if (m.status === 'completed' && oldStatus !== 'completed') {
          const proj = data.projects.find((p) => p.id === m.projectId);
          createMilestoneReachedNotificationsInDb(
            data,
            m.title,
            m.projectId,
            proj?.memberIds || [],
            false
          );
        }
      }
      return m;
    });

    if (updatedMs && updatedMs.status !== oldStatus) {
      realtimeHub.broadcast(updatedMs.projectId, {
        id: makeId('rt'),
        type: 'milestone:status_changed',
        projectId: updatedMs.projectId,
        title: 'Milestone Status Updated',
        message: `Milestone "${updatedMs.title}" marked as ${updatedMs.status.toUpperCase()}`,
        oldValue: oldStatus,
        newValue: updatedMs.status,
        entityId: updatedMs.id,
        entityTitle: updatedMs.title,
        actorName: actor.user.name,
        timestamp: new Date().toISOString(),
      });
    }

    const summary = `Updated milestone "${updatedMs?.title || existingMs.title}"`;
    return {
      toolResponse: { success: true, milestone: updatedMs, message: summary },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'milestone',
        entityId: existingMs.id,
        projectId: existingMs.projectId,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 9. award_merit_bonus (Leader & Co-Leader ONLY)
  // ------------------------------------------------------------------
  if (toolName === 'award_merit_bonus') {
    if (!isLeaderOrCoLeader(actor.role)) {
      return permissionDeniedOutcome(
        toolName,
        `Permission denied: Your account role is Member (${actor.user.name}). Only Leaders and Co-Leaders can award merit bonus points.`,
        'Blocked: Member cannot award merit bonuses'
      );
    }

    const bonusPoints = Math.round(Number(args.points));
    if (!Number.isFinite(bonusPoints) || bonusPoints <= 0 || bonusPoints > 1000) {
      return {
        toolResponse: {
          success: false,
          error: 'Bonus points must be a whole number between 1 and 1,000.',
        },
        actionRecord: { toolName, success: false, summary: 'Invalid bonus point amount' },
      };
    }

    const rawData = db.getRawData();
    const targetUser = resolveUser(rawData, String(args.recipient || ''), actor.user);
    if (!targetUser) {
      return {
        toolResponse: {
          success: false,
          error: `Could not find workspace member "${args.recipient}".`,
        },
        actionRecord: { toolName, success: false, summary: `Recipient "${args.recipient}" not found` },
      };
    }

    let linkedProjectId: string | undefined;
    if (typeof args.project === 'string' && args.project.trim()) {
      linkedProjectId = resolveAccessibleProject(rawData, args.project, actor).project?.id;
    }

    const actorRoleTitle = formatRoleLabel(actor.role);
    const isSelfAward = targetUser.id === actor.user.id;
    const bonusReason =
      typeof args.reason === 'string' && args.reason.trim()
        ? args.reason.trim()
        : `${actorRoleTitle} Discretionary Merit Bonus`;

    const bonusAward: BonusAward = {
      id: makeId('ba'),
      workspaceId: actor.workspace.id,
      projectId: linkedProjectId,
      recipientId: targetUser.id,
      recipientName: targetUser.name,
      awardedById: actor.user.id,
      awardedByName: actor.user.name,
      points: bonusPoints,
      reason: bonusReason,
      createdAt: new Date().toISOString(),
    };

    await db.mutateAsync((data) => {
      if (!Array.isArray(data.bonusAwards)) data.bonusAwards = [];
      data.bonusAwards.push(bonusAward);
      data.notifications.unshift({
        id: makeId('notif'),
        userId: targetUser.id,
        title: 'Bonus Points Awarded',
        message: isSelfAward
          ? `You awarded yourself +${bonusPoints} pts (${bonusReason})`
          : `${actorRoleTitle} ${actor.user.name} awarded you +${bonusPoints} merit bonus points (${bonusReason})`,
        type: 'score_bonus',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    realtimeHub.broadcast(linkedProjectId || 'workspace', {
      id: makeId('rt'),
      type: 'user:bonus_awarded',
      projectId: linkedProjectId || 'workspace',
      title: 'Merit Bonus Awarded',
      message: `${actorRoleTitle} ${actor.user.name} awarded +${bonusPoints} bonus points to ${targetUser.name}!`,
      entityId: targetUser.id,
      entityTitle: targetUser.name,
      actorName: actor.user.name,
      timestamp: new Date().toISOString(),
    });

    logActivity({
      workspaceId: actor.workspace.id,
      projectId: linkedProjectId,
      userId: actor.user.id,
      action: 'AI Co-Pilot: Awarded Merit Bonus',
      entityType: 'setting',
      entityId: targetUser.id,
      details: `${actorRoleTitle} ${actor.user.name} awarded +${bonusPoints} pts to ${targetUser.name}: "${bonusReason}"`,
    });

    const summary = `Awarded +${bonusPoints} bonus points to ${targetUser.name}`;
    return {
      toolResponse: { success: true, bonusAward, message: summary },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'bonus',
        entityId: bonusAward.id,
        projectId: linkedProjectId,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 10. manage_project_member (Leader & Co-Leader ONLY)
  // ------------------------------------------------------------------
  if (toolName === 'manage_project_member') {
    if (!isLeaderOrCoLeader(actor.role)) {
      return permissionDeniedOutcome(
        toolName,
        `Permission denied: Your account role is Member (${actor.user.name}). Only Leaders and Co-Leaders can manage project membership or project status.`,
        'Blocked: Member cannot manage project roster or status'
      );
    }

    const rawData = db.getRawData();
    const { project } = resolveAccessibleProject(rawData, args.project, actor);
    if (!project) {
      return {
        toolResponse: { success: false, error: 'Project not found.' },
        actionRecord: { toolName, success: false, summary: 'Project not found' },
      };
    }

    let targetMember: User | null = null;
    if (typeof args.member === 'string' && args.member.trim()) {
      targetMember = resolveUser(rawData, args.member, actor.user);
      if (!targetMember) {
        return {
          toolResponse: { success: false, error: `Member "${args.member}" not found.` },
          actionRecord: { toolName, success: false, summary: `Member "${args.member}" not found` },
        };
      }
    }

    const memberAction = args.memberAction === 'remove' ? 'remove' : 'add';
    const nextProjectStatus: ProjectStatus | undefined =
      typeof args.newProjectStatus === 'string' &&
      PROJECT_STATUSES.includes(args.newProjectStatus as ProjectStatus)
        ? (args.newProjectStatus as ProjectStatus)
        : undefined;

    const oldStatus = project.status;
    await db.mutateAsync((data) => {
      const p = data.projects.find((item) => item.id === project.id);
      if (!p) return null;

      if (targetMember) {
        if (memberAction === 'add' && !p.memberIds.includes(targetMember.id)) {
          p.memberIds.push(targetMember.id);
        } else if (memberAction === 'remove') {
          p.memberIds = p.memberIds.filter((id) => id !== targetMember!.id);
        }
      }
      if (nextProjectStatus) {
        p.status = nextProjectStatus;
      }
      p.updatedAt = new Date().toISOString();
      return p;
    });

    if (targetMember && memberAction === 'add') {
      realtimeHub.broadcast(project.id, {
        id: makeId('rt'),
        type: 'project:member_assigned',
        projectId: project.id,
        title: 'Team Member Assigned',
        message: `${targetMember.name} was added to project "${project.title}"`,
        memberId: targetMember.id,
        memberName: targetMember.name,
        memberRole: targetMember.role,
        entityId: project.id,
        entityTitle: project.title,
        actorName: actor.user.name,
        timestamp: new Date().toISOString(),
      });
    }

    if (nextProjectStatus && nextProjectStatus !== oldStatus) {
      realtimeHub.broadcast(project.id, {
        id: makeId('rt'),
        type: 'project:status_changed',
        projectId: project.id,
        title: 'Project Status Updated',
        message: `"${project.title}" status updated to "${nextProjectStatus}"`,
        oldValue: oldStatus,
        newValue: nextProjectStatus,
        entityId: project.id,
        entityTitle: project.title,
        actorName: actor.user.name,
        timestamp: new Date().toISOString(),
      });
    }

    const parts: string[] = [];
    if (targetMember) {
      parts.push(
        `${memberAction === 'add' ? 'Added' : 'Removed'} ${targetMember.name} ${memberAction === 'add' ? 'to' : 'from'} ${project.title}`
      );
    }
    if (nextProjectStatus) {
      parts.push(`Set ${project.title} status to ${nextProjectStatus}`);
    }
    const summary = parts.join(' · ') || `Updated project ${project.title}`;

    logActivity({
      workspaceId: actor.workspace.id,
      projectId: project.id,
      userId: actor.user.id,
      action: 'AI Co-Pilot: Updated project',
      entityType: 'project',
      entityId: project.id,
      details: summary,
    });

    return {
      toolResponse: { success: true, projectId: project.id, message: summary },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'project',
        entityId: project.id,
        projectId: project.id,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 11. update_member_rank (Leader & Co-Leader ONLY, with hierarchy protection)
  // ------------------------------------------------------------------
  if (toolName === 'update_member_rank') {
    if (!isLeaderOrCoLeader(actor.role)) {
      return permissionDeniedOutcome(
        toolName,
        `Permission denied: Your account role is Member (${actor.user.name}). Members cannot alter workspace user roles or ranks.`,
        'Blocked: Member cannot change user ranks'
      );
    }

    const newRole = String(args.newRole || '').trim() as UserRole;
    if (![ROLES.LEADER, ROLES.CO_LEADER, ROLES.MEMBER].includes(newRole)) {
      return {
        toolResponse: {
          success: false,
          error: 'Invalid role. Must be "member", "co-leader", or "leader".',
        },
        actionRecord: { toolName, success: false, summary: 'Invalid target role' },
      };
    }

    const rawData = db.getRawData();
    const targetUser = resolveUser(rawData, String(args.member || ''), actor.user);
    if (!targetUser) {
      return {
        toolResponse: { success: false, error: `Member "${args.member}" not found.` },
        actionRecord: { toolName, success: false, summary: 'Member not found' },
      };
    }

    if (targetUser.id === actor.user.id) {
      return permissionDeniedOutcome(
        toolName,
        'Permission denied: You cannot alter your own account rank.',
        'Blocked: Cannot change own rank'
      );
    }

    if (actor.role === ROLES.CO_LEADER && (targetUser.role === ROLES.LEADER || newRole === ROLES.LEADER)) {
      return permissionDeniedOutcome(
        toolName,
        'Permission denied: Only a Workspace Leader can promote users to Leader or modify an existing Leader’s rank.',
        'Blocked: Co-Leader cannot modify Leader rank'
      );
    }

    const previousRole = targetUser.role;
    await db.mutateAsync((data) => {
      const u = data.users.find((item) => item.id === targetUser.id);
      if (u) {
        u.role = newRole;
        u.lastActiveAt = new Date().toISOString();
      }
      const membership = (data.workspaceMemberships || []).find(
        (m) => m.userId === targetUser.id && m.workspaceId === actor.workspace.id
      );
      if (membership) membership.role = newRole;
    });

    logActivity({
      workspaceId: actor.workspace.id,
      userId: actor.user.id,
      action: 'AI Co-Pilot: Changed Member Rank',
      entityType: 'setting',
      entityId: targetUser.id,
      details: `${actor.user.name} changed ${targetUser.name} rank from ${previousRole} to ${newRole}`,
    });

    const summary = `Changed ${targetUser.name}'s role from ${previousRole} to ${newRole}`;
    return {
      toolResponse: { success: true, userId: targetUser.id, previousRole, newRole, message: summary },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'user',
        entityId: targetUser.id,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 12. manage_squad_team (Leader ONLY)
  // ------------------------------------------------------------------
  if (toolName === 'manage_squad_team') {
    if (actor.role !== ROLES.LEADER) {
      return permissionDeniedOutcome(
        toolName,
        `Permission denied: Only Workspace Leaders can create, delete, or modify squad rosters (your role is ${actor.role}).`,
        'Blocked: Squad roster administration requires Leader role'
      );
    }

    const action = String(args.action || '').trim().toLowerCase();
    const teamQuery = String(args.team || '').trim();
    const rawData = db.getRawData();

    if (action === 'create') {
      if (!teamQuery) {
        return {
          toolResponse: { success: false, error: 'Team name is required.' },
          actionRecord: { toolName, success: false, summary: 'Missing team name' },
        };
      }
      const createdTeam = await db.mutateAsync((data) => {
        const team = {
          id: makeId('team'),
          workspaceId: actor.workspace.id,
          name: teamQuery,
          description: typeof args.description === 'string' ? args.description.trim() : '',
          leaderId: actor.user.id,
          memberIds: [actor.user.id],
          isArchived: false,
          createdAt: new Date().toISOString(),
        };
        data.teams.push(team);
        return team;
      });
      const summary = `Created squad "${createdTeam.name}"`;
      return {
        toolResponse: { success: true, team: createdTeam, message: summary },
        actionRecord: { toolName, success: true, entityType: 'team', entityId: createdTeam.id, summary },
      };
    }

    const lowerTeam = teamQuery.toLowerCase();
    const targetTeam = rawData.teams.find(
      (t) =>
        t.workspaceId === actor.workspace.id &&
        (t.id.toLowerCase() === lowerTeam || t.name.toLowerCase().includes(lowerTeam))
    );
    if (!targetTeam) {
      return {
        toolResponse: { success: false, error: `Squad "${teamQuery}" not found.` },
        actionRecord: { toolName, success: false, summary: `Squad "${teamQuery}" not found` },
      };
    }

    if (action === 'delete') {
      await db.mutateAsync((data) => {
        data.teams = data.teams.filter((t) => t.id !== targetTeam.id);
      });
      const summary = `Deleted squad "${targetTeam.name}"`;
      return {
        toolResponse: { success: true, deletedId: targetTeam.id, message: summary },
        actionRecord: { toolName, success: true, entityType: 'team', entityId: targetTeam.id, summary },
      };
    }

    const targetMember = resolveUser(rawData, String(args.member || ''), actor.user);
    if (!targetMember) {
      return {
        toolResponse: { success: false, error: `Member "${args.member}" not found.` },
        actionRecord: { toolName, success: false, summary: `Member "${args.member}" not found` },
      };
    }

    await db.mutateAsync((data) => {
      const t = data.teams.find((item) => item.id === targetTeam.id);
      if (!t) return;
      if (action === 'add_member' && !t.memberIds.includes(targetMember.id)) {
        t.memberIds.push(targetMember.id);
      } else if (action === 'remove_member') {
        t.memberIds = t.memberIds.filter((id) => id !== targetMember.id);
      }
    });

    const summary = `${action === 'remove_member' ? 'Removed' : 'Added'} ${targetMember.name} ${action === 'remove_member' ? 'from' : 'to'} squad "${targetTeam.name}"`;
    return {
      toolResponse: { success: true, teamId: targetTeam.id, message: summary },
      actionRecord: { toolName, success: true, entityType: 'team', entityId: targetTeam.id, summary },
    };
  }

  // ------------------------------------------------------------------
  // 13. send_workspace_message (All roles, sent strictly as actor.user)
  // ------------------------------------------------------------------
  if (toolName === 'send_workspace_message') {
    const content = typeof args.content === 'string' ? args.content.trim() : '';
    if (!content) {
      return {
        toolResponse: { success: false, error: 'Message content cannot be empty.' },
        actionRecord: { toolName, success: false, summary: 'Empty message rejected' },
      };
    }

    const channelType = String(args.channelType || 'project').trim().toLowerCase();
    const rawData = db.getRawData();

    if (channelType === 'direct') {
      const recipient = resolveUser(rawData, String(args.target || ''), actor.user);
      if (!recipient) {
        return {
          toolResponse: { success: false, error: `Could not find recipient "${args.target}".` },
          actionRecord: { toolName, success: false, summary: 'Recipient not found' },
        };
      }

      const dm = await db.mutateAsync((data) => {
        const msg = {
          id: makeId('dm'),
          senderId: actor.user.id,
          receiverId: recipient.id,
          content,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        data.directMessages.push(msg);
        if (recipient.id !== actor.user.id) {
          data.notifications.unshift({
            id: makeId('notif'),
            userId: recipient.id,
            title: `Direct message from ${actor.user.name}`,
            message: content.slice(0, 80),
            type: 'mention',
            isRead: false,
            link: `/messages?user=${actor.user.id}`,
            createdAt: new Date().toISOString(),
          });
        }
        return msg;
      });

      const summary = `Sent direct message to ${recipient.name}`;
      return {
        toolResponse: { success: true, messageId: dm.id, recipient: recipient.name, message: summary },
        actionRecord: { toolName, success: true, entityType: 'message', entityId: dm.id, summary },
      };
    }

    const { project, forbidden } = resolveAccessibleProject(rawData, args.target, actor);
    if (forbidden || !project) {
      return permissionDeniedOutcome(
        toolName,
        forbidden
          ? 'Permission denied: You do not have access to post in that private project.'
          : 'Target project channel not found.',
        'Could not post project message'
      );
    }

    const projMsg = await db.mutateAsync((data) => {
      const msg = {
        id: makeId('msg'),
        projectId: project.id,
        senderId: actor.user.id,
        content,
        createdAt: new Date().toISOString(),
      };
      data.projectMessages.push(msg);
      return msg;
    });

    const summary = `Posted message in ${project.title} discussion`;
    return {
      toolResponse: { success: true, messageId: projMsg.id, projectTitle: project.title, message: summary },
      actionRecord: {
        toolName,
        success: true,
        entityType: 'message',
        entityId: projMsg.id,
        projectId: project.id,
        summary,
      },
    };
  }

  // ------------------------------------------------------------------
  // 14. update_my_profile (Strictly actor.user.id ONLY)
  // ------------------------------------------------------------------
  if (toolName === 'update_my_profile') {
    if (typeof args.userId === 'string' && args.userId !== actor.user.id) {
      return permissionDeniedOutcome(
        toolName,
        'Permission denied: Each user can only edit their own profile.',
        'Blocked: Cannot edit another member’s profile'
      );
    }

    const updatedUser = await db.mutateAsync((data) => {
      const u = data.users.find((item) => item.id === actor.user.id);
      if (!u) return null;

      if (typeof args.title === 'string') u.title = args.title.trim();
      if (typeof args.bio === 'string') u.bio = args.bio.trim();
      if (typeof args.statusMessage === 'string') u.statusMessage = args.statusMessage.trim();
      if (typeof args.department === 'string') u.department = args.department.trim();
      if (typeof args.location === 'string') u.location = args.location.trim();
      if (Array.isArray(args.skills)) {
        u.skills = args.skills.map((s: unknown) => String(s).trim()).filter(Boolean);
      }
      u.lastActiveAt = new Date().toISOString();
      return u;
    });

    if (!updatedUser) {
      return {
        toolResponse: { success: false, error: 'Profile not found.' },
        actionRecord: { toolName, success: false, summary: 'Profile update failed' },
      };
    }

    logActivity({
      workspaceId: actor.workspace.id,
      userId: actor.user.id,
      action: 'AI Co-Pilot: Updated Profile',
      entityType: 'setting',
      entityId: actor.user.id,
      details: `${actor.user.name} updated their personal profile via AI Co-Pilot`,
    });

    const summary = `Updated ${actor.user.name}'s profile`;
    return {
      toolResponse: { success: true, message: summary },
      actionRecord: { toolName, success: true, entityType: 'user', entityId: actor.user.id, summary },
    };
  }

  return permissionDeniedOutcome(
    toolName,
    `Tool "${toolName}" is not available or permitted for role "${actor.role}".`,
    `Blocked unrecognized or restricted tool "${toolName}"`
  );
}
