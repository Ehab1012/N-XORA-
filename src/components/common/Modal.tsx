import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        className={`relative w-full ${maxWidth} glass-panel rounded-t-3xl sm:rounded-2xl shadow-2xl sm:my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        style={{
          background: 'var(--surface-panel)',
          borderColor: 'var(--border-color)',
          borderWidth: 1,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Mobile sheet grabber handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center" style={{ background: 'var(--surface-header)' }}>
          <span className="w-10 h-1 rounded-full bg-slate-600/70" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 border-b"
          style={{
            background: 'var(--surface-header)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="min-w-0 flex-1">
            <h3 id="modal-title" className="text-base sm:text-lg font-display font-semibold text-slate-100 truncate">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 max-h-[82dvh] sm:max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
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
        <div
          className="flex items-center justify-end gap-3 pt-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-modern-ghost px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              destructive
                ? 'btn-modern-danger'
                : 'btn-modern-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
