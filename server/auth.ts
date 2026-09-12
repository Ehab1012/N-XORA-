import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { User, Workspace, UserRole } from '../shared/types.js';
import { ROLES } from '../shared/const.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  workspace?: Workspace;
  role?: UserRole;
  sessionId?: string;
}

// In-memory rate limiting map: ip -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(limit: number = 60, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      res.status(429).json({
        error: 'Too many requests. Please wait before retrying.',
        retryAfterMs: entry.resetAt - now,
      });
      return;
    }

    entry.count += 1;
    next();
  };
}

export function createSession(userId: string, workspaceId: string = 'ws_default'): string {
  const token = 'nexora_sess_' + crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days

  db.mutate((data) => {
    if (!data.sessions) data.sessions = {};
    data.sessions[token] = { userId, workspaceId, expiresAt };
  });

  return token;
}

export function destroySession(token: string): boolean {
  return db.mutate((data) => {
    if (data.sessions && data.sessions[token]) {
      delete data.sessions[token];
      return true;
    }
    return false;
  });
}

export function getSession(token: string): { user: User; workspace: Workspace; role: UserRole } | null {
  const data = db.getRawData();
  const sess = data.sessions?.[token];
  if (!sess) return null;

  if (Date.now() > sess.expiresAt) {
    destroySession(token);
    return null;
  }

  const user = data.users.find((u) => u.id === sess.userId);
  const workspace = data.workspaces.find((w) => w.id === sess.workspaceId);
  if (!user || !workspace) return null;

  const membership = data.workspaceMemberships.find(
    (m) => m.workspaceId === workspace.id && m.userId === user.id
  );
  const role: UserRole = membership?.role || user.role || 'member';

  return { user, workspace, role };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check Bearer token in header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Check cookie if available
  if (!token && req.cookies && req.cookies.nexora_session) {
    token = req.cookies.nexora_session;
  }

  // 3. Check query parameter (essential for browser EventSource SSE)
  if (!token && req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (token) {
    const session = getSession(token);
    if (session) {
      req.user = session.user;
      req.workspace = session.workspace;
      req.role = session.role;
      req.sessionId = token;
    }
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.workspace) {
    res.status(401).json({
      error: 'Unauthenticated. Sign in to access this resource.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.role) {
      res.status(401).json({ error: 'Unauthenticated', code: 'UNAUTHENTICATED' });
      return;
    }

    if (!allowedRoles.includes(req.role)) {
      res.status(403).json({
        error: `Unauthorized. Required role: [${allowedRoles.join(', ')}], current role: ${req.role}`,
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}

export function logActivity(params: {
  workspaceId: string;
  userId: string;
  action: string;
  entityType: 'project' | 'task' | 'milestone' | 'proof' | 'team' | 'resource' | 'setting' | 'auth';
  entityId: string;
  details: string;
  projectId?: string;
}) {
  db.mutate((data) => {
    const event = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      createdAt: new Date().toISOString(),
    };
    data.activityEvents.unshift(event);
    // Keep max 500 events
    if (data.activityEvents.length > 500) {
      data.activityEvents = data.activityEvents.slice(0, 500);
    }
  });
}
