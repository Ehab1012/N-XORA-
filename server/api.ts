import { Router, Response, Request } from 'express';
import { db, DatabaseSchema } from './db.js';
import { chatWithGemini } from './gemini.js';
import {
  AuthenticatedRequest,
  createSession,
  destroySession,
  requireAuth,
  requireRole,
  logActivity,
  rateLimit,
} from './auth.js';
import { calculateProjectAnalytics, generateProjectMarkdownReport, calculateUserOverallScore } from './analytics.js';
import { ROLES, PRODUCT_NAME } from '../shared/const.js';
import { UserRole, TaskStatus, Task, ProjectInvitation } from '../shared/types.js';
import { realtimeHub } from './realtime.js';

export const apiRouter = Router();

// ----------------------------------------------------
// Notification Helpers (Task Assignment & Milestones)
// ----------------------------------------------------
function createAssignmentNotifications(
  data: DatabaseSchema,
  task: Task,
  actorName: string,
  assignedUserIds: string[],
  isGroupTask: boolean
) {
  const project = data.projects.find((p) => p.id === task.projectId);
  const projectName = project?.title || 'Project';

  for (const userId of assignedUserIds) {
    if (!userId || userId === task.creatorId) continue;

    const existing = data.notifications.find(
      (n) => n.userId === userId && n.type === 'task_assigned' && n.link?.includes(task.id) && !n.isRead
    );
    if (existing) continue;

    data.notifications.unshift({
      id: 'notif_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      title: isGroupTask ? 'Assigned to Group Task 👥' : 'New Task Assigned 📋',
      message: isGroupTask
        ? `Leader ${actorName} assigned you to group task "${task.title}" in ${projectName}.`
        : `Leader ${actorName} assigned you to task "${task.title}" in ${projectName}.`,
      type: 'task_assigned',
      isRead: false,
      link: `/projects/${task.projectId}?task=${task.id}`,
      createdAt: new Date().toISOString(),
    });
  }
}

function createMilestoneReachedNotifications(
  data: DatabaseSchema,
  milestoneTitle: string,
  projectId: string,
  memberIdsToNotify: string[],
  isGroupTaskMilestone: boolean = true,
  taskId?: string
) {
  const project = data.projects.find((p) => p.id === projectId);
  const projectName = project?.title || 'Project';

  const recipients = memberIdsToNotify.length > 0
    ? Array.from(new Set(memberIdsToNotify))
    : (project?.memberIds || []);

  for (const userId of recipients) {
    if (!userId) continue;

    data.notifications.unshift({
      id: 'notif_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      title: isGroupTaskMilestone ? 'Group Task Milestone Reached! 🏆' : 'Milestone Achieved! 🎯',
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

function checkAndCompleteMilestone(
  data: DatabaseSchema,
  projectId: string,
  milestoneId: string,
  actorName: string
) {
  if (!milestoneId) return;
  const milestone = data.milestones.find((m) => m.id === milestoneId);
  if (!milestone || milestone.status === 'completed') return;

  const milestoneTasks = data.tasks.filter((t) => t.projectId === projectId && t.milestoneId === milestoneId);
  if (milestoneTasks.length > 0 && milestoneTasks.every((t) => t.status === 'complete')) {
    milestone.status = 'completed';

    const project = data.projects.find((p) => p.id === projectId);
    const recipients = project?.memberIds || [];

    createMilestoneReachedNotifications(
      data,
      milestone.title,
      projectId,
      recipients,
      true
    );

    realtimeHub.broadcast(projectId, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'milestone:status_changed',
      projectId,
      title: 'Group Task Milestone Reached! 🎯',
      message: `Group milestone "${milestone.title}" reached! All associated task deliverables have been completed.`,
      entityId: milestone.id,
      entityTitle: milestone.title,
      actorName,
      timestamp: new Date().toISOString(),
    });
  }
}

// ----------------------------------------------------
// Health check
// ----------------------------------------------------
apiRouter.get('/health', (req, res) => {
  const data = db.getRawData();
  res.json({
    status: 'healthy',
    product: PRODUCT_NAME,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: 'connected',
      usersCount: data.users.length,
      projectsCount: data.projects.length,
      tasksCount: data.tasks.length,
    },
  });
});

// ----------------------------------------------------
// AI Chat Endpoint (Gemini Multi-Turn Co-Pilot)
// ----------------------------------------------------
apiRouter.post('/ai/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { messages, systemInstruction, modelType, projectId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required' });
    return;
  }

  let projectContext = '';
  if (projectId) {
    const data = db.getRawData();
    const proj = data.projects.find((p) => p.id === projectId);
    if (proj) {
      const projTasks = data.tasks.filter((t) => t.projectId === projectId);
      const projMilestones = data.milestones.filter((m) => m.projectId === projectId);
      const projMembers = data.users.filter((u) => proj.memberIds.includes(u.id));

      projectContext = `
Project Name: ${proj.title}
Description: ${proj.description}
Status: ${proj.status}
Members: ${projMembers.map((m) => `${m.name} (${m.role})`).join(', ')}
Total Tasks: ${projTasks.length}
Completed Tasks: ${projTasks.filter((t) => t.status === 'complete').length}
Pending Tasks: ${projTasks
        .filter((t) => t.status !== 'complete')
        .map((t) => `"${t.title}" (${t.priority} priority, assigned to ${t.assigneeId || 'Unassigned'})`)
        .slice(0, 10)
        .join('; ')}
Milestones: ${projMilestones.map((m) => `${m.title} (${m.status})`).join(', ')}
`.trim();
    }
  }

  try {
    const reply = await chatWithGemini({
      messages,
      systemInstruction,
      modelType,
      projectContext,
    });
    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('AI Chat Endpoint Error:', err);
    res.status(500).json({ error: err.message || 'Failed to interact with Gemini AI' });
  }
});

// ----------------------------------------------------
// Auth Routes
// ----------------------------------------------------
apiRouter.get('/auth/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.workspace) {
    res.json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    user: req.user,
    workspace: req.workspace,
    role: req.role,
    availableUsers: db.getRawData().users,
  });
});

apiRouter.post('/auth/login', rateLimit(10, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const data = db.getRawData();
  const user = data.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    res.status(404).json({ error: 'No account found with this email. Please sign up to create your account.' });
    return;
  }

  const workspace = data.workspaces[0] || {
    id: 'ws_default',
    name: 'Nexora Workspace',
    slug: 'nexora-workspace',
    ownerId: user.id,
    createdAt: new Date().toISOString(),
    settings: {
      allowMemberInvites: true,
      requireProofApproval: true,
      emergencyRecoveryEmail: user.email,
      strictIdorChecks: true,
    },
  };

  const token = createSession(user.id, workspace.id);
  res.cookie('nexora_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  logActivity({
    workspaceId: workspace.id,
    userId: user.id,
    action: 'Signed in',
    entityType: 'auth',
    entityId: user.id,
    details: `User signed in (${user.email})`,
  });

  res.json({ token, user, workspace, role: user.role });
});

apiRouter.post('/auth/register', rateLimit(10, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { name, email, role, title, department } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  let data = db.getRawData();
  const existing = data.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    return;
  }

  const isFirstUser = data.users.length === 0;
  const userRole: UserRole = isFirstUser ? 'owner' : (role || 'member');

  const newUser = {
    id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    email: cleanEmail,
    name: cleanName,
    role: userRole,
    title: title?.trim() || (userRole === 'owner' ? 'Workspace Owner' : 'Engineering Contributor'),
    department: department?.trim() || 'Core Engineering',
    location: 'Remote',
    bio: 'Active member of Nexora Workspace',
    skills: ['Collaboration', 'Project Management'],
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  db.mutate((d) => {
    d.users.push(newUser);
    let ws = d.workspaces[0];
    if (!ws) {
      ws = {
        id: 'ws_default',
        name: 'Nexora Workspace',
        slug: 'nexora-workspace',
        ownerId: newUser.id,
        createdAt: new Date().toISOString(),
        settings: {
          allowMemberInvites: true,
          requireProofApproval: true,
          emergencyRecoveryEmail: cleanEmail,
          strictIdorChecks: true,
        },
      };
      d.workspaces.push(ws);
    } else if (isFirstUser) {
      ws.ownerId = newUser.id;
    }

    d.workspaceMemberships.push({
      id: 'wm_' + Date.now().toString(36),
      workspaceId: ws.id,
      userId: newUser.id,
      role: userRole,
      joinedAt: new Date().toISOString(),
    });
  });

  data = db.getRawData();
  const workspace = data.workspaces[0];
  const token = createSession(newUser.id, workspace.id);

  res.cookie('nexora_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  logActivity({
    workspaceId: workspace.id,
    userId: newUser.id,
    action: 'Registered new account',
    entityType: 'auth',
    entityId: newUser.id,
    details: `Created new user account (${newUser.email}) as ${userRole}`,
  });

  res.json({ token, user: newUser, workspace, role: userRole });
});

// OAuth 2.0 Simulation with state verification & CSRF defense
apiRouter.post('/auth/oauth/simulate', rateLimit(10, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { provider, state, code, userId } = req.body;

  if (!state || typeof state !== 'string' || state.length < 8) {
    res.status(400).json({ error: 'Invalid OAuth state parameter or CSRF mismatch' });
    return;
  }

  const targetId = userId || 'usr_owner';
  const data = db.getRawData();
  const user = data.users.find((u) => u.id === targetId) || data.users[0];

  const token = createSession(user.id, 'ws_default');
  res.cookie('nexora_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  logActivity({
    workspaceId: 'ws_default',
    userId: user.id,
    action: 'Signed in via OAuth',
    entityType: 'auth',
    entityId: user.id,
    details: `Authenticated via ${provider || 'Enterprise SSO'}`,
  });

  res.json({ token, user, workspace: data.workspaces[0], role: user.role });
});

// Switch role / identity for role-testing workflows
apiRouter.post('/auth/switch-role', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { targetUserId } = req.body;
  const data = db.getRawData();
  const targetUser = data.users.find((u) => u.id === targetUserId);
  if (!targetUser) {
    res.status(404).json({ error: 'Target user not found' });
    return;
  }

  const token = createSession(targetUser.id, req.workspace!.id);
  res.cookie('nexora_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  logActivity({
    workspaceId: req.workspace!.id,
    userId: targetUser.id,
    action: 'Role context switched',
    entityType: 'auth',
    entityId: targetUser.id,
    details: `Switched identity to ${targetUser.name} (${targetUser.role})`,
  });

  res.json({ token, user: targetUser, workspace: req.workspace, role: targetUser.role });
});

apiRouter.post('/auth/logout', (req: AuthenticatedRequest, res: Response) => {
  if (req.sessionId) {
    destroySession(req.sessionId);
  }
  res.clearCookie('nexora_session');
  res.json({ success: true });
});

// ----------------------------------------------------
// Workspaces
// ----------------------------------------------------
apiRouter.get('/workspaces/current', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const ws = data.workspaces.find((w) => w.id === req.workspace!.id);
  res.json(ws);
});

apiRouter.patch('/workspaces/settings', requireAuth, requireRole([ROLES.OWNER]), (req: AuthenticatedRequest, res: Response) => {
  const { name, settings } = req.body;
  const updated = db.mutate((data) => {
    const ws = data.workspaces.find((w) => w.id === req.workspace!.id);
    if (!ws) return null;
    if (name) ws.name = name.trim();
    if (settings) ws.settings = { ...ws.settings, ...settings };
    return ws;
  });

  if (!updated) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  logActivity({
    workspaceId: req.workspace!.id,
    userId: req.user!.id,
    action: 'Updated workspace settings',
    entityType: 'setting',
    entityId: updated.id,
    details: 'Configured permissions and emergency recovery settings',
  });

  res.json(updated);
});

// ----------------------------------------------------
// Teams
// ----------------------------------------------------
apiRouter.get('/teams', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const teams = data.teams.filter((t) => t.workspaceId === req.workspace!.id);
  res.json(teams);
});

apiRouter.post('/teams', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { name, description, leaderId, coLeaderId } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Team name is required' });
    return;
  }

  const newTeam = db.mutate((data) => {
    const team = {
      id: 'team_' + Date.now().toString(36),
      workspaceId: req.workspace!.id,
      name: name.trim(),
      description: description?.trim() || '',
      leaderId: leaderId || req.user!.id,
      coLeaderId: coLeaderId || undefined,
      memberIds: [leaderId || req.user!.id, req.user!.id].filter((v, i, a) => a.indexOf(v) === i),
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    data.teams.push(team);
    return team;
  });

  logActivity({
    workspaceId: req.workspace!.id,
    userId: req.user!.id,
    action: 'Created team',
    entityType: 'team',
    entityId: newTeam.id,
    details: `Created new team "${newTeam.name}"`,
  });

  res.status(201).json(newTeam);
});

apiRouter.patch('/teams/:id', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER, ROLES.CO_LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, leaderId, coLeaderId } = req.body;

  const updated = db.mutate((data) => {
    const team = data.teams.find((t) => t.id === id);
    if (!team) return null;

    if (name) team.name = name.trim();
    if (description !== undefined) team.description = description.trim();
    if (leaderId) team.leaderId = leaderId;
    if (coLeaderId !== undefined) team.coLeaderId = coLeaderId;
    return team;
  });

  if (!updated) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  res.json(updated);
});

apiRouter.delete('/teams/:id', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const workspaceId = req.workspace!.id;
  const currentUserId = req.user!.id;

  const data = db.getRawData();
  const existingTeam = data.teams.find((t) => t.id === id && t.workspaceId === workspaceId);
  if (!existingTeam) {
    res.status(404).json({ error: 'Team not found in current workspace' });
    return;
  }

  const teamName = existingTeam.name;

  db.mutate((d) => {
    d.teams = d.teams.filter((t) => t.id !== id);
    // Unlink any projects assigned to this team
    for (const p of d.projects) {
      if (p.teamId === id) {
        p.teamId = undefined;
      }
    }
  });

  logActivity({
    workspaceId,
    userId: currentUserId,
    action: 'Deleted team',
    entityType: 'team',
    entityId: id,
    details: `${req.user!.name} deleted squad / team "${teamName}"`,
  });

  res.json({ success: true, deletedId: id, message: `Team "${teamName}" has been deleted.` });
});

apiRouter.post('/teams/:id/members', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { userId, email } = req.body;

  const updated = db.mutate((data) => {
    const team = data.teams.find((t) => t.id === id);
    if (!team) return null;

    let targetUserId = userId;
    if (!targetUserId && email) {
      let existingUser = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!existingUser) {
        existingUser = {
          id: 'usr_' + Date.now().toString(36),
          email: email.toLowerCase(),
          name: email.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          role: 'member',
          title: 'Engineering Contributor',
          department: 'Core Engineering',
          location: 'Remote',
          bio: 'Workspace contributor collaborating on scoped sprint objectives and system deliverables.',
          phone: '',
          skills: ['TypeScript', 'Testing', 'Distributed Systems'],
          githubHandle: email.split('@')[0],
          linkedinUrl: '',
          timezone: 'UTC',
          statusMessage: '🟢 Active in Workspace',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };
        data.users.push(existingUser);
        data.workspaceMemberships.push({
          id: 'wm_' + Date.now(),
          workspaceId: req.workspace!.id,
          userId: existingUser.id,
          role: 'member',
          joinedAt: new Date().toISOString(),
        });
      }
      targetUserId = existingUser.id;
    }

    if (targetUserId && !team.memberIds.includes(targetUserId)) {
      team.memberIds.push(targetUserId);
    }
    return team;
  });

  if (!updated) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  res.json(updated);
});

// ----------------------------------------------------
// Member Profiles (Query & Management)
// ----------------------------------------------------
apiRouter.get('/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const workspaceId = req.workspace?.id || 'ws_default';
  const enrichedUsers = data.users.map((u) => {
    try {
      const score = calculateUserOverallScore(u.id, workspaceId);
      return { ...u, overallScore: score.totalScore };
    } catch {
      return u;
    }
  });
  res.json(enrichedUsers);
});

apiRouter.get('/users/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getRawData();
  const targetUser = data.users.find((u) => u.id === id);

  if (!targetUser) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const workspaceId = req.workspace?.id || 'ws_default';
  const score = calculateUserOverallScore(id, workspaceId);

  // Find teams this member belongs to
  const memberTeams = data.teams.filter(
    (t) => t.memberIds.includes(id) || t.leaderId === id || t.coLeaderId === id
  );

  // Find projects this member is associated with
  const memberProjects = data.projects
    .filter(
      (p) =>
        p.workspaceId === workspaceId &&
        (p.memberIds.includes(id) || p.leaderId === id || p.coLeaderId === id)
    )
    .map((p) => {
      const projTasks = data.tasks.filter((t) => t.projectId === p.id);
      const doneTasks = projTasks.filter((t) => t.status === 'complete').length;
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        accentColor: p.accentColor,
        isLeader: p.leaderId === id || p.coLeaderId === id,
        isMember: p.memberIds.includes(id),
        totalTasks: projTasks.length,
        completedTasks: doneTasks,
        deadline: p.deadline,
      };
    });

  // Find all tasks assigned to this member
  const memberTasks = data.tasks
    .filter((t) => t.assigneeId === id)
    .map((t) => {
      const proj = data.projects.find((p) => p.id === t.projectId);
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectId: t.projectId,
        projectTitle: proj?.title || 'Unknown Project',
        dueDate: t.dueDate,
      };
    });

  const completedTasksCount = memberTasks.filter((t) => t.status === 'complete').length;
  const inProgressTasksCount = memberTasks.filter((t) => t.status === 'in_progress').length;
  const completionRatePercent =
    memberTasks.length > 0 ? Math.round((completedTasksCount / memberTasks.length) * 100) : 100;

  res.json({
    user: { ...targetUser, overallScore: score.totalScore },
    teams: memberTeams,
    projects: memberProjects,
    tasks: memberTasks,
    stats: {
      totalProjects: memberProjects.length,
      totalTasksAssigned: memberTasks.length,
      completedTasksCount,
      inProgressTasksCount,
      completionRatePercent,
    },
    score,
  });
});

apiRouter.patch('/users/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user!.id;

  // STRICT RULE: Each member can only edit his own profile, not everyone can edit it.
  const isSelf = currentUserId === id;
  if (!isSelf) {
    res.status(403).json({ error: 'Permission denied. Each member can only edit their own profile.' });
    return;
  }

  const {
    name,
    title,
    bio,
    department,
    location,
    phone,
    skills,
    githubHandle,
    linkedinUrl,
    timezone,
    statusMessage,
    avatarUrl,
  } = req.body;

  const updatedUser = db.mutate((data) => {
    const user = data.users.find((u) => u.id === id);
    if (!user) return null;

    if (name !== undefined && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (title !== undefined) user.title = typeof title === 'string' ? title.trim() : user.title;
    if (bio !== undefined) user.bio = typeof bio === 'string' ? bio.trim() : user.bio;
    if (department !== undefined) user.department = typeof department === 'string' ? department.trim() : user.department;
    if (location !== undefined) user.location = typeof location === 'string' ? location.trim() : user.location;
    if (phone !== undefined) user.phone = typeof phone === 'string' ? phone.trim() : user.phone;
    if (skills !== undefined && Array.isArray(skills)) {
      user.skills = skills.map((s) => String(s).trim()).filter(Boolean);
    }
    if (githubHandle !== undefined) user.githubHandle = typeof githubHandle === 'string' ? githubHandle.trim().replace(/^@/, '') : user.githubHandle;
    if (linkedinUrl !== undefined) user.linkedinUrl = typeof linkedinUrl === 'string' ? linkedinUrl.trim() : user.linkedinUrl;
    if (timezone !== undefined) user.timezone = typeof timezone === 'string' ? timezone.trim() : user.timezone;
    if (statusMessage !== undefined) user.statusMessage = typeof statusMessage === 'string' ? statusMessage.trim() : user.statusMessage;
    if (avatarUrl !== undefined) {
      user.avatarUrl = typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : undefined;
    }

    user.lastActiveAt = new Date().toISOString();
    return user;
  });

  if (!updatedUser) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  logActivity({
    workspaceId: req.workspace!.id,
    userId: currentUserId,
    action: 'Updated Profile',
    entityType: 'setting',
    entityId: id,
    details: `${req.user!.name} updated their personal profile details`,
  });

  res.json(updatedUser);
});

// ----------------------------------------------------
// Member Rank / Role Management
// Leaders and Owners can change a member's rank (e.g. member -> leader)
// ----------------------------------------------------
apiRouter.patch(
  ['/users/:id/rank', '/users/:id/role'],
  requireAuth,
  requireRole([ROLES.OWNER, ROLES.LEADER]),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentRole = req.role!;
    const { role: newRole } = req.body;

    if (!newRole || ![ROLES.LEADER, ROLES.MEMBER, ROLES.CO_LEADER].includes(newRole)) {
      res.status(400).json({
        error: 'Invalid rank specified. Allowed ranks: leader, member, co-leader.',
      });
      return;
    }

    // Leaders cannot change their own rank (prevents self-demotion or bypassing checks)
    if (currentUserId === id && currentRole !== ROLES.OWNER) {
      res.status(403).json({ error: 'Leaders cannot alter their own rank.' });
      return;
    }

    const data = db.getRawData();
    const targetUser = data.users.find((u) => u.id === id);
    if (!targetUser) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    // Cannot modify workspace owner rank unless by owner
    if (targetUser.role === ROLES.OWNER && currentRole !== ROLES.OWNER) {
      res.status(403).json({ error: 'Cannot modify workspace owner rank.' });
      return;
    }

    const previousRole = targetUser.role;

    const updatedUser = db.mutate((d) => {
      const u = d.users.find((user) => user.id === id);
      if (!u) return null;
      u.role = newRole;
      u.lastActiveAt = new Date().toISOString();

      // Keep workspace membership in sync
      const wsId = req.workspace?.id || 'ws_default';
      const membershipsList = d.workspaceMemberships || [];
      const membership = membershipsList.find(
        (m) => m.userId === id && m.workspaceId === wsId
      );
      if (membership) {
        membership.role = newRole;
      }
      return u;
    });

    const isPromotion = previousRole === ROLES.MEMBER && (newRole === ROLES.LEADER || newRole === ROLES.CO_LEADER);
    const actionLabel = isPromotion ? 'Promoted to Leader' : 'Changed Member Rank';

    logActivity({
      workspaceId: req.workspace!.id,
      userId: currentUserId,
      action: actionLabel,
      entityType: 'setting',
      entityId: id,
      details: `${req.user!.name} changed rank of ${targetUser.name} from "${previousRole}" to "${newRole}"`,
    });

    res.json({
      user: updatedUser,
      previousRole,
      newRole,
      message: `Successfully changed rank of ${targetUser.name} to ${newRole}.`,
    });
  }
);

apiRouter.delete('/users/:id', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user!.id;
  const currentRole = req.role!;

  if (currentUserId === id) {
    res.status(403).json({ error: 'You cannot delete your own account.' });
    return;
  }

  const data = db.getRawData();
  const targetUser = data.users.find((u) => u.id === id);
  if (!targetUser) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  if (targetUser.role === ROLES.OWNER && currentRole !== ROLES.OWNER) {
    res.status(403).json({ error: 'Cannot delete workspace owner.' });
    return;
  }

  const deleted = db.mutate((d) => {
    const idx = d.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const removed = d.users.splice(idx, 1)[0];

    // Clean up team rosters
    for (const t of d.teams) {
      t.memberIds = t.memberIds.filter((m) => m !== id);
      if (t.leaderId === id) t.leaderId = '';
      if (t.coLeaderId === id) t.coLeaderId = '';
    }

    // Clean up project memberships
    for (const p of d.projects) {
      p.memberIds = p.memberIds.filter((m) => m !== id);
      if (p.leaderId === id) p.leaderId = '';
      if (p.coLeaderId === id) p.coLeaderId = '';
    }

    return removed;
  });

  if (!deleted) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  logActivity({
    workspaceId: req.workspace!.id,
    userId: currentUserId,
    action: 'Deleted Member',
    entityType: 'setting',
    entityId: id,
    details: `${req.user!.name} deleted member ${targetUser.name} (${targetUser.email}) from the system`,
  });

  res.json({ success: true, deletedId: id });
});

apiRouter.delete('/teams/:id/members/:userId', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id, userId } = req.params;

  const updated = db.mutate((data) => {
    const team = data.teams.find((t) => t.id === id);
    if (!team) return null;
    team.memberIds = team.memberIds.filter((m) => m !== userId);
    return team;
  });

  if (!updated) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  res.json(updated);
});

// ----------------------------------------------------
// Projects (Role-aware query & mutation)
// ----------------------------------------------------
apiRouter.get('/projects', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const user = req.user!;
  const role = req.role!;

  // Owners see all projects
  // Leaders see all projects in their workspace or teams
  // Co-leaders and members see projects they are assigned to or that have workspace/team visibility
  let projects = data.projects.filter((p) => p.workspaceId === req.workspace!.id);

  if (role === 'member') {
    projects = projects.filter(
      (p) =>
        p.visibility === 'workspace' ||
        p.memberIds.includes(user.id) ||
        p.leaderId === user.id
    );
  }

  res.json(projects);
});

apiRouter.get('/projects/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getRawData();
  const project = data.projects.find((p) => p.id === id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Authorization check
  const role = req.role!;
  const userId = req.user!.id;
  if (
    role === 'member' &&
    project.visibility === 'private_assigned' &&
    !project.memberIds.includes(userId)
  ) {
    res.status(403).json({ error: 'Access denied to this project' });
    return;
  }

  res.json(project);
});

// Real-time Server-Sent Events stream for a project
apiRouter.get('/projects/:id/events', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getRawData();
  const project = data.projects.find((p) => p.id === id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Authorization check
  const role = req.role!;
  const userId = req.user!.id;
  if (
    role === 'member' &&
    project.visibility === 'private_assigned' &&
    !project.memberIds.includes(userId)
  ) {
    res.status(403).json({ error: 'Access denied to this project events stream' });
    return;
  }

  realtimeHub.subscribe(id, res, `usr_${userId}_${Math.random().toString(36).substring(2, 7)}`);
});

// Recent real-time events history for a project
apiRouter.get('/projects/:id/recent-events', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const events = realtimeHub.getRecentEvents(id);
  res.json(events);
});

// Dedicated endpoint to add or remove team member assignments for a project
apiRouter.post('/projects/:id/members', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER, ROLES.CO_LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { userId, action = 'add' } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'User ID is required' });
    return;
  }

  const data = db.getRawData();
  const targetUser = data.users.find((u) => u.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: 'Target user not found' });
    return;
  }

  let wasAdded = false;
  const updated = db.mutate((d) => {
    const proj = d.projects.find((p) => p.id === id);
    if (!proj) return null;

    if (!Array.isArray(proj.memberIds)) {
      proj.memberIds = [];
    }

    if (action === 'add') {
      if (!proj.memberIds.includes(userId)) {
        proj.memberIds.push(userId);
        wasAdded = true;
      }
    } else {
      proj.memberIds = proj.memberIds.filter((mId) => mId !== userId);
    }
    proj.updatedAt = new Date().toISOString();
    return proj;
  });

  if (!updated) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (action === 'add' && wasAdded) {
    // Broadcast real-time team member assignment event
    realtimeHub.broadcast(id, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'project:member_assigned',
      projectId: id,
      title: 'New Team Member Assigned',
      message: `${targetUser.name} was assigned to project "${updated.title}"`,
      memberId: targetUser.id,
      memberName: targetUser.name,
      memberRole: targetUser.role,
      entityId: id,
      entityTitle: updated.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    });
  }

  logActivity({
    workspaceId: req.workspace!.id,
    projectId: updated.id,
    userId: req.user!.id,
    action: action === 'add' ? 'Assigned project member' : 'Removed project member',
    entityType: 'project',
    entityId: updated.id,
    details: `${action === 'add' ? 'Assigned' : 'Removed'} ${targetUser.name} (${targetUser.email})`,
  });

  res.json(updated);
});

// Simulate real-time event for demonstration or manual testing
apiRouter.post('/projects/:id/simulate-event', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { type = 'status_change', memberId, newStatus } = req.body;
  const data = db.getRawData();
  const project = data.projects.find((p) => p.id === id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  let eventPayload: any;

  if (type === 'member_assignment' || type === 'project:member_assigned') {
    const targetUser = memberId
      ? data.users.find((u) => u.id === memberId) || data.users[1]
      : data.users.find((u) => !project.memberIds.includes(u.id)) || data.users[2];

    eventPayload = {
      id: `rt_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'project:member_assigned',
      projectId: id,
      title: 'New Team Member Assigned',
      message: `${targetUser.name} was assigned to team for "${project.title}"`,
      memberId: targetUser.id,
      memberName: targetUser.name,
      memberRole: targetUser.role,
      entityId: id,
      entityTitle: project.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    };
  } else {
    const statuses = ['active', 'at_risk', 'completed', 'on_hold', 'planned'];
    const currentIdx = statuses.indexOf(project.status);
    const chosenStatus = newStatus || statuses[(currentIdx + 1) % statuses.length];

    eventPayload = {
      id: `rt_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'project:status_changed',
      projectId: id,
      title: 'Project Status Updated',
      message: `Project status changed from "${project.status.replace('_', ' ')}" to "${chosenStatus.replace('_', ' ')}"`,
      oldValue: project.status,
      newValue: chosenStatus,
      entityId: id,
      entityTitle: project.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    };
  }

  realtimeHub.broadcast(id, eventPayload);
  res.json({ success: true, event: eventPayload, activeSubscribers: realtimeHub.getActiveCount(id) });
});

apiRouter.post('/projects', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER, ROLES.CO_LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { title, description, teamId, objectives, status, deadline, accentColor, visibility, memberIds } = req.body;

  if (!title || !teamId) {
    res.status(400).json({ error: 'Project title and team are required' });
    return;
  }

  const newProject = db.mutate((data) => {
    const project = {
      id: 'proj_' + Date.now().toString(36),
      workspaceId: req.workspace!.id,
      teamId,
      title: title.trim(),
      description: description?.trim() || '',
      objectives: Array.isArray(objectives) ? objectives : [],
      status: status || 'planned',
      deadline: deadline || new Date(Date.now() + 30 * 86400000).toISOString(),
      accentColor: accentColor || '#8b5cf6',
      leaderId: req.user!.id,
      visibility: visibility || 'workspace',
      memberIds: Array.isArray(memberIds) && memberIds.length > 0 ? memberIds : [req.user!.id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.projects.unshift(project);
    return project;
  });

  logActivity({
    workspaceId: req.workspace!.id,
    projectId: newProject.id,
    userId: req.user!.id,
    action: 'Created project',
    entityType: 'project',
    entityId: newProject.id,
    details: `Created new project "${newProject.title}"`,
  });

  res.status(201).json(newProject);
});

apiRouter.patch('/projects/:id', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER, ROLES.CO_LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const fields = req.body;

  const currentData = db.getRawData();
  const existingProj = currentData.projects.find((p) => p.id === id);
  if (!existingProj) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const oldStatus = existingProj.status;
  const oldMemberIds = [...(existingProj.memberIds || [])];

  const updated = db.mutate((data) => {
    const proj = data.projects.find((p) => p.id === id);
    if (!proj) return null;

    if (fields.title) proj.title = fields.title.trim();
    if (fields.description !== undefined) proj.description = fields.description.trim();
    if (fields.status) proj.status = fields.status;
    if (fields.deadline) proj.deadline = fields.deadline;
    if (fields.accentColor) proj.accentColor = fields.accentColor;
    if (fields.visibility) proj.visibility = fields.visibility;
    if (fields.teamId) proj.teamId = fields.teamId;
    if (Array.isArray(fields.objectives)) proj.objectives = fields.objectives;
    if (Array.isArray(fields.memberIds)) proj.memberIds = fields.memberIds;
    if (fields.budget !== undefined) proj.budget = Number(fields.budget);
    if (Array.isArray(fields.expenseItems)) {
      proj.expenseItems = fields.expenseItems;
      proj.expenses = proj.expenseItems.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    } else if (fields.expenses !== undefined) {
      proj.expenses = Number(fields.expenses);
    }
    proj.updatedAt = new Date().toISOString();

    return proj;
  });

  if (!updated) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Real-time broadcast: Status Change
  if (fields.status && fields.status !== oldStatus) {
    realtimeHub.broadcast(id, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'project:status_changed',
      projectId: id,
      title: 'Project Status Updated',
      message: `Project status changed from "${oldStatus.replace('_', ' ')}" to "${fields.status.replace('_', ' ')}"`,
      oldValue: oldStatus,
      newValue: fields.status,
      entityId: id,
      entityTitle: updated.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    });
  }

  // Real-time broadcast: New member assignments
  if (Array.isArray(fields.memberIds)) {
    const addedMemberIds = fields.memberIds.filter((mId: string) => !oldMemberIds.includes(mId));
    for (const mId of addedMemberIds) {
      const assignedUser = currentData.users.find((u) => u.id === mId);
      realtimeHub.broadcast(id, {
        id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'project:member_assigned',
        projectId: id,
        title: 'New Team Member Assigned',
        message: `${assignedUser ? assignedUser.name : mId} was assigned to project "${updated.title}"`,
        memberId: mId,
        memberName: assignedUser ? assignedUser.name : mId,
        memberRole: assignedUser?.role,
        entityId: id,
        entityTitle: updated.title,
        actorName: req.user!.name,
        timestamp: new Date().toISOString(),
      });
    }
  }

  logActivity({
    workspaceId: req.workspace!.id,
    projectId: updated.id,
    userId: req.user!.id,
    action: 'Updated project',
    entityType: 'project',
    entityId: updated.id,
    details: `Updated details for project "${updated.title}"`,
  });

  res.json(updated);
});

apiRouter.delete('/projects/:id', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const deleted = db.mutate((data) => {
    const idx = data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    
    const proj = data.projects[idx];
    data.projects.splice(idx, 1);
    
    // Cleanup associated entities
    data.tasks = data.tasks.filter(t => t.projectId !== id);
    data.milestones = data.milestones.filter(m => m.projectId !== id);
    data.resources = data.resources.filter(r => r.projectId !== id);
    data.projectMessages = data.projectMessages.filter(m => m.projectId !== id);
    data.files = data.files.filter(f => f.projectId !== id);
    
    return proj;
  });

  if (!deleted) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  
  logActivity({
    workspaceId: req.workspace!.id,
    userId: req.user!.id,
    action: 'Deleted project',
    entityType: 'project',
    entityId: id,
    details: `Deleted project "${(deleted as any).title}"`,
  });

  res.json({ success: true });
});

// ----------------------------------------------------
// Project Expenses & Bought Components / Services
// ----------------------------------------------------
apiRouter.post('/projects/:id/expenses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, category, cost, date, status, vendor, notes } = req.body;

  if (!title || cost === undefined || isNaN(Number(cost))) {
    res.status(400).json({ error: 'Title and valid cost amount are required' });
    return;
  }

  const currentData = db.getRawData();
  const proj = currentData.projects.find((p) => p.id === id);
  if (!proj) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const newExpenseItem = {
    id: 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    projectId: id,
    title: String(title).trim(),
    category: category || 'component',
    cost: Math.max(0, Number(cost)),
    date: date || new Date().toISOString().split('T')[0],
    status: status || 'bought',
    vendor: vendor ? String(vendor).trim() : undefined,
    notes: notes ? String(notes).trim() : undefined,
    createdById: req.user!.id,
    createdAt: new Date().toISOString(),
  };

  const updatedProject = db.mutate((data) => {
    const p = data.projects.find((item) => item.id === id);
    if (!p) return null;
    if (!Array.isArray(p.expenseItems)) {
      p.expenseItems = [];
    }
    p.expenseItems.unshift(newExpenseItem);
    p.expenses = p.expenseItems.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
    p.updatedAt = new Date().toISOString();
    return p;
  });

  logActivity({
    workspaceId: req.workspace!.id,
    projectId: id,
    userId: req.user!.id,
    action: 'Added project expense',
    entityType: 'project',
    entityId: id,
    details: `Added "${newExpenseItem.title}" ($${newExpenseItem.cost.toLocaleString()}) to project budget`,
  });

  res.status(201).json({ project: updatedProject, expenseItem: newExpenseItem });
});

apiRouter.delete('/projects/:id/expenses/:expenseId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id, expenseId } = req.params;

  const currentData = db.getRawData();
  const proj = currentData.projects.find((p) => p.id === id);
  if (!proj) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  let deletedExpenseTitle = '';
  const updatedProject = db.mutate((data) => {
    const p = data.projects.find((item) => item.id === id);
    if (!p || !Array.isArray(p.expenseItems)) return null;

    const idx = p.expenseItems.findIndex((item) => item.id === expenseId);
    if (idx === -1) return null;

    deletedExpenseTitle = p.expenseItems[idx].title;
    p.expenseItems.splice(idx, 1);
    p.expenses = p.expenseItems.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
    p.updatedAt = new Date().toISOString();
    return p;
  });

  if (!updatedProject) {
    res.status(404).json({ error: 'Expense item not found' });
    return;
  }

  logActivity({
    workspaceId: req.workspace!.id,
    projectId: id,
    userId: req.user!.id,
    action: 'Removed project expense',
    entityType: 'project',
    entityId: id,
    details: `Removed "${deletedExpenseTitle}" from project budget deductions`,
  });

  res.json({ success: true, project: updatedProject });
});

// ----------------------------------------------------
// Tasks (Individual & Collaborative Group Tasks)
// ----------------------------------------------------
apiRouter.get('/tasks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.query;
  const data = db.getRawData();
  const user = req.user!;

  let tasks = data.tasks;

  if (projectId) {
    tasks = tasks.filter((t) => t.projectId === projectId);
  }

  // Normal members see ONLY their assigned tasks, tasks they created, or group tasks they participate in.
  // Leaders, co-leaders, and owners see ALL tasks for the workspace/project.
  if (req.role === 'member') {
    tasks = tasks.filter(
      (t) =>
        t.assigneeId === user.id ||
        t.creatorId === user.id ||
        (t.isGroupTask && Array.isArray(t.participantIds) && t.participantIds.includes(user.id))
    );
  }

  res.json(tasks);
});

apiRouter.post('/tasks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    projectId,
    title,
    description,
    assigneeId,
    priority,
    dueDate,
    milestoneId,
    tags,
    checklist,
    isGroupTask,
    participantIds,
    individualPoints,
    groupBonusPoints,
  } = req.body;

  if (!projectId || !title) {
    res.status(400).json({ error: 'Project ID and task title are required' });
    return;
  }

  // Normal members can only assign tasks to themselves. Leaders/co-leaders/owners can assign to anyone.
  let finalAssigneeId = assigneeId || undefined;
  if (req.role === 'member' && finalAssigneeId && finalAssigneeId !== req.user!.id) {
    finalAssigneeId = req.user!.id;
  }

  const rawData = db.getRawData();
  const participants = Array.isArray(participantIds) ? participantIds : (isGroupTask && finalAssigneeId ? [finalAssigneeId] : []);
  const indPoints = Number(individualPoints) > 0 ? Number(individualPoints) : 35;
  const bonusPoints = Number(groupBonusPoints) > 0 ? Number(groupBonusPoints) : 60;

  const newTask = db.mutate((data) => {
    const taskId = 'task_' + Date.now().toString(36);

    const initialSubmissions = isGroupTask
      ? participants.map((pId: string) => {
          const u = data.users.find((user) => user.id === pId);
          return {
            id: `gsub_${taskId}_${pId}`,
            taskId,
            userId: pId,
            userName: u?.name || pId,
            userAvatar: u?.avatarUrl,
            userRole: u?.role,
            status: 'pending' as const,
          };
        })
      : undefined;

    const task = {
      id: taskId,
      projectId,
      title: title.trim(),
      description: description?.trim() || '',
      assigneeId: isGroupTask ? undefined : finalAssigneeId,
      creatorId: req.user!.id,
      status: 'todo' as TaskStatus,
      priority: priority || 'medium',
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      milestoneId: milestoneId || undefined,
      tags: Array.isArray(tags) ? tags : [],
      checklist: Array.isArray(checklist)
        ? checklist.map((item: any, idx: number) => ({
            id: 'cl_' + taskId + '_' + idx,
            taskId,
            title: item.title,
            isCompleted: !!item.isCompleted,
            sortOrder: idx,
          }))
        : [],
      // Group Task attributes
      isGroupTask: !!isGroupTask,
      participantIds: isGroupTask ? participants : undefined,
      individualPoints: isGroupTask ? indPoints : undefined,
      groupBonusPoints: isGroupTask ? bonusPoints : undefined,
      submissions: initialSubmissions,
      bonusAwarded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.tasks.push(task);

    // Generate assignment notifications for members
    const assignees = isGroupTask ? participants : (finalAssigneeId ? [finalAssigneeId] : []);
    createAssignmentNotifications(data, task, req.user!.name, assignees, !!isGroupTask);

    if (task.status === 'complete' && task.milestoneId) {
      checkAndCompleteMilestone(data, projectId, task.milestoneId, req.user!.name);
    }

    return task;
  });

  // Real-time broadcast: Task assignment
  if (newTask.isGroupTask && Array.isArray(newTask.participantIds) && newTask.participantIds.length > 0) {
    const participantNames = newTask.participantIds
      .map((pId: string) => rawData.users.find((u) => u.id === pId)?.name || pId)
      .join(', ');

    realtimeHub.broadcast(projectId, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'task:member_assigned',
      projectId,
      title: 'New Collaborative Group Task',
      message: `Group task "${newTask.title}" assigned to: ${participantNames}. (+${newTask.individualPoints} pts on submit, +${newTask.groupBonusPoints} team bonus on completion)`,
      entityId: newTask.id,
      entityTitle: newTask.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    });
  } else if (newTask.assigneeId) {
    const assignedUser = rawData.users.find((u) => u.id === newTask.assigneeId);
    realtimeHub.broadcast(projectId, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'task:member_assigned',
      projectId,
      title: 'New Work Item Assigned',
      message: `${assignedUser ? assignedUser.name : 'Team member'} was assigned to task "${newTask.title}"`,
      memberId: newTask.assigneeId,
      memberName: assignedUser ? assignedUser.name : newTask.assigneeId,
      memberRole: assignedUser?.role,
      entityId: newTask.id,
      entityTitle: newTask.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    });
  }

  logActivity({
    workspaceId: req.workspace!.id,
    projectId,
    userId: req.user!.id,
    action: newTask.isGroupTask ? 'Created collaborative group task' : 'Created task',
    entityType: 'task',
    entityId: newTask.id,
    details: newTask.isGroupTask
      ? `Created group task "${newTask.title}" with ${(newTask.participantIds || []).length} participants (+${newTask.individualPoints} pts each, +${newTask.groupBonusPoints} bonus)`
      : `Added task "${newTask.title}"`,
  });

  res.status(201).json(newTask);
});

apiRouter.patch('/tasks/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const rawData = db.getRawData();
  const existingTask = rawData.tasks.find((t) => t.id === id);
  if (!existingTask) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const oldStatus = existingTask.status;
  const oldAssigneeId = existingTask.assigneeId;
  const oldParticipants = existingTask.participantIds || [];
  let bonusTriggeredJustNow = false;

  const updated = db.mutate((data) => {
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return null;

    if (updates.title) task.title = updates.title.trim();
    if (updates.description !== undefined) task.description = updates.description.trim();
    if (updates.assigneeId !== undefined) {
      // Normal members cannot reassign tasks to other users
      if (req.role !== 'member' || updates.assigneeId === req.user!.id || updates.assigneeId === task.assigneeId) {
        task.assigneeId = updates.assigneeId;
      }
    }
    if (updates.priority) task.priority = updates.priority;
    if (updates.dueDate) task.dueDate = updates.dueDate;
    if (updates.milestoneId !== undefined) task.milestoneId = updates.milestoneId;
    if (Array.isArray(updates.tags)) task.tags = updates.tags;
    if (Array.isArray(updates.checklist)) task.checklist = updates.checklist;

    // Group Task fields
    if (updates.isGroupTask !== undefined) task.isGroupTask = !!updates.isGroupTask;
    if (Array.isArray(updates.participantIds)) {
      task.participantIds = updates.participantIds;
      // Sync submissions
      if (!Array.isArray(task.submissions)) task.submissions = [];
      for (const pId of task.participantIds) {
        if (!task.submissions.some((s) => s.userId === pId)) {
          const u = data.users.find((user) => user.id === pId);
          task.submissions.push({
            id: `gsub_${task.id}_${pId}`,
            taskId: task.id,
            userId: pId,
            userName: u?.name || pId,
            userAvatar: u?.avatarUrl,
            userRole: u?.role,
            status: 'pending',
          });
        }
      }
    }
    if (updates.individualPoints !== undefined) task.individualPoints = Number(updates.individualPoints);
    if (updates.groupBonusPoints !== undefined) task.groupBonusPoints = Number(updates.groupBonusPoints);
    if (Array.isArray(updates.submissions)) task.submissions = updates.submissions;

    if (updates.status && updates.status !== task.status) {
      task.status = updates.status;
      if (updates.status === 'complete') {
        task.completedAt = new Date().toISOString();
        if (task.isGroupTask && !task.bonusAwarded) {
          task.bonusAwarded = true;
          task.bonusAwardedAt = new Date().toISOString();
          bonusTriggeredJustNow = true;
        }
      } else {
        delete task.completedAt;
        if (task.isGroupTask) {
          task.bonusAwarded = false;
          delete task.bonusAwardedAt;
        }
      }
    }

    task.updatedAt = new Date().toISOString();

    // Task assignment notifications
    if (updates.assigneeId && updates.assigneeId !== oldAssigneeId) {
      createAssignmentNotifications(data, task, req.user!.name, [updates.assigneeId], false);
    }
    if (Array.isArray(updates.participantIds)) {
      const newParticipants = updates.participantIds.filter((pId: string) => !oldParticipants.includes(pId));
      if (newParticipants.length > 0) {
        createAssignmentNotifications(data, task, req.user!.name, newParticipants, true);
      }
    }

    // Milestone & Group task completion notifications
    if (updates.status === 'complete' && oldStatus !== 'complete') {
      if (task.isGroupTask && Array.isArray(task.participantIds) && task.participantIds.length > 0) {
        createMilestoneReachedNotifications(data, task.title, task.projectId, task.participantIds, true, task.id);
      }
      if (task.milestoneId) {
        checkAndCompleteMilestone(data, task.projectId, task.milestoneId, req.user!.name);
      }
    }

    return task;
  });

  if (!updated) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  // Real-time broadcast: Task Status Change
  if (updates.status && updates.status !== oldStatus) {
    realtimeHub.broadcast(updated.projectId, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'task:status_changed',
      projectId: updated.projectId,
      title: 'Task Status Updated',
      message: `"${updated.title}" transitioned from "${oldStatus.replace('_', ' ')}" to "${updates.status.replace('_', ' ')}"`,
      oldValue: oldStatus,
      newValue: updates.status,
      entityId: updated.id,
      entityTitle: updated.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast group completion bonus celebration
  if (bonusTriggeredJustNow && updated.isGroupTask) {
    realtimeHub.broadcast(updated.projectId, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'task:status_changed',
      projectId: updated.projectId,
      title: 'Group Mission Complete!',
      message: `Collaborative task "${updated.title}" has been finalized! All ${(updated.participantIds || []).length} participants were awarded +${updated.groupBonusPoints || 60} extra bonus points!`,
      entityId: updated.id,
      entityTitle: updated.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    });
  }

  // Real-time broadcast: Task Member Assignment Change
  if (updates.assigneeId !== undefined && updates.assigneeId !== oldAssigneeId) {
    const assignedUser = rawData.users.find((u) => u.id === updates.assigneeId);
    realtimeHub.broadcast(updated.projectId, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'task:member_assigned',
      projectId: updated.projectId,
      title: updates.assigneeId ? 'Task Assignee Updated' : 'Task Unassigned',
      message: updates.assigneeId
        ? `${assignedUser ? assignedUser.name : 'Team member'} was assigned to "${updated.title}"`
        : `"${updated.title}" is now unassigned`,
      memberId: updates.assigneeId || undefined,
      memberName: assignedUser ? assignedUser.name : updates.assigneeId,
      memberRole: assignedUser?.role,
      entityId: updated.id,
      entityTitle: updated.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    });
  }

  logActivity({
    workspaceId: req.workspace!.id,
    projectId: updated.projectId,
    userId: req.user!.id,
    action: 'Updated task',
    entityType: 'task',
    entityId: updated.id,
    details: `Task status: ${updated.status}`,
  });

  res.json(updated);
});

// Member submits their contribution to a group task (takes individual points!)
apiRouter.post('/tasks/:id/group-submit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { note, proofLinks } = req.body;
  const currentUserId = req.user!.id;
  const currentUserName = req.user!.name;

  const rawData = db.getRawData();
  const existingTask = rawData.tasks.find((t) => t.id === id);
  if (!existingTask) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  if (!existingTask.isGroupTask) {
    res.status(400).json({ error: 'This task is not a collaborative group task' });
    return;
  }

  const individualPts = existingTask.individualPoints || 35;
  const bonusPts = existingTask.groupBonusPoints || 60;
  let allMembersSubmitted = false;
  let bonusAwarded = false;

  const updatedTask = db.mutate((data) => {
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return null;

    if (!Array.isArray(task.submissions)) task.submissions = [];
    if (!Array.isArray(task.participantIds)) task.participantIds = [];

    // If current user is not in participantIds yet, add them
    if (!task.participantIds.includes(currentUserId)) {
      task.participantIds.push(currentUserId);
    }

    let sub = task.submissions.find((s) => s.userId === currentUserId);
    if (!sub) {
      sub = {
        id: `gsub_${task.id}_${currentUserId}`,
        taskId: task.id,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: req.user!.avatarUrl,
        userRole: req.user!.role,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        note: note ? String(note).trim() : undefined,
        proofLinks: Array.isArray(proofLinks) ? proofLinks : (proofLinks ? [String(proofLinks).trim()] : []),
        pointsAwarded: individualPts,
      };
      task.submissions.push(sub);
    } else {
      sub.status = 'submitted';
      sub.submittedAt = new Date().toISOString();
      if (note !== undefined) sub.note = String(note).trim();
      if (proofLinks !== undefined) {
        sub.proofLinks = Array.isArray(proofLinks) ? proofLinks : (proofLinks ? [String(proofLinks).trim()] : []);
      }
      sub.pointsAwarded = individualPts;
      sub.userName = currentUserName;
      sub.userAvatar = req.user!.avatarUrl;
    }

    // Check if all participants have submitted
    const submittedCount = task.submissions.filter(
      (s) => (s.status === 'submitted' || s.status === 'approved') && task.participantIds?.includes(s.userId)
    ).length;

    allMembersSubmitted = task.participantIds.length > 0 && submittedCount >= task.participantIds.length;

    // If task was todo, transition to in_progress or complete
    if (task.status === 'todo') {
      task.status = 'in_progress';
    }

    // If all members submitted, auto-complete the group task and distribute bonus points!
    if (allMembersSubmitted && task.status !== 'complete') {
      task.status = 'complete';
      task.completedAt = new Date().toISOString();
      task.bonusAwarded = true;
      task.bonusAwardedAt = new Date().toISOString();
      bonusAwarded = true;
    }

    if ((bonusAwarded || task.status === 'complete') && Array.isArray(task.participantIds)) {
      createMilestoneReachedNotifications(data, task.title, task.projectId, task.participantIds, true, task.id);
      if (task.milestoneId) {
        checkAndCompleteMilestone(data, task.projectId, task.milestoneId, currentUserName);
      }
    }

    task.updatedAt = new Date().toISOString();
    return task;
  });

  if (!updatedTask) {
    res.status(404).json({ error: 'Task could not be updated' });
    return;
  }

  // Real-time broadcast for member submission
  realtimeHub.broadcast(updatedTask.projectId, {
    id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'task:status_changed',
    projectId: updatedTask.projectId,
    title: 'Group Task Contribution Submitted',
    message: `${currentUserName} submitted their part for "${updatedTask.title}" and earned +${individualPts} points! (${updatedTask.submissions?.filter(s => s.status === 'submitted' || s.status === 'approved').length}/${updatedTask.participantIds?.length} members ready)`,
    entityId: updatedTask.id,
    entityTitle: updatedTask.title,
    actorName: currentUserName,
    timestamp: new Date().toISOString(),
  });

  // If bonus awarded, broadcast team bonus celebration
  if (bonusAwarded) {
    realtimeHub.broadcast(updatedTask.projectId, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'task:status_changed',
      projectId: updatedTask.projectId,
      title: '🎉 All Group Members Completed!',
      message: `All participants submitted work for "${updatedTask.title}"! Task is now complete and all ${(updatedTask.participantIds || []).length} members earned an extra +${bonusPts} bonus points!`,
      entityId: updatedTask.id,
      entityTitle: updatedTask.title,
      actorName: currentUserName,
      timestamp: new Date().toISOString(),
    });
  }

  logActivity({
    workspaceId: req.workspace!.id,
    projectId: updatedTask.projectId,
    userId: currentUserId,
    action: 'Submitted group task contribution',
    entityType: 'task',
    entityId: updatedTask.id,
    details: `${currentUserName} submitted contribution for "${updatedTask.title}" (+${individualPts} pts claimed)${bonusAwarded ? ` — Group task complete! (+${bonusPts} team bonus each)` : ''}`,
  });

  res.json({
    success: true,
    task: updatedTask,
    pointsAwarded: individualPts,
    allMembersSubmitted,
    bonusAwarded,
    message: bonusAwarded
      ? `You earned +${individualPts} individual points, and all members received +${bonusPts} collective bonus points!`
      : `You earned +${individualPts} points for submitting your part!`,
  });
});

// Finalize/Complete a group task directly (awarding team bonus)
apiRouter.post('/tasks/:id/group-complete', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER, ROLES.CO_LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const rawData = db.getRawData();
  const existingTask = rawData.tasks.find((t) => t.id === id);

  if (!existingTask) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const bonusPts = existingTask.groupBonusPoints || 60;

  const updatedTask = db.mutate((data) => {
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return null;

    task.status = 'complete';
    task.completedAt = new Date().toISOString();
    task.bonusAwarded = true;
    task.bonusAwardedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    // Ensure all participant submissions are marked approved if submitted
    if (Array.isArray(task.submissions)) {
      for (const sub of task.submissions) {
        if (sub.status === 'submitted') {
          sub.status = 'approved';
          sub.reviewedById = req.user!.id;
          sub.reviewedAt = new Date().toISOString();
        }
      }
    }

    if (Array.isArray(task.participantIds) && task.participantIds.length > 0) {
      createMilestoneReachedNotifications(data, task.title, task.projectId, task.participantIds, true, task.id);
    }
    if (task.milestoneId) {
      checkAndCompleteMilestone(data, task.projectId, task.milestoneId, req.user!.name);
    }

    return task;
  });

  if (!updatedTask) {
    res.status(404).json({ error: 'Failed to complete task' });
    return;
  }

  realtimeHub.broadcast(updatedTask.projectId, {
    id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'task:status_changed',
    projectId: updatedTask.projectId,
    title: 'Group Task Finalized & Team Bonus Awarded!',
    message: `Leader ${req.user!.name} finalized group task "${updatedTask.title}"! All ${(updatedTask.participantIds || []).length} participants received +${bonusPts} extra bonus points!`,
    entityId: updatedTask.id,
    entityTitle: updatedTask.title,
    actorName: req.user!.name,
    timestamp: new Date().toISOString(),
  });

  logActivity({
    workspaceId: req.workspace!.id,
    projectId: updatedTask.projectId,
    userId: req.user!.id,
    action: 'Finalized group task',
    entityType: 'task',
    entityId: updatedTask.id,
    details: `Finalized group task "${updatedTask.title}" and distributed +${bonusPts} bonus points to all participants`,
  });

  res.json({
    success: true,
    task: updatedTask,
    bonusPointsAwarded: bonusPts,
    message: `Final task completed! All participants earned +${bonusPts} bonus points.`,
  });
});

// Review an individual participant submission in a group task
apiRouter.post('/tasks/:id/group-review', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER, ROLES.CO_LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { userId, action, reviewNote } = req.body;

  if (!userId || !action || !['approved', 'rejected', 'changes_requested'].includes(action)) {
    res.status(400).json({ error: 'Valid userId and action (approved, rejected, changes_requested) are required' });
    return;
  }

  const updatedTask = db.mutate((data) => {
    const task = data.tasks.find((t) => t.id === id);
    if (!task || !Array.isArray(task.submissions)) return null;

    const sub = task.submissions.find((s) => s.userId === userId);
    if (!sub) return null;

    sub.status = action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'pending';
    sub.reviewedById = req.user!.id;
    sub.reviewedAt = new Date().toISOString();
    if (reviewNote) sub.reviewNote = String(reviewNote).trim();

    task.updatedAt = new Date().toISOString();
    return task;
  });

  if (!updatedTask) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }

  res.json({ success: true, task: updatedTask });
});

// ----------------------------------------------------
// Milestones
// ----------------------------------------------------
apiRouter.get('/milestones', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.query;
  const data = db.getRawData();
  const milestones = projectId
    ? data.milestones.filter((m) => m.projectId === projectId)
    : data.milestones;
  res.json(milestones);
});

apiRouter.post('/milestones', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER, ROLES.CO_LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { projectId, title, description, dueDate, ownerId } = req.body;
  if (!projectId || !title) {
    res.status(400).json({ error: 'Project ID and milestone title are required' });
    return;
  }

  const newMilestone = db.mutate((data) => {
    const ms = {
      id: 'ms_' + Date.now().toString(36),
      projectId,
      title: title.trim(),
      description: description?.trim() || '',
      dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString(),
      status: 'pending' as const,
      ownerId: ownerId || req.user!.id,
      createdAt: new Date().toISOString(),
    };
    data.milestones.push(ms);
    return ms;
  });

  res.status(201).json(newMilestone);
});

apiRouter.patch('/milestones/:id', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER, ROLES.CO_LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const rawData = db.getRawData();
  const existingMs = rawData.milestones.find((m) => m.id === id);
  if (!existingMs) {
    res.status(404).json({ error: 'Milestone not found' });
    return;
  }

  const oldStatus = existingMs.status;

  const updated = db.mutate((data) => {
    const ms = data.milestones.find((m) => m.id === id);
    if (!ms) return null;
    if (updates.title) ms.title = updates.title.trim();
    if (updates.description !== undefined) ms.description = updates.description.trim();
    if (updates.dueDate) ms.dueDate = updates.dueDate;
    if (updates.status) ms.status = updates.status;
    if (updates.ownerId) ms.ownerId = updates.ownerId;

    if (updates.status && (updates.status === 'completed' || updates.status === 'achieved') && oldStatus !== updates.status) {
      const project = data.projects.find((p) => p.id === ms.projectId);
      const members = project?.memberIds || [];
      createMilestoneReachedNotifications(data, ms.title, ms.projectId, members, false);
    }

    return ms;
  });

  if (!updated) {
    res.status(404).json({ error: 'Milestone not found' });
    return;
  }

  // Real-time broadcast: Milestone Status Change
  if (updates.status && updates.status !== oldStatus) {
    realtimeHub.broadcast(updated.projectId, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'milestone:status_changed',
      projectId: updated.projectId,
      title: 'Milestone Status Updated',
      message: `Milestone "${updated.title}" marked as "${updates.status.toUpperCase()}"`,
      oldValue: oldStatus,
      newValue: updates.status,
      entityId: updated.id,
      entityTitle: updated.title,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    });
  }

  res.json(updated);
});

// ----------------------------------------------------
// Proof of Work
// ----------------------------------------------------
apiRouter.get('/proofs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId, taskId } = req.query;
  const data = db.getRawData();
  let proofs = data.proofSubmissions;

  if (projectId) proofs = proofs.filter((p) => p.projectId === projectId);
  if (taskId) proofs = proofs.filter((p) => p.taskId === taskId);

  res.json(proofs);
});

apiRouter.post('/proofs', requireAuth, rateLimit(20, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { taskId, projectId, explanation, links, attachmentIds } = req.body;
  if (!taskId || !projectId || !explanation) {
    res.status(400).json({ error: 'Task, project, and explanation are required for proof submission' });
    return;
  }

  const newProof = db.mutate((data) => {
    const proofId = 'proof_' + Date.now().toString(36);
    const proof = {
      id: proofId,
      taskId,
      projectId,
      submittedById: req.user!.id,
      explanation: explanation.trim(),
      links: Array.isArray(links) ? links : [],
      attachmentIds: Array.isArray(attachmentIds) ? attachmentIds : [],
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      reviewHistory: [],
    };
    data.proofSubmissions.unshift(proof);

    // Update task status to in_review
    const task = data.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'in_review';
      task.proofSubmittedId = proofId;
    }

    // Add notification for project leader
    const project = data.projects.find((p) => p.id === projectId);
    if (project && project.leaderId !== req.user!.id) {
      data.notifications.unshift({
        id: 'notif_' + Date.now().toString(36),
        userId: project.leaderId,
        title: 'Proof Submitted for Review',
        message: `${req.user!.name} submitted proof for "${task?.title || 'task'}"`,
        type: 'proof_review',
        isRead: false,
        link: `/projects/${projectId}?tab=proofs`,
        createdAt: new Date().toISOString(),
      });
    }

    return proof;
  });

  logActivity({
    workspaceId: req.workspace!.id,
    projectId,
    userId: req.user!.id,
    action: 'Submitted proof of work',
    entityType: 'proof',
    entityId: newProof.id,
    details: `Submitted proof for review: "${newProof.explanation.slice(0, 60)}..."`,
  });

  res.status(201).json(newProof);
});

apiRouter.post('/proofs/:id/review', requireAuth, requireRole([ROLES.OWNER, ROLES.LEADER, ROLES.CO_LEADER]), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  if (!['approved', 'rejected', 'changes_requested'].includes(action)) {
    res.status(400).json({ error: 'Valid action required: approved, rejected, changes_requested' });
    return;
  }

  const updated = db.mutate((data) => {
    const proof = data.proofSubmissions.find((p) => p.id === id);
    if (!proof) return null;

    proof.status = action;
    proof.reviewNote = reason?.trim() || '';
    proof.reviewedById = req.user!.id;
    proof.reviewedAt = new Date().toISOString();

    proof.reviewHistory.unshift({
      id: 'prh_' + Date.now().toString(36),
      proofId: proof.id,
      reviewerId: req.user!.id,
      action,
      reason: reason?.trim() || '',
      createdAt: new Date().toISOString(),
    });

    // Update associated task status
    const task = data.tasks.find((t) => t.id === proof.taskId);
    if (task) {
      if (action === 'approved') {
        task.status = 'complete';
        task.completedAt = new Date().toISOString();
        if (task.isGroupTask && Array.isArray(task.participantIds)) {
          createMilestoneReachedNotifications(data, task.title, task.projectId, task.participantIds, true, task.id);
        }
        if (task.milestoneId) {
          checkAndCompleteMilestone(data, task.projectId, task.milestoneId, req.user!.name);
        }
      } else if (action === 'changes_requested') {
        task.status = 'in_progress';
      } else if (action === 'rejected') {
        task.status = 'blocked';
      }
    }

    // Notify the submitter
    data.notifications.unshift({
      id: 'notif_' + Date.now().toString(36),
      userId: proof.submittedById,
      title: `Proof ${action === 'approved' ? 'Approved' : action === 'changes_requested' ? 'Changes Requested' : 'Rejected'}`,
      message: `${req.user!.name} evaluated your proof: "${reason || 'No additional note'}"`,
      type: action === 'approved' ? 'score' : 'proof_review',
      isRead: false,
      link: `/projects/${proof.projectId}?tab=proofs`,
      createdAt: new Date().toISOString(),
    });

    return proof;
  });

  if (!updated) {
    res.status(404).json({ error: 'Proof not found' });
    return;
  }

  logActivity({
    workspaceId: req.workspace!.id,
    projectId: updated.projectId,
    userId: req.user!.id,
    action: `Proof review: ${action}`,
    entityType: 'proof',
    entityId: updated.id,
    details: `Review decision: ${action}. Notes: ${reason || 'None'}`,
  });

  res.json(updated);
});

// ----------------------------------------------------
// Resources
// ----------------------------------------------------
apiRouter.get('/resources', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.query;
  const data = db.getRawData();
  const resources = projectId
    ? data.resources.filter((r) => r.projectId === projectId)
    : data.resources;
  res.json(resources);
});

apiRouter.post('/resources', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    projectId,
    title,
    description,
    url,
    category,
    permissionScope,
    fileId,
    fileName,
    fileSize,
    fileType,
    dataUrl,
    thumbnailUrl,
    tags,
  } = req.body;

  if (!projectId || !title) {
    res.status(400).json({ error: 'Project and resource title are required' });
    return;
  }

  const effectiveUrl = (url && String(url).trim()) || (dataUrl && String(dataUrl)) || '';

  const newResource = db.mutate((data) => {
    const resItem = {
      id: 'res_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      projectId,
      title: title.trim(),
      description: description?.trim() || '',
      url: effectiveUrl,
      category: category || 'documentation',
      fileId: fileId || undefined,
      fileName: fileName ? String(fileName).trim() : undefined,
      fileSize: fileSize ? Number(fileSize) : undefined,
      fileType: fileType ? String(fileType) : undefined,
      dataUrl: dataUrl ? String(dataUrl) : undefined,
      thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : undefined,
      tags: Array.isArray(tags) ? tags : [],
      createdById: req.user!.id,
      permissionScope: permissionScope || 'project_members',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.resources.push(resItem);
    return resItem;
  });

  res.status(201).json(newResource);
});

apiRouter.delete('/resources/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const deleted = db.mutate((data) => {
    const idx = data.resources.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    data.resources.splice(idx, 1);
    return true;
  });

  if (!deleted) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// Project & Direct Messages
// ----------------------------------------------------
apiRouter.get('/messages/project/:projectId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const data = db.getRawData();
  const messages = data.projectMessages.filter((m) => m.projectId === projectId);
  res.json(messages);
});

apiRouter.post('/messages/project/:projectId', requireAuth, rateLimit(30, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const { content, replyToId, audioUrl } = req.body;

  if ((!content || !content.trim()) && !audioUrl) {
    res.status(400).json({ error: 'Message content or audio is required' });
    return;
  }

  const newMsg = db.mutate((data) => {
    const msg = {
      id: 'msg_' + Date.now().toString(36),
      projectId,
      senderId: req.user!.id,
      content: content?.trim() || 'Voice Message',
      audioUrl: audioUrl || undefined,
      replyToId: replyToId || undefined,
      createdAt: new Date().toISOString(),
    };
    data.projectMessages.push(msg);
    return msg;
  });

  res.status(201).json(newMsg);
});

apiRouter.put('/messages/project/:projectId/:messageId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  if (!content || !content.trim()) {
    res.status(400).json({ error: 'Message content is required' });
    return;
  }

  const updated = db.mutate((data) => {
    const msg = data.projectMessages.find(m => m.id === messageId);
    if (!msg) return null;
    const authorId = msg.senderId || (msg as any).userId;
    if (authorId !== userId) return 'unauthorized';
    
    msg.content = content.trim();
    msg.isEdited = true;
    return msg;
  });

  if (updated === 'unauthorized') {
    res.status(403).json({ error: 'Cannot edit someone else\'s message' });
    return;
  }
  if (!updated) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  res.json(updated);
});

apiRouter.delete('/messages/project/:projectId/:messageId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.id;
  const isPrivileged = req.user!.role === 'owner' || req.user!.role === 'leader';

  const result = db.mutate((data) => {
    const idx = data.projectMessages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;
    const msg = data.projectMessages[idx];
    const authorId = msg.senderId || (msg as any).userId;
    if (authorId !== userId && !isPrivileged) return 'unauthorized';
    
    data.projectMessages.splice(idx, 1);
    return true;
  });

  if (result === 'unauthorized') {
    res.status(403).json({ error: 'Cannot delete someone else\'s message' });
    return;
  }
  if (!result) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  res.json({ success: true });
});

apiRouter.delete('/messages/:messageId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.id;
  const isPrivileged = req.user!.role === 'owner' || req.user!.role === 'leader';

  const result = db.mutate((data) => {
    const pIdx = data.projectMessages.findIndex(m => m.id === messageId);
    if (pIdx !== -1) {
      const msg = data.projectMessages[pIdx];
      const authorId = msg.senderId || (msg as any).userId;
      if (authorId !== userId && !isPrivileged) return 'unauthorized';
      data.projectMessages.splice(pIdx, 1);
      return true;
    }

    const dIdx = data.directMessages.findIndex(m => m.id === messageId);
    if (dIdx !== -1) {
      const msg = data.directMessages[dIdx];
      const authorId = msg.senderId || (msg as any).userId;
      if (authorId !== userId && msg.receiverId !== userId && !isPrivileged) return 'unauthorized';
      data.directMessages.splice(dIdx, 1);
      return true;
    }

    return null;
  });

  if (result === 'unauthorized') {
    res.status(403).json({ error: 'Cannot delete someone else\'s message' });
    return;
  }
  if (!result) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  res.json({ success: true });
});

apiRouter.get('/messages/direct/:otherUserId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { otherUserId } = req.params;
  const userId = req.user!.id;
  const data = db.getRawData();

  const messages = data.directMessages.filter(
    (m) =>
      (m.senderId === userId && m.receiverId === otherUserId) ||
      (m.senderId === otherUserId && m.receiverId === userId)
  );

  res.json(messages);
});

apiRouter.post('/messages/direct/:otherUserId', requireAuth, rateLimit(30, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { otherUserId } = req.params;
  const { content, audioUrl } = req.body;

  if ((!content || !content.trim()) && !audioUrl) {
    res.status(400).json({ error: 'Message content or audio cannot be empty' });
    return;
  }

  const newMsg = db.mutate((data) => {
    const msg = {
      id: 'dm_' + Date.now().toString(36),
      senderId: req.user!.id,
      receiverId: otherUserId,
      content: content?.trim() || 'Voice Message',
      audioUrl: audioUrl || undefined,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    data.directMessages.push(msg);

    // Notify recipient
    data.notifications.unshift({
      id: 'notif_' + Date.now().toString(36),
      userId: otherUserId,
      title: `Direct message from ${req.user!.name}`,
      message: content.trim().slice(0, 80),
      type: 'mention',
      isRead: false,
      link: `/messages?user=${req.user!.id}`,
      createdAt: new Date().toISOString(),
    });

    return msg;
  });

  res.status(201).json(newMsg);
});

apiRouter.put('/messages/direct/:otherUserId/:messageId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  if (!content || !content.trim()) {
    res.status(400).json({ error: 'Message content is required' });
    return;
  }

  const updated = db.mutate((data) => {
    const msg = data.directMessages.find(m => m.id === messageId);
    if (!msg) return null;
    const authorId = msg.senderId || (msg as any).userId;
    if (authorId !== userId) return 'unauthorized';
    
    msg.content = content.trim();
    msg.isEdited = true;
    return msg;
  });

  if (updated === 'unauthorized') {
    res.status(403).json({ error: 'Cannot edit someone else\'s message' });
    return;
  }
  if (!updated) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  res.json(updated);
});

apiRouter.delete('/messages/direct/:otherUserId/:messageId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.id;
  const isPrivileged = req.user!.role === 'owner' || req.user!.role === 'leader';

  const result = db.mutate((data) => {
    const idx = data.directMessages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;
    const msg = data.directMessages[idx];
    const authorId = msg.senderId || (msg as any).userId;
    if (authorId !== userId && msg.receiverId !== userId && !isPrivileged) return 'unauthorized';
    
    data.directMessages.splice(idx, 1);
    return true;
  });

  if (result === 'unauthorized') {
    res.status(403).json({ error: 'Cannot delete someone else\'s message' });
    return;
  }
  if (!result) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  res.json({ success: true });
});

// ----------------------------------------------------
// Analytics & Reporting
// ----------------------------------------------------
apiRouter.get('/analytics/project/:projectId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  try {
    const analytics = calculateProjectAnalytics(projectId);
    res.json(analytics);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Error generating analytics' });
  }
});

apiRouter.get('/analytics/project/:projectId/export', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  try {
    const report = generateProjectMarkdownReport(projectId);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="nexora-project-${projectId}.md"`);
    res.send(report);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Report generation failed' });
  }
});

// ----------------------------------------------------
// Notifications & Preferences
// ----------------------------------------------------
apiRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const notifs = data.notifications.filter((n) => n.userId === req.user!.id);
  res.json(notifs);
});

apiRouter.post('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  db.mutate((data) => {
    const notif = data.notifications.find((n) => n.id === id && n.userId === req.user!.id);
    if (notif) notif.isRead = true;
  });
  res.json({ success: true });
});

apiRouter.post('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  db.mutate((data) => {
    for (const notif of data.notifications) {
      if (notif.userId === req.user!.id) notif.isRead = true;
    }
  });
  res.json({ success: true });
});

apiRouter.get('/notifications/preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const prefs = data.notificationPreferences[req.user!.id] || {
    userId: req.user!.id,
    deadlineReminders: true,
    overdueAlerts: true,
    proofReviewUpdates: true,
    directMessages: true,
    projectAnnouncements: true,
    weeklySummaries: true,
  };
  res.json(prefs);
});

apiRouter.patch('/notifications/preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body;
  const updated = db.mutate((data) => {
    if (!data.notificationPreferences[req.user!.id]) {
      data.notificationPreferences[req.user!.id] = {
        userId: req.user!.id,
        deadlineReminders: true,
        overdueAlerts: true,
        proofReviewUpdates: true,
        directMessages: true,
        projectAnnouncements: true,
        weeklySummaries: true,
      };
    }
    data.notificationPreferences[req.user!.id] = {
      ...data.notificationPreferences[req.user!.id],
      ...updates,
    };
    return data.notificationPreferences[req.user!.id];
  });

  res.json(updated);
});

// ----------------------------------------------------
// Onboarding Progress
// ----------------------------------------------------
apiRouter.get('/onboarding', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const state = data.onboarding[req.user!.id] || {
    userId: req.user!.id,
    hasCompleted: req.role !== 'owner',
    dismissed: false,
    step: 'workspace',
    invitedTeammates: [],
  };
  res.json(state);
});

apiRouter.post('/onboarding/step', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { step, invitedTeammate } = req.body;
  const updated = db.mutate((data) => {
    if (!data.onboarding[req.user!.id]) {
      data.onboarding[req.user!.id] = {
        userId: req.user!.id,
        hasCompleted: false,
        dismissed: false,
        step: 'workspace',
        invitedTeammates: [],
      };
    }
    const state = data.onboarding[req.user!.id];
    if (step) state.step = step;
    if (invitedTeammate && !state.invitedTeammates.includes(invitedTeammate)) {
      state.invitedTeammates.push(invitedTeammate);
    }
    return state;
  });
  res.json(updated);
});

apiRouter.post('/onboarding/complete', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.mutate((data) => {
    if (!data.onboarding[req.user!.id]) {
      data.onboarding[req.user!.id] = {
        userId: req.user!.id,
        hasCompleted: true,
        dismissed: false,
        step: 'completed',
        invitedTeammates: [],
      };
    }
    data.onboarding[req.user!.id].hasCompleted = true;
    data.onboarding[req.user!.id].step = 'completed';
    return data.onboarding[req.user!.id];
  });
  res.json(updated);
});

apiRouter.post('/onboarding/dismiss', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.mutate((data) => {
    if (data.onboarding[req.user!.id]) {
      data.onboarding[req.user!.id].dismissed = true;
    }
    return data.onboarding[req.user!.id];
  });
  res.json(updated);
});

// ----------------------------------------------------
// File Upload & Protected Serving
// ----------------------------------------------------
apiRouter.post('/files/upload', requireAuth, rateLimit(25, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { name, mimeType, dataUrl, projectId, description, category, tags, thumbnailUrl } = req.body;

  if (!name || !dataUrl) {
    res.status(400).json({ error: 'File name and data payload are required' });
    return;
  }

  // Size limit check (approx 15MB base64)
  if (dataUrl.length > 20 * 1024 * 1024) {
    res.status(413).json({ error: 'File size exceeds 15MB limit' });
    return;
  }

  const newFile = db.mutate((data) => {
    const file = {
      id: 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: Math.round((dataUrl.length * 3) / 4),
      uploadedById: req.user!.id,
      uploadedByName: req.user!.name,
      projectId: projectId || undefined,
      dataUrl,
      thumbnailUrl: thumbnailUrl || undefined,
      description: description ? description.trim() : undefined,
      category: category || undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      createdAt: new Date().toISOString(),
    };
    data.files.unshift(file);
    return file;
  });

  if (projectId) {
    // Broadcast real-time event for project document sharing
    realtimeHub.broadcast(projectId, {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'project:file_uploaded',
      projectId,
      title: 'Project Document Shared',
      message: `${req.user!.name} shared document: "${newFile.name}"`,
      entityId: newFile.id,
      entityTitle: newFile.name,
      actorName: req.user!.name,
      timestamp: new Date().toISOString(),
    });

    logActivity({
      workspaceId: req.workspace!.id,
      projectId,
      userId: req.user!.id,
      action: 'Shared project document',
      entityType: 'resource',
      entityId: newFile.id,
      details: `Uploaded shared file: ${newFile.name} (${Math.round(newFile.sizeBytes / 1024)} KB)`,
    });
  }

  res.status(201).json({
    id: newFile.id,
    name: newFile.name,
    mimeType: newFile.mimeType,
    sizeBytes: newFile.sizeBytes,
    uploadedById: newFile.uploadedById,
    uploadedByName: newFile.uploadedByName,
    projectId: newFile.projectId,
    thumbnailUrl: newFile.thumbnailUrl,
    description: newFile.description,
    category: newFile.category,
    tags: newFile.tags,
    createdAt: newFile.createdAt,
  });
});

// List shared project files and documents
apiRouter.get('/projects/:projectId/files', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const data = db.getRawData();
  const proj = data.projects.find((p) => p.id === projectId);

  if (!proj) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const userMap = new Map(data.users.map((u) => [u.id, u.name]));
  const projectFiles = data.files
    .filter((f) => f.projectId === projectId)
    .map((f) => ({
      ...f,
      uploadedByName: f.uploadedByName || userMap.get(f.uploadedById) || 'Team Member',
    }));

  res.json(projectFiles);
});

// Upload shared document directly to a project
apiRouter.post('/projects/:projectId/files', requireAuth, rateLimit(25, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const { name, mimeType, dataUrl, description, category, tags, thumbnailUrl } = req.body;

  if (!name || !dataUrl) {
    res.status(400).json({ error: 'File name and data payload are required' });
    return;
  }

  const data = db.getRawData();
  const proj = data.projects.find((p) => p.id === projectId);
  if (!proj) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const newFile = db.mutate((d) => {
    const file = {
      id: 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: Math.round((dataUrl.length * 3) / 4),
      uploadedById: req.user!.id,
      uploadedByName: req.user!.name,
      projectId,
      dataUrl,
      thumbnailUrl: thumbnailUrl || undefined,
      description: description ? description.trim() : undefined,
      category: category || undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      createdAt: new Date().toISOString(),
    };
    d.files.unshift(file);
    return file;
  });

  // Broadcast real-time event for project document sharing
  realtimeHub.broadcast(projectId, {
    id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'project:file_uploaded',
    projectId,
    title: 'Project Document Shared',
    message: `${req.user!.name} shared document: "${newFile.name}"`,
    entityId: newFile.id,
    entityTitle: newFile.name,
    actorName: req.user!.name,
    timestamp: new Date().toISOString(),
  });

  logActivity({
    workspaceId: req.workspace!.id,
    projectId,
    userId: req.user!.id,
    action: 'Shared project document',
    entityType: 'resource',
    entityId: newFile.id,
    details: `Uploaded shared file: ${newFile.name} (${Math.round(newFile.sizeBytes / 1024)} KB)`,
  });

  res.status(201).json(newFile);
});

// Delete shared project document
apiRouter.delete('/projects/:projectId/files/:fileId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId, fileId } = req.params;
  const user = req.user!;
  const role = req.role!;

  const deleted = db.mutate((data) => {
    const idx = data.files.findIndex((f) => f.id === fileId && f.projectId === projectId);
    if (idx === -1) return null;

    const file = data.files[idx];
    if (role !== 'owner' && role !== 'leader' && file.uploadedById !== user.id) {
      return 'FORBIDDEN';
    }

    data.files.splice(idx, 1);
    return file;
  });

  if (deleted === 'FORBIDDEN') {
    res.status(403).json({ error: 'Permission denied to delete this document' });
    return;
  }

  if (!deleted) {
    res.status(404).json({ error: 'File not found in project' });
    return;
  }

  logActivity({
    workspaceId: req.workspace!.id,
    projectId,
    userId: user.id,
    action: 'Deleted shared project document',
    entityType: 'resource',
    entityId: fileId,
    details: `Deleted file: ${(deleted as any).name}`,
  });

  res.json({ success: true, deletedId: fileId });
});

apiRouter.get('/files/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getRawData();
  const file = data.files.find((f) => f.id === id);

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Access check: uploader, workspace owner, or project member
  const user = req.user!;
  const role = req.role!;
  if (role !== 'owner' && file.uploadedById !== user.id) {
    if (file.projectId) {
      const proj = data.projects.find((p) => p.id === file.projectId);
      if (proj && !proj.memberIds.includes(user.id)) {
        res.status(403).json({ error: 'Access denied to this file' });
        return;
      }
    }
  }

  res.json(file);
});

// ----------------------------------------------------
// Project Team Invitation Module
// ----------------------------------------------------

// Create Team Invitation(s) for a Project
apiRouter.post('/projects/:projectId/invitations', requireAuth, rateLimit(20, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const { email, emails, role = 'member', customNote, expiresInDays = 7 } = req.body;
  const user = req.user!;
  const userRole = req.role!;

  const data = db.getRawData();
  const proj = data.projects.find((p) => p.id === projectId);
  if (!proj) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Permission check: workspace owner, team leader, project leader/co-leader, or member if allowed
  const isLeader = proj.leaderId === user.id || proj.coLeaderId === user.id;
  const isWorkspaceOwner = userRole === 'owner';
  const allowMemberInvites = data.workspaces[0]?.settings?.allowMemberInvites ?? true;

  if (!isLeader && !isWorkspaceOwner && !allowMemberInvites) {
    res.status(403).json({ error: 'Only project leaders or workspace owners can issue project invitations' });
    return;
  }

  // Parse email list
  const targetEmails: string[] = [];
  if (Array.isArray(emails) && emails.length > 0) {
    emails.forEach((e: string) => {
      const clean = e.trim().toLowerCase();
      if (clean && !targetEmails.includes(clean)) targetEmails.push(clean);
    });
  } else if (email && typeof email === 'string' && email.trim()) {
    targetEmails.push(email.trim().toLowerCase());
  }

  const createdInvitations: ProjectInvitation[] = [];
  const expiresAt = expiresInDays > 0 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  db.mutate((d) => {
    // If targetEmails is empty, create a single shareable link invite
    const inviteList = targetEmails.length > 0 ? targetEmails : [undefined];

    for (const targetEmail of inviteList) {
      const token = 'inv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
      const inv: ProjectInvitation = {
        id: 'inv_id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        token,
        projectId,
        projectTitle: proj.title,
        workspaceId: proj.workspaceId,
        invitedByUserId: user.id,
        invitedByUserName: user.name,
        invitedByUserEmail: user.email,
        email: targetEmail,
        role: role as UserRole,
        status: 'pending',
        customNote: customNote ? customNote.trim() : undefined,
        expiresAt,
        createdAt: new Date().toISOString(),
      };
      d.projectInvitations.unshift(inv);
      createdInvitations.push(inv);

      // If target user exists in workspace, notify them immediately
      if (targetEmail) {
        const existingUser = d.users.find((u) => u.email.toLowerCase() === targetEmail);
        if (existingUser) {
          d.notifications.unshift({
            id: 'notif_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
            userId: existingUser.id,
            title: `Invitation to Join Project "${proj.title}"`,
            message: `${user.name} invited you to join "${proj.title}" as a ${role}.`,
            type: 'mention',
            isRead: false,
            link: `#invite/${token}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  });

  logActivity({
    workspaceId: proj.workspaceId,
    projectId,
    userId: user.id,
    action: 'Created project invitations',
    entityType: 'project',
    entityId: projectId,
    details: `Issued ${createdInvitations.length} invitation(s) for ${proj.title} (Role: ${role})`,
  });

  const primaryToken = createdInvitations[0]?.token;
  res.json({
    invitations: createdInvitations,
    primaryToken,
    shareableUrl: `${req.protocol}://${req.get('host')}/#invite/${primaryToken}`,
  });
});

// Get all invitations for a project
apiRouter.get('/projects/:projectId/invitations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const data = db.getRawData();
  const proj = data.projects.find((p) => p.id === projectId);
  if (!proj) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const projectInvitations = data.projectInvitations
    .filter((inv) => inv.projectId === projectId)
    .map((inv) => {
      // Check if expired
      if (inv.status === 'pending' && inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
        return { ...inv, status: 'expired' as const };
      }
      return inv;
    });

  res.json({ invitations: projectInvitations });
});

// Revoke a project invitation
apiRouter.delete('/projects/:projectId/invitations/:invitationId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId, invitationId } = req.params;
  const user = req.user!;
  
  let revoked = false;
  db.mutate((d) => {
    const inv = d.projectInvitations.find((i) => i.id === invitationId && i.projectId === projectId);
    if (inv) {
      inv.status = 'revoked';
      revoked = true;
    }
  });

  if (!revoked) {
    res.status(404).json({ error: 'Invitation not found' });
    return;
  }

  logActivity({
    workspaceId: req.workspace!.id,
    projectId,
    userId: user.id,
    action: 'Revoked project invitation',
    entityType: 'project',
    entityId: projectId,
    details: `Revoked invitation ID: ${invitationId}`,
  });

  res.json({ success: true });
});

// Get public/authenticated details of an invitation by token
apiRouter.get('/invitations/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const data = db.getRawData();
  const inv = data.projectInvitations.find((i) => i.token === token);

  if (!inv) {
    res.status(404).json({ error: 'Invitation not found or link has expired' });
    return;
  }

  const proj = data.projects.find((p) => p.id === inv.projectId);
  if (!proj) {
    res.status(404).json({ error: 'Project no longer exists' });
    return;
  }

  const inviter = data.users.find((u) => u.id === inv.invitedByUserId);
  const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
  const effectiveStatus = (inv.status === 'pending' && isExpired) ? 'expired' : inv.status;

  res.json({
    invitation: { ...inv, status: effectiveStatus },
    project: {
      id: proj.id,
      title: proj.title,
      description: proj.description,
      status: proj.status,
      accentColor: proj.accentColor,
      memberCount: proj.memberIds.length,
      deadline: proj.deadline,
    },
    inviter: inviter ? {
      name: inviter.name,
      email: inviter.email,
      role: inviter.role,
      title: inviter.title,
    } : { name: inv.invitedByUserName || 'Project Leader' },
  });
});

// Accept an invitation
apiRouter.post('/invitations/:token/accept', requireAuth, rateLimit(15, 60000), (req: AuthenticatedRequest, res: Response) => {
  const { token } = req.params;
  const user = req.user!;

  const data = db.getRawData();
  const inv = data.projectInvitations.find((i) => i.token === token);

  if (!inv) {
    res.status(404).json({ error: 'Invitation link is invalid' });
    return;
  }

  if (inv.status === 'revoked') {
    res.status(400).json({ error: 'This invitation has been revoked by the project leader' });
    return;
  }

  if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
    res.status(400).json({ error: 'This invitation link has expired' });
    return;
  }

  const proj = data.projects.find((p) => p.id === inv.projectId);
  if (!proj) {
    res.status(404).json({ error: 'Associated project was not found' });
    return;
  }

  // Verify email match if invite was sent to a specific email
  if (inv.email && inv.email.toLowerCase() !== user.email.toLowerCase()) {
    res.status(400).json({
      error: `This invitation was issued specifically for ${inv.email}. You are currently signed in as ${user.email}.`
    });
    return;
  }

  db.mutate((d) => {
    // 1. Add user to project memberIds if not present
    const projectInDb = d.projects.find((p) => p.id === proj.id);
    if (projectInDb) {
      if (!projectInDb.memberIds.includes(user.id)) {
        projectInDb.memberIds.push(user.id);
      }
      if (inv.role === 'co-leader' && !projectInDb.coLeaderId) {
        projectInDb.coLeaderId = user.id;
      }
    }

    // 2. Add user to associated team if applicable
    if (proj.teamId) {
      const teamInDb = d.teams.find((t) => t.id === proj.teamId);
      if (teamInDb && !teamInDb.memberIds.includes(user.id)) {
        teamInDb.memberIds.push(user.id);
      }
    }

    // 3. Update invitation record
    const invInDb = d.projectInvitations.find((i) => i.token === token);
    if (invInDb) {
      invInDb.status = 'accepted';
      invInDb.acceptedByUserId = user.id;
      invInDb.acceptedAt = new Date().toISOString();
    }

    // 4. Send notification to project leader
    if (proj.leaderId) {
      d.notifications.unshift({
        id: 'notif_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        userId: proj.leaderId,
        title: 'New Member Joined Project',
        message: `${user.name} accepted the invitation and joined "${proj.title}" as ${inv.role}.`,
        type: 'mention',
        isRead: false,
        link: `project/${proj.id}`,
        createdAt: new Date().toISOString(),
      });
    }
  });

  logActivity({
    workspaceId: proj.workspaceId,
    projectId: proj.id,
    userId: user.id,
    action: 'Accepted project invitation',
    entityType: 'project',
    entityId: proj.id,
    details: `${user.name} joined project "${proj.title}" via invitation`,
  });

  // Broadcast real-time update
  realtimeHub.broadcast(proj.id, {
    id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'project:member_assigned',
    projectId: proj.id,
    title: 'New Member Joined Project',
    message: `${user.name} joined the project team!`,
    memberId: user.id,
    memberName: user.name,
    actorName: user.name,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    projectId: proj.id,
    projectTitle: proj.title,
    message: `You have successfully joined ${proj.title}!`,
  });
});

// ----------------------------------------------------
// Audit Trail
// ----------------------------------------------------
apiRouter.get('/audit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const events = data.activityEvents.slice(0, 100);
  res.json(events);
});

// ----------------------------------------------------
// System Reset (Strictly restricted: Leader and Owner only. Not even co-leader or members)
// ----------------------------------------------------
apiRouter.post(
  '/reset-data',
  requireAuth,
  requireRole([ROLES.OWNER, ROLES.LEADER]),
  (req: AuthenticatedRequest, res: Response) => {
    if (req.role !== ROLES.OWNER && req.role !== ROLES.LEADER) {
      res.status(403).json({ error: 'Forbidden: Only workspace leaders have the ability to reset all data.' });
      return;
    }

    db.resetToDefaults();

    logActivity({
      workspaceId: req.workspace?.id || 'ws_default',
      userId: req.user!.id,
      action: 'Reset System Data',
      entityType: 'setting',
      entityId: 'system_reset',
      details: `${req.user!.name} (${req.role}) executed full workspace reset to seed fixtures`,
    });

    res.json({ success: true, message: 'All workspace data has been reset to defaults.' });
  }
);
