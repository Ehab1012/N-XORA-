import React, { useState } from 'react';
import {
  Cpu,
  ArrowRight,
  Sparkles,
  Shield,
  Layers,
  Terminal,
  ExternalLink,
  ChevronRight,
  LogIn,
  CheckCircle2,
  Code,
  FileCheck2,
  Users,
  Zap,
} from 'lucide-react';
import { Web3ConstellationCanvas } from './Web3ConstellationCanvas.js';
import { PRODUCT_NAME } from '../../../shared/const.js';

interface Web3HeroCardProps {
  onLoginClick?: () => void;
  onConnectClick?: () => void;
  isLoggedIn?: boolean;
  onEnterWorkspace?: () => void;
}

export function Web3HeroCard({
  onLoginClick,
  onConnectClick,
  isLoggedIn = false,
  onEnterWorkspace,
}: Web3HeroCardProps) {
  const [activeNav, setActiveNav] = useState<'home' | 'about' | 'product' | 'blog' | 'docs'>('home');
  const [modalTopic, setModalTopic] = useState<'about' | 'product' | 'docs' | null>(null);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About us' },
    { id: 'product', label: 'Product' },
    { id: 'blog', label: 'Blog' },
    { id: 'docs', label: 'Docs' },
  ] as const;

  const handleNavClick = (id: typeof navItems[number]['id']) => {
    setActiveNav(id);
    if (id === 'about' || id === 'product' || id === 'docs') {
      setModalTopic(id);
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Outer subtle glow aura */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/20 via-teal-500/10 to-blue-500/20 rounded-[28px] blur-xl opacity-75 pointer-events-none" />

      {/* The Central Web 3.0 Window Frame (matching user's uploaded reference image) */}
      <div className="relative rounded-[24px] sm:rounded-[28px] bg-[#070b14]/95 border border-cyan-500/30 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9),0_0_50px_-10px_rgba(6,182,212,0.25)] overflow-hidden backdrop-blur-2xl transition-all duration-300">
        {/* Top Header Bar inside the Window */}
        <div className="relative z-20 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-cyan-900/30 bg-[#060912]/80 backdrop-blur-md">
          {/* Left Brand Mark */}
          <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => setActiveNav('home')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600 p-0.5 shadow-md shadow-cyan-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <div className="w-full h-full bg-[#070a14] rounded-[6px] flex items-center justify-center">
                <Cpu className="w-4 h-4 text-cyan-300 icon-anim" />
              </div>
            </div>
            <span className="font-sharp font-bold text-sm sm:text-base tracking-wider text-slate-100 group-hover:text-cyan-300 transition-colors">
              {PRODUCT_NAME}
            </span>
          </div>

          {/* Center Navigation Links (Exact labels: Home, About us, Product, Blog, Docs) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-medium text-slate-300">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 transition-all duration-200 hover:text-cyan-300 cursor-pointer ${
                  activeNav === item.id ? 'text-cyan-300 font-semibold' : 'text-slate-400'
                }`}
              >
                <span>{item.label}</span>
                {activeNav === item.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-in fade-in" />
                )}
              </button>
            ))}
          </nav>

          {/* Right Action Buttons: "Log in" and "Connect Us" */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {isLoggedIn ? (
              <button
                onClick={onEnterWorkspace}
                className="btn-modern-pill group cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-slate-950 icon-anim" />
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-950 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            ) : (
              <>
                <button
                  onClick={onLoginClick || onConnectClick}
                  className="px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-cyan-300 transition-all duration-200 hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30 cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={onConnectClick || onLoginClick}
                  className="btn-modern-pill group cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950 icon-anim" />
                  <span>Connect Us</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hero Body Content */}
        <div className="relative pt-12 sm:pt-16 pb-36 sm:pb-48 px-4 sm:px-8 text-center overflow-hidden">
          {/* Subtle Ambient Light Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[260px] bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Kicker Headline (Matching reference image: "Your Partner for") */}
          <div className="relative z-10 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <span className="text-sm sm:text-base text-slate-300 font-sans tracking-wide font-normal">
              Your Partner for
            </span>
          </div>

          {/* Massive Glowing Title (Matching reference image: "WEB 3.0") */}
          <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6 my-2 animate-in fade-in zoom-in-95 duration-700">
            {/* Left Binary Marker Dots */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-cyan-400/60 select-none">
              <span>✦</span>
              <span className="tracking-widest">110010</span>
              <span>011010</span>
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-sharp font-black tracking-wider web3-glow-title uppercase select-none">
              WEB 3.0
            </h1>

            {/* Right Binary Marker Dots */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-cyan-400/60 select-none">
              <span className="tracking-widest">011010</span>
              <span>111010</span>
              <span>✦</span>
            </div>
          </div>

          {/* Subtext description & quick launch buttons */}
          <div className="relative z-10 max-w-xl mx-auto mt-4 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans font-light">
              Autonomous engineering execution platform with cryptographic proof of work,
              collaborative missions, and deterministic merit recognition.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={onConnectClick || onLoginClick}
                className="btn-modern-primary px-5 py-2.5 text-xs flex items-center gap-2 group cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950 icon-anim" />
                <span>Launch Nexora App</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-950 transition-transform duration-300 group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => setModalTopic('product')}
                className="btn-modern-secondary px-4 py-2.5 text-xs flex items-center gap-2 group cursor-pointer"
              >
                <Code className="w-3.5 h-3.5 text-cyan-400 icon-anim" />
                <span>Explore Architecture</span>
              </button>
            </div>
          </div>

          {/* Animated 3D Interactive Constellation Mesh Horizon at the Bottom */}
          <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 pointer-events-none overflow-hidden">
            <Web3ConstellationCanvas />
          </div>
        </div>

        {/* Bottom Status Ticker strip inside window */}
        <div className="relative z-20 px-4 sm:px-6 py-2.5 border-t border-cyan-900/25 bg-[#050811]/90 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
            <span className="text-slate-300">NEXORA PROTOCOL ACTIVE</span>
            <span className="text-cyan-400/60 hidden sm:inline">• ED25519 VERIFICATION RUNNING</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="hover:text-cyan-300 cursor-pointer transition-colors" onClick={() => setModalTopic('docs')}>
              View Whitepaper
            </span>
            <span>/</span>
            <span className="hover:text-cyan-300 cursor-pointer transition-colors" onClick={() => setModalTopic('about')}>
              Security Model
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Modal for "About us" / "Product" / "Docs" */}
      {modalTopic && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setModalTopic(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#090e1c] border border-cyan-500/30 p-6 space-y-4 shadow-2xl shadow-cyan-950/40 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1a2540] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="font-sharp font-bold text-sm text-white uppercase tracking-wider">
                  {modalTopic === 'about' && 'About Nexora Web 3.0'}
                  {modalTopic === 'product' && 'Product Architecture & Workflows'}
                  {modalTopic === 'docs' && 'Protocol Documentation & Security'}
                </h3>
              </div>
              <button
                onClick={() => setModalTopic(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#151d33] transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              {modalTopic === 'about' && (
                <>
                  <p>
                    Nexora is a high-assurance engineering workspace that combines multi-role task governance,
                    cryptographic proof submissions, and peer accountability.
                  </p>
                  <p>
                    Designed for distributed protocols, cryptography teams, and mission-critical engineering units
                    that demand transparent milestones and verifiable deliverable audit trails.
                  </p>
                </>
              )}

              {modalTopic === 'product' && (
                <>
                  <div className="p-3 rounded-xl bg-[#0e162d] border border-cyan-500/20 space-y-2">
                    <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4" />
                      <span>Verifiable Deliverables</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Submit raw benchmark logs, differential SVG graphs, and cryptographic hashes evaluated directly by leadership.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0e162d] border border-cyan-500/20 space-y-2">
                    <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>Leader Merit Bonus System</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Full authority for leaders to award merit points to co-leaders, members, and self with immutable audit trails.
                    </p>
                  </div>
                </>
              )}

              {modalTopic === 'docs' && (
                <>
                  <p>
                    Nexora operates with strict zero-leak role boundaries (Leader, Co-Leader, Member) backed by
                    server-authoritative session validation and isolated workspace scopes.
                  </p>
                  <div className="p-2.5 rounded-lg bg-[#070b14] border border-[#1b2644] font-mono text-[10px] text-cyan-300">
                    GET /api/projects/:id/proofs → 200 OK (Verified)<br />
                    POST /api/users/:id/bonus → 200 OK (Leader Authorized)
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-[#1a2540] flex justify-end gap-2">
              <button
                onClick={() => setModalTopic(null)}
                className="px-4 py-2 rounded-xl bg-[#141d36] hover:bg-[#1a2748] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setModalTopic(null);
                  if (onConnectClick) onConnectClick();
                }}
                className="btn-modern-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Launch App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
