import React from 'react';
import { X, CheckCheck, Bell, Clock, FileCheck2, AlertTriangle, Sparkles, ExternalLink, UserPlus, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { api } from '../../lib/api.js';
import { NotificationItem } from '../../../shared/types.js';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (link: string) => void;
}

export function NotificationDrawer({ isOpen, onClose, onNavigate }: NotificationDrawerProps) {
  const { notifications, refreshNotifications } = useAuth();

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
        return <UserPlus className="w-4 h-4 text-cyan-400" />;
      case 'milestone_reached':
        return <Target className="w-4 h-4 text-amber-400" />;
      case 'proof_review':
        return <FileCheck2 className="w-4 h-4 text-purple-400" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'score':
        return <Sparkles className="w-4 h-4 text-teal-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#0e101f] border-l border-[#222646] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#202444] flex items-center justify-between bg-[#121426]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" />
            <h3 className="font-display font-semibold text-slate-100 text-sm">Notifications</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30">
              {notifications.filter((n) => !n.isRead).length} new
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAll}
              title="Mark all as read"
              className="p-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#1f223d] rounded flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1f223d] rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              No recent alerts or notifications.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  notif.isRead
                    ? 'bg-[#101222]/60 border-[#1c1f38] text-slate-400 hover:bg-[#14162a]'
                    : 'bg-[#161830] border-purple-500/30 text-slate-200 shadow-md hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-[#111322] border border-[#232746]">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-100 truncate">{notif.title}</h4>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                    {notif.link && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-purple-400 mt-2 hover:underline">
                        <span>View Details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
