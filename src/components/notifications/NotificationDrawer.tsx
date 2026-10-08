import React from 'react';
import { X, CheckCheck, Bell, Clock, FileCheck2, AlertTriangle, Sparkles, ExternalLink, UserPlus, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import { api } from '../../lib/api.js';
import { NotificationItem } from '../../../shared/types.js';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (link: string) => void;
}

export function NotificationDrawer({ isOpen, onClose, onNavigate }: NotificationDrawerProps) {
  const { notifications, refreshNotifications } = useAuth();
  const { themeConfig } = useTheme();

  if (!isOpen) return null;

  const handleMarkAll = async () => {
    await api.markAllNotificationsRead();
    await refreshNotifications();
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await api.markNotificationRead(notif.id);
      await refreshNotifications();
    }
    if (notif.link) {
      onNavigate(notif.link);
      onClose();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <UserPlus className="w-4 h-4" style={{ color: themeConfig.accentColor }} />;
      case 'milestone_reached':
        return <Target className="w-4 h-4 text-amber-400" />;
      case 'proof_review':
        return <FileCheck2 className="w-4 h-4 text-purple-400" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'score':
        return <Sparkles className="w-4 h-4 text-teal-400" />;
      default:
        return <Bell className="w-4 h-4" style={{ color: themeConfig.accentColor }} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md backdrop-blur-2xl border-l h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        style={{
          background: 'var(--surface-panel)',
          borderColor: 'var(--border-color)',
          boxShadow: `-15px 0 35px -5px rgba(0,0,0,0.7), 0 0 25px -5px ${themeConfig.accentColor}25`,
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{
            background: 'var(--surface-header)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 icon-anim" style={{ color: themeConfig.accentColor }} />
            <h3 className="font-sharp font-bold text-slate-100 text-sm tracking-wide">Notifications</h3>
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border"
              style={{
                background: `${themeConfig.accentColor}20`,
                color: themeConfig.accentColor,
                borderColor: `${themeConfig.accentColor}40`,
              }}
            >
              {notifications.filter((n) => !n.isRead).length} new
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAll}
              title="Mark all as read"
              className="p-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-none">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              No recent alerts or notifications.
            </div>
          ) : (
            notifications.map((notif) => {
              const unread = !notif.isRead;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className="p-3.5 rounded-2xl border transition-all cursor-pointer duration-200 hover:-translate-y-0.5 shadow-sm"
                  style={
                    unread
                      ? {
                          background: `linear-gradient(135deg, ${themeConfig.accentColor}18, var(--surface-card))`,
                          borderColor: `${themeConfig.accentColor}50`,
                          boxShadow: `0 4px 15px -3px ${themeConfig.accentColor}20`,
                        }
                      : {
                          background: 'var(--surface-subtle)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-muted)',
                        }
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 p-2 rounded-xl border shrink-0"
                      style={{
                        background: 'var(--surface-card)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-100 truncate">{notif.title}</h4>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                      {notif.link && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] mt-2 hover:underline font-semibold"
                          style={{ color: themeConfig.accentColor }}
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
