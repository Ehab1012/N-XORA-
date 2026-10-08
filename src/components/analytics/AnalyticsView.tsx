import React, { useState, useEffect } from 'react';
import { BarChart3, Trophy, CheckCircle2, FileCheck2, Activity, FolderGit2 } from 'lucide-react';
import { Project, ProjectAnalytics } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { ProjectAnalyticsView } from '../projects/ProjectAnalyticsView.js';
import { useTheme } from '../../contexts/ThemeContext.js';

export function AnalyticsView() {
  const { themeConfig } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then((list) => {
      setProjects(list);
      if (list.length > 0) {
        setSelectedProjectId(list[0].id);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-xs">
        Compiling merit scores across workspace initiatives...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-sharp font-bold text-slate-100 tracking-tight flex items-center gap-3">
            <span>Analytics & Merit Scoring</span>
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse hidden sm:inline-block"
              style={{
                backgroundColor: themeConfig.accentColor,
                boxShadow: `0 0 10px ${themeConfig.accentColor}`,
              }}
            />
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
            Deterministic metrics, milestone completion ratios, and verified proof scores.
          </p>
        </div>

        {/* Project Selector */}
        <div
          className="flex items-center gap-2.5 p-1 rounded-2xl backdrop-blur-md shadow-inner"
          style={{
            background: 'var(--surface-header)',
            borderColor: 'var(--border-color)',
            borderWidth: 1,
          }}
        >
          <FolderGit2 className="w-4 h-4 ml-2" style={{ color: themeConfig.accentColor }} />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#060b1e] text-slate-200">
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedProjectId && <ProjectAnalyticsView projectId={selectedProjectId} />}
    </div>
  );
}
