import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  id?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, id }: EmptyStateProps) {
  return (
    <div
      id={id}
      className="flex flex-col items-center justify-center text-center p-12 rounded-xl border border-dashed border-[#232742] bg-[#0e101c]/60 max-w-lg mx-auto"
    >
      <div className="w-12 h-12 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-display font-medium text-slate-200 mb-1">{title}</h4>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
