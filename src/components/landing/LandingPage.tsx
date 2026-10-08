import React, { useState } from 'react';
import {
  Cpu,
  Shield,
  Layers,
  FileCheck2,
  Users,
  BarChart3,
  ArrowRight,
  Sparkles,
  Lock,
  Workflow,
  CheckCircle2,
  FolderGit2,
  ExternalLink,
  ChevronRight,
  Terminal,
  Zap,
} from 'lucide-react';
import { PRODUCT_NAME, PRODUCT_STYLIZED_NAME, PRODUCT_TAGLINE } from '../../../shared/const.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Web3HeroCard } from './Web3HeroCard.js';

interface LandingPageProps {
  onOpenAuthModal: () => void;
}

export function LandingPage({ onOpenAuthModal }: LandingPageProps) {
  const { user } = useAuth();
  const [activeSignalNode, setActiveSignalNode] = useState<'project' | 'task' | 'proof' | 'review' | 'analytics'>('project');

  const signalDetails = {
    project: {
      title: 'Project Context Anchor',
      desc: 'Scoped authorization container binding team assignments, deadline constraints, and cryptographic objectives.',
      code: 'visibility: "team_only" | status: "active" | leaderId: "usr_leader"',
      metric: 'Aurora Protocol v3 (3 Milestones)',
    },
    task: {
      title: 'Actionable Work Items',
      desc: 'Granular tasks with assignees, subtask checklists, priorities, and dependency links.',
      code: 'priority: "high" | assignee: "Alex Rivera" | status: "in_review"',
      metric: 'SIMD Ed25519 Batch Verification',
    },
    proof: {
      title: 'Verifiable Proof Submission',
      desc: 'Member provides mathematical benchmarks, deployment URLs, or cryptographic artifacts verifying real completion.',
      code: 'verified_artifacts: 2 | latency_drop: "4.2x speedup" | status: "pending"',
      metric: 'Benchmark: 59,800 verifies/sec',
    },
    review: {
      title: 'Leader Attestation & Approval',
      desc: 'Leaders inspect submitted proof and attest outcome with written criteria or request revision.',
      code: 'attested_by: "Marcus Chen" | decision: "approved" | pts: +40',
      metric: 'Approved & Merged into Mainline',
    },
    analytics: {
      title: 'Transparent Merit Scoring',
      desc: 'Real calculated metrics from completed work, prompt deliveries, and approved proofs.',
      code: 'tasksScore: +25 | onTimeBonus: +15 | milestonesScore: +50',
      metric: 'Top Performer: Alex Rivera (180 pts)',
    },
  };

  return (
    <div className="min-h-screen web3-outer-slashes text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background glow atmospheric effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-900/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[400px] bg-teal-900/10 rounded-full blur-[110px]" />
        <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-sky-950/20 rounded-full blur-[140px]" />
      </div>

      {/* Top Global Navigation Bar */}
      <header className="relative z-20 border-b border-cyan-900/30 bg-[#060a14]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <div className="w-full h-full bg-[#070b16] rounded-[9px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-300 icon-anim" />
              </div>
            </div>
            <div>
              <span className="font-sharp font-bold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                {PRODUCT_NAME}
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  WEB 3.0
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-6 text-sm text-slate-300 mr-2">
              <a href="#signals" className="hover:text-cyan-300 transition-colors">Architecture</a>
              <a href="#principles" className="hover:text-cyan-300 transition-colors">Core Pillars</a>
              <a href="#roles" className="hover:text-cyan-300 transition-colors">Role Matrix</a>
            </div>

            {user ? (
              <button
                onClick={onOpenAuthModal}
                className="btn-modern-primary px-4 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="btn-modern-pill group cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950 icon-anim" />
                <span>Connect Us</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Featured Web 3.0 Hero Window (Matching User's Reference Screenshot) */}
      <section className="relative z-10 pt-8 sm:pt-12 pb-12 px-4 sm:px-6 lg:px-8">
        <Web3HeroCard
          onLoginClick={onOpenAuthModal}
          onConnectClick={onOpenAuthModal}
          isLoggedIn={!!user}
          onEnterWorkspace={onOpenAuthModal}
        />
      </section>

      {/* Visual Workspace Signal Panel */}
      <section id="signals" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl sm:rounded-3xl border border-cyan-500/25 bg-[#090d1a]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#1b2544]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1">
                <Workflow className="w-4 h-4 icon-anim" />
                <span>Connected Workspace Signal Architecture</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-semibold text-slate-100">
                How work, proof, and governance stay connected
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
              <span>Real-time Operational Pipeline</span>
            </div>
          </div>

          {/* Interactive signal nodes */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-6">
            {[
              { id: 'project', label: '1. Project Scope', icon: FolderGit2 },
              { id: 'task', label: '2. Work Item', icon: Layers },
              { id: 'proof', label: '3. Proof of Work', icon: FileCheck2 },
              { id: 'review', label: '4. Leader Review', icon: Shield },
              { id: 'analytics', label: '5. Merit Metric', icon: BarChart3 },
            ].map((node) => {
              const Icon = node.icon;
              const isActive = activeSignalNode === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => setActiveSignalNode(node.id as any)}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-300 group cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50'
                      : 'bg-[#0e1428] border-[#1d2746] text-slate-400 hover:text-cyan-200 hover:bg-[#141d38] hover:border-cyan-500/40'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 icon-anim ${isActive ? 'text-cyan-300' : 'text-slate-500 group-hover:text-cyan-400'}`} />
                  <div className="text-xs font-semibold">{node.label}</div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Inspector Box */}
          <div className="bg-[#060914] rounded-xl border border-cyan-950/80 p-5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-3 border-b border-[#18223c] mb-4">
              <div className="flex items-center gap-2 text-cyan-300">
                <Terminal className="w-4 h-4 text-cyan-400 icon-anim" />
                <span>ACTIVE PIPELINE INSPECTOR: {signalDetails[activeSignalNode].title}</span>
              </div>
              <span className="text-cyan-400/80 font-mono text-[10px]">VERIFIED STAGE</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <h4 className="text-base font-display font-medium text-slate-100">
                  {signalDetails[activeSignalNode].title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                  {signalDetails[activeSignalNode].desc}
                </p>
                <div className="pt-2">
                  <div className="text-[11px] font-mono text-cyan-300 bg-[#090e1c] p-2.5 rounded-lg border border-cyan-500/20">
                    {signalDetails[activeSignalNode].code}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#080d1c] border border-cyan-500/20 p-4 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Live Objective Telemetry</span>
                <div className="text-sm font-semibold text-cyan-200 py-2">
                  {signalDetails[activeSignalNode].metric}
                </div>
                <button
                  onClick={onOpenAuthModal}
                  className="btn-modern-primary py-2 px-3 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <span>Test in Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section id="principles" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-mono uppercase tracking-widest text-purple-400 mb-2">Architectural Principles</h2>
          <h3 className="text-3xl font-display font-bold text-slate-100">Engineered for accountable team execution</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-xl border border-[#222544]">
            <div className="w-10 h-10 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-display font-semibold text-slate-100 mb-2">Role-Aware Authorization</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enforced strictly on the server layer. Workspace Leaders, Leaders, Co-Leaders, and Members have clear, verifiable
              boundaries protecting private work from unauthorized tampering.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-[#222544]">
            <div className="w-10 h-10 rounded-lg bg-teal-950/60 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-display font-semibold text-slate-100 mb-2">Verified Proof of Work</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              No superficial checklists. When work is finished, contributors attach cryptographic links, benchmarks, or code diffs.
              Leaders inspect and attest with a full audit history.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-[#222544]">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-display font-semibold text-slate-100 mb-2">Transparent Analytics</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Zero fabricated ratings or vague metrics. Scores are derived algorithmically: +25 for task completion,
              +15 on-time delivery bonus, +50 milestone delivery, and +40 verified proof.
            </p>
          </div>
        </div>
      </section>

      {/* Role Matrix */}
      <section id="roles" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-panel rounded-2xl border border-[#222646] p-6 sm:p-8">
          <h3 className="text-xl font-display font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-400" />
            <span>Role-Based Governance Matrix</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase font-mono text-purple-300 border-b border-[#222646] bg-[#121426]">
                <tr>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Workspace Governance</th>
                  <th className="py-3 px-4">Project & Team Leadership</th>
                  <th className="py-3 px-4">Proof Evaluation</th>
                  <th className="py-3 px-4">Execution & Discussion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e213b]">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-purple-300">Workspace Leader</td>
                  <td className="py-3.5 px-4 text-emerald-400">Full System Control</td>
                  <td className="py-3.5 px-4 text-emerald-400">Universal Manage</td>
                  <td className="py-3.5 px-4 text-emerald-400">Approve & Reject</td>
                  <td className="py-3.5 px-4 text-emerald-400">Full Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-violet-300">Leader</td>
                  <td className="py-3.5 px-4 text-slate-500">View Only</td>
                  <td className="py-3.5 px-4 text-emerald-400">Create & Manage Assigned</td>
                  <td className="py-3.5 px-4 text-emerald-400">Approve & Review</td>
                  <td className="py-3.5 px-4 text-emerald-400">Full Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-fuchsia-300">Co-Leader</td>
                  <td className="py-3.5 px-4 text-slate-500">Restricted</td>
                  <td className="py-3.5 px-4 text-emerald-400">Delegated Scope</td>
                  <td className="py-3.5 px-4 text-emerald-400">Review & Feedback</td>
                  <td className="py-3.5 px-4 text-emerald-400">Full Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-300">Member</td>
                  <td className="py-3.5 px-4 text-slate-500">None</td>
                  <td className="py-3.5 px-4 text-slate-400">View Assigned Only</td>
                  <td className="py-3.5 px-4 text-sky-400">Submit Only</td>
                  <td className="py-3.5 px-4 text-emerald-400">Execute & Chat</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1a1c32] bg-[#090b14] py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-slate-300">{PRODUCT_NAME}</span>
            <span>&copy; 2026 NΞXORA Systems. Verified operational workspace.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Zero-Trust Enforced</span>
            <span>WCAG 2.2 AA Compliant</span>
            <span>Deterministic Auditing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
