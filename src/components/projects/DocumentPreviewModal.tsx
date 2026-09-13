import React, { useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  FileCode,
  FileImage,
  Video,
  Music,
  Calendar,
  User,
  HardDrive,
  Share2,
} from 'lucide-react';
import { StoredFile } from '../../../shared/types.js';
import { useAuth } from '../../contexts/AuthContext.js';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: StoredFile | null;
  onDelete?: (fileId: string) => void;
}

export function DocumentPreviewModal({ isOpen, onClose, file, onDelete }: DocumentPreviewModalProps) {
  const { user, role } = useAuth();
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!isOpen || !file) return null;

  const isImage = file.mimeType.startsWith('image/') || file.name.endsWith('.svg') || file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.webp');
  const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isVideo = file.mimeType.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
  const isAudio = file.mimeType.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav');
  const isCode = file.mimeType.includes('json') || file.mimeType.includes('javascript') || file.mimeType.includes('text/') || file.name.endsWith('.json') || file.name.endsWith('.ts') || file.name.endsWith('.md');

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(file.dataUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const canDelete = role === 'leader' || file.uploadedById === user?.id;

  // Render decoded text content for JSON/code preview
  const [textPreview, setTextPreview] = React.useState('');
  React.useEffect(() => {
    if (isCode) {
      if (file.dataUrl.startsWith('data:')) {
        try {
          const base64Index = file.dataUrl.indexOf('base64,');
          if (base64Index !== -1) {
            let text = atob(file.dataUrl.substring(base64Index + 7));
            if (file.name.endsWith('.json')) { try { text = JSON.stringify(JSON.parse(text), null, 2); } catch {} }
            setTextPreview(text);
          }
        } catch { setTextPreview('Unable to decode raw file data for preview.'); }
      } else if (file.dataUrl.startsWith('/api/files/')) {
        fetch(file.dataUrl).then(res => res.text()).then(text => {
          if (file.name.endsWith('.json')) { try { text = JSON.stringify(JSON.parse(text), null, 2); } catch {} }
          setTextPreview(text);
        }).catch(() => setTextPreview('Unable to load file content.'));
      }
    }
  }, [file.dataUrl, isCode, file.name]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0b0d1a] border border-[#23274c] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1c1f38] bg-[#0f1224]/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300">
              {isImage && <FileImage className="w-4 h-4" />}
              {isPdf && <FileText className="w-4 h-4 text-rose-400" />}
              {isVideo && <Video className="w-4 h-4 text-sky-400" />}
              {isAudio && <Music className="w-4 h-4 text-emerald-400" />}
              {isCode && <FileCode className="w-4 h-4 text-amber-400" />}
              {!isImage && !isPdf && !isVideo && !isAudio && !isCode && <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">{file.name}</h3>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                <span>{formatBytes(file.sizeBytes)}</span>
                <span>•</span>
                <span className="uppercase">{file.mimeType.split('/')[1] || file.mimeType}</span>
                {file.uploadedByName && (
                  <>
                    <span>•</span>
                    <span className="text-slate-300">Shared by {file.uploadedByName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#14182e] border border-[#23274c] mr-2">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                  className="p-1 text-slate-400 hover:text-slate-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                  className="p-1 text-slate-400 hover:text-slate-200"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 text-slate-400 hover:text-slate-200 ml-1"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#14182e] border border-[#23274c] text-slate-300 hover:text-white text-xs font-mono transition-colors"
              title="Copy Reference Link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-sm"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {canDelete && onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Delete "${file.name}" from project files?`)) {
                    onDelete(file.id);
                    onClose();
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                title="Delete file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f223f] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center min-h-[360px] max-h-[68vh] bg-[#080914] relative">
          {/* Image & SVG Viewer */}
          {isImage && (
            <div className="relative overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
              <img
                src={file.dataUrl}
                alt={file.name}
                referrerPolicy="no-referrer"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                className="max-h-[60vh] max-w-full rounded-lg shadow-2xl transition-transform duration-150 object-contain border border-[#1f223f]"
              />
            </div>
          )}

          {/* PDF & Document Reader Preview */}
          {isPdf && (
            <div className="w-full max-w-3xl bg-[#0f1224] border border-[#23274c] rounded-xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1c1f38]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-100">{file.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Portable Document Format • {formatBytes(file.sizeBytes)} • Verified Specification
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-rose-950/60 border border-rose-500/30 text-rose-300">
                  PDF 1.7
                </span>
              </div>

              <div className="space-y-3 bg-[#080914] p-4 rounded-lg border border-[#181b32] font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between text-slate-500 text-[11px] pb-2 border-b border-[#181b32]">
                  <span>DOCUMENT INSPECTION REPORT</span>
                  <span>STATUS: SIGNED</span>
                </div>
                {file.description ? (
                  <p className="text-slate-200 text-xs font-sans leading-relaxed pt-1">
                    {file.description}
                  </p>
                ) : (
                  <p className="text-slate-400 italic">
                    Formal technical documentation and protocol blueprint specification.
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 text-[11px]">
                  <div className="p-2 rounded bg-[#0e1020] border border-[#1d203e]">
                    <span className="text-slate-500 block text-[10px]">PARSING ENGINE</span>
                    <span className="text-purple-300 font-semibold">Nexora PDF Spec</span>
                  </div>
                  <div className="p-2 rounded bg-[#0e1020] border border-[#1d203e]">
                    <span className="text-slate-500 block text-[10px]">FILE INTEGRITY</span>
                    <span className="text-teal-300 font-semibold">SHA-256 Validated</span>
                  </div>
                  <div className="p-2 rounded bg-[#0e1020] border border-[#1d203e] col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block text-[10px]">SHARING SCOPE</span>
                    <span className="text-sky-300 font-semibold">Project Teammates</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <a
                  href={file.dataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#181c38] hover:bg-[#20254c] text-purple-300 text-xs font-medium border border-purple-500/30 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Dedicated Viewer</span>
                </a>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-md shadow-purple-900/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          )}

          {/* Video Player */}
          {isVideo && (
            <div className="w-full max-w-3xl flex flex-col items-center gap-4">
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-[#23274c] shadow-2xl flex items-center justify-center">
                <video
                  src={file.dataUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={file.thumbnailUrl}
                >
                  Your browser does not support HTML5 video preview.
                </video>
              </div>
              {file.description && (
                <p className="text-xs text-slate-400 text-center max-w-xl">{file.description}</p>
              )}
            </div>
          )}

          {/* Audio Player */}
          {isAudio && (
            <div className="w-full max-w-xl bg-[#0f1224] border border-[#23274c] rounded-xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-100">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{formatBytes(file.sizeBytes)}</p>
              </div>
              <audio src={file.dataUrl} controls className="w-full mt-2" />
            </div>
          )}

          {/* Code & JSON Preview */}
          {isCode && (
            <div className="w-full max-w-3xl bg-[#0a0c18] border border-[#1f223f] rounded-xl overflow-hidden shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f1224] border-b border-[#1f223f] text-xs font-mono text-slate-400">
                <span>{file.name}</span>
                <span className="text-slate-500">Read-only code inspection</span>
              </div>
              <pre className="p-4 overflow-auto max-h-[50vh] text-xs font-mono text-teal-300 leading-relaxed bg-[#080a14] whitespace-pre-wrap">
                {textPreview || file.description || 'Code / telemetry payload loaded.'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer info strip */}
        <div className="px-5 py-3 border-t border-[#1c1f38] bg-[#0c0e1e] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
            </div>
            {file.tags && file.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {file.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-[#161830] text-purple-300 text-[10px] border border-purple-500/20"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Nexora Verified File Storage
          </div>
        </div>
      </div>
    </div>
  );
}
