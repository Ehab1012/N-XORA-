import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Users,
  FolderGit2,
  Bell,
  ArrowRight,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { api } from '../../lib/api.js';
import { OnboardingState } from '../../../shared/types.js';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user, workspace, role } = useAuth();
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState<number>(1);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getOnboarding().then((data) => {
        setOnboarding(data);
        if (data.step === 'team') setStep(2);
        else if (data.step === 'project') setStep(3);
        else if (data.step === 'notifications') setStep(4);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const isLeader = role === 'leader';

  const handleNext = async (nextStepIndex: number, stepName: string) => {
    setSaving(true);
    try {
      await api.updateOnboardingStep(stepName, invitedEmail || undefined);
      setInvitedEmail('');
      setStep(nextStepIndex);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await api.completeOnboarding();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = async () => {
    await api.dismissOnboarding();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl glass-panel rounded-2xl border border-purple-500/30 p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
        {/* Close/Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#1a1d36]"
          aria-label="Dismiss Onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-purple-950/70 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-mono text-purple-300 uppercase tracking-wider">
              {isLeader ? `Workspace Setup • Step ${step} of 4` : `Welcome to ${workspace?.name || 'Nexora'}`}
            </h3>
          </div>
        </div>

        {/* Dynamic Step Content */}
        {isLeader ? (
          <div className="space-y-6">
            {step === 1 && (
              <div>
                <h2 className="text-xl font-display font-bold text-slate-100 mb-2">
                  Verify Workspace Configuration
                </h2>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  Your workspace is initialized as <strong className="text-purple-300">{workspace?.name}</strong>.
                  Zero-trust IDOR controls and proof review policies are active.
                </p>
                <div className="p-4 rounded-xl bg-[#0f1120] border border-[#202444] space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Slug:</span>
                    <span>{workspace?.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Proof Verification Policy:</span>
                    <span className="text-teal-300">Mandatory Review</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Security Ingress:</span>
                    <span className="text-emerald-300">RBAC Token Enforced</span>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => handleNext(2, 'team')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium"
                  >
                    <span>Continue to Teams</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-xl font-display font-bold text-slate-100 mb-2">
                  Assemble Engineering Teams
                </h2>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  Invite teammates by email to collaborate on projects. They will be assigned appropriate permissions automatically.
                </p>
                <div className="space-y-3">
                  <label className="block text-xs text-slate-400">Teammate Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="colleague@domain.com"
                      value={invitedEmail}
                      onChange={(e) => setInvitedEmail(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-sm focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleNext(3, 'project')}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium"
                    >
                      Invite & Next
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center text-xs">
                  <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-200">
                    Back
                  </button>
                  <button onClick={() => setStep(3)} className="text-purple-400 hover:text-purple-300">
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-xl font-display font-bold text-slate-100 mb-2">
                  Connect Projects & Proof of Work
                </h2>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  Projects bind tasks, milestones, deliverables, and verifiable proofs into one context.
                  We seeded initial reference projects: <span className="text-purple-300">Aurora Protocol v3</span> and <span className="text-purple-300">Zero-Trust Mesh</span>.
                </p>
                <div className="p-4 rounded-xl bg-[#0f1120] border border-[#202444] space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-teal-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cryptographic Milestone tracking enabled</span>
                  </div>
                  <div className="flex items-center gap-2 text-teal-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Member proof submission verification pipeline ready</span>
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <button onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-slate-200">
                    Back
                  </button>
                  <button
                    onClick={() => handleNext(4, 'notifications')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium"
                  >
                    <span>Notification Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-xl font-display font-bold text-slate-100 mb-2">
                  Notification Alerts & Operational Readiness
                </h2>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  You will receive in-app alerts when proof is submitted for review, deadlines approach, or tasks are flagged as overdue.
                </p>
                <div className="p-4 rounded-xl bg-[#0f1120] border border-[#202444] space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Bell className="w-4 h-4" />
                    <span>Real-time proof review notifications: Active</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-300">
                    <Shield className="w-4 h-4" />
                    <span>Security audit logs enabled</span>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleComplete}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-900/30"
                  >
                    <span>Finish Setup & Open Dashboard</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-slate-100">
              Welcome, {user.name}!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              You are signed in as a <strong className="text-purple-300 uppercase font-mono">{role}</strong>.
              You have access to your assigned projects, tasks, milestones, and conversation channels.
            </p>
            <div className="p-4 rounded-xl bg-[#0f1120] border border-[#202444] space-y-2 text-xs">
              <div className="text-slate-400">First Recommended Action:</div>
              <div className="text-purple-300 font-medium">
                Review assigned tasks in "Aurora Protocol v3" and submit completion proof with test benchmarks.
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
