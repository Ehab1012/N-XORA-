import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Check,
  AlertCircle,
  X,
  Clock,
  Sparkles,
  ArrowRight,
  Folder,
  User,
  Loader2,
  LogIn,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { RoleBadge } from '../common/Badges.js';
import { ProjectInvitation, UserRole } from '../../../shared/types.js';

interface AcceptInvitationModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onJoinedProject: (projectId: string) => void;
}

export function AcceptInvitationModal({ token, isOpen, onClose, onJoinedProject }: AcceptInvitationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [invData, setInvData] = useState<{
    invitation: ProjectInvitation;
    project: { id: string; title: string; description: string; status: string; accentColor: string; memberCount: number; deadline: string };
    inviter: { name: string; email?: string; role?: string; title?: string };
  } | null>(null);

  const [accepting, setAccepting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      loadInvitation();
    }
  }, [isOpen, token]);

  const loadInvitation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInvitationByToken(token);
      setInvData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load invitation. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await api.acceptProjectInvitation(token);
      setSuccessMessage(res.message || 'Successfully joined project!');
      setTimeout(() => {
        onJoinedProject(res.projectId);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0d0f20] border border-[#23274e] rounded-3xl shadow-2xl shadow-purple-950/50 overflow-hidden text-slate-100 p-6 sm:p-8 space-y-6 relative">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-900/40">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-sharp text-white">Project Invitation</h2>
              <p className="text-xs text-slate-400 font-mono">You've been invited to join a workspace project</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#141731] hover:bg-[#1d2147] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Loading */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400 font-mono text-xs">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <span>Validating Project Invitation Token...</span>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Invitation Error</p>
                <p className="mt-0.5 text-rose-200/80">{error}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#141731] hover:bg-[#1d2147] text-slate-200 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        ) : invData ? (
          <div className="space-y-5">
            {/* Project Overview Card */}
            <div className="p-4 rounded-2xl bg-[#090b17] border border-[#22264c] space-y-3 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: invData.project.accentColor || '#a855f7' }}
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-purple-400 font-semibold flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" />
                  {invData.project.status.toUpperCase()} PROJECT
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {invData.project.memberCount} Team Members
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{invData.project.title}</h3>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {invData.project.description || 'Collaborative engineering project.'}
                </p>
              </div>

              <div className="pt-2 border-t border-[#1a1d3b] flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Invited by <strong className="text-slate-200">{invData.inviter.name}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Role:</span>
                  <RoleBadge role={invData.invitation.role} />
                </div>
              </div>
            </div>

            {/* Success message state */}
            {successMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center justify-center gap-2 animate-in fade-in">
                <Check className="w-5 h-5 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            ) : invData.invitation.status !== 'pending' ? (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs text-center font-mono">
                This invitation is already {invData.invitation.status}.
              </div>
            ) : user ? (
              /* User logged in: Accept button */
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-900/40 disabled:opacity-50"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Joining Project...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Accept Invitation & Join Project</span>
                  </>
                )}
              </button>
            ) : (
              /* User NOT logged in */
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs text-center">
                  Please sign in or create an account to accept this invitation and join the project.
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('pending_invite_token', token);
                    window.location.hash = 'signin';
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Create Account to Join</span>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Quick Join Modal where user can paste an Invite Code or Link URL directly
 */
export function JoinWithCodeModal({
  isOpen,
  onClose,
  onJoinToken,
}: {
  isOpen: boolean;
  onClose: () => void;
  onJoinToken: (token: string) => void;
}) {
  const [codeOrUrl, setCodeOrUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeOrUrl.trim()) return;

    let token = codeOrUrl.trim();
    if (token.includes('#invite/')) {
      token = token.split('#invite/')[1]?.split('?')[0] || token;
    } else if (token.includes('/invite/')) {
      token = token.split('/invite/')[1]?.split('?')[0] || token;
    }

    if (!token.startsWith('inv_')) {
      setError('Please enter a valid invitation code (starting with "inv_") or full invite link.');
      return;
    }

    onJoinToken(token);
    setCodeOrUrl('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0d0f20] border border-[#23274e] rounded-3xl shadow-2xl p-6 text-slate-100 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Join Project with Code</h3>
              <p className="text-[11px] text-slate-400">Paste invite link or code provided by leader</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#141731] text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Invite Code or Link URL</label>
            <input
              type="text"
              required
              placeholder="e.g. inv_16f39a_x9k2 or https://.../#invite/inv_16f39a_x9k2"
              value={codeOrUrl}
              onChange={(e) => {
                setCodeOrUrl(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090b17] border border-[#23274e] text-slate-200 placeholder-slate-600 text-xs font-mono focus:border-purple-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
          >
            <span>Proceed to Invitation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
