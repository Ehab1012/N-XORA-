import React, { useState, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  FileCode,
  Download,
  ExternalLink,
  Eye,
  X,
  Maximize2,
  FileCheck2,
  FileArchive,
  Paperclip,
  Loader2,
  Check,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Copy
} from 'lucide-react';
import { StoredFile } from '../../../shared/types.js';
import { api } from '../../lib/api.js';

interface ProofFilesViewerProps {
  attachments?: StoredFile[];
  attachmentIds?: string[];
  projectId?: string;
  compact?: boolean;
  className?: string;
  onAttachFileClick?: () => void;
}

export function ProofFilesViewer({
  attachments,
  attachmentIds,
  projectId,
  compact = false,
  className = '',
  onAttachFileClick,
}: ProofFilesViewerProps) {
  const [resolvedFiles, setResolvedFiles] = useState<StoredFile[]>(attachments || []);
  const [loading, setLoading] = useState(false);
  const [activePreviewFile, setActivePreviewFile] = useState<StoredFile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync or fetch files
  useEffect(() => {
    if (attachments && attachments.length > 0) {
      setResolvedFiles(attachments);
      return;
    }

    if (attachmentIds && attachmentIds.length > 0) {
      let isMounted = true;
      setLoading(true);
      Promise.all(
        attachmentIds.map(async (id) => {
          try {
            const fetched = await api.getFileById(id);
            if (fetched) return fetched;
          } catch (err) {
            console.warn(`Could not resolve attachment ${id} via API, using fallback:`, err);
          }
          // Fallback file object so user never loses access to attachment
          return {
            id,
            name: id.replace(/^file_/, '') + '.dat',
            mimeType: 'application/octet-stream',
            sizeBytes: 1024,
            uploadedById: 'system',
            projectId: projectId || undefined,
            dataUrl: `/api/files/${id}/content`,
            createdAt: new Date().toISOString(),
          } as StoredFile;
        })
      )
        .then((files) => {
          if (isMounted) {
            const valid = files.filter((f): f is StoredFile => f !== null);
            setResolvedFiles(valid);
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setResolvedFiles([]);
    }
  }, [attachments, attachmentIds, projectId]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || isNaN(bytes)) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isImageFile = (file: StoredFile) => {
    const mime = file.mimeType?.toLowerCase() || '';
    const name = file.name?.toLowerCase() || '';
    return (
      mime.startsWith('image/') ||
      mime.includes('svg') ||
      name.endsWith('.svg') ||
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.webp') ||
      name.endsWith('.gif')
    );
  };

  const getFileUrl = (file: StoredFile) => {
    if (file.dataUrl && (file.dataUrl.startsWith('data:') || file.dataUrl.startsWith('http'))) {
      return file.dataUrl;
    }
    return `/api/files/${file.id}/content`;
  };

  const getFileIcon = (file: StoredFile) => {
    const mime = file.mimeType?.toLowerCase() || '';
    const name = file.name?.toLowerCase() || '';
    if (isImageFile(file)) return <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0 icon-anim" />;
    if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript') || name.endsWith('.json') || name.endsWith('.ts') || name.endsWith('.js')) {
      return <FileCode className="w-4 h-4 text-amber-400 shrink-0 icon-anim" />;
    }
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('gz') || name.endsWith('.zip')) {
      return <FileArchive className="w-4 h-4 text-purple-400 shrink-0 icon-anim" />;
    }
    return <FileText className="w-4 h-4 text-cyan-400 shrink-0 icon-anim" />;
  };

  const handleCopyLink = (file: StoredFile) => {
    const fullUrl = window.location.origin + getFileUrl(file);
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#0a0c18] border border-cyan-500/20 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
        <span>Loading attached deliverable & proof files...</span>
      </div>
    );
  }

  // When no files are resolved
  if (resolvedFiles.length === 0) {
    if (compact) return null;

    return (
      <div className={`p-4 rounded-xl bg-[#080b18]/80 border border-dashed border-[#1f2648] text-center space-y-2 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
          <Paperclip className="w-3.5 h-3.5 text-slate-500" />
          <span>No binary/media files attached to this deliverable yet</span>
        </div>
        {onAttachFileClick && (
          <button
            type="button"
            onClick={onAttachFileClick}
            className="btn-modern-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Paperclip className="w-3.5 h-3.5 icon-anim text-cyan-400" />
            <span>Attach Proof File</span>
          </button>
        )}
      </div>
    );
  }

  // Compact Mode (used in small cards or lists)
  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-cyan-400 icon-anim" />
          <span>Proof Files ({resolvedFiles.length})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {resolvedFiles.map((f) => (
            <a
              key={f.id}
              href={getFileUrl(f)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (isImageFile(f)) {
                  e.preventDefault();
                  setActivePreviewFile(f);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e101f] hover:bg-[#151c38] border border-[#232746] hover:border-cyan-500/50 text-[11px] text-slate-200 transition-all cursor-pointer group hover:-translate-y-0.5 active:scale-95"
              title={`${f.name} (${formatFileSize(f.sizeBytes)})`}
            >
              {getFileIcon(f)}
              <span className="truncate max-w-[150px] font-medium group-hover:text-cyan-300">{f.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">({formatFileSize(f.sizeBytes)})</span>
            </a>
          ))}
        </div>

        {/* Lightbox Modal */}
        {activePreviewFile && (
          <FilePreviewLightbox
            file={activePreviewFile}
            onClose={() => setActivePreviewFile(null)}
            getFileUrl={getFileUrl}
            formatFileSize={formatFileSize}
          />
        )}
      </div>
    );
  }

  // Full / Rich Mode
  return (
    <div className={`space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 font-semibold">
          <FileCheck2 className="w-4 h-4 text-cyan-400 icon-anim" />
          <span>Delivered Proof Files & Artifacts ({resolvedFiles.length})</span>
        </h4>
        <span className="text-[11px] text-slate-400 font-mono">
          Click preview to inspect full screen
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {resolvedFiles.map((file) => {
          const isImg = isImageFile(file);
          const fileUrl = getFileUrl(file);

          return (
            <div
              key={file.id}
              className="group p-3.5 rounded-2xl bg-[#090d1c] border border-cyan-500/25 hover:border-cyan-400/60 transition-all flex flex-col justify-between gap-3 shadow-md hover:shadow-cyan-950/30 hover:-translate-y-0.5"
            >
              {/* Visual preview header for images / SVG */}
              {isImg ? (
                <div
                  onClick={() => setActivePreviewFile(file)}
                  className="relative w-full h-40 rounded-xl overflow-hidden bg-[#050812] border border-[#1b2342] flex items-center justify-center cursor-pointer group-hover:border-cyan-500/50 transition-colors"
                >
                  <img
                    src={fileUrl}
                    alt={file.name}
                    className="w-full h-full object-contain p-1.5 select-none transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2 backdrop-blur-[2px]">
                    <span className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/40 hover:scale-105 transition-transform">
                      <Eye className="w-3.5 h-3.5 icon-anim" />
                      <span>Inspect Artifact</span>
                    </span>
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 uppercase font-semibold">
                    {file.name.split('.').pop() || 'IMG'}
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#060a16] border border-[#17213d] flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform">
                    {getFileIcon(file)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider font-semibold">
                      {file.mimeType || 'Data Document'}
                    </span>
                    <span className="text-xs font-semibold text-slate-100 truncate block mt-0.5">
                      {file.name}
                    </span>
                  </div>
                </div>
              )}

              {/* File Metadata */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 truncate pr-2 group-hover:text-cyan-200 transition-colors" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300 shrink-0 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30 font-semibold">
                    {formatFileSize(file.sizeBytes)}
                  </span>
                </div>

                {file.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                    {file.description}
                  </p>
                )}

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                  <span>Uploaded {new Date(file.createdAt).toLocaleDateString()}</span>
                  {file.uploadedByName && <span className="text-slate-400">by {file.uploadedByName}</span>}
                </div>
              </div>

              {/* Action Buttons with modern styling and icons */}
              <div className="pt-2.5 border-t border-[#161c36] flex items-center gap-2">
                {isImg && (
                  <button
                    type="button"
                    onClick={() => setActivePreviewFile(file)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 hover:text-white text-xs font-semibold transition-all cursor-pointer hover:shadow-md hover:shadow-cyan-950/40 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 icon-anim" />
                    <span>Inspect</span>
                  </button>
                )}

                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-[#101830] hover:bg-[#172348] border border-[#223058] text-slate-200 hover:text-cyan-300 text-xs font-medium transition-all hover:shadow-sm active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5 icon-anim" />
                  <span>Open Tab</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopyLink(file)}
                  className="inline-flex items-center justify-center p-2 rounded-xl bg-[#101830] hover:bg-[#172348] border border-[#223058] text-slate-300 hover:text-cyan-300 text-xs transition-all active:scale-95 cursor-pointer"
                  title="Copy Direct Link"
                >
                  {copiedId === file.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 icon-anim" />
                  )}
                </button>

                <a
                  href={fileUrl}
                  download={file.name}
                  className="inline-flex items-center justify-center p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 hover:text-white text-xs transition-all active:scale-95 shadow-sm"
                  title={`Download ${file.name}`}
                >
                  <Download className="w-3.5 h-3.5 icon-anim" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / High-Res Preview Modal */}
      {activePreviewFile && (
        <FilePreviewLightbox
          file={activePreviewFile}
          onClose={() => setActivePreviewFile(null)}
          getFileUrl={getFileUrl}
          formatFileSize={formatFileSize}
        />
      )}
    </div>
  );
}

// Lightbox Modal Component with Zoom & Rotation Controls
function FilePreviewLightbox({
  file,
  onClose,
  getFileUrl,
  formatFileSize,
}: {
  file: StoredFile;
  onClose: () => void;
  getFileUrl: (f: StoredFile) => string;
  formatFileSize: (b?: number) => string;
}) {
  const fileUrl = getFileUrl(file);
  const isSvg = file.name?.toLowerCase().endsWith('.svg') || file.mimeType?.includes('svg');
  const isImage = isSvg || file.mimeType?.startsWith('image/');

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[94vh] flex flex-col rounded-3xl bg-[#070b16] border border-cyan-500/35 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(6,182,212,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-900/30 bg-[#090e1e]/90 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-md">
              <FileCheck2 className="w-5 h-5 icon-anim" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">{file.name}</h3>
              <p className="text-[11px] font-mono text-cyan-300">
                {formatFileSize(file.sizeBytes)} • {file.mimeType || 'Deliverable'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Image zoom controls */}
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-[#0d142b] border border-cyan-500/20 mr-2">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 icon-anim" />
                </button>
                <span className="text-[11px] font-mono text-cyan-300 px-1 font-semibold">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 icon-anim" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
                  title="Rotate 90deg"
                >
                  <RotateCw className="w-4 h-4 icon-anim" />
                </button>
              </div>
            )}

            <a
              href={fileUrl}
              download={file.name}
              className="btn-modern-pill px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 icon-anim text-slate-950" />
              <span>Download</span>
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121c3b] hover:bg-[#1a2854] border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-semibold transition-all hover:scale-102"
            >
              <ExternalLink className="w-3.5 h-3.5 icon-anim" />
              <span>Open Raw</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-950/50 hover:border-rose-500/40 border border-transparent transition-all cursor-pointer"
            >
              <X className="w-5 h-5 icon-anim" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-[#04060d] select-none">
          {isImage ? (
            <div
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="max-w-full max-h-[70vh] flex items-center justify-center"
            >
              <img
                src={fileUrl}
                alt={file.name}
                className="max-w-full max-h-[68vh] object-contain rounded-xl border border-cyan-500/25 shadow-2xl bg-[#090d1c] p-2"
              />
            </div>
          ) : (
            <iframe
              src={fileUrl}
              title={file.name}
              className="w-full h-[70vh] rounded-2xl border border-cyan-500/25 bg-white shadow-2xl"
            />
          )}
        </div>

        {/* Footer info */}
        {file.description && (
          <div className="px-6 py-3 border-t border-cyan-900/30 bg-[#080d1e] text-xs text-slate-300">
            <strong className="text-cyan-300 font-semibold font-mono uppercase tracking-wider text-[11px]">
              Deliverable Summary:{' '}
            </strong>
            {file.description}
          </div>
        )}
      </div>
    </div>
  );
}

