import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  FileCode,
  Download,
  ExternalLink,
  Eye,
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Copy,
  Check,
  Search,
  BookOpen,
  Palette,
  KeyRound,
  FileSpreadsheet,
  Film,
  Music,
  Code2,
  WrapText,
  FileCheck2,
  Sparkles,
  Layers,
  Info,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ResourceItem, ResourceCategory } from '../../../shared/types.js';
import { MarkdownDocumentSkeleton, CodeViewerSkeleton } from '../common/Skeleton.js';

interface ResourceFileViewerModalProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export type DetectedViewerType =
  | 'image'
  | 'pdf'
  | 'markdown'
  | 'code'
  | 'video'
  | 'audio'
  | 'web_link'
  | 'binary';

export function detectResourceType(resource: ResourceItem): {
  type: DetectedViewerType;
  extension: string;
  isExternalLink: boolean;
} {
  const url = (resource.dataUrl || resource.url || '').trim();
  const fileName = (resource.fileName || resource.title || '').toLowerCase();
  const fileType = (resource.fileType || '').toLowerCase();

  // Extract extension
  let extension = '';
  const cleanNameMatch = fileName.split('?')[0].split('#')[0];
  if (cleanNameMatch.includes('.')) {
    extension = cleanNameMatch.split('.').pop() || '';
  } else if (url.includes('.')) {
    const extMatch = url.split('?')[0].split('#')[0].split('.').pop() || '';
    if (extMatch.length <= 5) extension = extMatch.toLowerCase();
  }

  const isExternalLink = url.startsWith('http://') || url.startsWith('https://');

  // Check MIME or extension
  if (
    fileType.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'bmp', 'ico'].includes(extension) ||
    resource.category === 'design' && (resource.thumbnailUrl || url.startsWith('data:image/'))
  ) {
    return { type: 'image', extension: extension || 'image', isExternalLink };
  }

  if (fileType === 'application/pdf' || extension === 'pdf') {
    return { type: 'pdf', extension: 'pdf', isExternalLink };
  }

  if (
    ['md', 'markdown', 'mdown'].includes(extension) ||
    fileType.includes('markdown')
  ) {
    return { type: 'markdown', extension: 'md', isExternalLink };
  }

  if (
    fileType.startsWith('video/') ||
    ['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(extension)
  ) {
    return { type: 'video', extension: extension || 'video', isExternalLink };
  }

  if (
    fileType.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)
  ) {
    return { type: 'audio', extension: extension || 'audio', isExternalLink };
  }

  if (
    [
      'ts',
      'tsx',
      'js',
      'jsx',
      'json',
      'sql',
      'py',
      'rs',
      'go',
      'html',
      'css',
      'yaml',
      'yml',
      'toml',
      'proto',
      'graphql',
      'sh',
      'bash',
      'zsh',
      'txt',
      'env',
      'xml',
      'csv',
      'diff',
      'patch',
      'c',
      'cpp',
      'h',
    ].includes(extension) ||
    fileType.includes('json') ||
    fileType.includes('javascript') ||
    fileType.includes('typescript') ||
    fileType.includes('text/')
  ) {
    return { type: 'code', extension: extension || 'text', isExternalLink };
  }

  if (isExternalLink && !url.includes('/api/files/')) {
    return { type: 'web_link', extension: extension || 'web', isExternalLink: true };
  }

  return { type: 'binary', extension: extension || 'bin', isExternalLink };
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return 'Unknown size';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function ResourceFileViewerModal({
  resource,
  isOpen,
  onClose,
}: ResourceFileViewerModalProps) {
  if (!isOpen || !resource) return null;

  const { type: detectedType, extension } = useMemo(
    () => detectResourceType(resource),
    [resource]
  );

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  // Image controls
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showCheckerboard, setShowCheckerboard] = useState(true);

  // Code / Markdown controls
  const [markdownViewMode, setMarkdownViewMode] = useState<'preview' | 'source'>('preview');
  const [wrapLines, setWrapLines] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [textContent, setTextContent] = useState<string>('');
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Reset zoom on resource change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setSearchQuery('');
  }, [resource.id]);

  // Resolve best content URL
  const resolvedContentUrl = useMemo(() => {
    if (resource.dataUrl && (resource.dataUrl.startsWith('data:') || resource.dataUrl.startsWith('/api/files/'))) {
      return resource.dataUrl;
    }
    if (resource.url) {
      return resource.url;
    }
    if (resource.thumbnailUrl) {
      return resource.thumbnailUrl;
    }
    return `/api/resources/${resource.id}/content`;
  }, [resource]);

  // Load text / code content when viewing code or markdown
  useEffect(() => {
    if (detectedType !== 'code' && detectedType !== 'markdown') return;

    setTextLoading(true);
    setTextError(null);

    // If resource has a direct preview snippet or dataUrl
    const url = resolvedContentUrl;

    if (url.startsWith('data:')) {
      try {
        const commaIdx = url.indexOf(',');
        if (commaIdx !== -1) {
          const meta = url.substring(5, commaIdx);
          const raw = url.substring(commaIdx + 1);
          if (meta.includes(';base64')) {
            const decoded = atob(raw);
            setTextContent(decoded);
          } else {
            setTextContent(decodeURIComponent(raw));
          }
          setTextLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn('Failed to parse inline dataUrl:', err);
      }
    }

    if (resource.previewSnippet) {
      setTextContent(resource.previewSnippet);
      setTextLoading(false);
      return;
    }

    // Attempt to fetch file content via API or direct URL
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((text) => {
        setTextContent(text);
      })
      .catch((err) => {
        // Fallback to description or helpful sample if remote doc is protected
        if (resource.description) {
          setTextContent(
            `# ${resource.title}\n\n${resource.description}\n\n*Reference: ${resource.url || resource.fileName || 'Project Resource'}*`
          );
        } else {
          setTextError(`Could not load raw text stream: ${err.message}`);
        }
      })
      .finally(() => {
        setTextLoading(false);
      });
  }, [resource, detectedType, resolvedContentUrl]);

  const handleCopyLink = () => {
    const fullUrl = resolvedContentUrl.startsWith('http')
      ? resolvedContentUrl
      : `${window.location.origin}${resolvedContentUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyContent = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  const getCategoryBadge = (cat: ResourceCategory) => {
    switch (cat) {
      case 'specification':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-950/80 border border-purple-500/40 text-purple-300">
            <FileText className="w-3 h-3" />
            <span>Specification</span>
          </span>
        );
      case 'documentation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-950/80 border border-sky-500/40 text-sky-300">
            <BookOpen className="w-3 h-3" />
            <span>Documentation</span>
          </span>
        );
      case 'design':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-pink-950/80 border border-pink-500/40 text-pink-300">
            <Palette className="w-3 h-3" />
            <span>Design Blueprint</span>
          </span>
        );
      case 'credentials_vault':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 border border-amber-500/40 text-amber-300">
            <KeyRound className="w-3 h-3" />
            <span>Credentials Vault</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
            <FileText className="w-3 h-3" />
            <span>Resource</span>
          </span>
        );
    }
  };

  // Filter lines if searching code/text
  const lines = useMemo(() => {
    return textContent.split('\n');
  }, [textContent]);

  const filteredLineIndices = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const set = new Set<number>();
    lines.forEach((l, idx) => {
      if (l.toLowerCase().includes(q)) set.add(idx);
    });
    return set;
  }, [lines, searchQuery]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex flex-col rounded-2xl bg-[#080b18] border border-purple-500/30 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(168,85,247,0.18)] transition-all duration-300 overflow-hidden ${
          isFullscreen
            ? 'w-[99vw] h-[98vh] max-w-none max-h-none rounded-none'
            : 'w-full max-w-5xl h-[88vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-[#1b1f40] bg-[#0c1024]/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-950/70 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 shadow-md">
              {detectedType === 'image' && <ImageIcon className="w-5 h-5 text-pink-400" />}
              {detectedType === 'pdf' && <FileText className="w-5 h-5 text-rose-400" />}
              {detectedType === 'markdown' && <BookOpen className="w-5 h-5 text-sky-400" />}
              {detectedType === 'code' && <Code2 className="w-5 h-5 text-amber-400" />}
              {detectedType === 'video' && <Film className="w-5 h-5 text-emerald-400" />}
              {detectedType === 'audio' && <Music className="w-5 h-5 text-indigo-400" />}
              {detectedType === 'web_link' && <ExternalLink className="w-5 h-5 text-purple-400" />}
              {detectedType === 'binary' && <FileCode className="w-5 h-5 text-slate-400" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate max-w-[320px] sm:max-w-md">
                  {resource.title}
                </h3>
                {getCategoryBadge(resource.category)}
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-purple-900/40 text-purple-300 border border-purple-700/40">
                  {extension || detectedType}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                {resource.fileName && (
                  <span className="text-slate-300 font-medium truncate max-w-[200px]">
                    {resource.fileName}
                  </span>
                )}
                {resource.fileSize && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(resource.fileSize)}</span>
                  </>
                )}
                {resource.createdAt && (
                  <>
                    <span>•</span>
                    <span>Added {new Date(resource.createdAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {/* Copy direct link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-[#121633] hover:bg-[#1a214d] border border-[#242b5c] text-slate-300 hover:text-purple-300 text-xs transition-colors flex items-center gap-1.5"
              title="Copy web link to resource file"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium text-[11px] hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>

            {/* Download Button */}
            <a
              href={resolvedContentUrl}
              download={resource.fileName || `${resource.title}.${extension || 'dat'}`}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#141838] hover:bg-[#1f2557] border border-[#262f68] text-purple-300 hover:text-purple-200 text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Download file to computer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Download</span>
            </a>

            {/* Open in new native browser tab */}
            <a
              href={resolvedContentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Open raw file in a new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Raw Tab</span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-[#121633] hover:bg-[#1a214d] border border-[#242b5c] text-slate-300 hover:text-white text-xs transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Expand full screen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#15172e] hover:bg-rose-950/60 hover:text-rose-300 border border-[#262b59] hover:border-rose-700/50 text-slate-400 transition-colors ml-1"
              title="Close viewer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Secondary Sub-Toolbar for type-specific controls */}
        {detectedType === 'image' && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-[#0a0d1e] border-b border-[#181d3d] text-xs text-slate-300 shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-purple-300 font-medium">Image View Controls:</span>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
                className="p-1 rounded-lg bg-[#141838] hover:bg-[#1e2554] border border-[#262e63] text-slate-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-purple-300 text-xs font-semibold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                className="p-1 rounded-lg bg-[#141838] hover:bg-[#1e2554] border border-[#262e63] text-slate-200"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 rounded-lg bg-[#141838] hover:bg-[#1e2554] border border-[#262e63] text-slate-200 ml-1"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                }}
                className="px-2 py-0.5 rounded text-[11px] bg-[#141838] hover:bg-[#1e2554] border border-[#262e63] text-slate-300 ml-1"
              >
                Reset (100%)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCheckerboard(!showCheckerboard)}
                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border transition-colors ${
                  showCheckerboard
                    ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                    : 'bg-[#121633] border-[#222854] text-slate-400'
                }`}
                title="Toggle transparent checkerboard background"
              >
                <Layers className="w-3 h-3" />
                <span>Checkerboard BG</span>
              </button>
            </div>
          </div>
        )}

        {(detectedType === 'code' || detectedType === 'markdown') && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-[#0a0d1e] border-b border-[#181d3d] text-xs text-slate-300 shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {detectedType === 'markdown' && (
                <div className="flex rounded-lg bg-[#121633] p-0.5 border border-[#222854]">
                  <button
                    type="button"
                    onClick={() => setMarkdownViewMode('preview')}
                    className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      markdownViewMode === 'preview'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Formatted Doc
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkdownViewMode('source')}
                    className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      markdownViewMode === 'source'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Source Code
                  </button>
                </div>
              )}

              {/* Word wrap toggle */}
              <button
                type="button"
                onClick={() => setWrapLines(!wrapLines)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1.5 border transition-colors ${
                  wrapLines
                    ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                    : 'bg-[#121633] border-[#222854] text-slate-400'
                }`}
                title="Toggle line wrapping"
              >
                <WrapText className="w-3 h-3" />
                <span>Wrap Lines: {wrapLines ? 'ON' : 'OFF'}</span>
              </button>

              <span className="text-[11px] font-mono text-slate-500">
                {lines.length} lines • {textContent.length} chars
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search in file input */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter lines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1 rounded-lg bg-[#121633] border border-[#222854] text-slate-100 text-[11px] focus:outline-none focus:border-purple-500 w-36 sm:w-48 font-mono"
                />
              </div>

              {/* Copy file contents */}
              <button
                type="button"
                onClick={handleCopyContent}
                className="px-2.5 py-1 rounded-lg bg-[#141838] hover:bg-[#1e2554] border border-[#262e63] text-purple-300 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1.5"
                title="Copy all code to clipboard"
              >
                {copiedContent ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Content</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-[#04060d] relative flex flex-col">
          {/* CASE 1: IMAGE VIEWER */}
          {detectedType === 'image' && (
            <div
              className={`w-full h-full min-h-[400px] flex items-center justify-center p-6 overflow-auto select-none ${
                showCheckerboard
                  ? 'bg-[radial-gradient(#1e2246_1px,transparent_1px)] [background-size:16px_16px]'
                  : 'bg-[#04060d]'
              }`}
            >
              <div
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="max-w-full max-h-full flex items-center justify-center p-2"
              >
                <img
                  src={resolvedContentUrl}
                  alt={resource.title}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl border border-purple-500/20"
                />
              </div>
            </div>
          )}

          {/* CASE 2: PDF VIEWER */}
          {detectedType === 'pdf' && (
            <div className="w-full h-full flex flex-col bg-[#0f111a]">
              <div className="bg-[#121633] px-4 py-2 border-b border-[#222854] flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span className="font-semibold text-slate-200">Interactive PDF Document Viewer</span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  Use embedded PDF controls to zoom, print, or view pages.
                </span>
              </div>
              <iframe
                src={`${resolvedContentUrl}#view=FitH`}
                title={resource.title}
                className="w-full flex-1 border-0 bg-white"
              />
            </div>
          )}

          {/* CASE 3: MARKDOWN PREVIEW */}
          {detectedType === 'markdown' && markdownViewMode === 'preview' && (
            <div className="flex-1 p-6 sm:p-10 max-w-4xl mx-auto w-full overflow-y-auto">
              {textLoading ? (
                <MarkdownDocumentSkeleton />
              ) : textError ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
                  {textError}
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-slate-200 prose-headings:text-slate-100 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-purple-400 hover:prose-a:text-purple-300 prose-code:text-purple-300 prose-code:bg-purple-950/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#0b0e24] prose-pre:border prose-pre:border-[#1d224d]">
                  <ReactMarkdown>{textContent}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* CASE 4: CODE / SOURCE CODE VIEW */}
          {(detectedType === 'code' || (detectedType === 'markdown' && markdownViewMode === 'source')) && (
            <div className="flex-1 flex flex-col overflow-hidden font-mono text-xs">
              {textLoading ? (
                <CodeViewerSkeleton lines={14} />
              ) : textError ? (
                <div className="m-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
                  {textError}
                </div>
              ) : (
                <div className="flex-1 overflow-auto bg-[#060814] p-4 text-slate-200">
                  <table className="w-full border-collapse">
                    <tbody>
                      {lines.map((lineText, idx) => {
                        const lineNumber = idx + 1;
                        const isMatched =
                          filteredLineIndices === null || filteredLineIndices.has(idx);

                        if (!isMatched) return null;

                        return (
                          <tr
                            key={idx}
                            className="hover:bg-purple-950/30 group transition-colors"
                          >
                            <td className="w-12 select-none text-right pr-4 text-slate-600 group-hover:text-purple-400 align-top font-mono text-[11px]">
                              {lineNumber}
                            </td>
                            <td
                              className={`align-top font-mono ${
                                wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                              } text-slate-200`}
                            >
                              {searchQuery && lineText.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                                <mark className="bg-purple-600/60 text-white rounded px-0.5">
                                  {lineText}
                                </mark>
                              ) : (
                                lineText || ' '
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CASE 5: VIDEO VIEWER */}
          {detectedType === 'video' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#04060d]">
              <div className="max-w-4xl w-full rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl bg-black">
                <video
                  src={resolvedContentUrl}
                  controls
                  playsInline
                  className="w-full max-h-[70vh] object-contain"
                >
                  Your browser does not support HTML5 video playback.
                </video>
              </div>
            </div>
          )}

          {/* CASE 6: AUDIO VIEWER */}
          {detectedType === 'audio' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#07091a]">
              <div className="max-w-lg w-full p-8 rounded-3xl bg-[#0d102a] border border-purple-500/30 shadow-2xl text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-lg animate-pulse">
                  <Music className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">{resource.title}</h4>
                  <p className="text-xs text-indigo-300 font-mono">{resource.fileName || 'Audio Track'}</p>
                </div>
                <audio
                  src={resolvedContentUrl}
                  controls
                  className="w-full rounded-lg"
                >
                  Your browser does not support HTML5 audio playback.
                </audio>
              </div>
            </div>
          )}

          {/* CASE 7: EXTERNAL WEB LINK PREVIEW */}
          {detectedType === 'web_link' && (
            <div className="w-full h-full flex flex-col bg-[#0a0d1e]">
              <div className="bg-[#101433] px-4 py-2 border-b border-[#202758] flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-slate-200">Embedded Web Resource View:</span>
                  <span className="font-mono text-purple-300 truncate max-w-sm">{resolvedContentUrl}</span>
                </div>
                <a
                  href={resolvedContentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Open Full Webpage</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex-1 relative">
                <iframe
                  src={resolvedContentUrl}
                  title={resource.title}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            </div>
          )}

          {/* CASE 8: GENERIC BINARY / OTHER */}
          {detectedType === 'binary' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#07091a]">
              <div className="max-w-md w-full p-8 rounded-3xl bg-[#0e122b] border border-purple-500/30 text-center space-y-5 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-purple-950/70 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-md">
                  <FileCode className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">{resource.title}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    {resource.fileName || 'Binary Data Payload'}
                  </p>
                  {resource.fileSize && (
                    <p className="text-[11px] text-purple-300 font-mono mt-1">
                      File Size: {formatFileSize(resource.fileSize)}
                    </p>
                  )}
                </div>
                {resource.description && (
                  <p className="text-xs text-slate-300 italic px-4">"{resource.description}"</p>
                )}
                <div className="pt-2 flex items-center justify-center gap-3">
                  <a
                    href={resolvedContentUrl}
                    download={resource.fileName || `${resource.title}.dat`}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors inline-flex items-center gap-2 shadow-lg shadow-purple-900/40"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </a>
                  <a
                    href={resolvedContentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-[#171b3e] hover:bg-[#202758] text-purple-300 border border-[#2b336e] text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Raw</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary Bar */}
        {resource.description && (
          <div className="px-5 py-2.5 bg-[#0a0d20] border-t border-[#181d3d] text-xs text-slate-300 flex items-center justify-between gap-3 shrink-0">
            <div className="truncate">
              <span className="font-semibold text-purple-300 font-mono uppercase text-[10px] tracking-wider mr-2">
                Resource Note:
              </span>
              <span className="text-slate-300 text-xs">{resource.description}</span>
            </div>
            {resource.tags && resource.tags.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                {resource.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141838] text-purple-300 border border-[#262e63]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
