import React, { useState } from 'react';
import {
  Cpu,
  ArrowRight,
  Lock,
  UserPlus,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Shield,
  Crown,
  UserCheck,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { PRODUCT_NAME } from '../../../shared/const.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { UserRole } from '../../../shared/types.js';
import { Web3HeroCard } from '../landing/Web3HeroCard.js';

interface AppLoginViewProps {
  onSignedIn?: () => void;
}

export function AppLoginView({ onSignedIn }: AppLoginViewProps) {
  const { availableUsers, login, register } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'quickdemo'>('quickdemo');

  // Sign-in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);

  // Sign-up state
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('member');
  const [signUpError, setSignUpError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Check for invite token in hash or localStorage
  const pendingToken =
    typeof window !== 'undefined'
      ? window.location.hash.includes('invite/')
        ? window.location.hash.split('invite/')[1]?.split('?')[0]
        : localStorage.getItem('pending_invite_token')
      : null;

  const handleSelectUser = async (email: string) => {
    setLoading(true);
    setSignInError(null);
    try {
      await login(email);
      if (onSignedIn) onSignedIn();
    } catch (err: any) {
      setSignInError(err.message || 'Failed to sign in. Please verify your email or create a new account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim()) return;
    await handleSelectUser(signInEmail.trim());
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !signUpEmail.trim() || !password.trim()) return;
    setLoading(true);
    setSignUpError(null);

    try {
      await register({
        name: fullName.trim(),
        email: signUpEmail.trim(),
        role: selectedRole,
        password: password,
      });
      if (onSignedIn) onSignedIn();
    } catch (err: any) {
      setSignUpError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen web3-outer-slashes text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Graphic Teal Angular Accents (Matching Reference Image) */}
      <div className="fixed top-0 right-0 w-[45vw] h-[35vh] pointer-events-none opacity-40 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-bl from-cyan-600/20 via-teal-800/10 to-transparent transform rotate-12 scale-125" />
      </div>
      <div className="fixed bottom-0 left-0 w-[40vw] h-[30vh] pointer-events-none opacity-30 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-tr from-cyan-700/20 via-teal-900/10 to-transparent transform -rotate-12 scale-125" />
      </div>

      {/* Main Top Showcase Area */}
      <div className="w-full flex-1 flex flex-col items-center justify-center py-6 sm:py-10 z-10">
        <Web3HeroCard
          onLoginClick={() => {
            setActiveTab('signin');
            setIsAuthModalOpen(true);
          }}
          onConnectClick={() => {
            setActiveTab('quickdemo');
            setIsAuthModalOpen(true);
          }}
        />

        {/* Quick Launch Action Ribbon Below Card */}
        <div className="w-full max-w-5xl mt-6 px-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Instant Access</span>
            </span>
            <span className="hidden sm:inline text-slate-400">
              One-click login available for Leader, Co-Leader, or Member profiles.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('quickdemo');
                setIsAuthModalOpen(true);
              }}
              className="btn-modern-secondary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400 icon-anim" />
              <span>Switch Demo Profile</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('signin');
                setIsAuthModalOpen(true);
              }}
              className="btn-modern-primary px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-950 icon-anim" />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer minimal info */}
      <footer className="w-full max-w-5xl py-4 z-10 border-t border-cyan-900/20 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
        <div>
          © 2026 NΞXORA WEB 3.0 • High-Assurance Engineering & Proof Attestation Protocol
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="hover:text-cyan-300 transition-colors cursor-pointer" onClick={() => setIsAuthModalOpen(true)}>
            Connect Wallet / Identity
          </span>
          <span>•</span>
          <span className="hover:text-cyan-300 transition-colors cursor-pointer" onClick={() => handleSelectUser('marcus@nexora.internal')}>
            Launch as Team Leader
          </span>
        </div>
      </footer>

      {/* Modern Authentication & Demo Role Picker Modal */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsAuthModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#090d1a] border border-cyan-500/35 p-6 sm:p-7 space-y-5 shadow-2xl shadow-cyan-950/50 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#131b34] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header branding */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="inline-flex p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30 mb-1">
                <Cpu className="w-6 h-6 text-slate-950" />
              </div>
              <h3 className="text-xl font-sharp font-bold text-white tracking-wide">
                Connect to {PRODUCT_NAME}
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Select a demonstration role or enter your credentials
              </p>
            </div>

            {pendingToken && (
              <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2.5">
                <UserPlus className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Project Invitation Detected! Sign in to join the workspace.</span>
              </div>
            )}

            {/* Tab Selector: Demo Roles vs Sign In vs Create Account */}
            <div className="flex bg-[#070b16] p-1 rounded-xl border border-cyan-950/60">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('quickdemo');
                  setSignInError(null);
                  setSignUpError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'quickdemo'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Demo Roles</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setSignInError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'signin'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setSignUpError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'signup'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3 h-3" />
                <span>Sign Up</span>
              </button>
            </div>

            {/* TAB 1: 1-Click Demo Profiles */}
            {activeTab === 'quickdemo' && (
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                  Instant Preview Accounts
                </span>
                <div className="space-y-2">
                  {availableUsers.map((u) => {
                    const isLeader = u.role === 'leader';
                    const isCoLeader = u.role === 'co-leader';
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u.email)}
                        disabled={loading}
                        className="w-full p-3 rounded-xl bg-[#0c1224] hover:bg-[#121c38] border border-cyan-500/20 hover:border-cyan-400/60 text-left transition-all duration-200 flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isLeader
                                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                                : isCoLeader
                                ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                                : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                            }`}
                          >
                            {isLeader ? (
                              <Crown className="w-4 h-4 text-amber-400 icon-anim" />
                            ) : isCoLeader ? (
                              <Shield className="w-4 h-4 text-indigo-400 icon-anim" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-cyan-400 icon-anim" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors block truncate">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono capitalize">
                              {u.role === 'leader' ? 'Leader (Full Bonus & Proof Authority)' : u.role === 'co-leader' ? 'Co-Leader' : 'Team Member'}
                            </span>
                          </div>
                        </div>

                        <span className="btn-modern-primary text-[11px] font-bold px-2.5 py-1 text-slate-950 flex items-center gap-1 shrink-0">
                          <span>Enter</span>
                          <ArrowRight className="w-3 h-3 text-slate-950 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Sign In Form */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                {signInError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{signInError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-400">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="marcus@nexora.internal"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-[#1e2a4a] text-slate-100 placeholder-slate-600 text-xs focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-400">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-[#1e2a4a] text-slate-100 placeholder-slate-600 text-xs focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !signInEmail.trim()}
                  className="w-full btn-modern-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                </button>
              </form>
            )}

            {/* TAB 3: Sign Up Form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3">
                {signUpError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{signUpError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Satoshi Nakamoto"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-[#1e2a4a] text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@protocol.org"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-[#1e2a4a] text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-[#1e2a4a] text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Initial Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-[#1e2a4a] text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="leader">Leader (Full Administration & Bonus Power)</option>
                    <option value="co-leader">Co-Leader (Reviews & Operations)</option>
                    <option value="member">Team Member / Engineering Contributor</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || !fullName.trim() || !signUpEmail.trim() || !password.trim()}
                  className="w-full btn-modern-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  <span>{loading ? 'Creating Account...' : 'Create Account & Launch'}</span>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                </button>
              </form>
            )}

            <div className="text-center text-[10px] font-mono text-slate-500 flex items-center justify-center gap-1.5 pt-1">
              <Lock className="w-3 h-3 text-cyan-400" />
              <span>TLS 1.3 Authenticated & Server Session Verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
