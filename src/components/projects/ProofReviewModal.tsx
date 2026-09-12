import React, { useState } from 'react';
import { Shield, FileCheck2, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Download, Clock } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { ProofSubmission, User } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { ProofBadge } from '../common/Badges.js';
import { useAuth } from '../../contexts/AuthContext.js';

interface ProofReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proof: ProofSubmission | null;
  users: User[];
  onReviewCompleted: () => void;
}

export function ProofReviewModal({
  isOpen,
  onClose,
  proof,
  users,
  onReviewCompleted,
}: ProofReviewModalProps) {
  const { role } = useAuth();
  const [action, setAction] = useState<'approved' | 'changes_requested' | 'rejected'>('approved');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !proof) return null;

  const submitter = users.find((u) => u.id === proof.submittedById);
  const reviewer = users.find((u) => u.id === proof.reviewedById);
  const canReview = role === 'owner' || role === 'leader' || role === 'co-leader';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A concise review justification is required for verification audit');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.reviewProof(proof.id, action, reason.trim());
      onReviewCompleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Proof of Work Attestation"
      subtitle={`Submission ID: ${proof.id}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 text-sm">
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Current Status Bar */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#0f1122] border border-[#202444]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Status</span>
            <ProofBadge status={proof.status} />
          </div>
          <div className="text-right text-xs">
            <span className="text-slate-400 block">Submitted By</span>
            <span className="text-purple-300 font-medium">{submitter ? submitter.name : proof.submittedById}</span>
            <span className="text-[10px] text-slate-500 block">
              {new Date(proof.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Submitter's explanation */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-1.5">
            Deliverable Explanation
          </h4>
          <p className="p-4 rounded-xl bg-[#0e101c] border border-[#1e2240] text-slate-200 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap">
            {proof.explanation}
          </p>
        </div>

        {/* Artifact Links */}
        {proof.links && proof.links.length > 0 && (
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-1.5">
              Verified Verification Links
            </h4>
            <div className="space-y-1.5">
              {proof.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0e101c] border border-[#1e2240] text-purple-300 hover:text-purple-200 text-xs font-mono hover:border-purple-500/30 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{link}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Previous Review History */}
        {proof.reviewHistory && proof.reviewHistory.length > 0 && (
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Review Audit Trail ({proof.reviewHistory.length})</span>
            </h4>
            <div className="space-y-2">
              {proof.reviewHistory.map((rh) => {
                const histRev = users.find((u) => u.id === rh.reviewerId);
                return (
                  <div key={rh.id} className="p-3 rounded-lg bg-[#0c0d18] border border-[#1c1f36] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-200 capitalize flex items-center gap-1">
                        {rh.action === 'approved' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                        ) : rh.action === 'rejected' ? (
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>{rh.action.replace('_', ' ')}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {histRev ? histRev.name : rh.reviewerId} • {new Date(rh.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-400">{rh.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Review Form for Authorized Roles */}
        {canReview ? (
          <form onSubmit={handleSubmit} className="pt-4 border-t border-[#202444] space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-mono uppercase tracking-wider text-purple-300">
                Lead Attestation Decision
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAction('approved')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  action === 'approved'
                    ? 'bg-teal-950/80 border-teal-500 text-teal-200 ring-1 ring-teal-400'
                    : 'bg-[#121426] border-[#222544] text-slate-400 hover:bg-[#181a30]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Approve & Verify</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('changes_requested')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  action === 'changes_requested'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-1 ring-amber-400'
                    : 'bg-[#121426] border-[#222544] text-slate-400 hover:bg-[#181a30]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Request Changes</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('rejected')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  action === 'rejected'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-400'
                    : 'bg-[#121426] border-[#222544] text-slate-400 hover:bg-[#181a30]'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Reject</span>
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Review Attestation Criteria / Reason *
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detail verification findings, test outcomes, or specific changes required..."
                className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 placeholder-slate-500 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38] text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md shadow-purple-900/30"
              >
                {isSubmitting ? 'Recording...' : 'Submit Review Decision'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-lg bg-[#111324] border border-[#1f223f] text-xs text-slate-400 text-center">
            Review decisions require Leader, Co-Leader, or Owner permissions.
          </div>
        )}
      </div>
    </Modal>
  );
}
