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
import { useTheme } from '../../contexts/ThemeContext.js';
import { ProjectAnalyticsSkeleton } from '../common/Skeleton.js';

interface ProjectAnalyticsViewProps {
  projectId: string;
}

export function ProjectAnalyticsView({ projectId }: ProjectAnalyticsViewProps) {
  const { themeConfig } = useTheme();
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
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
    return <ProjectAnalyticsSkeleton />;
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
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl shadow-lg"
        style={{
          background: 'var(--surface-panel)',
          borderColor: 'var(--border-color)',
          borderWidth: 1,
          boxShadow: `0 10px 30px -5px rgba(0,0,0,0.6), 0 0 20px -5px ${themeConfig.accentColor}15`,
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4" style={{ color: themeConfig.accentColor }} />
            <span
              className="text-xs font-mono uppercase tracking-wider font-bold"
              style={{ color: themeConfig.accentColor }}
            >
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
          className="btn-modern-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Generating Report...' : 'Export Verified Project Report (.md)'}</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="p-4 rounded-xl border"
          style={{
            background: 'var(--surface-subtle)',
            borderColor: 'var(--border-color)',
          }}
        >
          <span className="text-[11px] font-mono text-slate-400 block mb-1">Completion Rate</span>
          <div className="text-2xl font-bold font-display text-slate-100">{analytics.completionRate}%</div>
          <div className="w-full bg-[#16182e] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`bg-gradient-to-r ${themeConfig.gradient} h-full rounded-full transition-all`}
              style={{ width: `${analytics.completionRate}%` }}
            />
          </div>
        </div>

        <div
          className="p-4 rounded-xl border"
          style={{
            background: 'var(--surface-subtle)',
            borderColor: 'var(--border-color)',
          }}
        >
          <span className="text-[11px] font-mono text-slate-400 block mb-1">Total Deliverables</span>
          <div className="text-2xl font-bold font-display text-slate-100">
            {analytics.completedTasks} / {analytics.totalTasks}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Work items closed</span>
        </div>

        <div
          className="p-4 rounded-xl border"
          style={{
            background: 'var(--surface-subtle)',
            borderColor: 'var(--border-color)',
          }}
        >
          <span className="text-[11px] font-mono text-slate-400 block mb-1">Approved Proofs</span>
          <div
            className="text-2xl font-bold font-display font-semibold"
            style={{ color: themeConfig.accentColor }}
          >
            {(analytics as any).proofsApproved || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {(analytics as any).proofsPending || 0} pending review
          </span>
        </div>

        <div
          className="p-4 rounded-xl border"
          style={{
            background: 'var(--surface-subtle)',
            borderColor: 'var(--border-color)',
          }}
        >
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
      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{
          background: 'var(--surface-panel)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b mb-4"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h4 className="text-base font-display font-semibold text-slate-100">
              Transparent Accountability Leaderboard
            </h4>
          </div>
          <div
            className="text-[11px] font-mono tabular-nums px-2.5 py-1 rounded-md border font-medium"
            style={{
              background: 'var(--surface-subtle)',
              borderColor: 'var(--border-color)',
              color: themeConfig.accentColor,
            }}
          >
            Formula: Priority (+15..+60) · On-Time (+15) · Late (-20%/day → 0 → Member Score) · Milestones (+50) · Proofs (+40)
          </div>
        </div>

        {/* Priority Points & Progressive Daily Late Penalty Policy Explainer */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5 text-[11px] font-mono tabular-nums">
          <div className="p-2.5 rounded-xl bg-[#080d22] border border-red-500/30 text-center space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-red-300 block">Urgent Priority</span>
            <div className="text-base font-bold text-red-200">+60 pts</div>
            <div className="text-[10px] text-rose-300/90">Late: -12 pts/day</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#080d22] border border-amber-500/30 text-center space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">High Priority</span>
            <div className="text-base font-bold text-amber-200">+40 pts</div>
            <div className="text-[10px] text-amber-300/90">Late: -8 pts/day</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#080d22] border border-blue-500/30 text-center space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-blue-300 block">Medium Priority</span>
            <div className="text-base font-bold text-blue-200">+25 pts</div>
            <div className="text-[10px] text-blue-300/90">Late: -5 pts/day</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#080d22] border border-slate-700/50 text-center space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Low Priority</span>
            <div className="text-base font-bold text-slate-200">+15 pts</div>
            <div className="text-[10px] text-slate-400">Late: -3 pts/day</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#080d22] border border-rose-500/35 text-center space-y-0.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-rose-300 block">Overflow @ 0 Pts</span>
            <div className="text-base font-bold text-emerald-300">+15 On-Time</div>
            <div className="text-[10px] text-rose-400 font-semibold">Day 6+: drains member pts</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead
              className="text-[10px] uppercase font-mono text-slate-400 border-b"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--surface-header)',
              }}
            >
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Contributor</th>
                <th className="py-2.5 px-3">Tasks Completed</th>
                <th className="py-2.5 px-3">Milestones Met</th>
                <th className="py-2.5 px-3">Proofs Approved</th>
                <th className="py-2.5 px-3">On-Time Deliveries</th>
                <th className="py-2.5 px-3">Late / Overdue</th>
                <th className="py-2.5 px-3 text-right">Total Merit Score</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {analytics.leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 font-mono">
                    No individual member scoring records yet.
                  </td>
                </tr>
              ) : (
                analytics.leaderboard.map((scorer, idx) => {
                  const lateDone = scorer.breakdown?.lateDeliveries ?? scorer.lateDeliveries ?? 0;
                  const overdueActive = scorer.breakdown?.overdueTasksCount ?? scorer.overdueTasksCount ?? 0;
                  const totalLateItems = lateDone + overdueActive;
                  const totalPenalty = scorer.breakdown?.latePenaltyScore ?? scorer.latePenaltyScore ?? 0;
                  const memberDrain = scorer.breakdown?.memberPenaltyDeduction ?? scorer.memberPenaltyDeduction ?? 0;

                  return (
                    <tr key={scorer.userId} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono tabular-nums">
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
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                        {scorer.breakdown?.tasksCompleted ?? scorer.tasksCompleted ?? 0}
                        <span className="text-cyan-400 text-[10px] ml-1 font-semibold">(+{scorer.breakdown?.tasksScore ?? 0})</span>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                        {scorer.breakdown?.milestonesCompleted ?? scorer.milestonesCompleted ?? 0}
                        <span className="text-slate-500 text-[10px] ml-1">(+{scorer.breakdown?.milestonesScore ?? 0})</span>
                      </td>
                      <td
                        className="py-3 px-3 font-mono tabular-nums font-semibold"
                        style={{ color: themeConfig.accentColor }}
                      >
                        {scorer.breakdown?.proofsApproved ?? scorer.proofsApproved ?? 0}
                        <span className="text-slate-500 text-[10px] ml-1">(+{scorer.breakdown?.proofsScore ?? 0})</span>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                        {scorer.breakdown?.onTimeDeliveries ?? scorer.onTimeDeliveries ?? 0}
                        <span className="text-emerald-400 text-[10px] ml-1 font-semibold">(+{scorer.breakdown?.onTimeScore ?? 0})</span>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums">
                        {totalLateItems > 0 || totalPenalty > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-amber-300 font-medium">
                              {totalLateItems}
                              <span className="text-rose-400 text-[10px] ml-1 font-semibold">(-{totalPenalty} pts)</span>
                            </span>
                            {memberDrain > 0 && (
                              <span className="text-[10px] text-rose-300 font-semibold">
                                -{memberDrain} from total
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td
                        className="py-3 px-3 font-mono tabular-nums font-bold text-right text-sm"
                        style={{ color: themeConfig.accentColor }}
                      >
                        {scorer.totalScore ?? 0} pts
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
