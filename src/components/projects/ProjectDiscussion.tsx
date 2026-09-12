import React, { useState, useEffect, useRef } from 'react';
import { Send, Reply, CornerDownRight, MessageSquare, Shield, X, Mic, Pencil, Trash2 } from 'lucide-react';
import { ProjectMessage, User } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import { RoleBadge } from '../common/Badges.js';
import { VoiceRecorder } from '../messages/VoiceRecorder.js';
import { AudioPlayer } from '../messages/AudioPlayer.js';

interface ProjectDiscussionProps {
  projectId: string;
  users: User[];
}

export function ProjectDiscussion({ projectId, users }: ProjectDiscussionProps) {
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<ProjectMessage | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const list = await api.getProjectMessages(projectId);
      setMessages(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 6000);
    return () => clearInterval(interval);
  }, [projectId]);

  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, audioUrl?: string) => {
    if (e) e.preventDefault();
    if ((!content.trim() && !audioUrl) || sending) return;

    const text = content.trim();
    const replyId = replyTo?.id;
    if (!audioUrl) setContent('');
    setReplyTo(null);
    setSending(true);
    setIsRecording(false);

    try {
      const msg = await api.postProjectMessage(projectId, text, replyId, audioUrl);
      setMessages((prev) => [...prev, msg]);
    } finally {
      setSending(false);
    }
  };

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleEditSubmit = async (messageId: string) => {
    if (!editingText.trim()) {
      setEditingMessageId(null);
      return;
    }
    try {
      const updated = await api.editProjectMessage(projectId, messageId, editingText);
      setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
    } catch (e: any) {
      alert(e.message || 'Failed to edit message');
    } finally {
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.deleteProjectMessage(projectId, messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (e: any) {
      alert(e.message || 'Failed to delete message');
    }
  };

  return (
    <div className="flex flex-col h-[550px] rounded-xl glass-panel border border-[#1f223f] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#202444] bg-[#0e101f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-slate-200">
            Project Discussion Channel
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {messages.length} messages • Scoped to project team
        </span>
      </div>

      {/* Messages Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0b12]/70">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
            <span>No messages yet. Start the project discussion.</span>
          </div>
        ) : (
          messages.map((m) => {
            const senderId = m.senderId || (m as any).userId;
            const author = users.find((u) => u.id === senderId);
            const isMe = senderId === user?.id;
            const replyTarget = m.replyToId ? messages.find((prev) => prev.id === m.replyToId) : null;

            return (
              <div
                key={m.id}
                className={`p-3 rounded-xl border max-w-2xl relative group ${
                  isMe
                    ? 'ml-auto border-opacity-80 text-white shadow-lg'
                    : 'mr-auto bg-[#121526] border-[#222747] text-slate-200 shadow-sm'
                }`}
                style={isMe ? { backgroundColor: themeConfig.accentColor, borderColor: themeConfig.accentColor } : undefined}
              >
                {/* Reply preview if referenced */}
                {replyTarget && (
                  <div className={`mb-2 p-2 rounded border text-[11px] flex items-center gap-2 ${isMe ? 'bg-purple-700/60 border-purple-400/40 text-purple-100' : 'bg-[#0b0c16] border-[#1d2038] text-slate-400'}`}>
                    <CornerDownRight className={`w-3 h-3 shrink-0 ${isMe ? 'text-purple-200' : 'text-purple-400'}`} />
                    <span className="truncate">{replyTarget.content}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${isMe ? 'text-purple-100' : 'text-slate-200'}`}>
                      {author ? author.name : senderId}
                    </span>
                    {author && <RoleBadge role={author.role} />}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.isEdited && (
                      <span className={`text-[9px] font-mono italic ${isMe ? 'text-purple-200/80' : 'text-slate-500'}`}>(edited)</span>
                    )}
                    <span className={`text-[10px] font-mono ${isMe ? 'text-purple-200/80' : 'text-slate-500'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => setReplyTo(m)}
                      title="Reply"
                      className="text-slate-500 hover:text-purple-300 transition-colors"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
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
                    <p className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                      {m.content}
                    </p>
                    {m.audioUrl && <AudioPlayer audioUrl={m.audioUrl} />}
                  </>
                )}

                {isMe && !editingMessageId && (
                  <div className="absolute top-2 -left-16 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#181a33] p-1 rounded-lg border border-purple-500/30">
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

      {/* Input bar */}
      <div className="p-3 border-t border-[#202444] bg-[#0e101f]">
        {replyTo && (
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-[#14162a] border border-purple-500/30 flex items-center justify-between text-xs text-purple-300">
            <span className="truncate">Replying to: {replyTo.content}</span>
            <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-200 ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {isRecording ? (
          <VoiceRecorder
            onRecordComplete={(audioUrl) => handleSend(undefined, audioUrl)}
            onCancel={() => setIsRecording(false)}
          />
        ) : (
          <form onSubmit={handleSend} className="flex gap-1.5 sm:gap-2">
            <input
              type="text"
              placeholder="Post technical update or message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-lg bg-[#0a0b14] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsRecording(true)}
              className="p-2 rounded-lg bg-[#14162a] hover:bg-[#1a1d36] text-slate-400 hover:text-purple-400 border border-[#232746] hover:border-purple-500/30 transition-colors shrink-0"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!content.trim() || sending}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/30 transition-colors shrink-0"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-3 h-3" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
