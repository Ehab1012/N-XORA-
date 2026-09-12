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
      alert(e.message || 'Failed to edit message');
    } finally {
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!selectedTarget) return;
    if (!confirm('Delete this message?')) return;
    
    try {
      if (selectedTarget.type === 'project') {
        await api.deleteProjectMessage(selectedTarget.id, messageId);
      } else {
        await api.deleteDirectMessage(selectedTarget.id, messageId);
      }
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (e: any) {
      alert(e.message || 'Failed to delete message');
    }
  };

  const otherUsers = users.filter((u) => u.id !== user?.id);

  return (
    <div className="h-[calc(100vh-13rem)] sm:h-[calc(100vh-14.5rem)] min-h-[460px] rounded-2xl glass-panel border border-[#1f223f] flex overflow-hidden shadow-xl">
      {/* Sidebar: Channels & Direct Messages */}
      <div className={`w-full sm:w-72 md:w-80 border-r border-[#1c1f38] bg-[#0c0e1c] flex-col ${isMobileChatOpen ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[#1c1f38]">
          <h2 className="text-sm font-display font-semibold text-slate-100 mb-1">Messages & Comms</h2>
          <p className="text-[11px] text-slate-400 font-mono">Real-time scoped channels</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Projects Channels */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 block mb-1.5">
              Project Channels
            </span>
            <div className="space-y-1">
              {projects.map((proj) => {
                const isSelected = selectedTarget?.type === 'project' && selectedTarget?.id === proj.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setSelectedTarget({ type: 'project', id: proj.id, name: proj.title });
                      setIsMobileChatOpen(true);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all ${
                      isSelected
                        ? 'bg-purple-950/80 text-purple-200 border border-purple-500/30 font-medium'
                        : 'text-slate-300 hover:bg-[#151830]'
                    }`}
                  >
                    <FolderGit2 className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                    <span className="truncate">{proj.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 block mb-1.5">
              Direct Messages
            </span>
            <div className="space-y-1">
              {otherUsers.map((u) => {
                const isSelected = selectedTarget?.type === 'direct' && selectedTarget?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedTarget({ type: 'direct', id: u.id, name: u.name });
                      setIsMobileChatOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                      isSelected
                        ? 'bg-purple-950/80 text-purple-200 border border-purple-500/30 font-medium'
                        : 'text-slate-300 hover:bg-[#151830]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-5 h-5 rounded-full bg-purple-900 text-purple-300 flex items-center justify-center text-[10px] font-bold">
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
      <div className={`flex-1 flex-col bg-[#090a14]/80 min-w-0 ${isMobileChatOpen ? 'flex' : 'hidden sm:flex'}`}>
        {/* Stream Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#1c1f38] bg-[#0c0e1a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileChatOpen(false)}
              className="sm:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-[#1a1d36] text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {selectedTarget?.type === 'project' ? (
              <FolderGit2 className="w-4 h-4 text-purple-400" />
            ) : (
              <User className="w-4 h-4 text-purple-400" />
            )}
            <h3 className="text-sm font-semibold text-slate-100">
              {selectedTarget ? selectedTarget.name : 'No Active Stream'}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Encrypted Session</span>
          </span>
        </div>

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
                    <div className="flex items-center gap-2">
                      {m.isEdited && (
                        <span className={`text-[9px] font-mono italic ${isMe ? 'text-purple-200/80' : 'text-slate-500'}`}>(edited)</span>
                      )}
                      <span className={`text-[10px] font-mono ${isMe ? 'text-purple-200/80' : 'text-slate-500'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
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
                  {isMe && !editingMessageId && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#181a33] p-1 rounded-lg border border-purple-500/30">
                      <button
                        onClick={() => {
                          setEditingMessageId(m.id);
                          setEditingText(m.content);
                        }}
                        className="p-1 text-slate-400 hover:text-purple-300 transition-colors"
                        title="Edit message"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-[#1c1f38] bg-[#0c0e1a]">
          {isRecording ? (
            <VoiceRecorder
              onRecordComplete={(audioUrl) => handleSend(undefined, audioUrl)}
              onCancel={() => setIsRecording(false)}
            />
          ) : (
            <form onSubmit={handleSend} className="flex gap-1.5 sm:gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder={`Message ${selectedTarget?.name || ''}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2.5 rounded-xl bg-[#080912] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setIsRecording(true)}
                className="p-2.5 rounded-xl bg-[#14162a] hover:bg-[#1a1d36] text-slate-400 hover:text-purple-400 border border-[#232746] hover:border-purple-500/30 transition-colors shrink-0"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="px-3 sm:px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-md shadow-purple-900/30 transition-colors shrink-0"
              >
                <span className="hidden sm:inline">Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
