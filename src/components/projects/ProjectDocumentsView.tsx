import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  FileImage,
  Upload,
  Plus,
  Search,
  Filter,
  Layers,
  Video,
  FileCode,
  HardDrive,
  Sparkles,
  LayoutGrid,
  List,
  Grid,
  RefreshCw,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { Project, StoredFile } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { DocumentThumbnail } from './DocumentThumbnail.js';
import { DocumentPreviewModal } from './DocumentPreviewModal.js';

interface ProjectDocumentsViewProps {
  project: Project;
  onFilesChanged?: () => void;
}

export function ProjectDocumentsView({ project, onFilesChanged }: ProjectDocumentsViewProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'compact' | 'list'>('grid');

  // Preview modal state
  const [selectedFile, setSelectedFile] = useState<StoredFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('diagram');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDataUrl, setUploadDataUrl] = useState('');
  const [uploadMimeType, setUploadMimeType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load project files
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProjectFiles(project.id);
      setFiles(data);
    } catch (err: any) {
      console.error('Failed to load project files:', err);
      setError(err.message || 'Failed to load project files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [project.id]);

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    try {
      await api.deleteProjectFile(project.id, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      onFilesChanged?.();
      if (selectedFile?.id === fileId) {
        setIsPreviewOpen(false);
        setSelectedFile(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  // Handle file selection from disk
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert('File exceeds 15MB limit');
      return;
    }

    setUploadName(file.name);
    setUploadMimeType(file.type || 'application/octet-stream');

    // Automatically detect category
    if (file.type.startsWith('image/')) {
      setUploadCategory(file.name.endsWith('.svg') ? 'diagram' : 'image');
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setUploadCategory('document');
    } else if (file.type.startsWith('video/')) {
      setUploadCategory('video');
    } else if (file.name.endsWith('.json') || file.name.endsWith('.ts') || file.name.endsWith('.rs')) {
      setUploadCategory('code');
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadDataUrl(reader.result as string);
      setIsUploadOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Submit upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !uploadDataUrl) return;

    try {
      setUploading(true);
      const tagsArray = uploadTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const isImage = uploadMimeType.startsWith('image/') || uploadName.endsWith('.svg');

      const uploaded = await api.uploadProjectFile(project.id, {
        name: uploadName,
        mimeType: uploadMimeType,
        dataUrl: uploadDataUrl,
        thumbnailUrl: isImage ? uploadDataUrl : undefined,
        description: uploadDesc,
        category: uploadCategory,
        tags: tagsArray,
      });

      setFiles((prev) => [uploaded, ...prev]);
      setIsUploadOpen(false);
      setUploadName('');
      setUploadDesc('');
      setUploadTags('');
      setUploadDataUrl('');
      setUploadMimeType('');
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      if (!matchesSearch) return false;
      if (selectedCategory === 'all') return true;

      const isImg = file.mimeType.startsWith('image/') || file.name.endsWith('.png') || file.name.endsWith('.jpg');
      const isDiagram = file.category === 'diagram' || file.name.endsWith('.svg') || file.tags?.includes('diagram');
      const isDoc = file.mimeType === 'application/pdf' || file.name.endsWith('.pdf') || file.category === 'document';
      const isMedia = file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/') || file.category === 'video';
      const isCode = file.mimeType.includes('json') || file.name.endsWith('.json') || file.category === 'code';

      if (selectedCategory === 'images' && (isImg || isDiagram)) return true;
      if (selectedCategory === 'documents' && isDoc) return true;
      if (selectedCategory === 'media' && isMedia) return true;
      if (selectedCategory === 'code' && isCode) return true;

      return false;
    });
  }, [files, searchQuery, selectedCategory]);

  // Quick stats
  const stats = useMemo(() => {
    const totalBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    const formatBytes = (bytes: number) => {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const imagesCount = files.filter(
      (f) => f.mimeType.startsWith('image/') || f.name.endsWith('.svg') || f.name.endsWith('.png')
    ).length;

    const docsCount = files.filter(
      (f) => f.mimeType === 'application/pdf' || f.name.endsWith('.pdf') || f.category === 'document'
    ).length;

    const mediaCount = files.filter(
      (f) => f.mimeType.startsWith('video/') || f.mimeType.startsWith('audio/')
    ).length;

    return {
      totalCount: files.length,
      totalSizeFormatted: formatBytes(totalBytes),
      imagesCount,
      docsCount,
      mediaCount,
    };
  }, [files]);

  return (
    <div className="space-y-6">
      {/* Header & Stats Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#0f1224] border border-[#23274c] rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-100">Project Documents &amp; Media</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-purple-950/80 text-purple-300 border border-purple-500/30">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visual thumbnail previews for shared architecture diagrams, protocol whitepapers, media captures, and benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium cursor-pointer shadow-md shadow-purple-950/40 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,application/pdf,video/*,audio/*,.json,.svg,.md,.ts,.csv"
            />
          </label>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 rounded-lg bg-[#0c0e1e] border border-[#1d203e] flex items-center gap-3">
          <div className="p-2 rounded-md bg-purple-950/60 text-purple-300">
            <FileImage className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">IMAGES &amp; DIAGRAMS</span>
            <span className="text-slate-100 font-semibold text-sm">{stats.imagesCount} files</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#0c0e1e] border border-[#1d203e] flex items-center gap-3">
          <div className="p-2 rounded-md bg-rose-950/60 text-rose-300">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">DOCS &amp; SPECS</span>
            <span className="text-slate-100 font-semibold text-sm">{stats.docsCount} files</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#0c0e1e] border border-[#1d203e] flex items-center gap-3">
          <div className="p-2 rounded-md bg-sky-950/60 text-sky-300">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">MEDIA DEMOS</span>
            <span className="text-slate-100 font-semibold text-sm">{stats.mediaCount} files</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#0c0e1e] border border-[#1d203e] flex items-center gap-3">
          <div className="p-2 rounded-md bg-teal-950/60 text-teal-300">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">TOTAL STORAGE</span>
            <span className="text-slate-100 font-semibold text-sm">{stats.totalSizeFormatted}</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All Files', count: files.length },
            { id: 'images', label: 'Diagrams & Images', count: stats.imagesCount },
            { id: 'documents', label: 'Documents & PDFs', count: stats.docsCount },
            { id: 'media', label: 'Media & Demos', count: stats.mediaCount },
            {
              id: 'code',
              label: 'Code & Telemetry',
              count: files.filter((f) => f.mimeType.includes('json') || f.name.endsWith('.json')).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                selectedCategory === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-[#12152b] text-slate-400 hover:text-slate-200 hover:bg-[#181c38] border border-[#1f2347]'
              }`}
            >
              {tab.label} <span className="opacity-70 font-mono text-[11px] ml-1">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search & View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file name, tags..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0e1022] border border-[#23274c] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center rounded-lg bg-[#0e1022] border border-[#23274c] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Large Thumbnail Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Compact Grid"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 transition-all text-center ${
          isDragOver
            ? 'border-purple-500 bg-purple-950/20'
            : 'border-[#23274c] hover:border-purple-500/40 bg-[#0a0c1a]/50'
        }`}
      >
        <p className="text-xs text-slate-400">
          <span className="font-medium text-purple-300">Drag &amp; drop files here</span> to preview and share with the team, or{' '}
          <label className="text-purple-400 hover:underline cursor-pointer">
            browse from your computer
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,application/pdf,video/*,audio/*,.json,.svg,.md,.ts,.csv"
            />
          </label>
        </p>
      </div>

      {/* Files Display Container */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-xs font-mono">Loading shared project documents...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={loadFiles} className="underline ml-auto font-mono">
            Retry
          </button>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-16 text-center rounded-xl bg-[#0b0e1e] border border-[#1f223f] p-8 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#141830] border border-[#23274c] flex items-center justify-center text-purple-400">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">No documents found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No files matched "${searchQuery}". Try a different filter or search keyword.`
              : 'Share architecture diagrams, RFC documents, or benchmark results to collaborate visually.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Large Thumbnail Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <DocumentThumbnail
              key={file.id}
              file={file}
              size="lg"
              onSelect={(f) => {
                setSelectedFile(f);
                setIsPreviewOpen(true);
              }}
              onDelete={handleDeleteFile}
            />
          ))}
        </div>
      ) : viewMode === 'compact' ? (
        /* Compact Thumbnail Cards */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredFiles.map((file) => (
            <DocumentThumbnail
              key={file.id}
              file={file}
              size="md"
              showDetails={true}
              onSelect={(f) => {
                setSelectedFile(f);
                setIsPreviewOpen(true);
              }}
              onDelete={handleDeleteFile}
            />
          ))}
        </div>
      ) : (
        /* Table / List View */
        <div className="bg-[#0f1224] border border-[#23274c] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1c1f38] bg-[#0b0d1e] font-mono text-[11px] text-slate-400">
                <th className="py-3 px-4">PREVIEW &amp; FILE</th>
                <th className="py-3 px-3">CATEGORY</th>
                <th className="py-3 px-3">SIZE</th>
                <th className="py-3 px-3">SHARED BY</th>
                <th className="py-3 px-3">DATE</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181b34]">
              {filteredFiles.map((file) => {
                const formatBytes = (bytes: number) => {
                  if (!bytes) return '0 B';
                  const k = 1024;
                  const sizes = ['B', 'KB', 'MB'];
                  const i = Math.floor(Math.log(bytes) / Math.log(k));
                  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                };

                return (
                  <tr
                    key={file.id}
                    onClick={() => {
                      setSelectedFile(file);
                      setIsPreviewOpen(true);
                    }}
                    className="hover:bg-[#141830] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-12 h-10 rounded bg-[#090b17] border border-[#23274c] overflow-hidden flex items-center justify-center shrink-0">
                        {file.mimeType.startsWith('image/') || file.name.endsWith('.svg') ? (
                          <img
                            src={file.thumbnailUrl || file.dataUrl}
                            alt=""
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : file.mimeType === 'application/pdf' ? (
                          <FileText className="w-5 h-5 text-rose-400" />
                        ) : file.mimeType.startsWith('video/') ? (
                          <Video className="w-5 h-5 text-sky-400" />
                        ) : (
                          <FileCode className="w-5 h-5 text-teal-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-200 group-hover:text-purple-300 block truncate max-w-xs sm:max-w-md">
                          {file.name}
                        </span>
                        {file.description && (
                          <span className="text-[11px] text-slate-400 truncate block">
                            {file.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400 uppercase">
                      {file.category || file.mimeType.split('/')[1]}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {file.uploadedByName || 'Team Member'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(file);
                          setIsPreviewOpen(true);
                        }}
                        className="px-2.5 py-1 rounded bg-[#161a36] hover:bg-purple-600 hover:text-white text-purple-300 border border-purple-500/20 font-medium transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Details Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0f1224] border border-[#23274c] rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c1f38]">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" /> Share Project Document or Media
              </h3>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Name</label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0c18] border border-[#23274c] text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0c18] border border-[#23274c] text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="diagram">Diagram / Blueprint</option>
                    <option value="image">Image / Graphic</option>
                    <option value="document">Technical Document / PDF</option>
                    <option value="video">Video Screencast / Demo</option>
                    <option value="code">Code / Telemetry / JSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="e.g. topology, rfc, audit"
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0c18] border border-[#23274c] text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Key context, protocol version, or verification notes..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0c18] border border-[#23274c] text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Mini Preview in Modal */}
              {uploadDataUrl && uploadMimeType.startsWith('image/') && (
                <div className="p-2 rounded-lg bg-[#080914] border border-[#1f223f] max-h-32 flex items-center justify-center overflow-hidden">
                  <img
                    src={uploadDataUrl}
                    alt="preview"
                    className="max-h-28 object-contain rounded"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1c1f38]">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#14182e] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md transition-colors flex items-center gap-1.5"
                >
                  {uploading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{uploading ? 'Uploading...' : 'Save & Share'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-res Document Preview Lightbox Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        onDelete={handleDeleteFile}
      />
    </div>
  );
}
