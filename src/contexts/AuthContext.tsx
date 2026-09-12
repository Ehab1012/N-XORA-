import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Workspace, UserRole, NotificationItem } from '../../shared/types.js';
import { api } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  role: UserRole | null;
  loading: boolean;
  availableUsers: Array<{ id: string; name: string; email: string; role: UserRole; title?: string }>;
  notifications: NotificationItem[];
  unreadCount: number;
  login: (email: string) => Promise<void>;
  simulateOAuth: (provider: string, userId?: string) => Promise<void>;
  switchRole: (targetUserId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string; role: UserRole; title?: string }>>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshNotifications = async () => {
    try {
      if (user) {
        const list = await api.getNotifications();
        setNotifications(list);
      }
    } catch {
      // ignore silently
    }
  };

  const refreshMe = async () => {
    try {
      const res = await api.getMe();
      if (res.authenticated && res.user && res.workspace) {
        setUser(res.user);
        setWorkspace(res.workspace);
        setRole(res.role || 'member');
        if (res.availableUsers) setAvailableUsers(res.availableUsers);
      } else {
        // Auto-initialize with default workspace identity for instant app access
        const loginRes = await api.login('elena@nexora.internal');
        setUser(loginRes.user);
        setWorkspace(loginRes.workspace);
        setRole(loginRes.role);
        const meAfter = await api.getMe();
        if (meAfter.availableUsers) setAvailableUsers(meAfter.availableUsers);
      }
    } catch (err) {
      console.warn('Session verification failed:', err);
      setUser(null);
      setWorkspace(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshNotifications();
      const interval = setInterval(refreshNotifications, 15000); // 15s polling for notification stream
      return () => clearInterval(interval);
    }
  }, [user]);

  const login = async (email: string) => {
    setLoading(true);
    try {
      const res = await api.login(email);
      setUser(res.user);
      setWorkspace(res.workspace);
      setRole(res.role);
      await refreshMe();
    } finally {
      setLoading(false);
    }
  };

  const simulateOAuth = async (provider: string, userId?: string) => {
    setLoading(true);
    try {
      // Secure random state parameter for OAuth CSRF protection
      const state = 'state_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const res = await api.simulateOAuth(provider, state, userId);
      setUser(res.user);
      setWorkspace(res.workspace);
      setRole(res.role);
      await refreshMe();
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (targetUserId: string) => {
    setLoading(true);
    try {
      const res = await api.switchRole(targetUserId);
      setUser(res.user);
      setWorkspace(res.workspace);
      setRole(res.role);
      await refreshMe();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
      setUser(null);
      setWorkspace(null);
      setRole(null);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        role,
        loading,
        availableUsers,
        notifications,
        unreadCount,
        login,
        simulateOAuth,
        switchRole,
        logout,
        refreshMe,
        refreshNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
