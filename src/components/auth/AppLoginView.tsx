import React, { useState } from 'react';
import { Cpu, ArrowRight, Lock, UserPlus, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { PRODUCT_NAME } from '../../../shared/const.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { RoleBadge } from '../common/Badges.js';
import { UserRole } from '../../../shared/types.js';

interface AppLoginViewProps {
  onSignedIn?: () => void;
}

export function AppLoginView({ onSignedIn }: AppLoginViewProps) {
  const { availableUsers, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
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
  const pendingToken = typeof window !== 'undefined'
    ? (window.location.hash.includes('invite/') ? window.location.hash.split('invite/')[1]?.split('?')[0] : localStorage.getItem('pending_invite_token'))
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
    <div className="min-h-screen bg-[#090a12] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 glass-panel border border-[#1f223f] p-6 sm:p-8 rounded-3xl shadow-2xl shadow-black/80 space-y-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-xl shadow-purple-900/40 mb-1">
            <Cpu className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-sharp font-bold tracking-tight text-white">
            {PRODUCT_NAME}
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Engineering & Project Workspace Platform
          </p>
        </div>

        {pendingToken && (
          <div className="p-3.5 rounded-2xl bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-2.5 animate-in fade-in">
            <UserPlus className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Project Invitation Detected! Sign in or create an account to join the team.</span>
          </div>
        )}

        {/* Tab Selector: Sign In vs Sign Up */}
        <div className="flex bg-[#0c0e1e] p-1 rounded-2xl border border-[#1e2245]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setSignInError(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'signin'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
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
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'signup'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {activeTab === 'signin' ? (
          <div className="space-y-4">
            {signInError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{signInError}</span>
              </div>
            )}

            {/* Sign in with Email Form */}
            <form onSubmit={handleSignInSubmit} className="space-y-3 pt-1">
              <label className="block text-[11px] font-mono text-slate-400">
                Account Email Address
              </label>
              <div className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090a14] border border-[#232746] text-slate-200 placeholder-slate-600 text-xs focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090a14] border border-[#232746] text-slate-200 placeholder-slate-600 text-xs focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !signInEmail.trim()}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Sign Up Form */
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            {signUpError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{signUpError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#090a14] border border-[#232746] text-slate-200 placeholder-slate-600 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="alex@nexora.internal"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#090a14] border border-[#232746] text-slate-200 placeholder-slate-600 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#090a14] border border-[#232746] text-slate-200 placeholder-slate-600 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Workspace Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#090a14] border border-[#232746] text-slate-200 text-xs focus:border-purple-500 focus:outline-none"
                >
                  <option value="leader">Team Leader</option>
                  <option value="co-leader">Co-Leader</option>
                  <option value="member">Team Member / Contributor</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !fullName.trim() || !signUpEmail.trim() || !password.trim()}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
            >
              <span>{loading ? 'Creating Account...' : 'Create Account & Enter'}</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="text-center text-[10px] font-mono text-slate-500 flex items-center justify-center gap-1.5 pt-2">
          <Lock className="w-3 h-3 text-purple-400" />
          <span>Local session verified via secure HTTP cookie</span>
        </div>
      </div>
    </div>
  );
}
