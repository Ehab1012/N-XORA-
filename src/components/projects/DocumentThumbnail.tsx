import React, { useState } from 'react';
import {
  FileText,
  FileImage,
  FileCode,
  Video,
  Music,
  ExternalLink,
  Download,
  Eye,
  Trash2,
  Check,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StoredFile } from '../../../shared/types.js';
import { useAuth } from '../../contexts/AuthContext.js';

interface DocumentThumbnailProps {
  key?: React.Key;
  file: StoredFile;
  onSelect: (file: StoredFile) => void;
  onDelete?: (fileId: string) => Promise<void> | void;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export function DocumentThumbnail({
  file,
  onSelect,
  onDelete,
  size = 'md',
  showDetails = true,
}: DocumentThumbnailProps) {
  const { user, role } = useAuth();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isImage =
    (file.mimeType.startsWith('image/') ||
      file.name.endsWith('.svg') ||
      file.name.endsWith('.png') ||
      file.name.endsWith('.jpg') ||
      file.name.endsWith('.webp')) &&
    !imgError;

  const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isVideo = file.mimeType.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
  const isAudio = file.mimeType.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav');
  const isCode =
    file.mimeType.includes('json') ||
    file.mimeType.includes('javascript') ||
    file.mimeType.includes('text/') ||
    file.name.endsWith('.json') ||
    file.name.endsWith('.ts') ||
    file.name.endsWith('.md');
  const isDiagram = file.category === 'diagram' || file.tags?.includes('diagram') || file.name.includes('topology');

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(file.dataUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const canDelete = role === 'owner' || role === 'leader' || file.uploadedById === user?.id;

  const heightClass =
    size === 'sm' ? 'h-28' : size === 'lg' ? 'h-48' : 'h-36';

  return (
    <div
      onClick={() => onSelect(file)}
      className="group relative flex flex-col bg-[#0f1224] border border-[#23274c] hover:border-purple-500/50 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-purple-950/20 cursor-pointer"
    >
      {/* Visual Thumbnail Area */}
      <div className={`relative w-full ${heightClass} bg-[#080a16] flex items-center justify-center overflow-hidden border-b border-[#1c1f38]`}>
        {/* Visual Graphic 1: Image / Vector SVG / Diagram */}
        {isImage ? (
          <div className="relative w-full h-full flex items-center justify-center p-2 bg-[radial-gradient(#1e2242_1px,transparent_1px)] [background-size:12px_12px]">
            <img
              src={file.thumbnailUrl || file.dataUrl}
              alt={file.name}
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain rounded transition-transform duration-300 group-hover:scale-105"
            />
            {isDiagram && (
              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" /> Diagram
              </span>
            )}
          </div>
        ) : isPdf ? (
          /* Visual Graphic 2: Technical Document / PDF Specification Preview Card */
          <div className="relative w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-[#12162a] to-[#0a0c1a]">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-[#171b36] border border-rose-500/30 rounded-lg p-2.5 shadow-md flex flex-col justify-between overflow-hidden group-hover:border-rose-400/60 transition-colors">
              {/* PDF Header Ribbon */}
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-1.5">
                <div className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[9px] font-mono font-bold text-rose-300 uppercase">PDF SPEC</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              </div>

              {/* Faux Document Paragraph Skeleton Lines */}
              <div className="space-y-1 py-1">
                <div className="w-full h-1 bg-slate-600/50 rounded" />
                <div className="w-4/5 h-1 bg-slate-600/40 rounded" />
                <div className="w-full h-1 bg-slate-600/40 rounded" />
                <div className="w-3/5 h-1 bg-slate-600/30 rounded" />
                <div className="w-5/6 h-1 bg-slate-600/40 rounded" />
              </div>

              {/* Footer Indicator */}
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 border-t border-slate-700/30 pt-1">
                <span>SEC-VERIFIED</span>
                <span className="text-rose-400 font-semibold">{formatBytes(file.sizeBytes)}</span>
              </div>
            </div>
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-500/30">
              PDF
            </span>
          </div>
        ) : isVideo ? (
          /* Visual Graphic 3: Video Screencast / Media Player Thumbnail */
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#121630] to-[#070914]">
            <div className="w-11 h-11 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-lg group-hover:scale-110 group-hover:bg-sky-500/30 transition-transform">
              <Video className="w-5 h-5 ml-0.5" />
            </div>
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-950/80 text-sky-300 border border-sky-500/30">
              MP4 VIDEO
            </span>
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/70 text-slate-300">
              PREVIEW
            </span>
          </div>
        ) : isAudio ? (
          /* Visual Graphic 4: Audio / Waveform Thumbnail */
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0e1d24] to-[#070e14]">
            <div className="flex items-end gap-1 h-8 px-4">
              <div className="w-1.5 h-4 bg-emerald-400 rounded-full animate-pulse" />
              <div className="w-1.5 h-7 bg-emerald-400 rounded-full" />
              <div className="w-1.5 h-3 bg-emerald-400 rounded-full" />
              <div className="w-1.5 h-8 bg-emerald-300 rounded-full" />
              <div className="w-1.5 h-5 bg-emerald-400 rounded-full" />
              <div className="w-1.5 h-2 bg-emerald-400 rounded-full" />
            </div>
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              AUDIO
            </span>
          </div>
        ) : isCode ? (
          /* Visual Graphic 5: Code / JSON / Telemetry Snippet Preview */
          <div className="relative w-full h-full p-2.5 bg-[#080914] font-mono text-[10px] text-teal-400/80 overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-1.5 pb-1 border-b border-[#1c1f38]">
              <div className="w-2 h-2 rounded-full bg-rose-500/60" />
              <div className="w-2 h-2 rounded-full bg-amber-500/60" />
              <div className="w-2 h-2 rounded-full bg-teal-500/60" />
              <span className="text-[9px] text-slate-400 ml-1 truncate">{file.name}</span>
            </div>
            <div className="text-[10px] leading-tight text-slate-400/90 py-1 space-y-0.5">
              <p className="text-teal-300">&#123;</p>
              <p className="pl-2 text-slate-300">"status": "ok",</p>
              <p className="pl-2 text-cyan-300">"telemetry": [...]</p>
              <p className="text-teal-300">&#125;</p>
            </div>
            <span className="self-end px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#14182e] text-teal-300 border border-teal-500/30">
              JSON / CODE
            </span>
          </div>
        ) : (
          /* Fallback Graphic */
          <div className="relative w-full h-full flex items-center justify-center bg-[#0d1022]">
            <FileText className="w-8 h-8 text-purple-400" />
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#14182e] text-purple-300">
              FILE
            </span>
          </div>
        )}

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium shadow-md">
            <Eye className="w-3.5 h-3.5" />
            <span>Inspect</span>
          </span>
        </div>
      </div>

      {/* File Metadata Details */}
      {showDetails && (
        <div className="p-3 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-start justify-between gap-1.5">
              <h4
                className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 transition-colors truncate"
                title={file.name}
              >
                {file.name}
              </h4>
            </div>

            {file.description ? (
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                {file.description}
              </p>
            ) : (
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
                <span>{formatBytes(file.sizeBytes)}</span>
                <span>•</span>
                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#1c1f38] text-[11px]">
            <span className="text-slate-400 font-mono truncate max-w-[120px]">
              {file.uploadedByName ? `By ${file.uploadedByName}` : formatBytes(file.sizeBytes)}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyLink}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1a1d36] transition-colors"
                title="Copy Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleDownload}
                className="p-1 text-slate-400 hover:text-purple-300 rounded hover:bg-[#1a1d36] transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              {canDelete && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${file.name}"?`)) {
                      onDelete(file.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/30 transition-colors"
                  title="Delete File"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
