import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag, Plus, Trash2, Pencil, AlertCircle,
  Loader2, CheckCircle, X, Search, RefreshCw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../../services/api';

// deterministic bar-height pattern for the barcode-style mini chart on stat cards
const BAR_HEIGHTS = [45, 90, 60, 100, 55, 80, 40, 95, 65, 85, 50, 75, 40, 100, 60, 90];
const BAR_COUNT = 32;

const getTagName  = (t) => t?.name ?? String(t);
// Only the first character is capitalized — every other character, including
// later words, is forced lowercase (not per-word Title Case).
const toCapitalized = (val) => {
  const cleaned = val.replace(/[^a-zA-Z\s]/g, '').toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};
// Same case rule applied when displaying already-stored values (e.g. older
// records saved before this rule existed) — does not strip characters.
const formatDisplay = (val) => {
  if (!val) return val;
  const lower = String(val).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};
const getTagAdmin = (t) =>
  t?.createdBy?.username ?? t?.createdBy?.name ?? t?.adminUsername ?? t?.createdByUsername ?? null;

// ─── main tab ─────────────────────────────────────────────────────────────────

const TagsTab = () => {
  const [tags, setTags]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [total, setTotal]     = useState(0);

  const [showAdd, setShowAdd]       = useState(false);
  const [addName, setAddName]       = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState(null);

  const [editTarget, setEditTarget]   = useState(null);
  const [editName, setEditName]       = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState(null);

  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  const fetchTags = useCallback(async (targetPage, term) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/tags/admin/getAllTags', {
        params: { page: targetPage, limit: 12, ...(term && { search: term }) },
      });
      const root = data?.data ?? data;
      const list = Array.isArray(root) ? root : root?.tags ?? root?.result ?? root?.items ?? [];
      const pagination = root?.pagination ?? root?.meta ?? root ?? {};
      setTags(list);
      setPages(pagination.pages ?? pagination.totalPages ?? 1);
      setTotal(pagination.total ?? pagination.totalCount ?? list.length);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  // debounce search → resets to page 1 once the user stops typing
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // (re)fetch whenever the page or the debounced search term changes
  const doFetch = useCallback(() => fetchTags(page, debouncedSearch), [fetchTags, page, debouncedSearch]);
  useEffect(() => { doFetch(); }, [doFetch]);

  const refresh = () => doFetch();

  // jumps to a page, refetching directly when the page number doesn't change
  // (changing `page` state alone wouldn't re-trigger the fetch effect in that case)
  const goToPage = (targetPage) => {
    if (targetPage === page) fetchTags(targetPage, debouncedSearch);
    else setPage(targetPage);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addName.trim()) return;
    setAddLoading(true);
    setAddError(null);
    try {
      await api.post('/api/tags/admin/createTag', { name: addName.trim() });
      setAddName('');
      setShowAdd(false);
      goToPage(1);
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add tag');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const { data } = await api.put(`/api/tags/admin/${editTarget._id}`, { name: editName.trim() });
      const updated = data?.data ?? { ...editTarget, name: editName.trim().toLowerCase() };
      setTags((prev) => prev.map((t) => (t._id === editTarget._id ? updated : t)));
      setEditTarget(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to rename tag');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/tags/admin/${deleteTarget._id}`);
      setDeleteTarget(null);
      const isLastOnPage = tags.length === 1 && page > 1;
      goToPage(isLastOnPage ? page - 1 : page);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete tag');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[
          { label: 'Total Tags', value: total,        Icon: Tag,    iconColor: 'text-neutral-900', barColor: 'bg-neutral-900' },
          { label: 'Showing',    value: tags.length,   Icon: Search, iconColor: 'text-neutral-500', barColor: 'bg-neutral-400' },
        ].map(({ label, value, Icon, iconColor, barColor }) => {
          const maxStat = Math.max(total, tags.length, 1);
          const pct = Math.round(((value || 0) / maxStat) * 100);
          const filledBars = Math.round((pct / 100) * BAR_COUNT);
          return (
            <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-neutral-700">{label}</span>
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 ${iconColor}`}>
                  <Icon size={15} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-neutral-900 sm:text-3xl">{value}</span>
              </div>
              <div className="mt-2.5 flex h-6 items-end gap-[3px] overflow-hidden">
                {Array.from({ length: BAR_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-[3px] flex-shrink-0 rounded-full ${i < filledBars ? barColor : 'bg-neutral-200'}`}
                    style={{ height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => { setShowAdd(true); setAddName(''); setAddError(null); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-80 sm:flex-none"
            >
              <Plus size={15} /> Add Tag
            </button>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-6 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Tag grid */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
              <Loader2 size={20} className="animate-spin" /> Loading tags…
            </div>
          ) : tags.length === 0 ? (
            <div className="py-16 text-center">
              <Tag size={36} className="mx-auto mb-3 text-neutral-200" />
              <p className="text-sm font-medium text-neutral-400">
                {search ? 'No tags match your search' : 'No tags yet'}
              </p>
              {search && (
                <p className="mt-1 text-xs text-neutral-300">Try a different search term</p>
              )}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tags.map((tag) => {
                const name  = getTagName(tag);
                const admin = getTagAdmin(tag);
                return (
                  <div
                    key={tag._id ?? name}
                    className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3 transition hover:border-neutral-200 hover:bg-white sm:px-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm font-bold text-neutral-700">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{formatDisplay(name)}</p>
                        {admin && <p className="truncate text-xs text-neutral-400">by {admin}</p>}
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => { setEditTarget(tag); setEditName(formatDisplay(name)); setEditError(null); }}
                        title="Rename"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(tag); setDeleteError(null); }}
                        title="Delete"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && tags.length > 0 && pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
            <p className="text-xs text-neutral-400">Page {page} of {pages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add modal ─────────────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-sm sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Add Tag</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            {addError && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle size={14} /> {addError}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(toCapitalized(e.target.value))}
                  placeholder="e.g. Gaming, Music, Travel…"
                  autoFocus
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                />
                <p className="mt-1.5 text-xs text-neutral-400">Capitalized automatically — duplicates are rejected.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading || !addName.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-sm font-medium text-white transition hover:opacity-80 disabled:opacity-50"
                >
                  {addLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {addLoading ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-sm sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Rename Tag</h3>
              <button
                onClick={() => setEditTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle size={14} /> {editError}
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(toCapitalized(e.target.value))}
                  autoFocus
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                />
                <p className="mt-1.5 text-xs text-neutral-400">Capitalized automatically.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editName.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-sm font-medium text-white transition hover:opacity-80 disabled:opacity-50"
                >
                  {editLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete modal ──────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-sm sm:rounded-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold">Delete "{formatDisplay(getTagName(deleteTarget))}"?</h3>
            <p className="mt-1.5 text-sm text-neutral-500">
              This removes the tag from the platform and from every user profile that has it.
            </p>
            {deleteError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle size={14} /> {deleteError}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
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
                {deleteLoading ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsTab;
