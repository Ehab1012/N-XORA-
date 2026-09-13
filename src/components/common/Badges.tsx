import React from 'react';
import { TaskStatus, ProjectStatus, ProofStatus, UserRole, TaskPriority } from '../../../shared/types.js';

export function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, { label: string; bg: string; text: string; border: string }> = {
    leader: {
      label: 'Leader',
      bg: 'bg-violet-950/60',
      text: 'text-violet-300',
      border: 'border-violet-500/30',
    },
    'co-leader': {
      label: 'Co-Leader',
      bg: 'bg-fuchsia-950/60',
      text: 'text-fuchsia-300',
      border: 'border-fuchsia-500/30',
    },
    member: {
      label: 'Member',
      bg: 'bg-slate-900/60',
      text: 'text-slate-300',
      border: 'border-slate-700/40',
    },
  };

  const c = styles[role] || styles.member;
  return (
    <span
      id={`role-badge-${role}`}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${c.bg} ${c.text} ${c.border} tracking-wide`}
    >
      {c.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus | ProjectStatus }) {
  const map: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    planned: { label: 'Planned', bg: 'bg-slate-900/80', text: 'text-slate-300', border: 'border-slate-700/50', dot: 'bg-slate-400' },
    active: { label: 'Active', bg: 'bg-emerald-950/50', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
    at_risk: { label: 'At Risk', bg: 'bg-rose-950/50', text: 'text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-400' },
    paused: { label: 'Paused', bg: 'bg-amber-950/50', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
    complete: { label: 'Complete', bg: 'bg-teal-950/50', text: 'text-teal-300', border: 'border-teal-500/30', dot: 'bg-teal-400' },

    // Tasks
    backlog: { label: 'Backlog', bg: 'bg-slate-900/70', text: 'text-slate-400', border: 'border-slate-800', dot: 'bg-slate-500' },
    todo: { label: 'To Do', bg: 'bg-sky-950/50', text: 'text-sky-300', border: 'border-sky-500/30', dot: 'bg-sky-400' },
    in_progress: { label: 'In Progress', bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
    blocked: { label: 'Blocked', bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-500/30', dot: 'bg-red-500' },
    in_review: { label: 'In Review', bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
    cancelled: { label: 'Cancelled', bg: 'bg-zinc-900/60', text: 'text-zinc-400', border: 'border-zinc-800', dot: 'bg-zinc-600' },
  };

  const item = map[status] || { label: status, bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700', dot: 'bg-slate-400' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.bg} ${item.text} ${item.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{item.label}</span>
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const styles: Record<TaskPriority, { label: string; text: string; bg: string; border: string }> = {
    low: { label: 'Low', text: 'text-slate-400', bg: 'bg-slate-900/60', border: 'border-slate-800' },
    medium: { label: 'Medium', text: 'text-blue-300', bg: 'bg-blue-950/50', border: 'border-blue-500/30' },
    high: { label: 'High', text: 'text-amber-300', bg: 'bg-amber-950/50', border: 'border-amber-500/30' },
    urgent: { label: 'Urgent', text: 'text-red-300', bg: 'bg-red-950/60', border: 'border-red-500/40' },
  };

  const p = styles[priority] || styles.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${p.bg} ${p.text} ${p.border}`}>
      {p.label}
    </span>
  );
}

export function ProofBadge({ status }: { status: ProofStatus }) {
  const map: Record<ProofStatus, { label: string; bg: string; text: string; border: string }> = {
    pending: { label: 'Pending Review', bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-500/30' },
    approved: { label: 'Verified & Approved', bg: 'bg-teal-950/60', text: 'text-teal-300', border: 'border-teal-500/30' },
    rejected: { label: 'Rejected', bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-500/30' },
    changes_requested: { label: 'Changes Requested', bg: 'bg-orange-950/60', text: 'text-orange-300', border: 'border-orange-500/30' },
  };

  const p = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${p.bg} ${p.text} ${p.border}`}>
      {p.label}
    </span>
  );
}
