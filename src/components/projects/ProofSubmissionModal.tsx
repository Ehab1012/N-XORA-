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

    // Check size limit: max 5MB
    if (selected.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB');
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
          <label className="block text-xs font-mono uppercase tracking-wider text-purple-300 mb-1 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Attach Proof File (Log, Binary output, or Report)</span>
          </label>
          <div className="p-4 border border-dashed border-[#262a4a] hover:border-purple-500/40 rounded-xl bg-[#0e101c] text-center">
            {file ? (
              <div className="flex items-center justify-between text-xs text-teal-300">
                <span className="truncate max-w-[300px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-rose-400 hover:text-rose-300 ml-2 text-xs"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <span className="text-xs text-slate-400 block mb-1">
                  Drag & drop file or <span className="text-purple-400 underline">browse</span>
                </span>
                <span className="text-[10px] text-slate-500 block">Up to 5MB (JSON, TXT, PDF, PNG)</span>
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#202444] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-purple-900/30 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <FileCheck2 className="w-4 h-4" />
                <span>Submit Deliverable for Review</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
