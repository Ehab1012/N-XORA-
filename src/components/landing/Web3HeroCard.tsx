import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Shield,
  Code,
  FileCheck2,
  Users,
  Zap,
  Bot,
  X,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Web3ConstellationCanvas } from './Web3ConstellationCanvas.js';
import { PRODUCT_NAME } from '../../../shared/const.js';
import { Logo } from '../common/Logo.js';

interface Web3HeroCardProps {
  onLoginClick?: () => void;
  onConnectClick?: () => void;
  isLoggedIn?: boolean;
  onEnterWorkspace?: () => void;
}

type NavSectionId = 'home' | 'about' | 'product' | 'blog' | 'docs';
type ModalTopicId = 'about' | 'product' | 'blog' | 'docs';

export function Web3HeroCard({
  onLoginClick,
  onConnectClick,
  isLoggedIn = false,
  onEnterWorkspace,
}: Web3HeroCardProps) {
  const [activeNav, setActiveNav] = useState<NavSectionId>('home');
  const [modalTopic, setModalTopic] = useState<ModalTopicId | null>(null);

  const navItems: ReadonlyArray<{ id: NavSectionId; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About us' },
    { id: 'product', label: 'Product' },
    { id: 'blog', label: 'Updates' },
    { id: 'docs', label: 'Docs' },
  ];

  useEffect(() => {
    if (!modalTopic) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalTopic(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalTopic]);

  const handleNavClick = (id: NavSectionId) => {
    setActiveNav(id);
    if (id === 'home') {
      setModalTopic(null);
      return;
    }
    setModalTopic(id);
  };

  const primaryAction = isLoggedIn
    ? onEnterWorkspace || onConnectClick || onLoginClick
    : onConnectClick || onLoginClick;

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Subtle ambient perimeter glow */}
      <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500/18 via-blue-600/8 to-cyan-500/12 rounded-[28px] blur-xl opacity-80 pointer-events-none" />

      {/* Central Showcase Frame */}
      <div className="relative rounded-[22px] sm:rounded-[26px] bg-[#060a15]/95 border border-cyan-500/25 shadow-[0_28px_80px_-16px_rgba(0,0,0,0.92),0_0_48px_-12px_rgba(6,182,212,0.2)] overflow-hidden backdrop-blur-2xl">
        {/* Top Luminous Hairline */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />

        {/* Header Bar */}
        <header className="relative z-20 px-4 sm:px-7 h-16 flex items-center justify-between gap-4 border-b border-slate-800/80 bg-[#050812]/85 backdrop-blur-md">
          {/* Brand Lockup */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 group cursor-pointer shrink-0 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600 p-px shadow-md shadow-cyan-500/25 transition-transform duration-200 group-hover:scale-105 shrink-0">
              <div className="w-full h-full bg-[#060914] rounded-[7px] flex items-center justify-center">
                <Logo className="w-5 h-5" size={20} />
              </div>
            </div>
            <span className="font-sharp font-bold text-sm sm:text-base tracking-wider text-white group-hover:text-cyan-300 transition-colors">
              {PRODUCT_NAME}
            </span>
          </button>

          {/* Desktop Center Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-medium"
          >
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative py-1.5 transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.75)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls (Matched height & baseline) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={onEnterWorkspace}
                className="btn-modern-pill group cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-slate-950 icon-anim shrink-0" />
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-950 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLoginClick || onConnectClick}
                  className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 transition-colors duration-200 whitespace-nowrap cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={onConnectClick || onLoginClick}
                  className="btn-modern-pill group cursor-pointer"
                >
                  <span>Connect Us</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Mobile Quick Navigation Bar */}
        <div className="md:hidden relative z-20 px-4 py-2 border-b border-slate-800/70 bg-[#050812]/70 flex items-center justify-between gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'text-cyan-300 bg-cyan-950/50 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Hero Centerpiece */}
        <div className="relative pt-12 sm:pt-16 pb-36 sm:pb-44 px-5 sm:px-10 text-center overflow-hidden">
          {/* Ambient radial spotlight */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[250px] bg-cyan-500/10 rounded-full blur-[95px] pointer-events-none" />

          {/* Clean Unboxed Eyebrow */}
          <p className="relative z-10 text-[11px] sm:text-xs font-mono uppercase tracking-[0.22em] text-cyan-300/90 mb-3 sm:mb-4">
            Enterprise Execution &amp; Proof-of-Work Platform
          </p>

          {/* NEXORA Hero Display Lockup in Orbitron (.font-sharp) */}
          <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-7 my-2">
            <span
              aria-hidden="true"
              className="hidden sm:block w-12 lg:w-20 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-cyan-300/80"
            />

            <h1 className="text-[clamp(2.65rem,8.5vw,6.25rem)] leading-[0.95] font-sharp font-black tracking-[0.09em] nexora-hero-title uppercase select-none">
              NEXORA
            </h1>

            <span
              aria-hidden="true"
              className="hidden sm:block w-12 lg:w-20 h-px bg-gradient-to-l from-transparent via-cyan-400/45 to-cyan-300/80"
            />
          </div>

          {/* Value Proposition & Primary Actions */}
          <div className="relative z-10 max-w-2xl mx-auto mt-4 sm:mt-5 space-y-6">
            <p className="text-xs sm:text-sm md:text-[15px] text-slate-300/90 leading-relaxed font-sans max-w-xl mx-auto">
              Coordinate mission-critical projects with role-scoped AI co-pilots, verifiable
              deliverable reviews, and deterministic merit scoring across every team.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={primaryAction}
                className="btn-modern-primary h-10 sm:h-11 px-5 sm:px-6 text-xs sm:text-[13px] inline-flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
              >
                <span>{isLoggedIn ? 'Open Workspace' : 'Launch Nexora App'}</span>
                <ArrowRight className="w-4 h-4 text-slate-950 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveNav('product');
                  setModalTopic('product');
                }}
                className="btn-modern-secondary h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-[13px] inline-flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
              >
                <Code className="w-3.5 h-3.5 text-cyan-400 icon-anim shrink-0" />
                <span>Explore Architecture</span>
              </button>
            </div>

            {/* Unboxed Architectural Capabilities Strip */}
            <div className="pt-4 max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-0 sm:divide-x divide-slate-800/90 text-left sm:text-center">
              <div className="px-3 py-1 flex sm:flex-col items-center sm:justify-center gap-2.5 sm:gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
                  <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Role-Scoped AI</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Mirrors account permissions
                </span>
              </div>

              <div className="px-3 py-1 flex sm:flex-col items-center sm:justify-center gap-2.5 sm:gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
                  <FileCheck2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Verified Proofs</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Leader &amp; co-leader review
                </span>
              </div>

              <div className="px-3 py-1 flex sm:flex-col items-center sm:justify-center gap-2.5 sm:gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Merit Accountability</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  On-time rewards &amp; SLA tracking
                </span>
              </div>
            </div>
          </div>

          {/* Interactive 3D Constellation Horizon */}
          <div className="absolute inset-x-0 bottom-0 h-44 sm:h-60 pointer-events-none overflow-hidden">
            <Web3ConstellationCanvas />
          </div>
        </div>

        {/* Clean Bottom Governance Bar */}
        <div className="relative z-20 px-4 sm:px-7 py-3 border-t border-slate-800/80 bg-[#050811]/92 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 text-slate-300">
            <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Zero-Trust Role Boundaries · Leader, Co-Leader &amp; Member Scopes</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              type="button"
              onClick={() => {
                setActiveNav('docs');
                setModalTopic('docs');
              }}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Architecture Spec
            </button>
            <span className="text-slate-700" aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => {
                setActiveNav('about');
                setModalTopic('about');
              }}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Security Governance
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Documentation & Product Modal */}
      {modalTopic && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => {
            setModalTopic(null);
            setActiveNav('home');
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-[#080d1b] border border-cyan-500/30 p-6 space-y-4 shadow-2xl shadow-black/80 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <Logo className="w-5 h-5" size={20} />
                <h3 className="font-sharp font-bold text-sm text-white uppercase tracking-wider">
                  {modalTopic === 'about' && 'About NEXORA'}
                  {modalTopic === 'product' && 'Platform Architecture & Workflows'}
                  {modalTopic === 'blog' && 'Platform Capabilities & Releases'}
                  {modalTopic === 'docs' && 'Governance & Security Documentation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalTopic(null);
                  setActiveNav('home');
                }}
                aria-label="Close modal"
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              {modalTopic === 'about' && (
                <>
                  <p>
                    NEXORA is a high-assurance engineering and operations workspace uniting
                    multi-role task governance, verifiable proof submissions, and transparent
                    merit accounting in one unified environment.
                  </p>
                  <p>
                    Built for distributed engineering teams that require clear ownership,
                    structured milestone execution, and auditable deliverable reviews without
                    administrative friction.
                  </p>
                </>
              )}

              {modalTopic === 'product' && (
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-[#0c1428] border border-cyan-500/20 space-y-1.5">
                    <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Bot className="w-4 h-4" />
                      <span>Role-Scoped AI Co-Pilot</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Every user&apos;s AI assistant inherits their exact account permissions. Leaders
                      can delegate task assignments and review proofs via natural language, while
                      members execute and submit deliverables within their authorized scope.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c1428] border border-cyan-500/20 space-y-1.5">
                    <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4" />
                      <span>Verifiable Deliverables &amp; Merit Ledger</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Attach benchmarks, code diffs, and files to proof submissions. Timely
                      completions earn bonus points, while overdue items apply transparent daily
                      point deductions.
                    </p>
                  </div>
                </div>
              )}

              {modalTopic === 'blog' && (
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-[#0c1428] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Role-Bound AI Tool Execution
                      </span>
                      <span className="font-mono text-[10px] text-cyan-300">Latest</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Server-enforced function declarations ensure AI assistants act strictly
                      within Leader, Co-Leader, or Member permissions, with multimodal image and
                      document attachments.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c1428] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        Full-Screen Focused Task Boards &amp; Daily SLA Scoring
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Core</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dedicated list selectors open To Do, In Progress, Review, Blocked, and
                      Completed queues in full-screen focus on both desktop and mobile.
                    </p>
                  </div>
                </div>
              )}

              {modalTopic === 'docs' && (
                <>
                  <p>
                    NEXORA enforces strict server-side role boundaries (Leader, Co-Leader, Member)
                    across REST endpoints and AI tool invocations, preventing unauthorized task
                    reassignment, deletion, or cross-team access.
                  </p>
                  <div className="p-3 rounded-xl bg-[#050811] border border-slate-800 font-mono text-[11px] text-cyan-300 space-y-1">
                    <div>POST /api/projects/:id/tasks → Leader &amp; Co-Leader Authorized</div>
                    <div>POST /api/tasks/:id/proofs → Assigned Contributor Verified</div>
                    <div>POST /api/ai/chat → Role-Scoped Tool Declarations Enforced</div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setModalTopic(null);
                  setActiveNav('home');
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTopic(null);
                  setActiveNav('home');
                  if (primaryAction) primaryAction();
                }}
                className="btn-modern-primary px-4 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isLoggedIn ? 'Enter Workspace' : 'Launch App'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
