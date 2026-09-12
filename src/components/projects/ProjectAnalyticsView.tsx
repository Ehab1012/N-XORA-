import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Download,
  Trophy,
  Activity,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { ProjectAnalytics } from '../../../shared/types.js';
import { api } from '../../lib/api.js';

interface ProjectAnalyticsViewProps {
  projectId: string;
}

export function ProjectAnalyticsView({ projectId }: ProjectAnalyticsViewProps) {
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const data = await api.getProjectAnalytics(projectId);
      setAnalytics(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [projectId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const markdown = await api.exportProjectReport(projectId);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexora-report-${projectId}-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-500 font-mono text-xs">
        Calculating transparent project metrics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-rose-400 font-mono text-xs">
        Failed to load project analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Health & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-[#202444]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-purple-300">
              Deterministic Project Scorecard
            </span>
          </div>
          <h3 className="text-lg font-display font-semibold text-slate-100">
            Health State:{' '}
            <span
              className={
                analytics.healthStatus === 'healthy'
                  ? 'text-emerald-400'
                  : analytics.healthStatus === 'critical'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }
            >
              {analytics.healthStatus.toUpperCase()}
            </span>
          </h3>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Generating Report...' : 'Export Verified Project Report (.md)'}</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-panel border border-[#1f223f]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">Completion Rate</span>
          <div className="text-2xl font-bold font-display text-slate-100">{analytics.completionRate}%</div>
          <div className="w-full bg-[#16182e] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-teal-400 h-full rounded-full transition-all"
              style={{ width: `${analytics.completionRate}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[#1f223f]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">Total Deliverables</span>
          <div className="text-2xl font-bold font-display text-slate-100">
            {analytics.completedTasks} / {analytics.totalTasks}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Work items closed</span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[#1f223f]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">Approved Proofs</span>
          <div className="text-2xl font-bold font-display text-teal-300">
            {(analytics as any).proofsApproved || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {(analytics as any).proofsPending || 0} pending review
          </span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[#1f223f]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">Overdue / Blocked</span>
          <div className="text-2xl font-bold font-display text-rose-400">
            {(analytics.overdueTasks ?? analytics.atRiskTasks ?? 0) + (analytics.blockedTasks ?? 0)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {analytics.blockedTasks ?? 0} blocked items
          </span>
        </div>
      </div>

      {/* Transparent Leaderboard with Formula */}
      <div className="rounded-2xl glass-panel border border-[#202444] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-[#202444] mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h4 className="text-base font-display font-semibold text-slate-100">
              Transparent Accountability Leaderboard
            </h4>
          </div>
          <div className="text-[11px] font-mono text-purple-300 bg-[#161832] px-2.5 py-1 rounded-md border border-purple-500/20">
            Formula: Tasks (+25) + On-Time (+15) + Milestones (+50) + Proofs (+40)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-mono text-slate-400 border-b border-[#1c1f38] bg-[#0c0e1a]">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Contributor</th>
                <th className="py-2.5 px-3">Tasks Completed</th>
                <th className="py-2.5 px-3">Milestones Met</th>
                <th className="py-2.5 px-3">Proofs Approved</th>
                <th className="py-2.5 px-3">On-Time Deliveries</th>
                <th className="py-2.5 px-3 text-right">Total Merit Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181b32]">
              {analytics.leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 font-mono">
                    No individual member scoring records yet.
                  </td>
                </tr>
              ) : (
                analytics.leaderboard.map((scorer, idx) => (
                  <tr key={scorer.userId} className="hover:bg-[#121428] transition-colors">
                    <td className="py-3 px-3 font-mono">
                      {idx === 0 ? (
                        <span className="text-amber-300 font-bold">#1</span>
                      ) : (
                        <span className="text-slate-400">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{scorer.userName}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{scorer.userRole || scorer.role}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {scorer.breakdown?.tasksCompleted ?? scorer.tasksCompleted ?? 0}
                      <span className="text-slate-500 text-[10px] ml-1">(+{scorer.breakdown?.tasksScore ?? 0})</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {scorer.breakdown?.milestonesCompleted ?? scorer.milestonesCompleted ?? 0}
                      <span className="text-slate-500 text-[10px] ml-1">(+{scorer.breakdown?.milestonesScore ?? 0})</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-teal-300">
                      {scorer.breakdown?.proofsApproved ?? scorer.proofsApproved ?? 0}
                      <span className="text-slate-500 text-[10px] ml-1">(+{scorer.breakdown?.proofsScore ?? 0})</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {scorer.breakdown?.onTimeDeliveries ?? scorer.onTimeDeliveries ?? 0}
                      <span className="text-slate-500 text-[10px] ml-1">(+{scorer.breakdown?.onTimeScore ?? 0})</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-right text-purple-300 text-sm">
                      {scorer.totalScore ?? 0} pts
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
