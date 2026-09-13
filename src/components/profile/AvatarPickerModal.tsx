import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Link as LinkIcon,
  Trash2,
  Check,
  X,
  Loader2,
  Camera,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';

export interface AvatarPreset {
  id: string;
  name: string;
  category: string;
  url: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'ai-android-neural',
    name: 'Neural Android',
    category: 'Cybernetic',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'cyber-operative',
    name: 'Cyber Operative',
    category: 'Cybernetic',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'systems-architect',
    name: 'Systems Architect',
    category: 'Engineering',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'platform-engineer',
    name: 'Lead Engineer',
    category: 'Engineering',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'quantum-hacker',
    name: 'Quantum Specialist',
    category: 'Security',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'synthwave-pilot',
    name: 'Nexus Pilot',
    category: 'Cybernetic',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'hologram-guardian',
    name: 'Core Guardian',
    category: 'Security',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'geometric-nexus',
    name: 'Prism AI',
    category: 'Abstract',
    url: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=400&q=80',
  },
];

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  userName?: string;
  onAvatarUpdated?: (newUrl: string | undefined) => void;
}

export function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  userName = 'User',
  onAvatarUpdated,
}: AvatarPickerModalProps) {
  const { user, refreshMe } = useAuth();
  const { themeConfig } = useTheme();
  const [selectedTab, setSelectedTab] = useState<'upload' | 'presets' | 'url'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentAvatarUrl);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state on open
  React.useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentAvatarUrl);
      setCustomUrlInput(currentAvatarUrl && !currentAvatarUrl.startsWith('data:') ? currentAvatarUrl : '');
      setUrlError(null);
    }
  }, [isOpen, currentAvatarUrl]);

  if (!isOpen) return null;

  // Process & resize uploaded image file onto canvas for optimal dimensions
  const handleProcessFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP, GIF, or SVG).');
      return;
    }

    // Limit original file size check (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit. Please choose a smaller image.');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to crop & resize to square 320x320
        const canvas = document.createElement('canvas');
        const targetSize = 320;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Center crop calculation
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setPreviewUrl(compressedDataUrl);
        } else {
          setPreviewUrl(event.target?.result as string);
        }
        setIsProcessing(false);
      };

      img.onerror = () => {
        alert('Failed to load image file. Please try a different image.');
        setIsProcessing(false);
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      setUrlError('Please enter a valid image URL');
      return;
    }
    setUrlError(null);
    setPreviewUrl(trimmed);
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(undefined);
    setCustomUrlInput('');
  };

  const handleSaveAvatar = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await api.updateUserProfile(user.id, {
        avatarUrl: previewUrl || '',
      });
      if (onAvatarUpdated) {
        onAvatarUpdated(previewUrl);
      }
      await refreshMe();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile picture.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Profile Picture"
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Top Preview Section */}
        <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar Preview Visual */}
          <div className="relative group shrink-0">
            <div
              className={`w-24 h-24 rounded-2xl bg-gradient-to-tr ${themeConfig.gradient} p-[2.5px] shadow-xl shadow-blue-950/40`}
            >
              <div className="w-full h-full bg-[#090d1e] rounded-[13px] flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={userName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setUrlError('Could not load image from provided URL. Please check the link.');
                    }}
                  />
                ) : (
                  <span className="text-2xl font-bold font-display text-white tracking-wider">
                    {initials}
                  </span>
                )}
              </div>
            </div>

            {previewUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Preview Info */}
          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-semibold text-slate-100 text-sm">{userName}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                {previewUrl ? (previewUrl.startsWith('data:') ? 'Custom Upload' : 'External Avatar') : 'Default Initials'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Upload your personal portrait, select a curated cybernetic avatar preset, or paste a link.
            </p>
            {previewUrl && (
              <div className="pt-1 flex items-center justify-center sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Reset to Initials</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-[#0b0e20] p-1 border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setSelectedTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              selectedTab === 'upload'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141832]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('presets')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              selectedTab === 'presets'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141832]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              selectedTab === 'url'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141832]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>
        </div>

        {/* Tab 1: Upload File */}
        {selectedTab === 'upload' && (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-[#262c52] hover:border-blue-500/50 bg-[#0c1024]/60 hover:bg-[#10142e]'
              }`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2 text-blue-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-medium">Processing & resizing image...</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200">
                      Click to choose photo or drag & drop here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports PNG, JPG, WebP, GIF, SVG (up to 50MB) • Auto-centered and resized
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#1a2344] hover:bg-[#232f5c] border border-blue-500/40 text-blue-200 text-xs font-medium shadow-sm transition-colors"
                  >
                    Select Local File
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Curated Presets */}
        {selectedTab === 'presets' && (
          <div className="space-y-3">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Select from curated cyber & tech avatars:</span>
              <span>{AVATAR_PRESETS.length} Available</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = previewUrl === preset.url;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setPreviewUrl(preset.url)}
                    className={`relative p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center group ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/50 shadow-md shadow-blue-950/50'
                        : 'bg-[#0c1024] border-[#1e2446] hover:border-slate-500 hover:bg-[#121630]'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden mb-2 bg-[#090d1e] border border-white/10 shadow-sm">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 truncate w-full block">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {preset.category}
                    </span>

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Custom URL */}
        {selectedTab === 'url' && (
          <div className="space-y-3">
            <div>
              <label className="block text-slate-300 mb-1.5 text-xs font-medium">
                Direct Image Link (HTTPS)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                    setUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCustomUrl();
                    }
                  }}
                  placeholder="https://images.unsplash.com/... or https://github.com/user.png"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#090d1e] border border-[#202648] text-slate-100 text-xs focus:border-blue-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md transition-colors"
                >
                  Preview
                </button>
              </div>
              {urlError && <p className="text-rose-400 text-[11px] mt-1.5">{urlError}</p>}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tip: You can use any high-resolution public photo from Unsplash, Gravatar, GitHub avatar URLs, or your company CDN.
            </p>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#161a36] text-xs transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAvatar}
              disabled={isSaving}
              className="glow-btn-primary px-5 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Profile Photo...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Profile Picture</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
