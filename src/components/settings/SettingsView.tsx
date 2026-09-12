import React, { useState, useEffect } from 'react';
import {
  Settings,
  Bell,
  Shield,
  History,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Save,
  Moon,
  Sun,
  Palette,
  Check,
  Sparkles,
  Camera,
  User as UserIcon,
} from 'lucide-react';
import { NotificationPreferences, ActivityEvent, Workspace } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme, THEME_OPTIONS } from '../../contexts/ThemeContext.js';
import { RoleBadge } from '../common/Badges.js';
import { ConfirmModal } from '../common/Modal.js';
import { AvatarPickerModal } from '../profile/AvatarPickerModal.js';

export function SettingsView() {
  const { user, workspace, role, refreshMe } = useAuth();
  const { currentTheme, setTheme, themeConfig } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [auditLogs, setAuditLogs] = useState<ActivityEvent[]>([]);
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');
  const [requireApproval, setRequireApproval] = useState(workspace?.settings.requireProofApproval ?? true);
  const [strictIDOR, setStrictIDOR] = useState(workspace?.settings.strictIdorChecks ?? true);

  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingWs, setSavingWs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getNotificationPreferences(),
      api.getAuditLogs(),
    ]).then(([p, logs]) => {
      setPrefs(p);
      setAuditLogs(logs);
    });
  }, []);

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSavingPrefs(true);
    try {
      await api.updateNotificationPreferences({ [key]: updated[key] });
      setSaveSuccess('Notification preferences saved');
      setTimeout(() => setSaveSuccess(null), 3000);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSaveWorkspaceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'owner') return;

    setSavingWs(true);
    try {
      await api.updateWorkspaceSettings({
        name: workspaceName,
        settings: {
          requireProofApproval: requireApproval,
          strictIdorChecks: strictIDOR,
        },
      });
      await refreshMe();
      setSaveSuccess('Workspace governance settings updated');
      setTimeout(() => setSaveSuccess(null), 3000);
    } finally {
      setSavingWs(false);
    }
  };

  const handleResetDefaults = async () => {
    await fetch('/api/reset-data', { method: 'POST' });
    window.location.reload();
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-100 tracking-tight">
          Settings & Governance
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage identity credentials, delivery alerts, workspace policies, and audit logs.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-500/40 text-teal-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* User Identity Card */}
      <div className="glass-panel p-6 rounded-2xl border border-[#202444] space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                onClick={() => setIsAvatarPickerOpen(true)}
                className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${themeConfig.gradient} p-[2px] shadow-lg cursor-pointer overflow-hidden`}
              >
                <div className="w-full h-full bg-[#0d0f1e] rounded-[14px] flex items-center justify-center text-white font-bold text-2xl font-display overflow-hidden relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    user?.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                    <Camera className="w-4 h-4 text-blue-300" />
                    <span className="text-[8px] font-mono tracking-tighter mt-0.5 text-blue-200">Edit</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(true)}
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors"
                title="Change profile picture"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-display font-semibold text-slate-100">
                  {user?.name}
                </h3>
                <RoleBadge role={role || 'member'} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user?.title || 'Active Platform Contributor'} • {user?.department || 'Engineering'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAvatarPickerOpen(true)}
            className="glow-btn-primary px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Change Profile Picture</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2 border-t border-[#1f223f]">
          <div className="p-3.5 rounded-xl bg-[#0e101c] border border-[#1f223f]">
            <span className="text-slate-500 font-mono block mb-1">Full Name</span>
            <span className="font-semibold text-slate-200 text-sm">{user?.name}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0e101c] border border-[#1f223f]">
            <span className="text-slate-500 font-mono block mb-1">Workspace Email</span>
            <span className="font-mono text-purple-300 text-sm">{user?.email}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0e101c] border border-[#1f223f]">
            <span className="text-slate-500 font-mono block mb-1">Enforced Role</span>
            <div className="mt-1">
              <RoleBadge role={role || 'member'} />
            </div>
          </div>
        </div>
      </div>

      {/* Display & Theme Palette Customization */}
      <div className="glass-panel p-6 rounded-2xl border border-[#202444] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-display font-semibold text-slate-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            <span>Workspace Theme & Color Palette</span>
          </h3>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Active Theme: {THEME_OPTIONS.find((t) => t.id === currentTheme)?.name}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Customize the aesthetic lighting, canvas contrast, and neon accent colors across your workspace.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {THEME_OPTIONS.map((t) => {
            const isSelected = currentTheme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#151c33] border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.18)] ring-1 ring-cyan-500/50 scale-[1.01]'
                    : 'bg-[#0e101c] border-[#1f223f] hover:border-slate-600 hover:bg-[#121526]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/20 flex items-center justify-center shadow-md shrink-0"
                        style={{ backgroundColor: t.previewBg }}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full shadow-sm"
                          style={{ backgroundColor: t.accentColor }}
                        />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 text-xs block">
                          {t.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {t.isDark ? 'Dark Theme' : 'Light Theme'}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-white shadow-sm">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#1c1f38] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: t.accentColor }}
                    />
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {t.accentColor}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500'
                    }`}
                  >
                    {isSelected ? 'Applied' : 'Select'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="glass-panel p-6 rounded-2xl border border-[#202444] space-y-4">
        <h3 className="text-base font-display font-semibold text-slate-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-400" />
          <span>Notification & In-App Alert Channels</span>
        </h3>

        {prefs ? (
          <div className="space-y-3 text-xs">
            {[
              {
                key: 'proofReviewUpdates',
                title: 'Proof Review Outcomes',
                desc: 'Alert when deliverables you submitted are approved, rejected, or revised.',
              },
              {
                key: 'deadlineReminders',
                title: 'Deadline Approaching Warnings',
                desc: 'Alert 72 hours before task and milestone due dates.',
              },
              {
                key: 'overdueAlerts',
                title: 'Overdue Task Escalate Alerts',
                desc: 'Notify leaders when a task crosses its scheduled target date.',
              },
              {
                key: 'directMessages',
                title: 'Direct Messages & Mentions',
                desc: 'Notify immediately when colleagues ping you directly.',
              },
              {
                key: 'weeklySummaries',
                title: 'Weekly Executive Merit Digest',
                desc: 'Digest of verified accomplishments and calculated points.',
              },
            ].map((item) => {
              const isChecked = !!(prefs as any)[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => handleTogglePref(item.key as any)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#0e101c] border border-[#1f223f] hover:border-purple-500/30 cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="font-semibold text-slate-200">{item.title}</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600 pointer-events-none"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-slate-500 text-xs font-mono">Loading preferences...</div>
        )}
      </div>

      {/* Workspace Governance (Owner Only) */}
      {role === 'owner' && (
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 space-y-4">
          <h3 className="text-base font-display font-semibold text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Workspace Security Governance (Owner Only)</span>
          </h3>

          <form onSubmit={handleSaveWorkspaceSettings} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Workspace Name</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="rounded text-purple-600 accent-purple-600"
                />
                <span className="text-slate-200">
                  Mandate Lead Attestation for all task completions (Requires approved proof)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strictIDOR}
                  onChange={(e) => setStrictIDOR(e.target.checked)}
                  className="rounded text-purple-600 accent-purple-600"
                />
                <span className="text-slate-200">
                  Strict Zero-Trust Object-Level Access Control (Blocks cross-team tampering)
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-[#1f223f] flex justify-end">
              <button
                type="submit"
                disabled={savingWs}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-900/30"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingWs ? 'Saving...' : 'Save Workspace Policies'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security & Audit Trail */}
      <div className="glass-panel p-6 rounded-2xl border border-[#202444] space-y-4">
        <h3 className="text-base font-display font-semibold text-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          <span>Security & Activity Audit Log</span>
        </h3>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-mono text-slate-400 border-b border-[#1c1f38] bg-[#0c0e1a] sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181b32]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#121428] font-mono text-[11px]">
                  <td className="py-2 px-3 text-slate-500">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2 px-3 text-purple-300 font-semibold">{log.action}</td>
                  <td className="py-2 px-3 text-slate-300">{log.userId}</td>
                  <td className="py-2 px-3 text-slate-400">{log.entityType} ({log.entityId})</td>
                  <td className="py-2 px-3 text-slate-500">{(log as any).ipAddress || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset to Factory Defaults */}
      <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Reset Demo Seed Data</span>
          </h4>
          <p className="text-xs text-rose-400/80 mt-0.5">
            Restore all users, projects, tasks, milestones, proofs, and mock messages to pristine default states.
          </p>
        </div>

        <button
          onClick={() => setIsResetConfirmOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium transition-colors shrink-0"
        >
          Reset Data
        </button>
      </div>

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDefaults}
        title="Reset All Workspace Data?"
        message="This will immediately overwrite current tasks, messages, and proofs with the default seed fixtures. This cannot be undone."
        confirmLabel="Reset Everything"
        destructive
      />

      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        currentAvatarUrl={user?.avatarUrl}
        userName={user?.name}
      />
    </div>
  );
}
