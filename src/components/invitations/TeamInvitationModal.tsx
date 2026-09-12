import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Link2,
  Mail,
  Copy,
  Check,
  Clock,
  X,
  AlertCircle,
  Shield,
  Trash2,
  RefreshCw,
  Send,
  Users,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { Project, ProjectInvitation, UserRole } from '../../../shared/types.js';
import { RoleBadge } from '../common/Badges.js';

interface TeamInvitationModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onInvitationCreated?: () => void;
}

export function TeamInvitationModal({ project, isOpen, onClose, onInvitationCreated }: TeamInvitationModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'email' | 'manage'>('link');

  // Link Invite State
  const [linkRole, setLinkRole] = useState<UserRole>('member');
  const [linkExpiresInDays, setLinkExpiresInDays] = useState<number>(7);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Email Invite State
  const [emailInput, setEmailInput] = useState('');
  const [emailRole, setEmailRole] = useState<UserRole>('member');
  const [emailExpiresInDays, setEmailExpiresInDays] = useState<number>(7);
  const [customNote, setCustomNote] = useState('');
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Manage Invites State
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'manage') {
      fetchInvitations();
    }
  }, [isOpen, activeTab, project.id]);

  const fetchInvitations = async () => {
    setLoadingInvites(true);
    try {
      const res = await api.getProjectInvitations(project.id);
      setInvitations(res.invitations || []);
    } catch (err) {
      console.error('Failed to load project invitations:', err);
    } finally {
      setLoadingInvites(false);
    }
  };

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setGenerating(true);
    setCopied(false);
    try {
      const res = await api.createProjectInvitations(project.id, {
        role: linkRole,
        expiresInDays: linkExpiresInDays,
      });
      setGeneratedLink(res.shareableUrl);
      if (onInvitationCreated) onInvitationCreated();
    } catch (err: any) {
      alert(err.message || 'Failed to generate invitation link.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = (urlToCopy: string) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setSendingEmails(true);
    setEmailError(null);
    setEmailSuccessMsg(null);

    const emails = emailInput
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    try {
      const res = await api.createProjectInvitations(project.id, {
        emails,
        role: emailRole,
        customNote,
        expiresInDays: emailExpiresInDays,
      });
      setEmailSuccessMsg(`Successfully sent ${res.invitations.length} invitation(s)!`);
      setEmailInput('');
      setCustomNote('');
      if (onInvitationCreated) onInvitationCreated();
    } catch (err: any) {
      setEmailError(err.message || 'Failed to send invitations.');
    } finally {
      setSendingEmails(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setRevokingId(invitationId);
    try {
      await api.revokeProjectInvitation(project.id, invitationId);
      setInvitations((prev) => prev.map((i) => (i.id === invitationId ? { ...i, status: 'revoked' } : i)));
    } catch (err: any) {
      alert(err.message || 'Failed to revoke invitation.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0d0f20] border border-[#23274e] rounded-3xl shadow-2xl shadow-purple-950/40 overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#1f2345] bg-[#090b17] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-sharp text-white">Invite Team Members</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300">
                  Project Invitation
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                Project: <span className="text-slate-200 font-medium">{project.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#141731] hover:bg-[#1d2147] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#1f2345] bg-[#090b17] px-5 pt-1 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('link')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'link'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Shareable Link</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'email'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Invite</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'manage'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Invites</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: Shareable Link */}
          {activeTab === 'link' && (
            <div className="space-y-5">
              <p className="text-xs text-slate-300 leading-relaxed">
                Generate a unique shareable link. Anyone with this link can join <strong className="text-purple-300">{project.title}</strong> directly as a member or leader.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Role Upon Joining</label>
                  <select
                    value={linkRole}
                    onChange={(e) => setLinkRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090b17] border border-[#23274e] text-slate-200 text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value="member">Contributor / Member</option>
                    <option value="co-leader">Co-Leader</option>
                    <option value="leader">Project Leader</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Link Expiration</label>
                  <select
                    value={linkExpiresInDays}
                    onChange={(e) => setLinkExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#090b17] border border-[#23274e] text-slate-200 text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value={1}>24 Hours</option>
                    <option value={7}>7 Days (Recommended)</option>
                    <option value={30}>30 Days</option>
                    <option value={0}>Never Expire</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateLink}
                disabled={generating}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Unique Invite Token...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Unique Invite Link</span>
                  </>
                )}
              </button>

              {generatedLink && (
                <div className="p-4 rounded-2xl bg-[#090b17] border border-purple-500/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-purple-300 font-semibold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      Unique Invite Link Ready
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {linkExpiresInDays === 0 ? 'Never Expire' : `Expires in ${linkExpiresInDays} days`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-[#0c0e21] p-2 rounded-xl border border-[#1e2348]">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="w-full bg-transparent text-xs font-mono text-slate-200 focus:outline-none px-2"
                    />
                    <button
                      onClick={() => handleCopyLink(generatedLink)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Email Invite */}
          {activeTab === 'email' && (
            <form onSubmit={handleSendEmails} className="space-y-4">
              {emailSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{emailSuccessMsg}</span>
                </div>
              )}

              {emailError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
                  Email Addresses (Comma or Newline separated) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="dev1@company.com, engineer@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090b17] border border-[#23274e] text-slate-200 placeholder-slate-600 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Project Role</label>
                  <select
                    value={emailRole}
                    onChange={(e) => setEmailRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090b17] border border-[#23274e] text-slate-200 text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value="member">Contributor / Member</option>
                    <option value="co-leader">Co-Leader</option>
                    <option value="leader">Project Leader</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Expiration</label>
                  <select
                    value={emailExpiresInDays}
                    onChange={(e) => setEmailExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#090b17] border border-[#23274e] text-slate-200 text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value={1}>24 Hours</option>
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Custom Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Welcome to the core architecture sprint!"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#090b17] border border-[#23274e] text-slate-200 placeholder-slate-600 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={sendingEmails || !emailInput.trim()}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 disabled:opacity-50"
              >
                {sendingEmails ? (
                  <span>Sending Invitations...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Project Invitations</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: Manage Invites */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Active & Past Invitations</span>
                <button
                  onClick={fetchInvitations}
                  disabled={loadingInvites}
                  className="hover:text-purple-300 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingInvites ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingInvites ? (
                <div className="py-8 text-center text-xs font-mono text-slate-500">
                  Loading project invitations...
                </div>
              ) : invitations.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-500 bg-[#090b17] rounded-2xl border border-[#1f2345] p-6">
                  No active or past invitations found for this project yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {invitations.map((inv) => {
                    const fullUrl = `${window.location.origin}/#invite/${inv.token}`;
                    return (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-2xl bg-[#090b17] border border-[#1f2345] flex items-center justify-between gap-3 text-left"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {inv.email || 'Shareable Link Invite'}
                            </span>
                            <RoleBadge role={inv.role} />
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-3">
                            <span>Token: {inv.token}</span>
                            <span>
                              Created: {new Date(inv.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {inv.status === 'pending' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300">
                              Pending
                            </span>
                          )}
                          {inv.status === 'accepted' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                              Accepted
                            </span>
                          )}
                          {inv.status === 'revoked' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-500">
                              Revoked
                            </span>
                          )}
                          {inv.status === 'expired' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/30 text-rose-300">
                              Expired
                            </span>
                          )}

                          {inv.status === 'pending' && (
                            <>
                              <button
                                title="Copy Link"
                                onClick={() => handleCopyLink(fullUrl)}
                                className="p-1.5 rounded-lg bg-[#141731] hover:bg-[#1d2147] text-slate-300 hover:text-white transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Revoke Invitation"
                                disabled={revokingId === inv.id}
                                onClick={() => handleRevoke(inv.id)}
                                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
