import React, { useState, useEffect } from 'react';
import { Shield, FileCheck2, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Download, Clock } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { ProofSubmission, User } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { ProofBadge } from '../common/Badges.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { ProofFilesViewer } from './ProofFilesViewer.js';

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
  const [currentProof, setCurrentProof] = useState<ProofSubmission | null>(proof);
  const [action, setAction] = useState<'approved' | 'changes_requested' | 'rejected'>('approved');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync and fetch full proof with attachments
  useEffect(() => {
    if (!isOpen || !proof) {
      setCurrentProof(null);
      return;
    }
    setCurrentProof(proof);

    // Fetch full proof to ensure attachments are loaded
    let isMounted = true;
    api.getProof(proof.id)
      .then((full) => {
        if (isMounted && full) {
          setCurrentProof(full);
        }
      })
      .catch((err) => {
        console.warn('Could not refresh full proof:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, proof?.id]);

  if (!isOpen || !currentProof) return null;

  const submitter = users.find((u) => u.id === currentProof.submittedById);
  const reviewer = users.find((u) => u.id === currentProof.reviewedById);
  const canReview = role === 'leader' || role === 'co-leader';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A concise review justification is required for verification audit');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.reviewProof(currentProof.id, action, reason.trim());
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
      subtitle={`Submission ID: ${currentProof.id}`}
      maxWidth="max-w-3xl"
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
            <ProofBadge status={currentProof.status} />
          </div>
          <div className="text-right text-xs">
            <span className="text-slate-400 block">Submitted By</span>
            <span className="text-purple-300 font-medium">{submitter ? submitter.name : currentProof.submittedById}</span>
            <span className="text-[10px] text-slate-500 block">
              {new Date(currentProof.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Submitter's explanation */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-1.5">
            Deliverable Explanation & Methodology
          </h4>
          <p className="p-4 rounded-xl bg-[#0e101c] border border-[#1e2240] text-slate-200 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap">
            {currentProof.explanation}
          </p>
        </div>

        {/* Proof Files & Attachments */}
        <ProofFilesViewer
          attachments={currentProof.attachments}
          attachmentIds={currentProof.attachmentIds}
          projectId={currentProof.projectId}
        />

        {/* Artifact Links */}
        {currentProof.links && currentProof.links.length > 0 && (
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-purple-300 mb-1.5">
              Verified Verification Links
            </h4>
            <div className="space-y-1.5">
              {currentProof.links.map((link, idx) => (
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
        {currentProof.reviewHistory && currentProof.reviewHistory.length > 0 && (
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setAction('approved')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-95 ${
                  action === 'approved'
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-500/50'
                    : 'bg-[#0a0f20] border-[#1c264a] text-slate-300 hover:bg-[#0f1838] hover:border-emerald-500/40'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 icon-anim" />
                <span>Approve & Verify</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('changes_requested')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-95 ${
                  action === 'changes_requested'
                    ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-lg shadow-amber-950/50 ring-2 ring-amber-500/50'
                    : 'bg-[#0a0f20] border-[#1c264a] text-slate-300 hover:bg-[#0f1838] hover:border-amber-500/40'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 icon-anim" />
                <span>Request Changes</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('rejected')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-95 ${
                  action === 'rejected'
                    ? 'bg-rose-950/80 border-rose-400 text-rose-200 shadow-lg shadow-rose-950/50 ring-2 ring-rose-500/50'
                    : 'bg-[#0a0f20] border-[#1c264a] text-slate-300 hover:bg-[#0f1838] hover:border-rose-500/40'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-400 icon-anim" />
                <span>Reject</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono uppercase tracking-wider">
                Review Attestation Criteria / Reason *
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detail verification findings, test outcomes, or specific changes required..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080c1c] border border-cyan-500/30 text-slate-100 placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-modern-secondary px-4 py-2 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-modern-primary px-5 py-2.5 text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/40"
              >
                {isSubmitting ? 'Recording...' : 'Submit Review Decision'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-lg bg-[#111324] border border-[#1f223f] text-xs text-slate-400 text-center">
            Review decisions require Leader or Co-Leader permissions.
          </div>
        )}
      </div>
    </Modal>
  );
}
