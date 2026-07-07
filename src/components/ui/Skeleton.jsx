import React from 'react';

// ─── base pulse block ─────────────────────────────────────────────────────────
export const Sk = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-neutral-100 ${className}`} />
);

// ─── overview tab skeleton ────────────────────────────────────────────────────
export const OverviewSkeleton = () => (
  <div className="space-y-6">
    {/* profile card */}
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-5">
        <Sk className="h-20 w-20 flex-shrink-0 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <Sk className="h-7 w-48" />
          <Sk className="h-4 w-64" />
          <div className="flex gap-2">
            <Sk className="h-5 w-5 rounded-full" />
            <Sk className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>

    {/* detail cards */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5">
          <Sk className="mb-5 h-3 w-20" />
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-start gap-3">
                <Sk className="h-8 w-8 flex-shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5 pt-0.5">
                  <Sk className="h-3 w-16" />
                  <Sk className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* wide timestamps card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:col-span-2 lg:col-span-3">
        <Sk className="mb-5 h-3 w-24" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Sk className="h-8 w-8 flex-shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <Sk className="h-3 w-20" />
                <Sk className="h-4 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── admin table rows skeleton (inside <tbody>) ───────────────────────────────
export const TableRowsSkeleton = ({ rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i}>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Sk className="h-8 w-8 flex-shrink-0 rounded-full" />
            <Sk className="h-4 w-24" />
          </div>
        </td>
        <td className="px-6 py-4"><Sk className="h-4 w-40" /></td>
        <td className="px-6 py-4"><Sk className="h-5 w-24 rounded-full" /></td>
        <td className="px-6 py-4"><Sk className="h-5 w-16 rounded-full" /></td>
        <td className="px-6 py-4"><Sk className="h-4 w-32" /></td>
        <td className="px-6 py-4"><Sk className="h-7 w-24 rounded-lg" /></td>
      </tr>
    ))}
  </>
);

// ─── admin stat cards skeleton ────────────────────────────────────────────────
export const StatsSkeleton = () => (
  <div className="grid grid-cols-3 gap-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5">
        <Sk className="mb-2.5 h-9 w-14" />
        <Sk className="h-3.5 w-28" />
      </div>
    ))}
  </div>
);

// ─── full dashboard shell skeleton (Suspense fallback) ────────────────────────
export const DashboardShellSkeleton = () => (
  <div className="flex h-screen overflow-hidden bg-white">
    {/* sidebar */}
    <div className="flex w-60 flex-shrink-0 flex-col border-r border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-3 border-b border-neutral-100 pb-4">
        <Sk className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5">
          <Sk className="h-4 w-20" />
          <Sk className="h-3 w-16" />
        </div>
      </div>
      <Sk className="mb-3 h-2.5 w-14" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Sk key={i} className="mb-1 h-10 w-full rounded-xl" />
      ))}
      <div className="mt-auto space-y-2 border-t border-neutral-100 pt-4">
        <Sk className="h-12 w-full rounded-xl" />
        <Sk className="h-9 w-full rounded-xl" />
      </div>
    </div>

    {/* main */}
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center border-b border-neutral-200 bg-white px-8 py-4">
        <div className="space-y-1.5">
          <Sk className="h-6 w-28" />
          <Sk className="h-3.5 w-52" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <OverviewSkeleton />
      </div>
    </div>
  </div>
);

// ─── simple full-page spinner (other routes) ──────────────────────────────────
export const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="space-y-3 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-100 border-t-neutral-800" />
      <p className="text-sm text-neutral-400">Loading…</p>
    </div>
  </div>
);
