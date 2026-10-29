import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  RefreshCw,
  Cpu,
  Zap,
  User,
  Minimize2,
  Maximize2,
  Paperclip,
  ImagePlus,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Music,
  Film,
  File as FileIcon,
  Upload,
  Download,
  ZoomIn,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { api } from '../../lib/api.js';
import { AiExecutedAction, ChatAttachment, UserRole } from '../../../shared/types.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { ChatReplySkeleton } from '../common/Skeleton.js';
import {
  auth,
  googleProvider,
  signInWithPopup,
  db,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from '../../lib/firebase.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  attachments?: ChatAttachment[];
  executedActions?: AiExecutedAction[];
}

export interface GeminiChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
  activeProjectName?: string;
}

type ChatRoleMode = 'pm' | 'tech' | 'agile';
type ModelTier = 'pro' | 'flash' | 'fast';

const MAX_ATTACHMENTS_PER_MESSAGE = 8;
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per file

const ROLE_PRESETS: Record<ChatRoleMode, { name: string; icon: React.ReactNode; instruction: string; badge: string }> = {
  pm: {
    name: 'Project Co-Pilot',
    icon: <Sparkles className="w-3.5 h-3.5 text-cyan-300" />,
    badge: 'Planning',
    instruction:
      'You are Nexora Project Co-Pilot. Provide structured project guidance, sprint breakdowns, risk assessments, and execute permissible workspace tasks within the logged-in user’s role.',
  },
  tech: {
    name: 'Code & Tech Architect',
    icon: <Cpu className="w-3.5 h-3.5 text-indigo-300" />,
    badge: 'Technical',
    instruction:
      'You are Nexora Technical Architect Co-Pilot. Help with code design patterns, API structures, database schemas, security reviews, and debugging within the logged-in user’s account permissions.',
  },
  agile: {
    name: 'Agile & Velocity Coach',
    icon: <Zap className="w-3.5 h-3.5 text-amber-300" />,
    badge: 'Velocity',
    instruction:
      'You are Nexora Agile Velocity Coach. Help formulate acceptance criteria, refine task deliverables, eliminate blockers, and execute role-permitted sprint updates.',
  },
};

function buildWelcomeContent(
  userName?: string,
  accountRole?: UserRole | null,
  activeProjectName?: string
): string {
  const effectiveRole = accountRole || 'member';
  const greeting = userName ? `**Hello, ${userName}! I'm your Nexora AI Co-Pilot.**` : `**Hello! I'm your Nexora AI Co-Pilot.**`;

  const capabilityNote =
    effectiveRole === 'leader'
      ? 'Operating with your **Leader** permissions — you can tell me to **assign tasks or group tasks to any member**, reassign or delete tasks, manage milestones, review proofs, award merit bonuses, or analyze attached pictures and files.'
      : effectiveRole === 'co-leader'
      ? 'Operating with your **Co-Leader** permissions — you can tell me to **assign tasks or group tasks to members**, update or delete tasks, manage milestones, review proofs, award bonuses, or analyze attached pictures and files.'
      : 'Operating with your **Member** permissions — I can list and update **your assigned tasks**, create personal tasks for yourself, submit proof of work, send messages, or analyze attached pictures and files. *(Assigning tasks to other members is restricted to Leaders and Co-Leaders.)*';

  const projectLine = activeProjectName ? `\n\nActive project: **${activeProjectName}**` : '';
  return `${greeting}\n\n${capabilityNote}${projectLine}`;
}

const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs',
  'go', 'rs', 'rb', 'php', 'swift', 'kt', 'html', 'htm', 'css', 'scss', 'sql',
  'xml', 'yaml', 'yml', 'toml', 'ini', 'sh', 'bash', 'json', 'jsonl', 'graphql',
  'vue', 'svelte', 'astro',
]);

const SPREADSHEET_EXTENSIONS = new Set(['csv', 'tsv', 'xlsx', 'xls']);
const ARCHIVE_EXTENSIONS = new Set(['zip', 'tar', 'gz', 'tgz', 'rar', '7z']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif', 'heic', 'heif']);

const EXTENSION_MIME_FALLBACKS: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  log: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  jsonl: 'application/json',
  js: 'text/javascript',
  jsx: 'text/javascript',
  mjs: 'text/javascript',
  cjs: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  py: 'text/x-python',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  scss: 'text/x-scss',
  xml: 'application/xml',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  sql: 'application/sql',
  sh: 'text/x-shellscript',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
};

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx !== -1 ? fileName.slice(idx + 1).toLowerCase() : '';
}

function inferAttachmentMeta(file: File): { mimeType: string; kind: 'image' | 'file' } {
  const ext = getExtension(file.name);
  // Browsers frequently misclassify `.ts` TypeScript files as `video/mp2t`
  if (ext === 'ts' || ext === 'tsx') {
    return { mimeType: 'text/typescript', kind: 'file' };
  }

  const rawType = (file.type || '').trim().toLowerCase();
  const mimeType = rawType || EXTENSION_MIME_FALLBACKS[ext] || 'application/octet-stream';
  const isImage = mimeType.startsWith('image/') || IMAGE_EXTENSIONS.has(ext);

  return {
    mimeType,
    kind: isImage ? 'image' : 'file',
  };
}

export function formatAttachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileVisualMeta(name: string, mimeType: string) {
  const ext = getExtension(name);
  const label = (ext || mimeType.split('/')[1] || 'FILE').slice(0, 6).toUpperCase();

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return {
      label: 'PDF',
      icon: <FileText className="w-4 h-4 text-rose-300" />,
      badgeClass: 'bg-rose-500/15 border-rose-500/35 text-rose-200',
    };
  }
  if (SPREADSHEET_EXTENSIONS.has(ext)) {
    return {
      label,
      icon: <FileSpreadsheet className="w-4 h-4 text-emerald-300" />,
      badgeClass: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200',
    };
  }
  if (CODE_EXTENSIONS.has(ext)) {
    return {
      label,
      icon: <FileCode className="w-4 h-4 text-cyan-300" />,
      badgeClass: 'bg-cyan-500/15 border-cyan-500/35 text-cyan-200',
    };
  }
  if (ARCHIVE_EXTENSIONS.has(ext)) {
    return {
      label,
      icon: <FileArchive className="w-4 h-4 text-amber-300" />,
      badgeClass: 'bg-amber-500/15 border-amber-500/35 text-amber-200',
    };
  }
  if (mimeType.startsWith('audio/')) {
    return {
      label,
      icon: <Music className="w-4 h-4 text-purple-300" />,
      badgeClass: 'bg-purple-500/15 border-purple-500/35 text-purple-200',
    };
  }
  if (mimeType.startsWith('video/')) {
    return {
      label,
      icon: <Film className="w-4 h-4 text-indigo-300" />,
      badgeClass: 'bg-indigo-500/15 border-indigo-500/35 text-indigo-200',
    };
  }
  return {
    label,
    icon: <FileIcon className="w-4 h-4 text-slate-300" />,
    badgeClass: 'bg-slate-500/15 border-slate-500/35 text-slate-200',
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(`Unable to read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function GeminiChatbot({ isOpen, onClose, activeProjectId, activeProjectName }: GeminiChatbotProps) {
  const { user, role, refreshMe, refreshNotifications } = useAuth();
  const effectiveAccountRole: UserRole = role || user?.role || 'member';

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome_1',
      role: 'assistant',
      content: buildWelcomeContent(user?.name, effectiveAccountRole, activeProjectName),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [roleMode, setRoleMode] = useState<ChatRoleMode>('pm');
  const [modelTier, setModelTier] = useState<ModelTier>('flash');
  const [isExpanded, setIsExpanded] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);
  const loadedHistoryKeyRef = useRef<string | null>(null);
  const activeAccountKeyRef = useRef<string>(`${user?.id || 'anon'}:${effectiveAccountRole}`);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setFirebaseUser(u));
    return () => unsubscribe();
  }, []);

  // Keep AI session scoped to the currently logged-in Nexora account user and role
  useEffect(() => {
    const nextKey = `${user?.id || 'anon'}:${effectiveAccountRole}`;
    if (activeAccountKeyRef.current !== nextKey) {
      activeAccountKeyRef.current = nextKey;
      loadedHistoryKeyRef.current = null;
      setPendingAttachments([]);
      setAttachmentError(null);
      setMessages([
        {
          id: `welcome_${Date.now()}`,
          role: 'assistant',
          content: buildWelcomeContent(user?.name, effectiveAccountRole, activeProjectName),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id.startsWith('welcome_')) {
        return [
          {
            ...prev[0],
            content: buildWelcomeContent(user?.name, effectiveAccountRole, activeProjectName),
          },
        ];
      }
      return prev;
    });
  }, [user?.id, user?.name, effectiveAccountRole, activeProjectName]);

  // Load persisted Firestore chat history scoped to both Firebase user and Nexora account ID
  useEffect(() => {
    const historyKey = firebaseUser ? `${firebaseUser.uid}:${user?.id || 'default'}` : null;
    if (!firebaseUser || !historyKey || loadedHistoryKeyRef.current === historyKey) return;
    loadedHistoryKeyRef.current = historyKey;

    (async () => {
      try {
        const q = query(collection(db, 'chat_messages'), where('userId', '==', firebaseUser.uid));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        interface StoredChatDoc {
          nexoraUserId?: string;
          role?: string;
          content?: string;
          timestamp?: string;
          attachments?: ChatAttachment[];
          executedActions?: AiExecutedAction[];
        }

        const docs = snapshot.docs
          .map((d) => {
            const raw = d.data() as StoredChatDoc;
            return {
              id: d.id,
              nexoraUserId: raw.nexoraUserId,
              role: raw.role,
              content: raw.content,
              timestamp: raw.timestamp,
              attachments: raw.attachments,
              executedActions: raw.executedActions,
            };
          })
          .filter((item) => !user?.id || !item.nexoraUserId || item.nexoraUserId === user.id)
          .sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')))
          .slice(-40);

        const loaded: ChatMessage[] = docs.map((item) => ({
          id: item.id,
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: item.content === '[Attachment]' ? '' : String(item.content || ''),
          timestamp: item.timestamp
            ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
          attachments: Array.isArray(item.attachments) ? item.attachments : undefined,
          executedActions: Array.isArray(item.executedActions) ? item.executedActions : undefined,
        }));

        if (loaded.length > 0) {
          setMessages((prev) => [prev[0], ...loaded]);
        }
      } catch (err) {
        console.warn('Could not load saved chat history:', err);
      }
    })();
  }, [firebaseUser, user?.id]);

  // Close image preview modal on Escape
  useEffect(() => {
    if (!previewAttachment) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewAttachment(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewAttachment]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  const handleFirebaseSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Firebase Auth Login Error:', err);
    }
  };

  const processSelectedFiles = useCallback(async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    setAttachmentError(null);
    setIsReadingFiles(true);

    try {
      const validFiles: File[] = [];
      let errorMsg: string | null = null;

      for (const file of incoming) {
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          errorMsg = `"${file.name}" exceeds the 25 MB per-file limit.`;
          continue;
        }
        validFiles.push(file);
      }

      const addedAttachments: ChatAttachment[] = [];
      for (const file of validFiles) {
        const dataUrl = await readFileAsDataUrl(file);
        const { mimeType, kind } = inferAttachmentMeta(file);
        const cleanName =
          file.name && file.name.trim()
            ? file.name.trim()
            : `${kind === 'image' ? 'image' : 'attachment'}-${Date.now()}.${mimeType.split('/')[1] || 'bin'}`;

        addedAttachments.push({
          id: `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
          name: cleanName,
          mimeType,
          sizeBytes: file.size,
          kind,
          dataUrl,
        });
      }

      setPendingAttachments((prev) => {
        const combined = [...prev, ...addedAttachments];
        if (combined.length > MAX_ATTACHMENTS_PER_MESSAGE) {
          errorMsg = `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message.`;
          return combined.slice(0, MAX_ATTACHMENTS_PER_MESSAGE);
        }
        return combined;
      });

      if (errorMsg) {
        setAttachmentError(errorMsg);
      }
    } catch (err: any) {
      setAttachmentError(err?.message || 'Failed to read selected attachment.');
    } finally {
      setIsReadingFiles(false);
    }
  }, []);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processSelectedFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) {
          const ext = f.type.split('/')[1]?.replace('+xml', '') || 'png';
          const hasMeaningfulName = f.name && f.name !== 'image.png' && f.name !== 'blob';
          const namedFile = hasMeaningfulName
            ? f
            : new File([f], `pasted-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.${ext}`, {
                type: f.type || 'image/png',
              });
          pastedFiles.push(namedFile);
        }
      }
    }

    if (pastedFiles.length > 0) {
      const hasPlainText = Array.from(items).some((it) => it.kind === 'string' && it.type === 'text/plain');
      if (!hasPlainText) {
        e.preventDefault();
      }
      await processSelectedFiles(pastedFiles);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      dragCounterRef.current += 1;
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      await processSelectedFiles(e.dataTransfer.files);
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== id));
    setAttachmentError(null);
  };

  const clearPendingAttachments = () => {
    setPendingAttachments([]);
    setAttachmentError(null);
  };

  const handleSendMessage = async (textOverride?: string) => {
    const isQuickPrompt = typeof textOverride === 'string';
    const queryText = (isQuickPrompt ? textOverride : inputText).trim();
    const attachmentsToSend = isQuickPrompt ? [] : [...pendingAttachments];

    if ((!queryText && attachmentsToSend.length === 0) || isLoading || isReadingFiles) return;

    const tempMessageId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempMessageId,
      role: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
    };

    const previousMessages = messages;
    setMessages((prev) => [...prev, userMsg]);
    if (!isQuickPrompt) {
      setInputText('');
      setPendingAttachments([]);
      setAttachmentError(null);
    }
    setIsLoading(true);

    try {
      // Persist attachments to chunked server storage so history & follow-ups stay lightweight
      let finalizedAttachments: ChatAttachment[] | undefined = undefined;
      if (attachmentsToSend.length > 0) {
        finalizedAttachments = await Promise.all(
          attachmentsToSend.map(async (att) => {
            if (att.fileUrl || !att.dataUrl) return att;
            try {
              const uploaded = await api.uploadFile(att.name, att.mimeType, att.dataUrl);
              return {
                ...att,
                id: uploaded.id || att.id,
                fileUrl: `/api/files/${uploaded.id}/content`,
              };
            } catch {
              return att;
            }
          })
        );

        // Update state with durable server fileUrls
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMessageId ? { ...m, attachments: finalizedAttachments } : m))
        );
      }

      // Save user message to Firestore if authenticated (lightweight metadata only, never raw base64)
      if (firebaseUser) {
        try {
          const firestoreAttachments = finalizedAttachments?.map((a) => ({
            id: a.id,
            name: a.name,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            kind: a.kind,
            fileUrl: a.fileUrl || '',
          }));
          await addDoc(collection(db, 'chat_messages'), {
            userId: firebaseUser.uid,
            ...(user?.id ? { nexoraUserId: user.id } : {}),
            role: 'user',
            content: queryText || '[Attachment]',
            ...(firestoreAttachments && firestoreAttachments.length > 0 ? { attachments: firestoreAttachments } : {}),
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Could not save message to Firestore:', e);
        }
      }

      // Build multi-turn payload: earlier messages use compact fileUrl references; current message sends fileUrl or inline dataUrl
      const historyForApi = [...previousMessages, { ...userMsg, attachments: finalizedAttachments }]
        .filter((m) => !m.id.startsWith('welcome_') && !m.id.startsWith('err_'))
        .map((m, idx, arr) => {
          const isLatest = idx === arr.length - 1;
          return {
            role: m.role as 'user' | 'assistant',
            content: m.content,
            attachments: m.attachments?.map((a) => ({
              id: a.id,
              name: a.name,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
              kind: a.kind,
              fileUrl: a.fileUrl,
              // Only send inline base64 if server upload wasn't available or on latest turn without fileUrl
              dataUrl: a.fileUrl ? undefined : isLatest ? a.dataUrl : undefined,
            })),
          };
        });

      const res = await api.chatWithAI({
        messages: historyForApi,
        systemInstruction: ROLE_PRESETS[roleMode].instruction,
        modelType: modelTier,
        projectId: activeProjectId,
      });

      const resolvedModelLabel =
        res.modelUsed ||
        (modelTier === 'pro'
          ? 'gemini-3.1-pro-preview'
          : modelTier === 'fast'
          ? 'gemini-3.1-flash-lite'
          : 'gemini-3.8-flash');

      const executedActions = Array.isArray(res.executedActions) ? res.executedActions : undefined;

      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: resolvedModelLabel,
        executedActions: executedActions && executedActions.length > 0 ? executedActions : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Notify workspace views whenever AI Co-Pilot performs a real state mutation
      if (executedActions && executedActions.some((a) => a.success && a.entityType !== 'query')) {
        window.dispatchEvent(new CustomEvent('nexora:ai-mutated', { detail: executedActions }));
        refreshNotifications().catch(() => {});
        if (executedActions.some((a) => a.entityType === 'user')) {
          refreshMe().catch(() => {});
        }
      }

      if (firebaseUser) {
        try {
          await addDoc(collection(db, 'chat_messages'), {
            userId: firebaseUser.uid,
            ...(user?.id ? { nexoraUserId: user.id } : {}),
            role: 'assistant',
            content: res.reply,
            ...(executedActions && executedActions.length > 0 ? { executedActions } : {}),
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Could not save AI reply to Firestore:', e);
        }
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Unable to process request**: ${err?.message || 'Could not reach the AI service. Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setPendingAttachments([]);
    setAttachmentError(null);
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: buildWelcomeContent(user?.name, effectiveAccountRole, activeProjectName),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handlePrefillComposer = (template: string) => {
    setInputText(template);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  if (!isOpen) return null;

  const canSend = (inputText.trim().length > 0 || pendingAttachments.length > 0) && !isLoading && !isReadingFiles;

  return (
    <>
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`fixed z-[60] transition-all duration-300 flex flex-col backdrop-blur-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] shadow-[0_24px_55px_-12px_rgba(0,0,0,0.85),0_0_32px_-8px_var(--accent-glow)] ${
          isExpanded
            ? 'inset-2 sm:inset-8 rounded-2xl sm:rounded-3xl'
            : 'inset-x-2.5 bottom-20 top-18 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[480px] sm:h-[670px] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl'
        }`}
      >
        {/* Drag-and-Drop Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-2 z-30 rounded-2xl border-2 border-dashed border-cyan-400 bg-[#05091b]/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-none animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-3 shadow-lg">
              <Upload className="w-7 h-7 animate-bounce" />
            </div>
            <p className="text-sm font-display font-bold text-white">Drop pictures or files to attach</p>
            <p className="text-xs text-slate-300 mt-1 max-w-xs">
              Supports PNG, JPG, WEBP, GIF, SVG, PDF, CSV, Office docs, JSON, Markdown, and source code up to 25 MB
            </p>
          </div>
        )}

        {/* Hidden Native File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* Top Header Bar */}
        <div className="px-3.5 py-2.5 border-b border-[var(--border-color)] bg-[var(--surface-header)] flex items-center justify-between gap-2 rounded-t-2xl sm:rounded-t-3xl min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-sm shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-xs sm:text-sm font-sharp font-bold text-[var(--text-main)] whitespace-nowrap truncate tracking-wide">
                  AI Co-Pilot
                </h3>
                <span className="text-[10px] text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-cyan-300 whitespace-nowrap truncate">
                  {effectiveAccountRole === 'leader'
                    ? 'Leader Access'
                    : effectiveAccountRole === 'co-leader'
                    ? 'Co-Leader Access'
                    : 'Member Access'}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                {user?.name ? `${user.name}` : 'Signed in'}
                {activeProjectName ? ` · ${activeProjectName}` : ' · Scoped to your account permissions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!firebaseUser && (
              <button
                type="button"
                onClick={handleFirebaseSignIn}
                title="Sign in with Google to sync AI chat history"
                className="px-2 py-1 rounded-lg bg-[#121836] border border-cyan-500/30 text-cyan-200 hover:text-white hover:bg-cyan-950/60 text-[10px] sm:text-[11px] font-medium flex items-center gap-1 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <User className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Sync History</span>
                <span className="sm:hidden">Sync</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2248] transition-colors shrink-0 cursor-pointer"
              title={isExpanded ? 'Restore Window Size' : 'Expand Window'}
              aria-label={isExpanded ? 'Restore Window Size' : 'Expand Window'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2248] transition-colors shrink-0 cursor-pointer"
              title="Reset Conversation"
              aria-label="Reset Conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-950/50 transition-colors shrink-0 cursor-pointer"
              title="Close Assistant"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Focus & Model Selector Toolbar */}
        <div className="px-3.5 py-1.5 border-b border-[var(--border-color)] bg-[var(--surface-card)] flex items-center justify-between gap-2 text-xs overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">Focus:</span>
            {(Object.keys(ROLE_PRESETS) as ChatRoleMode[]).map((key) => {
              const preset = ROLE_PRESETS[key];
              const isActive = roleMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleMode(key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/45 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#141c3a] border border-transparent'
                  }`}
                >
                  {preset.icon}
                  <span>{preset.badge}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">Model:</span>
            <select
              value={modelTier}
              onChange={(e) => setModelTier(e.target.value as ModelTier)}
              aria-label="Select AI Model"
              className="px-2 py-0.5 rounded-lg bg-[#0d132b] border border-[#222d58] text-slate-200 text-[10px] sm:text-[11px] font-mono focus:outline-none focus:border-cyan-400 shrink-0 cursor-pointer"
            >
              <option value="flash">Gemini 3.8 Flash</option>
              <option value="pro">Gemini 3.1 Pro</option>
              <option value="fast">Gemini 3.1 Lite</option>
            </select>
          </div>
        </div>

        {/* Message Scroll Thread */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 min-h-0">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const imageAttachments = msg.attachments?.filter((a) => a.kind === 'image') || [];
            const fileAttachments = msg.attachments?.filter((a) => a.kind !== 'image') || [];

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-md ${
                    isUser
                      ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950'
                      : 'bg-[#101836] text-cyan-300 border border-cyan-500/35'
                  }`}
                >
                  {isUser ? user?.name?.[0]?.toUpperCase() || 'U' : <Bot className="w-4 h-4 text-cyan-300" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-3 sm:p-3.5 text-xs leading-relaxed space-y-2 shadow-md min-w-0 ${
                    isUser
                      ? 'bg-gradient-to-br from-[#12264c] to-[#0f1d3d] text-white border border-cyan-400/35 rounded-tr-sm'
                      : 'bg-[#0e142f] text-slate-100 border border-[#1f2952] rounded-tl-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] text-slate-300/80 border-b border-white/10 pb-1">
                    <span className="font-semibold truncate">{isUser ? 'You' : ROLE_PRESETS[roleMode].name}</span>
                    <div className="flex items-center gap-1.5 font-mono shrink-0 tabular-nums">
                      {msg.modelUsed && <span className="text-cyan-300/90 hidden sm:inline">{msg.modelUsed}</span>}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  {/* Attached Pictures Grid */}
                  {imageAttachments.length > 0 && (
                    <div
                      className={`grid gap-2 ${
                        imageAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                      }`}
                    >
                      {imageAttachments.map((img) => {
                        const src = img.dataUrl || img.fileUrl || '';
                        return (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setPreviewAttachment(img)}
                            className="group relative rounded-xl overflow-hidden border border-white/15 bg-black/40 text-left focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
                            title={`Preview ${img.name}`}
                          >
                            {src ? (
                              <img
                                src={src}
                                alt={img.name}
                                className="w-full max-h-52 object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="h-28 flex items-center justify-center text-slate-400 text-[11px]">
                                {img.name}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                              <span className="text-[10px] text-white font-medium truncate pr-2">{img.name}</span>
                              <ZoomIn className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Attached Files List */}
                  {fileAttachments.length > 0 && (
                    <div className="space-y-1.5">
                      {fileAttachments.map((fileAtt) => {
                        const meta = getFileVisualMeta(fileAtt.name, fileAtt.mimeType);
                        const downloadHref = fileAtt.fileUrl || fileAtt.dataUrl;
                        return (
                          <div
                            key={fileAtt.id}
                            className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-black/30 border border-white/12 min-w-0"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${meta.badgeClass}`}
                              >
                                {meta.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-semibold text-white truncate" title={fileAtt.name}>
                                  {fileAtt.name}
                                </div>
                                <div className="text-[10px] font-mono text-slate-300/80 flex items-center gap-1.5 tabular-nums">
                                  <span>{meta.label}</span>
                                  <span>•</span>
                                  <span>{formatAttachmentSize(fileAtt.sizeBytes)}</span>
                                </div>
                              </div>
                            </div>

                            {downloadHref && (
                              <a
                                href={downloadHref}
                                download={fileAtt.name}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-cyan-500/25 text-slate-200 hover:text-cyan-200 transition-colors shrink-0"
                                title={`Download ${fileAtt.name}`}
                                aria-label={`Download ${fileAtt.name}`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Executed Account Actions Summary */}
                  {msg.executedActions && msg.executedActions.length > 0 && (
                    <div className="space-y-1 pt-0.5 pb-1.5 border-b border-white/10">
                      {msg.executedActions.map((act, idx) => (
                        <div
                          key={`${act.toolName}_${idx}`}
                          className={`flex items-center gap-1.5 text-[11px] leading-snug ${
                            act.permissionDenied
                              ? 'text-amber-300'
                              : act.success
                              ? 'text-teal-300'
                              : 'text-rose-300'
                          }`}
                        >
                          {act.permissionDenied ? (
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          ) : (
                            <CheckCircle2
                              className={`w-3.5 h-3.5 shrink-0 ${act.success ? 'text-teal-400' : 'text-rose-400'}`}
                            />
                          )}
                          <span className="break-words">{act.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Markdown Message Text */}
                  {msg.content && (
                    <div className="markdown-body text-slate-100 space-y-1.5 break-words">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && <ChatReplySkeleton />}
          <div ref={messagesEndRef} />
        </div>

        {/* Role-Scoped Quick Action Controls */}
        <div className="px-3 py-1.5 border-t border-[var(--border-color)] bg-[var(--surface-header)] flex items-center gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap">
          <span className="text-slate-400 font-mono text-[10px] uppercase font-bold shrink-0">Actions:</span>
          {effectiveAccountRole === 'leader' || effectiveAccountRole === 'co-leader' ? (
            <>
              <button
                type="button"
                onClick={() =>
                  handlePrefillComposer('Assign a high priority task "" to Alex Rivera due in 5 days')
                }
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] text-cyan-200 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50"
              >
                Assign Task to Member
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage('Show all open tasks and team member workload so I can delegate work.')
                }
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50"
              >
                Team Workload
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage('Check pending proof submissions and blocked tasks needing review.')
                }
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50"
              >
                Pending Proofs
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage('List my assigned tasks, priorities, and upcoming due dates.')
                }
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] text-cyan-200 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50"
              >
                My Assigned Tasks
              </button>
              <button
                type="button"
                onClick={() =>
                  handlePrefillComposer('Create a personal task for me titled "" due in 5 days')
                }
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50"
              >
                Add Personal Task
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage('Help me draft a proof-of-work summary for my in-progress tasks.')
                }
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50"
              >
                Draft Proof Summary
              </button>
            </>
          )}
        </div>

        {/* Pending Attachments & Validation Strip */}
        {(pendingAttachments.length > 0 || attachmentError || isReadingFiles) && (
          <div className="px-3 pt-2.5 pb-1.5 border-t border-[var(--border-color)] bg-[#080d22] space-y-2">
            {attachmentError && (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">{attachmentError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachmentError(null)}
                  className="text-rose-300 hover:text-white p-0.5 cursor-pointer shrink-0"
                  aria-label="Dismiss attachment warning"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {pendingAttachments.length > 0 && (
              <>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
                  <span className="tabular-nums">
                    Attached ({pendingAttachments.length}/{MAX_ATTACHMENTS_PER_MESSAGE})
                  </span>
                  {pendingAttachments.length > 1 && (
                    <button
                      type="button"
                      onClick={clearPendingAttachments}
                      className="text-rose-300 hover:text-rose-200 font-semibold cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {pendingAttachments.map((att) => {
                    const isImg = att.kind === 'image';
                    const meta = getFileVisualMeta(att.name, att.mimeType);
                    return (
                      <div
                        key={att.id}
                        className="relative group flex items-center gap-2 pl-2 pr-7 py-1.5 rounded-xl bg-[#101838] border border-cyan-500/30 shrink-0 max-w-[210px]"
                      >
                        {isImg && att.dataUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="w-9 h-9 rounded-lg overflow-hidden border border-white/15 bg-black/40 shrink-0 cursor-pointer"
                            title={`Preview ${att.name}`}
                          >
                            <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${meta.badgeClass}`}
                          >
                            {meta.icon}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-slate-100 truncate" title={att.name}>
                            {att.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                            {isImg ? 'IMG' : meta.label} • {formatAttachmentSize(att.sizeBytes)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removePendingAttachment(att.id)}
                          aria-label={`Remove ${att.name}`}
                          title="Remove attachment"
                          className="absolute top-1 right-1 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/30 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {isReadingFiles && (
              <div className="text-[11px] font-mono text-cyan-300 animate-pulse px-1">
                Preparing selected files...
              </div>
            )}
          </div>
        )}

        {/* Composer Form */}
        <div className="p-2.5 sm:p-3 border-t border-[var(--border-color)] bg-[var(--surface-card)] rounded-b-2xl sm:rounded-b-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-1.5 sm:gap-2"
          >
            {/* Add Picture Button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isLoading || pendingAttachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
              title="Add pictures (PNG, JPG, WEBP, GIF, SVG)"
              aria-label="Add pictures"
              className="h-10 w-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)] hover:border-cyan-400/60 hover:bg-[#111c3d] text-cyan-300 hover:text-cyan-200 flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <ImagePlus className="w-4 h-4" />
            </button>

            {/* Attach File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || pendingAttachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
              title="Attach files (PDF, CSV, Docs, Code, JSON, Audio)"
              aria-label="Attach files"
              className="h-10 w-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)] hover:border-cyan-400/60 hover:bg-[#111c3d] text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Auto-Resizing Prompt Input (supports Ctrl+V / Cmd+V screenshot & file paste) */}
            <textarea
              ref={textareaRef}
              rows={Math.min(4, Math.max(1, inputText.split('\n').length))}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) {
                    handleSendMessage();
                  }
                }
              }}
              placeholder={
                pendingAttachments.length > 0
                  ? 'Add instructions for attached file(s) or press Send...'
                  : 'Ask AI Co-Pilot, paste a screenshot, or attach files...'
              }
              disabled={isLoading}
              className="flex-1 min-w-0 max-h-[120px] resize-none px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-main)] placeholder-slate-400 focus:outline-none focus:border-cyan-400/70 disabled:opacity-50 transition-colors leading-relaxed"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!canSend}
              className="btn-modern-primary h-10 px-3.5 sm:px-4 text-xs font-bold disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Full-Screen In-App Image Lightbox Modal */}
      {previewAttachment && (
        <div
          onClick={() => setPreviewAttachment(null)}
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewAttachment.name}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col rounded-2xl bg-[#070c1f] border border-cyan-500/35 shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#1a2448] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-semibold text-white truncate">{previewAttachment.name}</div>
                <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {previewAttachment.mimeType} • {formatAttachmentSize(previewAttachment.sizeBytes)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(previewAttachment.fileUrl || previewAttachment.dataUrl) && (
                  <a
                    href={previewAttachment.fileUrl || previewAttachment.dataUrl}
                    download={previewAttachment.name}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/30 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50 min-h-[240px]">
              <img
                src={previewAttachment.dataUrl || previewAttachment.fileUrl || ''}
                alt={previewAttachment.name}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
