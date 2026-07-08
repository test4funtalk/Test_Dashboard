import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, X, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, RefreshCw, Trash2, Eye, Copy, Check,
} from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const ROLE_STYLES = {
  user: 'bg-blue-100 text-blue-700',
  host: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
};

const RoleBadge = ({ role }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[role] || 'bg-neutral-100 text-neutral-600'}`}>
    {role || '—'}
  </span>
);

// ─── component ────────────────────────────────────────────────────────────────

const CrashReasonsOverlay = ({ onClose }) => {
  const [reasons, setReasons]         = useState([]);
  const [pagination, setPagination]   = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [page, setPage]               = useState(1);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState(null);

  const [viewTarget, setViewTarget] = useState(null);
  const [copied, setCopied]         = useState(false);

  const fetchReasons = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/crash-reasons', { params: { page: targetPage, limit: 20 } });
      const rows = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};
      setReasons(rows);
      setPagination({
        total: pg.total ?? rows.length,
        page:  pg.page  ?? targetPage,
        limit: pg.limit ?? 20,
        pages: pg.pages ?? Math.ceil((pg.total ?? rows.length) / 20),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load crash reasons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReasons(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchReasons]);

  const onPage = (n) => {
    setPage(n);
    fetchReasons(n);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/admin/crash-reasons/${deleteTarget._id}`);
      const remaining = reasons.filter((r) => r._id !== deleteTarget._id);
      // if this was the last row on a page beyond the first, step back a page
      if (remaining.length === 0 && page > 1) {
        setDeleteTarget(null);
        onPage(page - 1);
      } else {
        setReasons(remaining);
        setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
        setDeleteTarget(null);
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete crash reason');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold leading-none">Crash Reports</h3>
              <p className="mt-1 text-xs text-neutral-400">{pagination.total} total report{pagination.total === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={() => fetchReasons(page)}
              disabled={loading}
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-40"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
            <button
              onClick={() => fetchReasons(page)}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && reasons.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
              <Loader2 size={20} className="animate-spin" /> Loading crash reports…
            </div>
          ) : reasons.length === 0 ? (
            <div className="py-16 text-center">
              <AlertTriangle size={36} className="mx-auto mb-3 text-neutral-200" />
              <p className="text-sm font-medium text-neutral-400">No crash reports yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-6">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-6">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-6">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-6">Reported</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {reasons.map((r) => (
                    <tr key={r._id} className="group hover:bg-neutral-50/70 transition-colors">
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <AvatarDisplay name={r.username} size="sm" />
                          <p className="truncate font-medium text-neutral-900">{r.username || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-6"><RoleBadge role={r.role} /></td>
                      <td className="max-w-xs px-4 py-3 text-neutral-700 sm:px-6">
                        <button
                          onClick={() => setViewTarget(r)}
                          className="block w-full text-left"
                          title="View full reason"
                        >
                          <p className="line-clamp-2 whitespace-pre-wrap break-words transition hover:text-neutral-950 hover:underline">{r.reason || '—'}</p>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-400 sm:px-6">{fmtDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewTarget(r)}
                            title="View details"
                            className="rounded-lg border border-neutral-200 p-1.5 text-neutral-400 transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            title="Delete"
                            className="rounded-lg border border-neutral-200 p-1.5 text-neutral-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 sm:px-6">
            <p className="text-xs text-neutral-400">{pagination.total} total · page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => onPage(Math.min(pagination.pages, pagination.page + 1))}
                disabled={pagination.page >= pagination.pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Crash report detail modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div className="flex items-center gap-2.5">
                  <AvatarDisplay name={viewTarget.username} size="sm" />
                  <div>
                    <p className="text-sm font-bold leading-none">{viewTarget.username || '—'}</p>
                    <div className="mt-1.5"><RoleBadge role={viewTarget.role} /></div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setViewTarget(null); setCopied(false); }}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Reason</p>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(viewTarget.reason || '');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    } catch { /* clipboard unavailable */ }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:bg-neutral-50"
                >
                  {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="min-h-[40vh] rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-neutral-800">
                  {viewTarget.reason || '—'}
                </p>
              </div>
              <p className="mt-4 text-xs text-neutral-400">Reported {fmtDateTime(viewTarget.createdAt)}</p>
            </div>

            <div className="flex gap-3 border-t border-neutral-100 px-5 py-4 sm:px-6">
              <button
                onClick={() => { setViewTarget(null); setCopied(false); }}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
              >
                Close
              </button>
              <button
                onClick={() => { setDeleteTarget(viewTarget); setViewTarget(null); setCopied(false); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-sm sm:rounded-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold">Delete this crash report?</h3>
            <p className="mt-1.5 text-sm text-neutral-500">
              This will permanently remove the crash report from {deleteTarget.username || 'this user'}. This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle size={14} /> {deleteError}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrashReasonsOverlay;
