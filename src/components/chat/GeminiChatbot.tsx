import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  RefreshCw,
  Cpu,
  Zap,
  Shield,
  User,
  MessageSquare,
  ChevronDown,
  Minimize2,
  Maximize2,
  ListFilter,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { auth, googleProvider, signInWithPopup, db, collection, addDoc, query, where, getDocs, orderBy } from '../../lib/firebase.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface GeminiChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
  activeProjectName?: string;
}

type ChatRoleMode = 'pm' | 'tech' | 'agile';
type ModelTier = 'pro' | 'flash' | 'fast';

const ROLE_PRESETS: Record<ChatRoleMode, { name: string; icon: React.ReactNode; instruction: string; badge: string }> = {
  pm: {
    name: 'Project Management Co-Pilot',
    icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
    badge: 'PM Leader',
    instruction:
      'You are Nexora Senior PM Co-Pilot. Provide structured project guidance, sprint breakdowns, risk management assessments, and milestone timeline optimizations.',
  },
  tech: {
    name: 'Code & Tech Architect',
    icon: <Cpu className="w-3.5 h-3.5 text-indigo-400" />,
    badge: 'Tech Architect',
    instruction:
      'You are Nexora Lead Technical Architect. Help with code design patterns, API structures, database schema optimization, security audits, and debugging.',
  },
  agile: {
    name: 'Agile & Velocity Coach',
    icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
    badge: 'Agile Coach',
    instruction:
      'You are Nexora Agile Velocity Coach. Help formulate acceptance criteria, refine task user stories, eliminate team blockers, and run retrospective analysis.',
  },
};

export function GeminiChatbot({ isOpen, onClose, activeProjectId, activeProjectName }: GeminiChatbotProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      content: `👋 **Hello! I'm your Gemini AI Co-Pilot.**\n\nI can analyze your project data, break down complex tasks, draft milestone roadmaps, or provide technical architectural guidance.\n\n${
        activeProjectName ? `Currently scoped to project: **${activeProjectName}**` : 'How can I assist you today?'
      }`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roleMode, setRoleMode] = useState<ChatRoleMode>('pm');
  const [modelTier, setModelTier] = useState<ModelTier>('flash');
  const [isExpanded, setIsExpanded] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setFirebaseUser(u));
    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleFirebaseSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Firebase Auth Login Error:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || inputText).trim();
    if (!queryText || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    // Save user message to Firestore if authenticated
    if (firebaseUser) {
      try {
        await addDoc(collection(db, 'chat_messages'), {
          userId: firebaseUser.uid,
          role: 'user',
          content: queryText,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not save message to Firestore:', e);
      }
    }

    try {
      const apiMessages = newHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await api.chatWithAI({
        messages: apiMessages,
        systemInstruction: ROLE_PRESETS[roleMode].instruction,
        modelType: modelTier,
        projectId: activeProjectId,
      });

      const assistantMsg: ChatMessage = {
        id: 'ai_' + Date.now(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: modelTier === 'pro' ? 'gemini-3.1-pro-preview' : modelTier === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.6-flash',
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Save AI message to Firestore if authenticated
      if (firebaseUser) {
        try {
          await addDoc(collection(db, 'chat_messages'), {
            userId: firebaseUser.uid,
            role: 'assistant',
            content: res.reply,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Could not save AI reply to Firestore:', e);
        }
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: `⚠️ **Unable to process request**: ${err?.message || 'Gemini API call failed. Check your API key or network connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: 'Conversation thread reset. How can I help you next?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 flex flex-col glass-panel bg-[#0b0d1b]/95 backdrop-blur-xl border border-purple-500/40 shadow-2xl ${
        isExpanded
          ? 'inset-4 sm:inset-10 rounded-3xl'
          : 'bottom-4 right-4 w-[calc(100vw-2rem)] sm:w-[460px] h-[640px] max-h-[85vh] rounded-2xl'
      }`}
    >
      {/* Top Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-[#1f2345] flex items-center justify-between gap-2 bg-gradient-to-r from-[#141838] via-[#0f122c] to-[#181335] rounded-t-2xl min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 sm:p-2 rounded-xl bg-purple-900/40 border border-purple-500/50 text-purple-300 shadow-md shrink-0">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-white whitespace-nowrap truncate">
                Gemini AI Co-Pilot
              </h3>
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] sm:text-[10px] font-mono font-medium whitespace-nowrap shrink-0">
                {modelTier === 'pro' ? 'Pro 3.1' : modelTier === 'fast' ? 'Flash Lite' : 'Flash 3.6'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {activeProjectName ? `Context: ${activeProjectName}` : 'Multi-turn intelligent assistant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Firebase Auth Google Sign-in status */}
          {!firebaseUser ? (
            <button
              onClick={handleFirebaseSignIn}
              title="Sign in with Google (Firebase Auth)"
              className="px-2 py-1 rounded-lg bg-[#161935] border border-purple-500/30 text-purple-200 hover:text-white hover:bg-purple-900/40 text-[10px] sm:text-[11px] font-medium flex items-center gap-1 transition-all whitespace-nowrap shrink-0"
            >
              <User className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="hidden sm:inline">Firebase Login</span>
              <span className="sm:hidden">Login</span>
            </button>
          ) : (
            <span
              title={`Authenticated as ${firebaseUser.email}`}
              className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[9px] sm:text-[10px] font-mono flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="hidden sm:inline">Firestore Auth Active</span>
              <span className="sm:hidden">Auth Active</span>
            </span>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1e42] transition-colors shrink-0"
            title={isExpanded ? 'Minimize Window' : 'Maximize Window'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          <button
            onClick={handleClearHistory}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1e42] transition-colors shrink-0"
            title="Clear Chat History"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-950/40 transition-colors shrink-0"
            title="Close Assistant"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Role & Model Selector Toolbar */}
      <div className="px-3.5 py-1.5 border-b border-[#1b1f3c] bg-[#0d0f22] flex items-center justify-between gap-2 text-xs overflow-x-auto scrollbar-none">
        {/* Role Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">Role:</span>
          {(Object.keys(ROLE_PRESETS) as ChatRoleMode[]).map((key) => {
            const preset = ROLE_PRESETS[key];
            const isActive = roleMode === key;
            return (
              <button
                key={key}
                onClick={() => setRoleMode(key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-purple-600/90 text-white shadow-sm shadow-purple-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#181c3d]'
                }`}
              >
                {preset.icon}
                <span>{preset.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Model Tier Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">Model:</span>
          <select
            value={modelTier}
            onChange={(e) => setModelTier(e.target.value as ModelTier)}
            className="px-2 py-0.5 rounded-lg bg-[#12152d] border border-[#252a54] text-slate-200 text-[10px] sm:text-[11px] font-mono focus:outline-none focus:border-purple-500 shrink-0"
          >
            <option value="flash">Gemini 3.6 Flash</option>
            <option value="pro">Gemini 3.1 Pro</option>
            <option value="fast">Gemini 3.1 Lite</option>
          </select>
        </div>
      </div>

      {/* Message Scroll Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-md ${
                  isUser
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-purple-900 to-purple-700 text-purple-200 border border-purple-400/30'
                }`}
              >
                {isUser ? user?.name?.[0] || 'U' : <Bot className="w-4 h-4 text-purple-200" />}
              </div>

              <div
                className={`max-w-[84%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-1 shadow-md ${
                  isUser
                    ? 'bg-purple-600 text-white rounded-tr-none'
                    : 'bg-[#121633] text-slate-100 border border-[#222852] rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[10px] text-slate-300/80 mb-1 border-b border-white/10 pb-1">
                  <span className="font-semibold">{isUser ? 'You' : ROLE_PRESETS[roleMode].name}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    {msg.modelUsed && <span className="text-purple-300">{msg.modelUsed}</span>}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                <div className="markdown-body text-slate-100 space-y-1.5">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-300 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-[#121633] border border-[#222852] text-slate-300 text-xs flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Gemini is thinking and drafting response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-1.5 bg-[#0a0c1a] border-t border-[#1a1d3a] flex items-center gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap scrollbar-none">
        <span className="text-slate-500 font-mono text-[10px] uppercase">Quick:</span>
        <button
          onClick={() => handleSendMessage('Analyze the current project bottlenecks and give recommendations.')}
          className="px-2.5 py-1 rounded-full bg-[#131636] border border-purple-500/20 text-purple-200 hover:border-purple-500/60 hover:text-white transition-colors"
        >
          🔍 Analyze Bottlenecks
        </button>
        <button
          onClick={() => handleSendMessage('Break down tasks for a security audit sprint.')}
          className="px-2.5 py-1 rounded-full bg-[#131636] border border-indigo-500/20 text-indigo-200 hover:border-indigo-500/60 hover:text-white transition-colors"
        >
          🛡️ Security Task Breakdown
        </button>
        <button
          onClick={() => handleSendMessage('Draft a high-level milestone progress report.')}
          className="px-2.5 py-1 rounded-full bg-[#131636] border border-amber-500/20 text-amber-200 hover:border-amber-500/60 hover:text-white transition-colors"
        >
          📊 Milestone Status
        </button>
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-[#1f2345] bg-[#0c0e21] rounded-b-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ask Gemini Co-Pilot (${ROLE_PRESETS[roleMode].name})...`}
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#070814] border border-[#242952] text-xs text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-xs hover:from-purple-500 hover:to-indigo-500 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
