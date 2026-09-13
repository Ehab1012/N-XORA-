import React, { useState, useRef } from 'react';
import {
  FileText,
  BookOpen,
  Palette,
  KeyRound,
  ExternalLink,
  Plus,
  Trash2,
  Tag,
  ShieldAlert,
  Image as ImageIcon,
  Eye,
  UploadCloud,
  FolderUp,
  Download,
  HardDrive,
  CheckCircle,
  X,
  FileCode,
} from 'lucide-react';
import { ResourceItem, ResourceCategory } from '../../../shared/types.js';
import { Modal } from '../common/Modal.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { RESOURCE_CATEGORIES } from '../../../shared/const.js';

interface ResourceLibraryProps {
  projectId: string;
  resources: ResourceItem[];
  onResourceChanged: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function detectCategoryFromFileName(fileName: string): ResourceCategory {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'fig', 'ai', 'sketch'].includes(ext)) {
    return 'design';
  }
  if (['key', 'pem', 'env', 'cert', 'crt', 'pfx', 'token', 'pub'].includes(ext)) {
    return 'credentials_vault';
  }
  if (['json', 'yaml', 'yml', 'ts', 'tsx', 'rs', 'py', 'go', 'sql', 'proto', 'graphql', 'toml'].includes(ext)) {
    return 'specification';
  }
  return 'documentation';
}

export function ResourceLibrary({ projectId, resources, onResourceChanged }: ResourceLibraryProps) {
  const { user, role } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'device' | 'url'>('device');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('specification');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewingResource, setPreviewingResource] = useState<ResourceItem | null>(null);

  // Device file handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);
  const [isDraggingOverModal, setIsDraggingOverModal] = useState(false);
  const [selectedDeviceFile, setSelectedDeviceFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [fileReadError, setFileReadError] = useState<string | null>(null);

  const getCategoryIcon = (cat: ResourceCategory) => {
    switch (cat) {
      case 'specification':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'documentation':
        return <BookOpen className="w-4 h-4 text-sky-400" />;
      case 'design':
        return <Palette className="w-4 h-4 text-pink-400" />;
      case 'credentials_vault':
        return <KeyRound className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const processFile = (file: File) => {
    setFileReadError(null);
    if (file.size > 15 * 1024 * 1024) {
      setFileReadError('File exceeds 15MB limit. Please select a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedDeviceFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
      });

      if (!title) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
        setTitle(cleanName);
      }

      const detected = detectCategoryFromFileName(file.name);
      setCategory(detected);

      if (file.type.startsWith('image/')) {
        setThumbnailUrl(dataUrl);
      }

      setInputMode('device');
      setIsAddOpen(true);
    };

    reader.onerror = () => {
      setFileReadError('Failed to read file from device.');
    };

    reader.readAsDataURL(file);
  };

  const handleDeviceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOverPage) setIsDraggingOverPage(true);
  };

  const handlePageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOverPage(false);
  };

  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverPage(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleModalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverModal(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const filtered = selectedCategory === 'all'
    ? resources
    : resources.filter((r) => r.category === selectedCategory);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (inputMode === 'url' && !url.trim()) {
      setFileReadError('Please enter a valid link URL or choose a device file.');
      return;
    }

    if (inputMode === 'device' && !selectedDeviceFile && !url.trim()) {
      setFileReadError('Please select or drag a file from your device.');
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await api.createResource({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        url: inputMode === 'device' && selectedDeviceFile ? selectedDeviceFile.dataUrl : (url.trim() || undefined),
        dataUrl: selectedDeviceFile ? selectedDeviceFile.dataUrl : undefined,
        fileName: selectedDeviceFile ? selectedDeviceFile.name : undefined,
        fileSize: selectedDeviceFile ? selectedDeviceFile.size : undefined,
        fileType: selectedDeviceFile ? selectedDeviceFile.type : undefined,
        thumbnailUrl: thumbnailUrl.trim() || (selectedDeviceFile?.type.startsWith('image/') ? selectedDeviceFile.dataUrl : undefined),
        tags,
      });

      setTitle('');
      setDescription('');
      setUrl('');
      setThumbnailUrl('');
      setTagsInput('');
      setSelectedDeviceFile(null);
      setFileReadError(null);
      setIsAddOpen(false);
      onResourceChanged();
    } catch (err: any) {
      setFileReadError(err?.message || 'Failed to save resource');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this resource from project reference library?')) {
      try {
        await api.deleteResource(id);
        onResourceChanged();
      } catch (err) {
        console.error('Failed to delete resource:', err);
      }
    }
  };

  const canManage = role === 'leader' || role === 'co-leader';

  return (
    <div
      id="resource-library-container"
      className="relative space-y-5"
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* Hidden file input for quick browse */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceFileSelect}
        className="hidden"
        id="device-file-input-quick"
      />

      {/* Drag & Drop Page Overlay */}
      {isDraggingOverPage && (
        <div className="absolute inset-0 z-40 bg-purple-950/85 backdrop-blur-sm border-2 border-dashed border-purple-400 rounded-2xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
          <UploadCloud className="w-16 h-16 text-purple-300 animate-bounce mb-3" />
          <h3 className="text-xl font-bold text-white mb-1">Drop file to add as Project Resource</h3>
          <p className="text-sm text-purple-200">Release the file here to auto-detect and load it directly into this project</p>
        </div>
      )}

      {/* Header with Quick Device Browse and Add Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>Technical Resources & Blueprints</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e2240] text-purple-300 font-mono">
              {resources.length}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Architecture specs, design assets, and device files with drag-and-drop support.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Browse Device File directly */}
          <button
            id="btn-browse-device-resource"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#171a33] hover:bg-[#1e2246] border border-[#2b305c] text-purple-300 hover:text-purple-200 text-xs font-medium transition-colors shadow-sm"
            title="Browse your computer to upload a specification, diagram or file"
          >
            <FolderUp className="w-3.5 h-3.5" />
            <span>Browse Device</span>
          </button>

          {/* Add Resource Modal trigger */}
          <button
            id="btn-add-resource-modal"
            type="button"
            onClick={() => {
              setSelectedDeviceFile(null);
              setFileReadError(null);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-md shadow-purple-900/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Quick Callout Banner */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer border border-dashed border-[#2b305c] hover:border-purple-500/60 bg-[#101326]/60 hover:bg-[#131730] transition-colors rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-950/70 border border-purple-700/40 flex items-center justify-center text-purple-400 shrink-0">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-200">Device Upload & Dropzone:</span>{' '}
            <span className="text-slate-400">Drag & drop files from your computer anywhere here, or click to browse device data.</span>
          </div>
        </div>
        <span className="hidden sm:inline-flex text-[11px] font-mono px-2 py-1 rounded bg-[#1c203d] text-purple-300 font-medium whitespace-nowrap">
          Browse Device
        </span>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0f1120] border border-[#1f223f] text-xs overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-purple-950/80 text-purple-200 border border-purple-500/40 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Resources ({resources.length})
        </button>
        {RESOURCE_CATEGORIES.map((cat) => {
          const count = resources.filter((r) => r.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-purple-950/80 text-purple-200 border border-purple-500/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {getCategoryIcon(cat)}
              <span>{cat.replace('_', ' ')}</span>
              <span className="text-[10px] opacity-70 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Resources Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-[#1f2345] rounded-2xl bg-[#0c0e1b]/50">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-300">No resources found in this category</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Drag and drop files from your computer or click "Browse Device" to upload architecture specs, design files, or docs.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-lg bg-[#1c2042] hover:bg-[#252b57] text-purple-300 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Browse Device</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Resource</span>
              </button>
            </div>
          </div>
        ) : (
          filtered.map((res) => {
            const isLocalUpload = Boolean(res.fileName || (res.url && res.url.startsWith('data:')));

            return (
              <div
                key={res.id}
                id={`resource-card-${res.id}`}
                className="group relative flex flex-col justify-between p-4 rounded-xl bg-[#111324] border border-[#1e2240] hover:border-purple-500/40 transition-all shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Thumbnail / Image Preview Header */}
                  {res.thumbnailUrl && (
                    <div
                      onClick={() => setPreviewingResource(res)}
                      className="relative h-32 w-full mb-3 rounded-lg overflow-hidden bg-[#0a0c16] border border-[#1b1e38] cursor-pointer group/thumb flex items-center justify-center"
                    >
                      <img
                        src={res.thumbnailUrl}
                        alt={res.title}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain group-hover/thumb:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </div>
                    </div>
                  )}

                  {/* Header Badges & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#1a1e3b] text-slate-300 capitalize">
                        {getCategoryIcon(res.category)}
                        <span>{res.category.replace('_', ' ')}</span>
                      </span>

                      {/* Device upload badge */}
                      {isLocalUpload && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-950/60 border border-purple-800/40 text-purple-300">
                          <HardDrive className="w-2.5 h-2.5" />
                          <span>{res.fileSize ? formatFileSize(res.fileSize) : 'Device File'}</span>
                        </span>
                      )}
                    </div>

                    {(canManage || res.createdById === user?.id) && (
                      <button
                        onClick={() => handleDelete(res.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-[#1c1f38] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-100 line-clamp-2 mb-1">{res.title}</h4>
                  {res.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">{res.description}</p>
                  )}
                  {res.fileName && (
                    <div className="text-[11px] font-mono text-slate-500 truncate mb-2 flex items-center gap-1">
                      <FileCode className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{res.fileName}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-[#1c1f38] flex items-center justify-between text-xs">
                  {res.url ? (
                    res.url.startsWith('data:') ? (
                      <a
                        href={res.url}
                        download={res.fileName || `${res.title}.dat`}
                        className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-medium text-xs py-0.5 px-1.5 rounded hover:bg-purple-950/40"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download File</span>
                      </a>
                    ) : (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-mono text-[11px]"
                      >
                        <span>Open Reference</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )
                  ) : (
                    <span className="text-slate-500 text-[11px]">Workspace Reference</span>
                  )}

                  {res.tags && res.tags.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-500">#{res.tags[0]}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resource Image Lightbox */}
      {previewingResource && previewingResource.thumbnailUrl && (
        <div
          onClick={() => setPreviewingResource(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[85vh] bg-[#0b0d1a] border border-[#23274c] rounded-2xl p-4 shadow-2xl overflow-hidden flex flex-col items-center"
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-[#1c1f38] mb-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">{previewingResource.title}</h4>
                {previewingResource.fileName && (
                  <p className="text-[11px] font-mono text-slate-400">{previewingResource.fileName}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewingResource(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-[#1c1f38]"
              >
                Close
              </button>
            </div>
            <img
              src={previewingResource.thumbnailUrl}
              alt={previewingResource.title}
              referrerPolicy="no-referrer"
              className="max-h-[65vh] object-contain rounded-lg border border-[#1f223f]"
            />
          </div>
        </div>
      )}

      {/* Add Resource Modal with Device File Drag-and-Drop + File Browser */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Technical Resource">
        <form onSubmit={handleCreate} className="space-y-4 text-sm">
          {/* Source Mode Toggle: Device File vs External URL */}
          <div className="flex rounded-lg bg-[#0e101c] p-1 border border-[#202444]">
            <button
              type="button"
              onClick={() => setInputMode('device')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                inputMode === 'device'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Browse Device / Drag & Drop</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                inputMode === 'url'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>External Web Link</span>
            </button>
          </div>

          {/* Device File Input Section */}
          {inputMode === 'device' ? (
            <div>
              <input
                type="file"
                ref={modalFileInputRef}
                onChange={handleDeviceFileSelect}
                className="hidden"
                id="device-file-input-modal"
              />

              {selectedDeviceFile ? (
                <div className="p-3 rounded-xl bg-[#14172f] border border-purple-500/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {selectedDeviceFile.type.startsWith('image/') ? (
                      <img
                        src={selectedDeviceFile.dataUrl}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded-lg border border-purple-600/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-purple-900/40 border border-purple-600/30 flex items-center justify-center text-purple-300 shrink-0">
                        <FileCode className="w-5 h-5" />
                      </div>
                    )}
                    <div className="truncate">
                      <div className="font-semibold text-slate-100 text-xs truncate">
                        {selectedDeviceFile.name}
                      </div>
                      <div className="text-[10px] text-purple-300 font-mono">
                        {formatFileSize(selectedDeviceFile.size)} • {selectedDeviceFile.type || 'binary'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeviceFile(null);
                      if (thumbnailUrl === selectedDeviceFile?.dataUrl) setThumbnailUrl('');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#1e2348] transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOverModal(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingOverModal(false);
                  }}
                  onDrop={handleModalDrop}
                  onClick={() => modalFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDraggingOverModal
                      ? 'border-purple-400 bg-purple-950/40 text-purple-200'
                      : 'border-[#292e59] hover:border-purple-500/70 bg-[#0e101c] hover:bg-[#12152a]'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-pulse" />
                  <div className="text-xs font-semibold text-slate-200 mb-1">
                    Drag and drop file here, or <span className="text-purple-400 underline">browse device</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Supports specifications, architecture diagrams, PDFs, binaries, code (up to 15MB)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs text-slate-300 mb-1">Target Link URL *</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.nexora.internal/rfc/004.pdf"
                className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none font-mono"
              />
            </div>
          )}

          {fileReadError && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{fileReadError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-300 mb-1">Resource Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cryptographic Key Management RFC"
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none capitalize"
              >
                {RESOURCE_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="crypto, consensus"
                className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary or purpose of this resource reference..."
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-4 border-t border-[#202444] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38] text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md shadow-purple-900/30 inline-flex items-center gap-1.5"
            >
              {submitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Save Resource</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
