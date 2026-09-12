import React, { useState } from 'react';
import { Cpu, ArrowRight, UserCheck, Lock, Sparkles } from 'lucide-react';
import { PRODUCT_NAME, PRODUCT_STYLIZED_NAME } from '../../../shared/const.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { RoleBadge } from '../common/Badges.js';

interface AppLoginViewProps {
  onSignedIn?: () => void;
}

export function AppLoginView({ onSignedIn }: AppLoginViewProps) {
  const { availableUsers, login } = useAuth();
  const [customEmail, setCustomEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectUser = async (email: string) => {
    setLoading(true);
    try {
      await login(email);
      if (onSignedIn) onSignedIn();
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    await handleSelectUser(customEmail.trim());
  };

  return (
    <div className="min-h-screen bg-[#090a12] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 glass-panel border border-[#1f223f] p-6 sm:p-8 rounded-3xl shadow-2xl shadow-black/80 space-y-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-xl shadow-purple-900/40 mb-2">
            <Cpu className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-sharp font-bold tracking-tight text-white">
            {PRODUCT_NAME}
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Zero-Trust Engineering & Milestone Workspace
          </p>
        </div>

        {/* 1-Click Profile Launch */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Select Active Workspace Identity</span>
            <span className="text-purple-400">1-Click Launch</span>
          </div>

          <div className="space-y-2">
            {availableUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u.email)}
                disabled={loading}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#0e101f] border border-[#202446] hover:border-purple-500/50 hover:bg-[#151833] transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
                    {u.name[0]}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-200 transition-colors">
                      {u.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {u.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <RoleBadge role={u.role} />
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Or enter custom email */}
        <div className="pt-2 border-t border-[#1a1d35]">
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <label className="block text-[11px] font-mono text-slate-400">
              Or Connect Custom Account
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="developer@team.internal"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#090a14] border border-[#232746] text-slate-200 placeholder-slate-600 text-xs focus:border-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !customEmail.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
              >
                {loading ? 'Starting...' : 'Launch'}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-[10px] font-mono text-slate-500 flex items-center justify-center gap-1.5 pt-2">
          <Lock className="w-3 h-3 text-purple-400" />
          <span>Local session verified via AES-encrypted cookie</span>
        </div>
      </div>
    </div>
  );
}
