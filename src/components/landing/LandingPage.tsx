import React, { useState } from 'react';
import {
  Shield,
  Layers,
  FileCheck2,
  BarChart3,
  ArrowRight,
  Lock,
  Workflow,
  FolderGit2,
  Terminal,
} from 'lucide-react';
import { PRODUCT_NAME } from '../../../shared/const.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Web3HeroCard } from './Web3HeroCard.js';
import { Logo } from '../common/Logo.js';

interface LandingPageProps {
  onOpenAuthModal: () => void;
}

export function LandingPage({ onOpenAuthModal }: LandingPageProps) {
  const { user } = useAuth();
  const [activeSignalNode, setActiveSignalNode] = useState<
    'project' | 'task' | 'proof' | 'review' | 'analytics'
  >('project');

  const signalDetails = {
    project: {
      title: 'Project Context Anchor',
      desc: 'Scoped authorization container binding team assignments, deadline constraints, and milestone objectives.',
      code: 'visibility: "team_only" | status: "active" | leaderId: "usr_leader"',
      metric: 'Aurora Protocol v3 · 3 Milestones',
    },
    task: {
      title: 'Actionable Work Items',
      desc: 'Granular tasks with assignees, subtask checklists, priorities, and role-scoped AI task delegation.',
      code: 'priority: "high" | assignee: "Alex Rivera" | status: "in_review"',
      metric: 'SIMD Ed25519 Batch Verification',
    },
    proof: {
      title: 'Verifiable Proof Submission',
      desc: 'Contributors attach benchmarks, deployment links, or code artifacts verifying real deliverable completion.',
      code: 'verified_artifacts: 2 | latency_drop: "4.2x speedup" | status: "pending"',
      metric: '59,800 verifications / sec',
    },
    review: {
      title: 'Leader Attestation & Approval',
      desc: 'Leaders and Co-Leaders inspect submitted proof and attest outcomes with written criteria or revision notes.',
      code: 'attested_by: "Marcus Chen" | decision: "approved" | pts: +40',
      metric: 'Approved & Merged to Mainline',
    },
    analytics: {
      title: 'Transparent Merit Scoring',
      desc: 'Calculated directly from priority-weighted tasks, on-time deliveries, daily late deductions, and verified proofs.',
      code: 'priorityTask: +15..+60 | onTimeBonus: +15 | dailyLateRate: -20%/day',
      metric: 'Top Contributor: Alex Rivera (180 pts)',
    },
  };

  return (
    <div className="min-h-screen nexora-ambient-canvas text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Subtle atmospheric lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-900/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[400px] bg-teal-900/10 rounded-full blur-[110px]" />
        <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-sky-950/20 rounded-full blur-[140px]" />
      </div>

      {/* Top Global Navigation Bar (Clean single wordmark without pill clutter) */}
      <header className="relative z-20 border-b border-slate-800/80 bg-[#050812]/88 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600 p-px flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#060914] rounded-[11px] flex items-center justify-center">
                <Logo className="w-5 h-5" size={20} />
              </div>
            </div>
            <span className="font-sharp font-bold text-lg sm:text-xl tracking-wider text-white">
              {PRODUCT_NAME}
            </span>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center gap-6 text-xs font-medium text-slate-300">
              <a href="#signals" className="hover:text-cyan-300 transition-colors">
                Architecture
              </a>
              <a href="#principles" className="hover:text-cyan-300 transition-colors">
                Capabilities
              </a>
              <a href="#roles" className="hover:text-cyan-300 transition-colors">
                Role Matrix
              </a>
            </div>

            <button
              type="button"
              onClick={onOpenAuthModal}
              className="btn-modern-pill group cursor-pointer"
            >
              <span>{user ? 'Enter Workspace' : 'Connect Us'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Featured NEXORA Hero Window */}
      <section className="relative z-10 pt-8 sm:pt-12 pb-12 px-4 sm:px-6 lg:px-8">
        <Web3HeroCard
          onLoginClick={onOpenAuthModal}
          onConnectClick={onOpenAuthModal}
          isLoggedIn={!!user}
          onEnterWorkspace={onOpenAuthModal}
        />
      </section>

      {/* Interactive Workspace Pipeline Section */}
      <section id="signals" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl border border-slate-800 bg-[#080d1b]/92 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1">
                <Workflow className="w-4 h-4" />
                <span>Connected Execution Architecture</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-semibold text-slate-100">
                How tasks, proofs, and merit stay synchronized
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              5-Stage Auditable Workflow
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-6">
            {[
              { id: 'project', label: '01. Project Scope', icon: FolderGit2 },
              { id: 'task', label: '02. Work Item', icon: Layers },
              { id: 'proof', label: '03. Proof of Work', icon: FileCheck2 },
              { id: 'review', label: '04. Leader Review', icon: Shield },
              { id: 'analytics', label: '05. Merit Ledger', icon: BarChart3 },
            ].map((node) => {
              const Icon = node.icon;
              const isActive = activeSignalNode === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setActiveSignalNode(node.id as any)}
                  className={`p-3.5 rounded-xl border text-left transition-colors duration-200 group cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/50 border-cyan-400/70 text-white'
                      : 'bg-[#0b1224] border-slate-800 text-slate-400 hover:text-slate-100 hover:border-cyan-500/35'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-2 ${
                      isActive ? 'text-cyan-300' : 'text-slate-500 group-hover:text-cyan-400'
                    }`}
                  />
                  <div className="text-xs font-semibold">{node.label}</div>
                </button>
              );
            })}
          </div>

          <div className="bg-[#050812] rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2 text-cyan-300">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>STAGE INSPECTOR · {signalDetails[activeSignalNode].title}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">SERVER ENFORCED</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <h4 className="text-base font-display font-medium text-slate-100">
                  {signalDetails[activeSignalNode].title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {signalDetails[activeSignalNode].desc}
                </p>
                <div className="pt-2">
                  <div className="text-[11px] font-mono text-cyan-300 bg-[#080d1b] p-2.5 rounded-lg border border-slate-800">
                    {signalDetails[activeSignalNode].code}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#080d1b] border border-slate-800 p-4 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Reference Output
                </span>
                <div className="text-sm font-semibold text-cyan-200 py-2 font-mono">
                  {signalDetails[activeSignalNode].metric}
                </div>
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="btn-modern-primary py-2 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <span>Open in Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="principles" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">
            Core Architecture
          </p>
          <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-100">
            Engineered for accountable team execution
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-5 glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="text-xs font-mono text-cyan-400 mb-3">01. Governance</div>
            <h4 className="text-lg font-display font-semibold text-slate-100 mb-2">
              Role-Aware Authorization &amp; AI Parity
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enforced on the server across both UI actions and AI Co-Pilot tool calls. Leaders,
              Co-Leaders, and Members operate within strict, auditable permission scopes.
            </p>
          </div>

          <div className="md:col-span-4 glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="text-xs font-mono text-cyan-400 mb-3">02. Verification</div>
            <h4 className="text-lg font-display font-semibold text-slate-100 mb-2">
              Verified Proof of Work
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Contributors attach benchmarks, links, and multimodal artifacts when completing work.
              Leadership inspects and attests every submission with a permanent review log.
            </p>
          </div>

          <div className="md:col-span-3 glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="text-xs font-mono text-cyan-400 mb-3">03. Merit Ledger</div>
            <h4 className="text-lg font-display font-semibold text-slate-100 mb-2">
              Algorithmic Scoring
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Priority-weighted points (+15 to +60), +15 on-time bonuses, and progressive daily
              late deductions ensure objective recognition.
            </p>
          </div>
        </div>
      </section>

      {/* Role Matrix */}
      <section id="roles" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 sm:p-8">
          <h3 className="text-xl font-display font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <span>Role-Based Governance Matrix</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase font-mono text-cyan-300 border-b border-slate-800 bg-[#060a15]">
                <tr>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Workspace Governance</th>
                  <th className="py-3 px-4">Task &amp; AI Delegation</th>
                  <th className="py-3 px-4">Proof Evaluation</th>
                  <th className="py-3 px-4">Execution &amp; Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-white">Leader</td>
                  <td className="py-3.5 px-4 text-emerald-400">Full Control</td>
                  <td className="py-3.5 px-4 text-emerald-400">Assign, Edit &amp; Delete</td>
                  <td className="py-3.5 px-4 text-emerald-400">Approve &amp; Reject</td>
                  <td className="py-3.5 px-4 text-emerald-400">Full Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-cyan-200">Co-Leader</td>
                  <td className="py-3.5 px-4 text-slate-400">Scoped View</td>
                  <td className="py-3.5 px-4 text-emerald-400">Assign, Edit &amp; Delete</td>
                  <td className="py-3.5 px-4 text-emerald-400">Approve &amp; Review</td>
                  <td className="py-3.5 px-4 text-emerald-400">Full Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-300">Member</td>
                  <td className="py-3.5 px-4 text-slate-500">Restricted</td>
                  <td className="py-3.5 px-4 text-sky-400">Update Assigned Status</td>
                  <td className="py-3.5 px-4 text-sky-400">Submit Proof</td>
                  <td className="py-3.5 px-4 text-emerald-400">Execute &amp; Chat</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#050812] py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-sharp font-semibold text-slate-300">{PRODUCT_NAME}</span>
            <span>&copy; 2026 NEXORA Systems. Verified operational workspace.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Role-Scoped Security</span>
            <span>WCAG 2.2 AA Contrast</span>
            <span>Deterministic Auditing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
