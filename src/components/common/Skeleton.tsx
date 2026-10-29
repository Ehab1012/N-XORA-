import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * Base GPU-composited skeleton bone primitive.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`skeleton-bone rounded-lg ${className}`} />;
}

/**
 * Accessible status container for skeleton screens.
 */
export function SkeletonScreen({
  label = 'Loading content',
  className = '',
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * 1. Full-Viewport Workspace Shell Skeleton (App.tsx initial session boot)
 */
export function AppSessionSkeleton() {
  return (
    <SkeletonScreen
      label="Loading workspace session"
      className="min-h-[100dvh] bg-[var(--canvas-bg)] text-slate-100 flex flex-col overflow-hidden"
    >
      {/* Sticky Top Header Skeleton */}
      <header className="h-16 border-b border-[var(--border-color)] bg-[var(--surface-header)] px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="md:hidden w-9 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-28 h-5 rounded-md" />
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[var(--border-color)]">
            <Skeleton className="w-24 h-4 rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="hidden md:block w-36 h-9 rounded-xl" />
          <Skeleton className="w-10 sm:w-28 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-9 sm:w-32 h-9 rounded-xl" />
        </div>
      </header>

      {/* Body Split: Sidebar + Main Workspace */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Left Navigation Rail */}
        <aside className="hidden md:flex w-64 shrink-0 border-r border-[var(--border-color)] bg-[var(--surface-header)] p-4 flex-col justify-between">
          <div className="space-y-2">
            <Skeleton className="w-24 h-3 rounded mb-3" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent"
              >
                <Skeleton className="w-4 h-4 rounded-md shrink-0" />
                <Skeleton className={`h-3.5 rounded-md ${i % 2 === 0 ? 'w-28' : 'w-36'}`} />
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="w-24 h-3.5 rounded" />
                <Skeleton className="w-16 h-3 rounded" />
              </div>
            </div>
            <Skeleton className="w-full h-7 rounded-lg" />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-28 space-y-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div className="space-y-2">
              <Skeleton className="w-56 sm:w-72 h-8 rounded-xl" />
              <Skeleton className="w-72 sm:w-96 max-w-full h-4 rounded-md" />
            </div>
            <Skeleton className="w-40 h-10 rounded-xl" />
          </div>

          {/* Filter & Search Bar */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] flex flex-col md:flex-row gap-3">
            <Skeleton className="flex-1 h-9 rounded-xl" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-32 h-9 rounded-xl" />
              <Skeleton className="w-32 h-9 rounded-xl" />
            </div>
          </div>

          <ProjectGridSkeleton count={6} />
        </main>
      </div>

      {/* Mobile Bottom Navigation Skeleton */}
      <nav
        aria-hidden="true"
        className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-[var(--border-color)] bg-[var(--surface-header)] px-2 grid grid-cols-6 items-center gap-1"
      >
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center gap-1.5 py-1">
            <Skeleton className="w-5 h-5 rounded-md" />
            <Skeleton className="w-10 h-2.5 rounded" />
          </div>
        ))}
      </nav>
    </SkeletonScreen>
  );
}

/**
 * 2. Projects Workspace Card Grid Skeleton (ProjectDashboard.tsx)
 */
export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonScreen
      label="Loading workspace projects"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-5 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] flex flex-col justify-between gap-5"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="w-20 h-5 rounded-full" />
              <Skeleton className="w-24 h-4 rounded-md" />
            </div>
            <Skeleton className={`h-6 rounded-lg ${idx % 2 === 0 ? 'w-3/4' : 'w-4/5'}`} />
            <div className="space-y-2 pt-0.5">
              <Skeleton className="w-full h-3.5 rounded" />
              <Skeleton className="w-5/6 h-3.5 rounded" />
            </div>
          </div>

          <div className="pt-3.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-20 h-4 rounded" />
            </div>
            <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </SkeletonScreen>
  );
}

/**
 * 3. Project Detail Full Environment Skeleton (ProjectDetail.tsx)
 */
export function ProjectDetailSkeleton() {
  return (
    <SkeletonScreen label="Loading project environment" className="space-y-6">
      {/* Top Breadcrumb & Responsive Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-start sm:items-center gap-3 w-full lg:w-auto">
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <Skeleton className="w-48 sm:w-64 h-7 rounded-lg" />
              <Skeleton className="w-24 h-6 rounded-lg" />
              <Skeleton className="w-20 h-6 rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="w-28 h-3.5 rounded" />
              <Skeleton className="w-32 h-3.5 rounded" />
              <Skeleton className="w-28 h-3.5 rounded" />
            </div>
          </div>
        </div>

        {/* Mobile 1-row action bar (< sm) */}
        <div className="flex sm:hidden items-center gap-2 w-full">
          <Skeleton className="flex-1 h-10 rounded-xl" />
          <Skeleton className="w-24 h-10 rounded-xl" />
          <Skeleton className="w-20 h-10 rounded-xl" />
        </div>

        {/* Tablet/Desktop inline action bar (sm+) */}
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          <Skeleton className="w-28 h-9 rounded-xl" />
          <Skeleton className="w-28 h-9 rounded-xl" />
          <Skeleton className="w-28 h-9 rounded-xl" />
          <Skeleton className="w-28 h-9 rounded-xl" />
        </div>
      </div>

      {/* Sub-navigation Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {Array.from({ length: 7 }).map((_, idx) => (
          <Skeleton
            key={idx}
            className={`h-9 rounded-xl shrink-0 ${idx === 0 ? 'w-28' : 'w-24'}`}
          />
        ))}
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] space-y-2.5"
          >
            <Skeleton className="w-24 h-3.5 rounded" />
            <Skeleton className="w-16 h-7 rounded-lg" />
            <Skeleton className="w-full h-1.5 rounded-full" />
          </div>
        ))}
      </div>

      {/* Main Two-Column Project Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Scope & Objectives Panel */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] space-y-4">
            <Skeleton className="w-44 h-5 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="w-full h-3.5 rounded" />
              <Skeleton className="w-11/12 h-3.5 rounded" />
              <Skeleton className="w-3/4 h-3.5 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-9 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Active Deliverables / Tasks List Skeleton */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="w-40 h-5 rounded-md" />
              <Skeleton className="w-24 h-8 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] space-y-3"
                >
                  <Skeleton className="w-4/5 h-4 rounded" />
                  <Skeleton className="w-full h-3 rounded" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-16 h-5 rounded-full" />
                    <Skeleton className="w-16 h-5 rounded-full" />
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                    <Skeleton className="w-20 h-4 rounded" />
                    <Skeleton className="w-20 h-6 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Milestones & Squad Roster */}
        <div className="space-y-5">
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] space-y-3.5">
            <div className="flex items-center justify-between">
              <Skeleton className="w-36 h-5 rounded-md" />
              <Skeleton className="w-16 h-6 rounded-lg" />
            </div>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="w-32 h-4 rounded" />
                  <Skeleton className="w-14 h-4 rounded-full" />
                </div>
                <Skeleton className="w-24 h-3 rounded" />
              </div>
            ))}
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] space-y-3.5">
            <Skeleton className="w-36 h-5 rounded-md" />
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="w-28 h-3.5 rounded" />
                    <Skeleton className="w-20 h-2.5 rounded" />
                  </div>
                </div>
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}

/**
 * 4. Teams & Membership Roster Skeleton (TeamsView.tsx)
 */
export function TeamsViewSkeleton() {
  return (
    <SkeletonScreen label="Loading teams and membership roster" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          <Skeleton className="w-56 h-8 rounded-xl" />
          <Skeleton className="w-72 sm:w-96 max-w-full h-4 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Skeleton className="w-52 h-9 rounded-2xl" />
          <Skeleton className="w-28 h-9 rounded-xl" />
        </div>
      </div>

      {/* Squads 2-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] space-y-5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="w-44 h-6 rounded-lg" />
                  <Skeleton className="w-4/5 h-3.5 rounded" />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Skeleton className="w-24 h-8 rounded-xl" />
                  <Skeleton className="w-8 h-8 rounded-xl" />
                </div>
              </div>

              {/* Leadership Badges Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Skeleton className="w-full h-12 rounded-xl" />
                <Skeleton className="w-full h-12 rounded-xl" />
              </div>

              {/* Member Roster Rows */}
              <div className="space-y-2 pt-1">
                <Skeleton className="w-28 h-3 rounded" />
                {Array.from({ length: 3 }).map((__, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-2.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="space-y-1">
                        <Skeleton className="w-28 h-3.5 rounded" />
                        <Skeleton className="w-36 h-2.5 rounded" />
                      </div>
                    </div>
                    <Skeleton className="w-16 h-5 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
              <Skeleton className="w-32 h-4 rounded" />
              <Skeleton className="w-24 h-4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}

/**
 * 5. Messages Sidebar & Conversation Thread Skeletons (MessagesView.tsx & ProjectDiscussion.tsx)
 */
export function MessagesSidebarSkeleton() {
  return (
    <SkeletonScreen label="Loading channels and direct messages" className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="w-28 h-3 rounded mx-2" />
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl">
            <Skeleton className="w-4 h-4 rounded shrink-0" />
            <Skeleton className={`h-3.5 rounded ${idx % 2 === 0 ? 'w-36' : 'w-28'}`} />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="w-28 h-3 rounded mx-2" />
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between px-3.5 py-2 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <Skeleton className="w-24 h-3.5 rounded" />
            </div>
            <Skeleton className="w-14 h-4 rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}

export function MessageStreamSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonScreen label="Loading conversation messages" className="space-y-3.5 py-2">
      {Array.from({ length: count }).map((_, idx) => {
        const alignRight = idx % 2 === 1;
        return (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] max-w-md space-y-2 ${
              alignRight ? 'ml-auto' : 'mr-auto'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="w-24 h-3.5 rounded" />
                <Skeleton className="w-14 h-4 rounded-full" />
              </div>
              <Skeleton className="w-10 h-3 rounded" />
            </div>
            <Skeleton className="w-full h-3.5 rounded" />
            {idx % 3 !== 2 && <Skeleton className="w-3/4 h-3.5 rounded" />}
          </div>
        );
      })}
    </SkeletonScreen>
  );
}

/**
 * 6. Analytics & Merit Scoring Skeletons (AnalyticsView.tsx & ProjectAnalyticsView.tsx)
 */
export function ProjectAnalyticsSkeleton() {
  return (
    <SkeletonScreen label="Loading project analytics scorecard" className="space-y-6">
      {/* Top Health Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)]">
        <div className="space-y-2">
          <Skeleton className="w-48 h-3.5 rounded" />
          <Skeleton className="w-56 h-6 rounded-lg" />
        </div>
        <Skeleton className="w-56 h-10 rounded-xl" />
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)] space-y-2.5"
          >
            <Skeleton className="w-24 h-3.5 rounded" />
            <Skeleton className="w-20 h-7 rounded-lg" />
            <Skeleton className="w-full h-2 rounded-full" />
          </div>
        ))}
      </div>

      {/* Leaderboard Panel */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-panel)] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
          <Skeleton className="w-64 h-5 rounded-md" />
          <Skeleton className="w-72 max-w-full h-6 rounded-md" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)] space-y-1.5 ${
                idx === 4 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <Skeleton className="w-20 h-3 rounded mx-auto" />
              <Skeleton className="w-14 h-5 rounded mx-auto" />
              <Skeleton className="w-16 h-2.5 rounded mx-auto" />
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)] flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="w-32 h-4 rounded" />
                  <Skeleton className="w-20 h-3 rounded" />
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-6">
                <Skeleton className="w-12 h-4 rounded" />
                <Skeleton className="w-12 h-4 rounded" />
                <Skeleton className="w-12 h-4 rounded" />
              </div>
              <Skeleton className="w-20 h-6 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}

export function AnalyticsViewSkeleton() {
  return (
    <SkeletonScreen label="Loading workspace analytics" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          <Skeleton className="w-64 h-8 rounded-xl" />
          <Skeleton className="w-80 max-w-full h-4 rounded-md" />
        </div>
        <Skeleton className="w-52 h-10 rounded-2xl" />
      </div>
      <ProjectAnalyticsSkeleton />
    </SkeletonScreen>
  );
}

/**
 * 7. Settings Preferences & Audit Logs Skeletons (SettingsView.tsx)
 */
export function NotificationPrefsSkeleton() {
  return (
    <SkeletonScreen label="Loading notification preferences" className="space-y-3">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)]"
        >
          <div className="space-y-1.5 flex-1">
            <Skeleton className="w-44 h-4 rounded" />
            <Skeleton className="w-72 max-w-full h-3 rounded" />
          </div>
          <Skeleton className="w-4 h-4 rounded shrink-0" />
        </div>
      ))}
    </SkeletonScreen>
  );
}

export function AuditLogsRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} aria-hidden="true">
          <td className="py-2.5 px-3">
            <Skeleton className="w-16 h-3.5 rounded" />
          </td>
          <td className="py-2.5 px-3">
            <Skeleton className="w-28 h-3.5 rounded" />
          </td>
          <td className="py-2.5 px-3">
            <Skeleton className="w-20 h-3.5 rounded" />
          </td>
          <td className="py-2.5 px-3">
            <Skeleton className="w-32 h-3.5 rounded" />
          </td>
          <td className="py-2.5 px-3">
            <Skeleton className="w-20 h-3.5 rounded" />
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * 8. Project Documents & Media Skeleton (ProjectDocumentsView.tsx)
 */
export function DocumentsViewSkeleton({
  viewMode = 'grid',
}: {
  viewMode?: 'grid' | 'compact' | 'list';
}) {
  if (viewMode === 'list') {
    return (
      <SkeletonScreen label="Loading shared project documents" className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-[var(--surface-panel)] border border-[var(--border-color)] flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="w-48 max-w-full h-4 rounded" />
                <Skeleton className="w-32 h-3 rounded" />
              </div>
            </div>
            <Skeleton className="w-20 h-7 rounded-lg shrink-0" />
          </div>
        ))}
      </SkeletonScreen>
    );
  }

  if (viewMode === 'compact') {
    return (
      <SkeletonScreen
        label="Loading shared project documents"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
      >
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-[var(--surface-panel)] border border-[var(--border-color)] space-y-2.5"
          >
            <Skeleton className="w-full h-24 rounded-lg" />
            <Skeleton className="w-3/4 h-3.5 rounded" />
            <Skeleton className="w-1/2 h-3 rounded" />
          </div>
        ))}
      </SkeletonScreen>
    );
  }

  return (
    <SkeletonScreen
      label="Loading shared project documents"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl bg-[var(--surface-panel)] border border-[var(--border-color)] overflow-hidden flex flex-col"
        >
          <Skeleton className="w-full h-40 rounded-none" />
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="w-2/3 h-4 rounded" />
              <Skeleton className="w-12 h-4 rounded" />
            </div>
            <Skeleton className="w-full h-3 rounded" />
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
              <Skeleton className="w-20 h-3 rounded" />
              <Skeleton className="w-16 h-5 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </SkeletonScreen>
  );
}

/**
 * 9. Command Palette Skeleton (CommandPalette.tsx)
 */
export function CommandPaletteSkeleton() {
  return (
    <SkeletonScreen label="Loading workspace search index" className="space-y-4 p-2">
      {['Navigation', 'Projects', 'Team Members'].map((section, sIdx) => (
        <div key={section} className="space-y-1.5">
          <Skeleton className="w-24 h-3 rounded mx-2 mb-2" />
          {Array.from({ length: sIdx === 0 ? 3 : 2 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-2 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="w-36 h-3.5 rounded" />
                  {sIdx > 0 && <Skeleton className="w-16 h-2.5 rounded" />}
                </div>
              </div>
              <Skeleton className="w-4 h-4 rounded shrink-0" />
            </div>
          ))}
        </div>
      ))}
    </SkeletonScreen>
  );
}

/**
 * 10. Member Profile Modal Skeleton (MemberProfileModal.tsx)
 */
export function MemberProfileSkeleton() {
  return (
    <SkeletonScreen label="Loading member profile" className="space-y-5">
      {/* Hero Banner */}
      <div className="rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-36 sm:w-44 h-6 rounded-lg" />
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
              <Skeleton className="w-40 h-4 rounded" />
              <Skeleton className="w-48 h-3 rounded" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="w-24 h-8 rounded-xl" />
            <Skeleton className="w-28 h-8 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="w-24 h-8 rounded-xl" />
        ))}
      </div>

      {/* Merit KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)] space-y-2"
          >
            <Skeleton className="w-20 h-3 rounded" />
            <Skeleton className="w-14 h-6 rounded-md" />
          </div>
        ))}
      </div>

      {/* Bio & Contact Details */}
      <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] space-y-3">
        <Skeleton className="w-28 h-4 rounded" />
        <Skeleton className="w-full h-3.5 rounded" />
        <Skeleton className="w-4/5 h-3.5 rounded" />
        <div className="flex flex-wrap gap-2 pt-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="w-20 h-6 rounded-lg" />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}

/**
 * 11. Accept Invitation & Manage Invitations Skeletons
 */
export function AcceptInvitationSkeleton() {
  return (
    <SkeletonScreen label="Validating project invitation" className="space-y-5">
      <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] space-y-3.5">
        <div className="flex items-center justify-between">
          <Skeleton className="w-28 h-4 rounded" />
          <Skeleton className="w-24 h-3.5 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="w-3/4 h-5 rounded-md" />
          <Skeleton className="w-full h-3.5 rounded" />
          <Skeleton className="w-5/6 h-3.5 rounded" />
        </div>
        <div className="pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between">
          <Skeleton className="w-36 h-4 rounded" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </div>
      </div>

      <Skeleton className="w-full h-11 rounded-2xl" />
    </SkeletonScreen>
  );
}

export function InvitationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonScreen label="Loading project invitations" className="space-y-2.5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] flex items-center justify-between gap-3"
        >
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="w-40 h-4 rounded" />
              <Skeleton className="w-16 h-4 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="w-28 h-3 rounded" />
              <Skeleton className="w-24 h-3 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="w-16 h-5 rounded-full" />
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="w-7 h-7 rounded-lg" />
          </div>
        </div>
      ))}
    </SkeletonScreen>
  );
}

/**
 * 12. Proof Deliverable & Proof Files Viewer Skeletons
 */
export function ProofFilesSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <SkeletonScreen label="Loading proof attachments" className="space-y-1.5">
        <Skeleton className="w-24 h-3.5 rounded" />
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="w-36 h-7 rounded-lg" />
          <Skeleton className="w-32 h-7 rounded-lg" />
        </div>
      </SkeletonScreen>
    );
  }

  return (
    <SkeletonScreen label="Loading proof attachments" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="w-52 h-4 rounded" />
        <Skeleton className="w-36 h-3.5 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] space-y-3"
          >
            <Skeleton className="w-full h-32 rounded-xl" />
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="w-32 h-4 rounded" />
              <Skeleton className="w-16 h-3.5 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="flex-1 h-8 rounded-xl" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}

export function ProofDeliverableSkeleton() {
  return (
    <SkeletonScreen
      label="Loading verified proof deliverable"
      className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-panel)] border border-[var(--border-color)] space-y-4"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Skeleton className="w-44 h-4 rounded" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </div>
        <Skeleton className="w-40 h-3.5 rounded" />
      </div>

      <div className="space-y-2 p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)]">
        <Skeleton className="w-40 h-3 rounded" />
        <Skeleton className="w-full h-3.5 rounded" />
        <Skeleton className="w-4/5 h-3.5 rounded" />
      </div>

      <ProofFilesSkeleton />
    </SkeletonScreen>
  );
}

/**
 * 13. Markdown Document & Source Code Viewer Skeletons
 */
export function MarkdownDocumentSkeleton() {
  return (
    <SkeletonScreen label="Loading document preview" className="space-y-5 py-4">
      <Skeleton className="w-3/5 h-8 rounded-lg" />
      <div className="space-y-2.5">
        <Skeleton className="w-full h-3.5 rounded" />
        <Skeleton className="w-11/12 h-3.5 rounded" />
        <Skeleton className="w-4/5 h-3.5 rounded" />
      </div>
      <Skeleton className="w-full h-28 rounded-xl" />
      <Skeleton className="w-2/5 h-6 rounded-lg" />
      <div className="space-y-2.5">
        <Skeleton className="w-full h-3.5 rounded" />
        <Skeleton className="w-5/6 h-3.5 rounded" />
      </div>
    </SkeletonScreen>
  );
}

export function CodeViewerSkeleton({ lines = 12 }: { lines?: number }) {
  const widths = ['w-1/3', 'w-2/3', 'w-1/2', 'w-3/4', 'w-2/5', 'w-4/5', 'w-3/5', 'w-1/4'];
  return (
    <SkeletonScreen label="Loading source code" className="p-4 space-y-2.5">
      {Array.from({ length: lines }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-4">
          <Skeleton className="w-7 h-3 rounded shrink-0" />
          <Skeleton
            className={`h-3.5 rounded ${widths[idx % widths.length]} ${
              idx % 3 === 1 ? 'ml-4' : idx % 4 === 2 ? 'ml-8' : ''
            }`}
          />
        </div>
      ))}
    </SkeletonScreen>
  );
}

/**
 * 14. Avatar Upload Processing & AI Assistant Reply Skeletons
 */
export function AvatarProcessingSkeleton() {
  return (
    <SkeletonScreen label="Processing avatar image" className="w-full flex flex-col items-center gap-3 py-2">
      <Skeleton className="w-20 h-20 rounded-2xl" />
      <Skeleton className="w-44 h-4 rounded" />
      <Skeleton className="w-56 h-3 rounded" />
    </SkeletonScreen>
  );
}

export function ChatReplySkeleton() {
  return (
    <SkeletonScreen label="Assistant generating reply" className="flex items-start gap-3">
      <Skeleton className="w-7 h-7 rounded-full shrink-0" />
      <div className="flex-1 max-w-[84%] rounded-2xl rounded-tl-none p-3.5 bg-[#121633] border border-[#222852] space-y-2.5">
        <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-white/10">
          <Skeleton className="w-32 h-3 rounded" />
          <Skeleton className="w-16 h-3 rounded" />
        </div>
        <Skeleton className="w-full h-3.5 rounded" />
        <Skeleton className="w-11/12 h-3.5 rounded" />
        <Skeleton className="w-2/3 h-3.5 rounded" />
      </div>
    </SkeletonScreen>
  );
}

/**
 * 15. Notification Drawer List Skeleton (NotificationDrawer.tsx)
 */
export function NotificationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonScreen label="Loading notifications" className="space-y-2.5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-start gap-3"
        >
          <Skeleton className="w-8 h-8 rounded-xl shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="w-36 h-3.5 rounded" />
              <Skeleton className="w-12 h-3 rounded" />
            </div>
            <Skeleton className="w-full h-3 rounded" />
            <Skeleton className="w-3/4 h-3 rounded" />
          </div>
        </div>
      ))}
    </SkeletonScreen>
  );
}
