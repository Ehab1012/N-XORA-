import {
  User,
  UserProfileDetails,
  Workspace,
  Team,
  Project,
  ProjectExpenseItem,
  Task,
  Milestone,
  ProofSubmission,
  ResourceItem,
  ProjectMessage,
  DirectMessage,
  NotificationItem,
  NotificationPreferences,
  ActivityEvent,
  ProjectAnalytics,
  OnboardingState,
  UserRole,
  RealtimeEventPayload,
  StoredFile,
  ProjectInvitation,
} from '../../shared/types.js';

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('nexora_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.statusText}`;
    let code: string | undefined;
    try {
      const body = await response.json();
      if (body.error) errorMsg = body.error;
      if (body.code) code = body.code;
    } catch {
      // ignore json parse error
    }
    throw new ApiError(errorMsg, response.status, code);
  }

  // If download attachment or text
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/markdown')) {
    return (await response.text()) as unknown as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  async getMe(): Promise<{ authenticated: boolean; user?: User; workspace?: Workspace; role?: UserRole; availableUsers?: Array<{ id: string; name: string; email: string; role: UserRole; title?: string }> }> {
    return request('/api/auth/me');
  },

  async login(email: string): Promise<{ token: string; user: User; workspace: Workspace; role: UserRole }> {
    const res = await request<{ token: string; user: User; workspace: Workspace; role: UserRole }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    localStorage.setItem('nexora_token', res.token);
    return res;
  },

  async register(payload: { name: string; email: string; title?: string; role?: UserRole; department?: string; password?: string }): Promise<{ token: string; user: User; workspace: Workspace; role: UserRole }> {
    const res = await request<{ token: string; user: User; workspace: Workspace; role: UserRole }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('nexora_token', res.token);
    return res;
  },

  async simulateOAuth(provider: string, state: string, userId?: string): Promise<{ token: string; user: User; workspace: Workspace; role: UserRole }> {
    const res = await request<{ token: string; user: User; workspace: Workspace; role: UserRole }>('/api/auth/oauth/simulate', {
      method: 'POST',
      body: JSON.stringify({ provider, state, userId }),
    });
    localStorage.setItem('nexora_token', res.token);
    return res;
  },

  async switchRole(targetUserId: string): Promise<{ token: string; user: User; workspace: Workspace; role: UserRole }> {
    const res = await request<{ token: string; user: User; workspace: Workspace; role: UserRole }>('/api/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
    localStorage.setItem('nexora_token', res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('nexora_token');
    }
  },

  // Workspace
  async getWorkspace(): Promise<Workspace> {
    return request('/api/workspaces/current');
  },

  async updateWorkspaceSettings(payload: { name?: string; settings?: Partial<Workspace['settings']> }): Promise<Workspace> {
    return request('/api/workspaces/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Teams
  async getTeams(): Promise<Team[]> {
    return request('/api/teams');
  },

  async createTeam(team: Partial<Team>): Promise<Team> {
    return request('/api/teams', {
      method: 'POST',
      body: JSON.stringify(team),
    });
  },

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    return request(`/api/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async addTeamMember(teamId: string, payload: { userId?: string; email?: string }): Promise<Team> {
    return request(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async removeTeamMember(teamId: string, userId: string): Promise<Team> {
    return request(`/api/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  async deleteTeam(teamId: string): Promise<{ success: boolean; deletedId: string; message: string }> {
    return request(`/api/teams/${teamId}`, {
      method: 'DELETE',
    });
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    return request('/api/projects');
  },

  async getProject(id: string): Promise<Project> {
    return request(`/api/projects/${id}`);
  },

  async createProject(project: Partial<Project>): Promise<Project> {
    return request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return request(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteProject(id: string): Promise<{ success: boolean }> {
    return request(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async addProjectExpense(
    projectId: string,
    expense: {
      title: string;
      cost: number;
      category?: string;
      date?: string;
      status?: 'bought' | 'completed' | 'planned';
      vendor?: string;
      notes?: string;
    }
  ): Promise<{ project: Project; expenseItem: ProjectExpenseItem }> {
    return request(`/api/projects/${projectId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  async deleteProjectExpense(
    projectId: string,
    expenseId: string
  ): Promise<{ success: boolean; project: Project }> {
    return request(`/api/projects/${projectId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  async assignProjectMember(projectId: string, userId: string): Promise<Project> {
    return request(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, action: 'add' }),
    });
  },

  async removeProjectMember(projectId: string, userId: string): Promise<Project> {
    return request(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, action: 'remove' }),
    });
  },

  async simulateRealtimeEvent(
    projectId: string,
    params: { type?: 'status_change' | 'member_assignment'; memberId?: string; newStatus?: string }
  ): Promise<{ success: boolean; event: RealtimeEventPayload }> {
    return request(`/api/projects/${projectId}/simulate-event`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getRecentProjectEvents(projectId: string): Promise<RealtimeEventPayload[]> {
    return request(`/api/projects/${projectId}/recent-events`);
  },

  // Tasks
  async getTasks(projectId?: string): Promise<Task[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return request(`/api/tasks${query}`);
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    return request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    return request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async submitGroupTaskPart(
    taskId: string,
    payload: { note?: string; proofLinks?: string[] }
  ): Promise<{ success: boolean; task: Task; pointsAwarded: number; allMembersSubmitted: boolean; bonusAwarded: boolean; message: string }> {
    return request(`/api/tasks/${taskId}/group-submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async completeGroupTask(
    taskId: string
  ): Promise<{ success: boolean; task: Task; bonusPointsAwarded: number; message: string }> {
    return request(`/api/tasks/${taskId}/group-complete`, {
      method: 'POST',
    });
  },

  async reviewGroupTaskSubmission(
    taskId: string,
    payload: { userId: string; action: 'approved' | 'rejected' | 'changes_requested'; reviewNote?: string }
  ): Promise<{ success: boolean; task: Task }> {
    return request(`/api/tasks/${taskId}/group-review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Milestones
  async getMilestones(projectId?: string): Promise<Milestone[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return request(`/api/milestones${query}`);
  },

  async createMilestone(milestone: Partial<Milestone>): Promise<Milestone> {
    return request('/api/milestones', {
      method: 'POST',
      body: JSON.stringify(milestone),
    });
  },

  async updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone> {
    return request(`/api/milestones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Proofs
  async getProofs(projectId?: string, taskId?: string): Promise<ProofSubmission[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (taskId) params.append('taskId', taskId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/proofs${query}`);
  },

  async submitProof(payload: {
    taskId: string;
    projectId: string;
    explanation: string;
    links?: string[];
    attachmentIds?: string[];
  }): Promise<ProofSubmission> {
    return request('/api/proofs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async reviewProof(proofId: string, action: 'approved' | 'rejected' | 'changes_requested', reason: string): Promise<ProofSubmission> {
    return request(`/api/proofs/${proofId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  },

  // Resources
  async getResources(projectId?: string): Promise<ResourceItem[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return request(`/api/resources${query}`);
  },

  async createResource(resource: Partial<ResourceItem>): Promise<ResourceItem> {
    return request('/api/resources', {
      method: 'POST',
      body: JSON.stringify(resource),
    });
  },

  async deleteResource(id: string): Promise<{ success: boolean }> {
    return request(`/api/resources/${id}`, { method: 'DELETE' });
  },

  // Messages
  async getProjectMessages(projectId: string): Promise<ProjectMessage[]> {
    return request(`/api/messages/project/${projectId}`);
  },

  async postProjectMessage(projectId: string, content: string, replyToId?: string, audioUrl?: string): Promise<ProjectMessage> {
    return request(`/api/messages/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ content, replyToId, audioUrl }),
    });
  },

  async editProjectMessage(projectId: string, messageId: string, content: string): Promise<ProjectMessage> {
    return request(`/api/messages/project/${projectId}/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  async deleteProjectMessage(projectId: string, messageId: string): Promise<void> {
    return request(`/api/messages/project/${projectId}/${messageId}`, {
      method: 'DELETE',
    });
  },

  async getDirectMessages(otherUserId: string): Promise<DirectMessage[]> {
    return request(`/api/messages/direct/${otherUserId}`);
  },

  async sendDirectMessage(otherUserId: string, content: string, audioUrl?: string): Promise<DirectMessage> {
    return request(`/api/messages/direct/${otherUserId}`, {
      method: 'POST',
      body: JSON.stringify({ content, audioUrl }),
    });
  },

  async editDirectMessage(otherUserId: string, messageId: string, content: string): Promise<DirectMessage> {
    return request(`/api/messages/direct/${otherUserId}/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  async deleteDirectMessage(otherUserId: string, messageId: string): Promise<void> {
    return request(`/api/messages/direct/${otherUserId}/${messageId}`, {
      method: 'DELETE',
    });
  },

  // Analytics
  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    return request(`/api/analytics/project/${projectId}`);
  },

  async exportProjectReport(projectId: string): Promise<string> {
    return request(`/api/analytics/project/${projectId}/export`);
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    return request('/api/notifications');
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return request(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return request('/api/notifications/read-all', { method: 'POST' });
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return request('/api/notifications/preferences');
  },

  async updateNotificationPreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return request('/api/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  },

  // Onboarding
  async getOnboarding(): Promise<OnboardingState> {
    return request('/api/onboarding');
  },

  async updateOnboardingStep(step: string, invitedTeammate?: string): Promise<OnboardingState> {
    return request('/api/onboarding/step', {
      method: 'POST',
      body: JSON.stringify({ step, invitedTeammate }),
    });
  },

  async completeOnboarding(): Promise<OnboardingState> {
    return request('/api/onboarding/complete', { method: 'POST' });
  },

  async dismissOnboarding(): Promise<OnboardingState> {
    return request('/api/onboarding/dismiss', { method: 'POST' });
  },

  // File Upload & Shared Documents
  async uploadFile(name: string, mimeType: string, dataUrl: string, projectId?: string): Promise<{ id: string; name: string; sizeBytes: number }> {
    return request('/api/files/upload', {
      method: 'POST',
      body: JSON.stringify({ name, mimeType, dataUrl, projectId }),
    });
  },

  async getProjectFiles(projectId: string): Promise<StoredFile[]> {
    return request(`/api/projects/${projectId}/files`);
  },

  async uploadProjectFile(
    projectId: string,
    fileData: {
      name: string;
      mimeType: string;
      dataUrl: string;
      thumbnailUrl?: string;
      description?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<StoredFile> {
    return request(`/api/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify(fileData),
    });
  },

  async getFileById(fileId: string): Promise<StoredFile> {
    return request(`/api/files/${fileId}`);
  },

  async deleteProjectFile(projectId: string, fileId: string): Promise<{ success: boolean }> {
    return request(`/api/projects/${projectId}/files/${fileId}`, {
      method: 'DELETE',
    });
  },

  // Member Profiles
  async getUsers(): Promise<User[]> {
    return request('/api/users');
  },

  async getUserProfile(userId: string): Promise<UserProfileDetails> {
    return request(`/api/users/${userId}`);
  },

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    return request(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async updateUserRank(userId: string, role: UserRole): Promise<{ user: User; previousRole: UserRole; newRole: UserRole; message: string }> {
    return request(`/api/users/${userId}/rank`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  async deleteUser(userId: string): Promise<{ success: boolean; deletedId: string }> {
    return request(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Audit
  async getAuditLogs(): Promise<ActivityEvent[]> {
    return request('/api/audit');
  },

  // AI Co-Pilot (Gemini Multi-Turn Chat)
  async chatWithAI(params: {
    messages: Array<{ role: 'user' | 'model' | 'assistant'; content: string }>;
    systemInstruction?: string;
    modelType?: 'pro' | 'flash' | 'fast';
    projectId?: string;
  }): Promise<{ reply: string; timestamp: string }> {
    return request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Project Team Invitation Module
  async createProjectInvitations(
    projectId: string,
    payload: { email?: string; emails?: string[]; role?: UserRole; customNote?: string; expiresInDays?: number }
  ): Promise<{ invitations: ProjectInvitation[]; primaryToken: string; shareableUrl: string }> {
    return request(`/api/projects/${projectId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getProjectInvitations(projectId: string): Promise<{ invitations: ProjectInvitation[] }> {
    return request(`/api/projects/${projectId}/invitations`);
  },

  async revokeProjectInvitation(projectId: string, invitationId: string): Promise<{ success: boolean }> {
    return request(`/api/projects/${projectId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  },

  async getInvitationByToken(token: string): Promise<{
    invitation: ProjectInvitation;
    project: { id: string; title: string; description: string; status: string; accentColor: string; memberCount: number; deadline: string };
    inviter: { name: string; email?: string; role?: string; title?: string };
  }> {
    return request(`/api/invitations/${token}`);
  },

  async acceptProjectInvitation(token: string): Promise<{ success: boolean; projectId: string; projectTitle: string; message: string }> {
    return request(`/api/invitations/${token}/accept`, {
      method: 'POST',
    });
  },
};
