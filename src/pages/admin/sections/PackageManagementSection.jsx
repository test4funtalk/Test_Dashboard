import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, RefreshCw, AlertCircle, Loader2,
  Coins, Star, CheckCircle, X, Search, Pencil, Trash2,
  ToggleLeft, ToggleRight,
} from 'lucide-react';
import api from '../../../services/api';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const EMPTY_FORM = { title: '', subtitle: '', coins: '', amount: '', currency: 'INR', isActive: true };

// ─── package card ─────────────────────────────────────────────────────────────

const PackageCard = ({ pkg, onEdit, onDelete }) => {
  const isPremium = pkg.isPremium || pkg.type === 'premium';
  const isActive  = pkg.isActive !== false;

  return (
    <div className={`relative flex flex-col rounded-2xl border bg-white p-5 transition hover:shadow-sm ${
      isPremium ? 'border-amber-200' : 'border-neutral-200'
    } ${!isActive ? 'opacity-60' : ''}`}>

      {isPremium && (
        <span className="absolute right-12 top-3 flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          <Star size={10} className="fill-amber-500" /> Premium
        </span>
      )}

      {/* Action buttons */}
      <div className="absolute right-3 top-3 flex items-center gap-1">
        <button
          onClick={() => onEdit(pkg)}
          title="Edit"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(pkg)}
          title="Delete (deactivate)"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-white text-red-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Icon + name */}
      <div className="mb-3 mr-12 flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isPremium ? 'bg-amber-100' : 'bg-neutral-100'}`}>
          <Package size={18} className={isPremium ? 'text-amber-600' : 'text-neutral-500'} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900">{pkg.title || '—'}</p>
          {pkg.subtitle && <p className="truncate text-xs text-neutral-400">{pkg.subtitle}</p>}
        </div>
      </div>

      {/* Coins + price */}
      <div className="mb-3 flex items-center justify-between gap-2">
        {pkg.coins != null && (
          <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-800">
            <Coins size={15} className="text-amber-500" />
            {pkg.coins} coins
          </div>
        )}
        {pkg.amount != null && (
          <p className="text-xl font-black text-neutral-900">
            {pkg.currency || 'INR'} {pkg.amount}
          </p>
        )}
      </div>

      {/* Active / inactive badge */}
      <div className="mt-auto pt-3 border-t border-neutral-100">
        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" /> Inactive
          </span>
        )}
        {pkg.createdAt && (
          <span className="ml-2 text-xs text-neutral-300">Added {fmtDate(pkg.createdAt)}</span>
        )}
      </div>
    </div>
  );
};

// ─── form modal (create & edit) ───────────────────────────────────────────────

const PackageFormModal = ({ title, form, onChange, onSubmit, onClose, loading, error, isEdit }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
    <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <p className="font-semibold">{title}</p>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
          <X size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-5 py-3 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 p-5">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="e.g. Starter Pack"
            required
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Subtitle</label>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => onChange('subtitle', e.target.value)}
            placeholder="e.g. Perfect for new users"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>

        {/* Coins + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Coins <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.coins}
              onChange={(e) => onChange('coins', e.target.value)}
              placeholder="100"
              required
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Amount <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => onChange('amount', e.target.value)}
              placeholder="49"
              required
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>
        </div>

        {/* Currency */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => onChange('currency', e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
          >
            {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* isActive toggle (edit only) */}
        {isEdit && (
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-neutral-400">Inactive packages are hidden from users</p>
            </div>
            <button
              type="button"
              onClick={() => onChange('isActive', !form.isActive)}
              className={`transition ${form.isActive ? 'text-green-600' : 'text-neutral-300'}`}
            >
              {form.isActive
                ? <ToggleRight size={32} />
                : <ToggleLeft size={32} />}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-sm font-medium text-white transition hover:opacity-80 disabled:opacity-50"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><CheckCircle size={14} /> {isEdit ? 'Save Changes' : 'Create Package'}</>}
          </button>
        </div>
      </form>
    </div>
  </div>
);

// ─── main section ─────────────────────────────────────────────────────────────

const PackageManagementSection = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');

  // create
  const [showCreate, setShowCreate]   = useState(false);
  const [createForm, setCreateForm]   = useState(EMPTY_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  // edit
  const [editTarget, setEditTarget]   = useState(null);
  const [editForm, setEditForm]       = useState(EMPTY_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState(null);

  // delete
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState(null);

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/packages/admin/getallPackage');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : data?.packages ?? data?.result ?? [];
      setPackages(list);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  // ── create ─────────────────────────────────────────────────────────────────

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const payload = {
        title:    createForm.title.trim(),
        subtitle: createForm.subtitle.trim() || undefined,
        coins:    Number(createForm.coins),
        amount:   Number(createForm.amount),
        currency: createForm.currency || 'INR',
      };
      const { data } = await api.post('/api/packages/admin/createPackage', payload);
      const newPkg = data?.data ?? data?.package ?? null;
      if (newPkg) setPackages((prev) => [newPkg, ...prev]);
      else fetchPackages();
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create package');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── edit ───────────────────────────────────────────────────────────────────

  const openEdit = (pkg) => {
    setEditTarget(pkg);
    setEditForm({
      title:    pkg.title    ?? '',
      subtitle: pkg.subtitle ?? '',
      coins:    pkg.coins    ?? '',
      amount:   pkg.amount   ?? '',
      currency: pkg.currency ?? 'INR',
      isActive: pkg.isActive !== false,
    });
    setEditError(null);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      const payload = {
        title:    editForm.title.trim(),
        subtitle: editForm.subtitle.trim() || undefined,
        coins:    Number(editForm.coins),
        amount:   Number(editForm.amount),
        currency: editForm.currency || 'INR',
        isActive: editForm.isActive,
      };
      const { data } = await api.put(`/api/packages/admin/updatePackage/${editTarget._id}`, payload);
      const updated = data?.data ?? data?.package ?? { ...editTarget, ...payload };
      setPackages((prev) => prev.map((p) => (p._id === editTarget._id ? updated : p)));
      setEditTarget(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update package');
    } finally {
      setEditLoading(false);
    }
  };

  // ── delete (soft) ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/packages/admin/deletePackage/${deleteTarget._id}`);
      // soft-delete sets isActive: false — reflect locally
      setPackages((prev) =>
        prev.map((p) => (p._id === deleteTarget._id ? { ...p, isActive: false } : p))
      );
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete package');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── derived ────────────────────────────────────────────────────────────────

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  const activeCount = packages.filter((p) => p.isActive !== false).length;
  const inactiveCount = packages.length - activeCount;

  const filtered = packages.filter((pkg) => {
    const matchesSearch = (pkg.title ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'      ? true :
      statusFilter === 'active'   ? pkg.isActive !== false :
                                    pkg.isActive === false;
    return matchesSearch && matchesStatus;
  });

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl bg-neutral-900 p-3 text-white sm:rounded-2xl sm:p-5">
          <p className="text-2xl font-black sm:text-3xl">{packages.length}</p>
          <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1 sm:text-sm">Total Packages</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-green-800 sm:rounded-2xl sm:p-5">
          <p className="text-2xl font-black sm:text-3xl">{activeCount}</p>
          <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1 sm:text-sm">Active</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-neutral-600 sm:rounded-2xl sm:p-5">
          <p className="text-2xl font-black sm:text-3xl">{inactiveCount}</p>
          <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1 sm:text-sm">Inactive</p>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Filter tabs */}
        <div className="flex items-center gap-1 border-b border-neutral-100 px-4 pt-3 sm:px-6">
          {[
            { id: 'all',      label: 'All',      count: packages.length },
            { id: 'active',   label: 'Active',   count: activeCount     },
            { id: 'inactive', label: 'Inactive', count: inactiveCount   },
          ].map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setStatusFilter(id)}
              className={`-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
                statusFilter === id
                  ? 'border-black text-black'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                statusFilter === id ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-500'
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search packages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPackages}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => { setShowCreate(true); setCreateForm(EMPTY_FORM); setCreateError(null); }}
              className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-80"
            >
              <Plus size={15} /> Add Package
            </button>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-6 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-neutral-400">
              <Loader2 size={20} className="animate-spin" /> Loading packages…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Package size={40} className="mx-auto mb-3 text-neutral-200" />
              <p className="text-sm font-medium text-neutral-400">
                {search ? 'No packages match your search' : 'No packages found'}
              </p>
              {!search && (
                <button
                  onClick={() => { setShowCreate(true); setCreateForm(EMPTY_FORM); setCreateError(null); }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-400"
                >
                  <Plus size={15} /> Create your first package
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((pkg) => (
                <PackageCard
                  key={pkg._id}
                  pkg={pkg}
                  onEdit={openEdit}
                  onDelete={(p) => { setDeleteTarget(p); setDeleteError(null); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="border-t border-neutral-100 px-4 py-3 sm:px-6">
            <p className="text-xs text-neutral-400">
              Showing {filtered.length} of {packages.length} packages ({activeCount} active)
            </p>
          </div>
        )}
      </div>

      {/* ── Create modal ──────────────────────────────────────────────────── */}
      {showCreate && (
        <PackageFormModal
          title="New Package"
          form={createForm}
          onChange={(key, val) => setCreateForm((f) => ({ ...f, [key]: val }))}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          loading={createLoading}
          error={createError}
          isEdit={false}
        />
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {editTarget && (
        <PackageFormModal
          title={`Edit "${editTarget.title}"`}
          form={editForm}
          onChange={(key, val) => setEditForm((f) => ({ ...f, [key]: val }))}
          onSubmit={handleEdit}
          onClose={() => setEditTarget(null)}
          loading={editLoading}
          error={editError}
          isEdit={true}
        />
      )}

      {/* ── Delete confirm modal ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-sm sm:rounded-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold">Deactivate "{deleteTarget.title}"?</h3>
            <p className="mt-1.5 text-sm text-neutral-500">
              The package will be hidden from users but not permanently removed. You can reactivate it later via Edit.
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
                {deleteLoading ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageManagementSection;
