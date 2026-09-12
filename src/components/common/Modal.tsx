import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-xl' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className={`relative w-full ${maxWidth} glass-panel rounded-xl shadow-2xl border border-purple-500/20 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232742] bg-[#121426]/90">
          <div>
            <h3 id="modal-title" className="text-lg font-display font-semibold text-slate-100">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#202442] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  destructive = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#202442]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-[#202442] border border-[#2d325a] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              destructive
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
