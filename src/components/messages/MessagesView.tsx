import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  User,
  Send,
  FolderGit2,
  Users,
  Search,
  CheckCircle2,
  ChevronLeft,
  Mic,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Project, User as UserType, DirectMessage, ProjectMessage } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import { RoleBadge } from '../common/Badges.js';
import { ConfirmModal } from '../common/Modal.js';
import { VoiceRecorder } from './VoiceRecorder.js';
import { AudioPlayer } from './AudioPlayer.js';

interface MessagesViewProps {
  initialTarget?: { type: 'project' | 'direct'; id: string; name?: string } | null;
}

export function MessagesView({ initialTarget }: MessagesViewProps = {}) {
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'project' | 'direct'; id: string; name: string } | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([api.getProjects(), api.getMe()]).then(([pList, meRes]) => {
      setProjects(pList);
      const avail = meRes.availableUsers ? (meRes.availableUsers as any) : [];
      setUsers(avail);

      if (initialTarget) {
        const foundName =
          initialTarget.name ||
          (initialTarget.type === 'project'
            ? pList.find((p) => p.id === initialTarget.id)?.title
            : avail.find((u: any) => u.id === initialTarget.id)?.name) ||
          'Conversation';
        setSelectedTarget({ type: initialTarget.type, id: initialTarget.id, name: foundName });
        setIsMobileChatOpen(true);
      } else if (pList.length > 0) {
        setSelectedTarget({ type: 'project', id: pList[0].id, name: pList[0].title });
      }
    });
  }, []);

  useEffect(() => {
    if (initialTarget && (projects.length > 0 || users.length > 0)) {
      const foundName =
        initialTarget.name ||
        (initialTarget.type === 'project'
          ? projects.find((p) => p.id === initialTarget.id)?.title
          : users.find((u) => u.id === initialTarget.id)?.name) ||
        'Conversation';
      setSelectedTarget({ type: initialTarget.type, id: initialTarget.id, name: foundName });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [initialTarget?.id, initialTarget?.type]);

  const fetchCurrentMessages = async () => {
    if (!selectedTarget) return;
    try {
      if (selectedTarget.type === 'project') {
        const list = await api.getProjectMessages(selectedTarget.id);
        setMessages(list);
      } else {
        const list = await api.getDirectMessages(selectedTarget.id);
        setMessages(list);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCurrentMessages();
    const interval = setInterval(fetchCurrentMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedTarget]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, audioUrl?: string) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !audioUrl) || !selectedTarget || sending) return;

    const text = inputText.trim();
    if (!audioUrl) setInputText('');
    setSending(true);
    setIsRecording(false);

    try {
      let sentMsg: any;
      if (selectedTarget.type === 'project') {
        sentMsg = await api.postProjectMessage(selectedTarget.id, text, undefined, audioUrl);
      } else {
        sentMsg = await api.sendDirectMessage(selectedTarget.id, text, audioUrl);
      }
      setMessages((prev) => [...prev, sentMsg]);
    } finally {
      setSending(false);
    }
  };

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleEditSubmit = async (messageId: string) => {
    if (!editingText.trim() || !selectedTarget) {
      setEditingMessageId(null);
      return;
    }
    
    try {
      let updated: any;
      if (selectedTarget.type === 'project') {
        updated = await api.editProjectMessage(selectedTarget.id, messageId, editingText);
      } else {
        updated = await api.editDirectMessage(selectedTarget.id, messageId, editingText);
      }
      setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
    } catch (e: any) {
      setActionError(e.message || 'Failed to edit message');
    } finally {
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete || !selectedTarget) return;
    const targetMsgId = messageToDelete;
    setIsDeleting(true);
    setActionError(null);
    
    try {
      if (selectedTarget.type === 'project') {
        await api.deleteProjectMessage(selectedTarget.id, targetMsgId);
      } else {
        await api.deleteDirectMessage(selectedTarget.id, targetMsgId);
      }
      setMessages(prev => prev.filter(m => m.id !== targetMsgId));
      setMessageToDelete(null);
    } catch (e: any) {
      setActionError(e.message || 'Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  const otherUsers = users.filter((u) => u.id !== user?.id);

  return (
    <div className="h-[calc(100vh-13rem)] sm:h-[calc(100vh-14.5rem)] min-h-[460px] rounded-2xl sm:rounded-3xl bg-[#060b1c]/90 backdrop-blur-2xl border border-cyan-500/25 flex overflow-hidden shadow-2xl shadow-cyan-950/40">
      {/* Sidebar: Channels & Direct Messages */}
      <div className={`w-full sm:w-72 md:w-80 border-r border-cyan-500/20 bg-[#060a18] flex-col ${isMobileChatOpen ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 border-b border-cyan-500/20 bg-[#070d22]/80">
          <h2 className="text-sm font-sharp font-bold text-slate-100 mb-0.5 tracking-tight">Messages & Comms</h2>
          <p className="text-[11px] text-slate-400 font-mono">Real-time scoped channels</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-none">
          {/* Projects Channels */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 font-bold px-2 block mb-2">
              Project Channels
            </span>
            <div className="space-y-1.5">
              {projects.map((proj) => {
                const isSelected = selectedTarget?.type === 'project' && selectedTarget?.id === proj.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setSelectedTarget({ type: 'project', id: proj.id, name: proj.title });
                      setIsMobileChatOpen(true);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/90 to-teal-950/80 text-cyan-200 border border-cyan-500/40 font-semibold shadow-md shadow-cyan-950/30'
                        : 'text-slate-300 hover:bg-[#0c142e] hover:text-cyan-200'
                    }`}
                  >
                    <FolderGit2 className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className="truncate">{proj.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 font-bold px-2 block mb-2">
              Direct Messages
            </span>
            <div className="space-y-1.5">
              {otherUsers.map((u) => {
                const isSelected = selectedTarget?.type === 'direct' && selectedTarget?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedTarget({ type: 'direct', id: u.id, name: u.name });
                      setIsMobileChatOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/90 to-teal-950/80 text-cyan-200 border border-cyan-500/40 font-semibold shadow-md shadow-cyan-950/30'
                        : 'text-slate-300 hover:bg-[#0c142e] hover:text-cyan-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-[10px] font-bold">
                        {u.name[0]}
                      </div>
                      <span className="truncate">{u.name}</span>
                    </div>
                    <RoleBadge role={u.role} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className={`flex-1 flex-col bg-[#040816]/95 min-w-0 ${isMobileChatOpen ? 'flex' : 'hidden sm:flex'}`}>
        {/* Stream Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-cyan-500/20 bg-[#060a18] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileChatOpen(false)}
              className="sm:hidden p-1.5 -ml-1.5 rounded-xl hover:bg-[#0c142e] text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {selectedTarget?.type === 'project' ? (
              <FolderGit2 className="w-4 h-4 text-cyan-400 icon-anim" />
            ) : (
              <User className="w-4 h-4 text-cyan-400 icon-anim" />
            )}
            <h3 className="text-sm font-sharp font-semibold text-slate-100">
              {selectedTarget ? selectedTarget.name : 'No Active Stream'}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Encrypted Session</span>
          </span>
        </div>

        {/* Error notification */}
        {actionError && (
          <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-400 hover:text-rose-200 text-xs font-semibold ml-2 px-1 py-0.5 rounded hover:bg-rose-900/40"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Message Log */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3">
          {!selectedTarget ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono text-center p-4">
              <span>No active project or message recipient available yet.</span>
              <span className="text-[11px] text-slate-600 mt-1">Create a project or add team members to start messaging.</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
              <span>No messages in this stream yet. Send a note.</span>
            </div>
          ) : (
            messages.map((m) => {
              const authorId = m.userId || m.senderId;
              const author = users.find((u) => u.id === authorId);
              const isMe = authorId === user?.id;
              const isLeader = user?.role === 'leader';
              const canEdit = isMe;
              const canDelete = isMe || isLeader;

              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border max-w-xl text-xs space-y-1 relative group ${
                    isMe
                      ? 'ml-auto border-opacity-80 text-white shadow-lg'
                      : 'mr-auto bg-[#121526] border-[#222747] text-slate-200 shadow-sm'
                  }`}
                  style={isMe ? { backgroundColor: themeConfig.accentColor, borderColor: themeConfig.accentColor } : undefined}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`font-semibold ${isMe ? 'text-purple-200' : 'text-purple-300'}`}>
                      {isMe ? 'You' : author ? author.name : authorId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {m.isEdited && (
                        <span className={`text-[9px] font-mono italic ${isMe ? 'text-purple-200/80' : 'text-slate-500'}`}>(edited)</span>
                      )}
                      <span className={`text-[10px] font-mono ${isMe ? 'text-purple-200/80' : 'text-slate-500'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {canEdit && !editingMessageId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(m.id);
                            setEditingText(m.content);
                          }}
                          className={`p-1 transition-colors rounded ${
                            isMe ? 'text-purple-200 hover:text-white hover:bg-black/20' : 'text-slate-400 hover:text-purple-300 hover:bg-[#181b36]'
                          }`}
                          title="Edit message"
                          aria-label="Edit message"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {canDelete && !editingMessageId && (
                        <button
                          type="button"
                          onClick={() => setMessageToDelete(m.id)}
                          className={`p-1 transition-colors rounded ${
                            isMe ? 'text-purple-200 hover:text-rose-200 hover:bg-black/20' : 'text-slate-400 hover:text-rose-400 hover:bg-[#181b36]'
                          }`}
                          title="Delete message"
                          aria-label="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {editingMessageId === m.id ? (
                    <div className="flex flex-col gap-2 mt-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0a0b14] border border-purple-500/50 text-slate-100 text-xs focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSubmit(m.id);
                          if (e.key === 'Escape') setEditingMessageId(null);
                        }}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setEditingMessageId(null)} className="text-[10px] text-slate-400 hover:text-slate-200">Cancel</button>
                        <button onClick={() => handleEditSubmit(m.id)} className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded">Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      {m.audioUrl && <AudioPlayer audioUrl={m.audioUrl} />}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-cyan-500/20 bg-[#040816]/90 backdrop-blur-xl">
          {isRecording ? (
            <VoiceRecorder
              onRecordComplete={(audioUrl) => handleSend(undefined, audioUrl)}
              onCancel={() => setIsRecording(false)}
            />
          ) : (
            <form onSubmit={handleSend} className="flex gap-2 sm:gap-2.5">
              <input
                ref={inputRef}
                type="text"
                placeholder={`Message ${selectedTarget?.name || ''}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#030612]/90 border border-cyan-500/20 text-slate-100 placeholder-slate-500 text-xs focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setIsRecording(true)}
                className="p-2.5 rounded-xl bg-[#060a1a] hover:bg-[#0c142e] text-slate-400 hover:text-cyan-300 border border-cyan-500/25 hover:border-cyan-400/60 transition-all shrink-0 cursor-pointer hover:-translate-y-0.5 active:scale-95"
                title="Record voice note"
              >
                <Mic className="w-4 h-4 text-cyan-400 icon-anim" />
              </button>
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="btn-modern-primary px-4 sm:px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-950/40 shrink-0"
              >
                <span className="hidden sm:inline">Send</span>
                <Send className="w-3.5 h-3.5 text-slate-950 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Message Deletion */}
      <ConfirmModal
        isOpen={!!messageToDelete}
        onClose={() => {
          if (!isDeleting) setMessageToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Message"
        message="Are you sure you want to permanently delete this message? This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Message'}
        destructive={true}
      />
    </div>
  );
}
