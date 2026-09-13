import React, { useState } from 'react';
import { Shield, KeyRound, ArrowRight, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '../../../shared/const.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { user, availableUsers, login, simulateOAuth, switchRole, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(email.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleQuickSelect = async (userId: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (user) {
        await switchRole(userId);
      } else {
        await simulateOAuth('Nexora SSO', userId);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to switch role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Switch Active Identity / Sign Out' : `Sign in to ${PRODUCT_NAME}`}
      subtitle={PRODUCT_TAGLINE}
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Instant Role Testing Accounts */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-purple-400 mb-2">
            Select Active Role Profile (Quick Evaluation)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(availableUsers.length > 0
              ? availableUsers
              : [
                  { id: 'usr_owner', name: 'Elena Vance', email: 'elena@nexora.internal', role: 'leader', title: 'Workspace Leader' },
                  { id: 'usr_leader', name: 'Marcus Chen', email: 'marcus@nexora.internal', role: 'leader', title: 'Engineering Leader' },
                  { id: 'usr_coleader', name: 'Sarah Jenkins', email: 'sarah@nexora.internal', role: 'co-leader', title: 'Product Co-Leader' },
                  { id: 'usr_member', name: 'Alex Rivera', email: 'alex@nexora.internal', role: 'member', title: 'Staff Member' },
                ]
            ).map((u) => {
              const isCurrent = user?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleRoleQuickSelect(u.id)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-400'
                      : 'bg-[#121426] border-[#222544] hover:border-purple-500/40 hover:bg-[#171a30]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-100">{u.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300 uppercase">
                      {u.role}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 truncate">{u.title || u.email}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-emerald-400 mt-1.5 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>Active Session</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#222544] w-full" />
          <span className="bg-[#121426] px-3 text-xs text-slate-500 font-mono uppercase">Or Enter Email</span>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="block text-xs text-slate-400 mb-1">
              Workspace Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              placeholder="e.g. alex@nexora.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors shadow-md shadow-purple-900/30"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign in with Email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {user && (
          <div className="pt-4 border-t border-[#20233f] flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Signed in as <strong className="text-slate-200">{user.name}</strong> ({user.role})
            </span>
            <button
              type="button"
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors"
            >
              Sign out of Workspace
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
