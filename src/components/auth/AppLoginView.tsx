import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Lock,
  UserPlus,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Users,
  Shield,
  Crown,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { PRODUCT_NAME } from '../../../shared/const.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { UserRole } from '../../../shared/types.js';
import { Web3HeroCard } from '../landing/Web3HeroCard.js';
import { Logo } from '../common/Logo.js';

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

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAuthModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthModalOpen]);

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
      setSignInError(
        err.message || 'Failed to sign in. Please verify your email or create a new account.'
      );
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
        password,
      });
      if (onSignedIn) onSignedIn();
    } catch (err: any) {
      setSignUpError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickRolePresets = [
    {
      label: 'Team Leader',
      email: 'marcus@nexora.internal',
      icon: Crown,
      accent: 'text-amber-300 border-amber-500/25 hover:border-amber-400/50 bg-amber-500/5',
    },
    {
      label: 'Co-Leader',
      email: 'sarah@nexora.internal',
      icon: Shield,
      accent: 'text-cyan-300 border-cyan-500/25 hover:border-cyan-400/50 bg-cyan-500/5',
    },
    {
      label: 'Member',
      email: 'alex@nexora.internal',
      icon: UserCheck,
      accent: 'text-sky-300 border-sky-500/25 hover:border-sky-400/50 bg-sky-500/5',
    },
  ];

  return (
    <div className="min-h-screen nexora-ambient-canvas text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Subtle Architectural Light Accents */}
      <div className="fixed top-0 right-0 w-[42vw] h-[34vh] pointer-events-none opacity-35 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-bl from-cyan-600/20 via-blue-800/10 to-transparent transform rotate-12 scale-125" />
      </div>
      <div className="fixed bottom-0 left-0 w-[38vw] h-[28vh] pointer-events-none opacity-25 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-tr from-cyan-700/20 via-slate-900/10 to-transparent transform -rotate-12 scale-125" />
      </div>

      {/* Main Showcase Area */}
      <div className="w-full flex-1 flex flex-col items-center justify-center py-4 sm:py-8 z-10">
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

        {/* Direct Role Evaluation & Sign-In Bar Below Frame */}
        <div className="w-full max-w-5xl mt-5 rounded-2xl bg-[#060a15]/85 border border-slate-800/90 px-4 sm:px-6 py-3.5 backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              Instant Workspace Preview
            </span>
            <span className="hidden sm:inline text-slate-700" aria-hidden="true">•</span>
            <span className="text-xs text-slate-400">
              Enter directly as a Leader, Co-Leader, or Member to test role-scoped workflows and AI actions.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
            {quickRolePresets.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.label}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectUser(preset.email)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${preset.accent}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{preset.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setIsAuthModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quiet Footer */}
      <footer className="w-full max-w-5xl py-4 z-10 border-t border-slate-800/70 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <div>
          &copy; 2026 NEXORA Systems · Verified Team Execution &amp; Proof Attestation Workspace
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <button
            type="button"
            className="hover:text-cyan-300 transition-colors cursor-pointer"
            onClick={() => {
              setActiveTab('signup');
              setIsAuthModalOpen(true);
            }}
          >
            Create Account
          </button>
          <span className="text-slate-700" aria-hidden="true">•</span>
          <button
            type="button"
            className="hover:text-cyan-300 transition-colors cursor-pointer"
            onClick={() => {
              setActiveTab('quickdemo');
              setIsAuthModalOpen(true);
            }}
          >
            All Demo Accounts
          </button>
        </div>
      </footer>

      {/* Authentication & Demo Role Picker Modal */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsAuthModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-[#080d1b] border border-cyan-500/30 p-6 sm:p-7 space-y-5 shadow-2xl shadow-black/90 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              aria-label="Close authentication modal"
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Branding */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="inline-flex w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600 p-px shadow-lg shadow-cyan-500/25 mb-1">
                <div className="w-full h-full bg-[#060914] rounded-[11px] flex items-center justify-center">
                  <Logo className="w-6 h-6" size={24} />
                </div>
              </div>
              <h3 className="text-lg font-sharp font-bold text-white tracking-wider">
                Access NEXORA
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Choose an active workspace profile or sign in with your account
              </p>
            </div>

            {pendingToken && (
              <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/35 text-cyan-200 text-xs flex items-center gap-2.5">
                <UserPlus className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Project invitation detected. Sign in to join the workspace.</span>
              </div>
            )}

            {/* Segmented Tab Bar */}
            <div className="flex bg-[#050812] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('quickdemo');
                  setSignInError(null);
                  setSignUpError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'quickdemo'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Demo Roles</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setSignInError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setSignUpError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>

            {/* TAB 1: 1-Click Demo Profiles */}
            {activeTab === 'quickdemo' && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                  Workspace Evaluation Accounts
                </span>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {availableUsers.map((u) => {
                    const isLeader = u.role === 'leader';
                    const isCoLeader = u.role === 'co-leader';
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u.email)}
                        disabled={loading}
                        className="w-full p-3 rounded-xl bg-[#0b1224] hover:bg-[#101a34] border border-slate-800 hover:border-cyan-500/45 text-left transition-colors duration-200 flex items-center justify-between gap-3 group cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isLeader
                                ? 'bg-amber-500/15 border border-amber-500/35 text-amber-300'
                                : isCoLeader
                                ? 'bg-indigo-500/15 border border-indigo-500/35 text-indigo-300'
                                : 'bg-cyan-500/15 border border-cyan-500/35 text-cyan-300'
                            }`}
                          >
                            {isLeader ? (
                              <Crown className="w-4 h-4 text-amber-400" />
                            ) : isCoLeader ? (
                              <Shield className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-cyan-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-slate-100 group-hover:text-cyan-300 transition-colors block truncate">
                              {u.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {u.role === 'leader'
                                ? 'Leader · Task Assignment & Proof Authority'
                                : u.role === 'co-leader'
                                ? 'Co-Leader · Delegated Operations & Review'
                                : 'Member · Execution & Deliverable Proofs'}
                            </span>
                          </div>
                        </div>

                        <span className="btn-modern-primary text-[11px] font-bold px-2.5 py-1 text-slate-950 inline-flex items-center gap-1 shrink-0">
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
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{signInError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Workspace Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="marcus@nexora.internal"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050812] border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050812] border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !signInEmail.trim()}
                  className="w-full btn-modern-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Signing In...' : 'Sign In to Workspace'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                </button>
              </form>
            )}

            {/* TAB 3: Sign Up Form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3">
                {signUpError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{signUpError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jordan Vance"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#050812] border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jordan@nexora.io"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#050812] border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#050812] border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Workspace Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#050812] border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="leader">Leader (Administration &amp; Task Assignment)</option>
                    <option value="co-leader">Co-Leader (Reviews &amp; Operations)</option>
                    <option value="member">Member (Engineering &amp; Proof Delivery)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || !fullName.trim() || !signUpEmail.trim() || !password.trim()}
                  className="w-full btn-modern-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-50"
                >
                  <span>{loading ? 'Creating Account...' : 'Create Account & Launch'}</span>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                </button>
              </form>
            )}

            <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
              <Lock className="w-3 h-3 text-cyan-400" />
              <span>Authenticated Server Session &amp; Role Isolation</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
