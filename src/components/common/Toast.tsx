import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Activity,
  UserCheck,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';
import { RealtimeEventPayload, RealtimeEventType } from '../../../shared/types.js';

export type ToastItem = Omit<Partial<RealtimeEventPayload>, 'type'> & {
  id: string;
  type: RealtimeEventType | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  durationMs?: number;
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const rawDuration = toast.durationMs ?? 6000;
  const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 6000;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  // Countdown timer with pause on hover
  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newRemaining = Math.max(0, remainingTimeRef.current - elapsed);
      const rawPct = (newRemaining / duration) * 100;
      const pct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, rawPct)) : 0;
      setProgress(pct);

      if (newRemaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, duration, onDismiss, toast.id]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const isStatusChange =
    toast.type === 'project:status_changed' ||
    toast.type === 'task:status_changed' ||
    toast.type === 'milestone:status_changed';

  const isMemberAssignment =
    toast.type === 'project:member_assigned' || toast.type === 'task:member_assigned';

  // Visual theming
  const getBadgeStyle = () => {
    if (isStatusChange) {
      return {
        border: 'border-violet-500/40',
        glow: 'shadow-violet-900/30',
        headerBg: 'bg-violet-950/50',
        badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
        barColor: 'bg-violet-500',
        label: 'Status Update',
        icon: <Activity className="w-4 h-4 text-violet-400 animate-pulse" />,
      };
    }
    if (isMemberAssignment) {
      return {
        border: 'border-emerald-500/40',
        glow: 'shadow-emerald-900/30',
        headerBg: 'bg-emerald-950/40',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        barColor: 'bg-emerald-400',
        label: 'Team Assignment',
        icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
      };
    }
    return {
      border: 'border-purple-500/30',
      glow: 'shadow-purple-900/20',
      headerBg: 'bg-purple-950/40',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      barColor: 'bg-purple-400',
      label: 'Notification',
      icon: <Zap className="w-4 h-4 text-purple-400" />,
    };
  };

  const style = getBadgeStyle();

  return (
    <div
      id={`toast-${toast.id}`}
      role="alert"
      aria-live="assertive"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-84 sm:w-96 rounded-2xl bg-[#0e101f]/95 backdrop-blur-xl border ${style.border} shadow-2xl ${style.glow} overflow-hidden transition-all duration-300 transform translate-y-0 opacity-100 hover:scale-[1.02]`}
    >
      {/* Top Header Bar */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 ${style.headerBg} border-b border-white/5`}>
        <div className="flex items-center gap-2">
          {style.icon}
          <span className="text-[11px] font-mono tracking-wider font-semibold uppercase text-slate-200">
            {style.label}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-white/10 text-slate-300">
            REAL-TIME
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono">
            {toast.timestamp
              ? new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'Now'}
          </span>
          <button
            id={`dismiss-toast-${toast.id}`}
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Toast Content */}
      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-100 leading-snug">
            {toast.title}
          </h4>
        </div>

        <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans">
          {toast.message}
        </p>

        {/* Status Transition Display */}
        {isStatusChange && toast.oldValue && toast.newValue && (
          <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#14162e] border border-white/5 text-[11px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
              {toast.oldValue.replace('_', ' ')}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="px-1.5 py-0.5 rounded bg-violet-500/30 border border-violet-500/40 text-violet-200 font-medium capitalize">
              {toast.newValue.replace('_', ' ')}
            </span>
          </div>
        )}

        {/* Team Member Assigned Pill */}
        {isMemberAssignment && toast.memberName && (
          <div className="mt-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#14162e] border border-white/5 text-[11px]">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] flex items-center justify-center font-bold">
                {toast.memberName[0]?.toUpperCase()}
              </div>
              <span className="text-slate-200 font-medium">{toast.memberName}</span>
            </div>
            {toast.memberRole && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 capitalize">
                {toast.memberRole}
              </span>
            )}
          </div>
        )}

        {/* Context metadata (actor / project) */}
        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5">
          {toast.actorName && (
            <span className="truncate">
              By <strong className="text-slate-300">{toast.actorName}</strong>
            </span>
          )}
          {toast.entityTitle && (
            <span className="font-mono text-slate-400 truncate max-w-[150px]">
              {toast.entityTitle}
            </span>
          )}
        </div>
      </div>

      {/* Shrinking Countdown Progress Bar */}
      <div className="w-full bg-[#16182f] h-1 overflow-hidden">
        <div
          className={`${style.barColor} h-full transition-all duration-75`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onClearAll?: () => void;
}

export function ToastContainer({ toasts, onDismiss, onClearAll }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <aside
      id="toast-notifications-container"
      aria-label="Real-time Notifications"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-3 max-h-[85vh] overflow-y-auto pointer-events-none p-1"
    >
      {toasts.length > 1 && onClearAll && (
        <div className="flex justify-end pointer-events-auto">
          <button
            onClick={onClearAll}
            className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 backdrop-blur-md shadow-lg transition-colors flex items-center gap-1"
          >
            <span>Dismiss All ({toasts.length})</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastCard toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </aside>
  );
}
