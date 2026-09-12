import React, { useState, useEffect, useRef } from 'react';
import { Send, Reply, CornerDownRight, MessageSquare, Shield, X } from 'lucide-react';
import { ProjectMessage, User } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { RoleBadge } from '../common/Badges.js';

interface ProjectDiscussionProps {
  projectId: string;
  users: User[];
}

export function ProjectDiscussion({ projectId, users }: ProjectDiscussionProps) {
  const { user } = useAuth();
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    const text = content.trim();
    const replyId = replyTo?.id;
    setContent('');
    setReplyTo(null);
    setSending(true);

    try {
      const msg = await api.postProjectMessage(projectId, text, replyId);
      setMessages((prev) => [...prev, msg]);
    } finally {
      setSending(false);
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
                className={`p-3 rounded-xl border max-w-2xl ${
                  isMe
                    ? 'ml-auto bg-[#181a33] border-purple-500/30'
                    : 'mr-auto bg-[#101222] border-[#222544]'
                }`}
              >
                {/* Reply preview if referenced */}
                {replyTarget && (
                  <div className="mb-2 p-2 rounded bg-[#0b0c16] border border-[#1d2038] text-[11px] text-slate-400 flex items-center gap-2">
                    <CornerDownRight className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="truncate">{replyTarget.content}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {author ? author.name : senderId}
                    </span>
                    {author && <RoleBadge role={author.role} />}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">
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

                <p className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                  {m.content}
                </p>
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

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder="Post technical update or message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-lg bg-[#0a0b14] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-purple-900/30 transition-colors"
          >
            <span>Send</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
