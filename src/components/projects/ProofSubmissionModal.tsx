import React, { useState } from 'react';
import { FileCheck2, Link2, Upload, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { Task } from '../../../shared/types.js';
import { api } from '../../lib/api.js';

interface ProofSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onProofSubmitted: () => void;
}

export function ProofSubmissionModal({
  isOpen,
  onClose,
  task,
  onProofSubmitted,
}: ProofSubmissionModalProps) {
  const [explanation, setExplanation] = useState('');
  const [linksInput, setLinksInput] = useState('');
  const [file, setFile] = useState<{ name: string; mimeType: string; dataUrl: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Check size limit: max 1GB
    if (selected.size > 1024 * 1024 * 1024) {
      setError('File size must be under 1GB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFile({
        name: selected.name,
        mimeType: selected.type || 'application/octet-stream',
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      setError('A concise explanation of the delivered work is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      let attachmentIds: string[] = [];

      // If file attached, upload first
      if (file) {
        const uploaded = await api.uploadFile(file.name, file.mimeType, file.dataUrl, task.projectId);
        attachmentIds.push(uploaded.id);
      }

      const links = linksInput
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      await api.submitProof({
        taskId: task.id,
        projectId: task.projectId,
        explanation: explanation.trim(),
        links,
        attachmentIds,
      });

      onProofSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit proof');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Proof of Work"
      subtitle={`Verifiable deliverable for: ${task.title}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-purple-300 mb-1">
            Deliverable Explanation & Methodology *
          </label>
          <textarea
            rows={4}
            required
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explain how the implementation was verified, tests conducted, benchmark figures, and security considerations..."
            className="w-full px-3.5 py-2.5 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 placeholder-slate-500 text-sm focus:border-purple-500 focus:outline-none leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-purple-300 mb-1 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            <span>Verifiable Artifact Links (One per line)</span>
          </label>
          <textarea
            rows={2}
            value={linksInput}
            onChange={(e) => setLinksInput(e.target.value)}
            placeholder="https://github.com/org/repo/pull/42&#10;https://benchmarks.internal/ed25519-report.html"
            className="w-full px-3.5 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 placeholder-slate-500 font-mono text-xs focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-cyan-300 mb-1 flex items-center gap-1.5 font-semibold">
            <Upload className="w-3.5 h-3.5 icon-anim text-cyan-400" />
            <span>Attach Proof File (Log, Binary output, SVG, or Report)</span>
          </label>
          <div className="p-4 border border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl bg-[#090d1c] text-center transition-colors">
            {file ? (
              <div className="flex items-center justify-between text-xs text-cyan-200 bg-[#0f1730] p-3 rounded-xl border border-cyan-500/30">
                <div className="flex items-center gap-2 truncate">
                  <FileCheck2 className="w-4 h-4 text-cyan-400 shrink-0 icon-anim" />
                  <span className="truncate max-w-[280px] font-semibold">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-rose-400 hover:text-rose-300 ml-2 text-xs font-medium px-2 py-1 rounded-lg hover:bg-rose-950/40 cursor-pointer transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block group">
                <span className="text-xs text-slate-300 block mb-1">
                  Drag & drop file or <span className="text-cyan-400 font-semibold underline group-hover:text-cyan-300">browse file</span>
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">Supports all formats: SVG, PNG, JSON, PDF, TXT (up to 1GB)</span>
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#18203c] flex items-center justify-end gap-3">
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
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <>
                <FileCheck2 className="w-4 h-4 text-slate-950 icon-anim" />
                <span>Submit Deliverable for Review</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
