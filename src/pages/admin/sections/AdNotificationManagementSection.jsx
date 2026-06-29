import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell, BellRing, Send, SendHorizontal, Crown, Users, Search,
  RefreshCw, Plus, X, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Trash2, Pencil, PlayCircle, PauseCircle,
} from 'lucide-react';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const NOTIF_TABS = [
  { id: 'user', label: 'User Notifications', Icon: Users },
  { id: 'host', label: 'Host Notifications', Icon: Crown },
];

const STATUS_FILTERS = [
  { value: '',         label: 'All'      },
  { value: 'active',   label: 'Active'   },
  { value: 'inactive', label: 'Inactive' },
];

const VALID_NOTIF_TABS = new Set(NOTIF_TABS.map((t) => t.id));
const VALID_STATUSES   = new Set(STATUS_FILTERS.map((s) => s.value));

const RoleBadge = ({ role }) => (
  <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
    role === 'host' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
  }`}>
    {role === 'host' ? <Crown size={10} /> : <Users size={10} />}
    {role || '—'}
  </span>
);

const StatusBadge = ({ status }) => (
  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
    status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-neutral-400'}`} />
    {status || '—'}
  </span>
);

const PushBadge = ({ note }) => (
  <span
    title={note.pushSentAt ? `Last attempted ${fmtDateTime(note.pushSentAt)}` : 'Push not yet attempted'}
    className={`flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
      note.pushSent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-neutral-50 text-neutral-400'
    }`}
  >
    {note.pushSent ? <SendHorizontal size={11} /> : <Send size={11} />}
    {note.pushSent ? `Sent · ${note.pushDeviceCount ?? 0} device${note.pushDeviceCount === 1 ? '' : 's'}` : 'Not sent'}
  </span>
);

// ─── create modal ───────────────────────────────────────────────────────────────

const CreateNotificationModal = ({ role, onClose, onSuccess }) => {
  const [title, setTitle]     = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus]   = useState('active');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await api.post('/api/admin/ad-notifications', {
        title: title.trim(),
        message: message.trim(),
        role,
        status,
      });
      onSuccess(data?.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create notification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full flex-col max-h-[92vh] rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">

        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="font-semibold">New Notification for {role === 'host' ? 'Hosts' : 'Users'}</p>
            <p className="text-xs text-neutral-400">Pushed to every matching device immediately on create</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form id="create-notification-form" onSubmit={handleSubmit} className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Title *</label>
              <input
                type="text" required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Diwali Offer"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Message *</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Get 20% extra coins this week!"
                className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Sent To</label>
                <div className="flex h-[42px] items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-medium capitalize text-neutral-700">
                  {role === 'host' ? <Crown size={14} className="text-amber-500" /> : <Users size={14} className="text-blue-500" />}
                  {role === 'host' ? 'Hosts' : 'Users'}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="flex flex-shrink-0 gap-2 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
            Cancel
          </button>
          <button type="submit" form="create-notification-form" disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
            {saving ? 'Creating…' : 'Create & Push'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── edit modal ─────────────────────────────────────────────────────────────────

const EditNotificationModal = ({ note, onClose, onSuccess }) => {
  const [title, setTitle]     = useState(note.title || '');
  const [message, setMessage] = useState(note.message || '');
  const [role, setRole]       = useState(note.role || 'user');
  const [status, setStatus]   = useState(note.status || 'active');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await api.put(`/api/admin/ad-notifications/${note._id}`, {
        title: title.trim(),
        message: message.trim(),
        role,
        status,
      });
      onSuccess(data?.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update notification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full flex-col max-h-[92vh] rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">

        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="font-semibold">Edit Notification</p>
            <p className="text-xs text-neutral-400">Re-pushes on save, unless you set it to Inactive</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form id="edit-notification-form" onSubmit={handleSubmit} className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Title *</label>
              <input
                type="text" required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Message *</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Sent To *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="user">Users</option>
                  <option value="host">Hosts</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="flex flex-shrink-0 gap-2 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
            Cancel
          </button>
          <button type="submit" form="edit-notification-form" disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── delete confirm modal ───────────────────────────────────────────────────────

const DeleteNotificationModal = ({ note, onCancel, onConfirm, busy }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
        <Trash2 size={22} className="text-red-600" />
      </div>
      <h3 className="text-base font-bold">Delete "{note.title}"?</h3>
      <p className="mt-1.5 text-sm text-neutral-500">
        This permanently removes the notification record. It does not recall pushes already delivered to devices.
      </p>
      <div className="mt-5 flex gap-3">
        <button onClick={onCancel} disabled={busy}
          className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {busy ? 'Deleting…' : 'Delete Forever'}
        </button>
      </div>
    </div>
  </div>
);

// ─── main section ─────────────────────────────────────────────────────────────

const AdNotificationManagementSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab    = searchParams.get('notifTab') || 'user';
  const rawStatus = searchParams.get('notifStatus') || '';
  const activeTab    = VALID_NOTIF_TABS.has(rawTab) ? rawTab : 'user';
  const activeStatus = VALID_STATUSES.has(rawStatus) ? rawStatus : '';

  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination]       = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [summary, setSummary]             = useState({ hostNotifications: 0, userNotifications: 0, active: 0, inactive: 0 });
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState('');

  const [showCreate, setShowCreate]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState(null);

  const fetchNotifications = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: targetPage, limit: 20, role: activeTab };
      if (activeStatus) params.status = activeStatus;

      const { data } = await api.get('/api/admin/ad-notifications', { params });

      const rows = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};
      const sm   = data?.summary ?? {};

      setNotifications(rows);
      setPagination({
        total: pg.total ?? rows.length,
        page:  pg.page  ?? targetPage,
        limit: pg.limit ?? 20,
        pages: pg.pages ?? Math.ceil((pg.total ?? rows.length) / 20),
      });
      setSummary({
        hostNotifications: sm.hostNotifications ?? 0,
        userNotifications: sm.userNotifications ?? 0,
        active:            sm.active            ?? 0,
        inactive:          sm.inactive           ?? 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeStatus]);

  useEffect(() => {
    fetchNotifications(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNotifications]);

  const setActiveTab = useCallback((t) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (t === 'user') p.delete('notifTab'); else p.set('notifTab', t);
      return p;
    }, { replace: true });
    setPage(1);
  }, [setSearchParams]);

  const setActiveStatusFilter = useCallback((s) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (s) p.set('notifStatus', s); else p.delete('notifStatus');
      return p;
    }, { replace: true });
    setPage(1);
  }, [setSearchParams]);

  const onPage = (n) => { setPage(n); fetchNotifications(n); };

  const filteredRows = search.trim()
    ? notifications.filter((n) => n.title?.toLowerCase().includes(search.trim().toLowerCase()))
    : notifications;

  const handleCreated = () => {
    setShowCreate(false);
    fetchNotifications(1);
    setPage(1);
  };

  const handleUpdated = () => {
    setEditTarget(null);
    fetchNotifications(page);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/admin/ad-notifications/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchNotifications(page);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete notification');
    } finally {
      setDeleting(false);
    }
  };

  const STAT_CARDS = [
    { label: 'Total',  value: pagination.total,             Icon: Bell,        cls: 'bg-neutral-900 text-white' },
    { label: 'Host',   value: summary.hostNotifications,     Icon: Crown,       cls: 'bg-amber-50 text-amber-800 border border-amber-200' },
    { label: 'User',   value: summary.userNotifications,     Icon: Users,       cls: 'bg-blue-50 text-blue-800 border border-blue-200' },
    { label: 'Active', value: summary.active,                Icon: PlayCircle,  cls: 'bg-green-50 text-green-800 border border-green-200' },
    { label: 'Inactive', value: summary.inactive,             Icon: PauseCircle, cls: 'bg-neutral-100 text-neutral-600 border border-neutral-200' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        {STAT_CARDS.map(({ label, value, Icon, cls }) => (
          <div key={label} className={`rounded-xl p-3 sm:rounded-2xl sm:p-5 ${cls}`}>
            <div className="flex items-start justify-between">
              <p className="text-2xl font-black sm:text-3xl">{value}</p>
              <Icon size={18} className="opacity-50" />
            </div>
            <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1 sm:text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Host / User tabs */}
        <div className="flex border-b border-neutral-200 px-2 sm:px-4">
          {NOTIF_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === id
                  ? '-mb-px border-black text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setActiveStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeStatus === value
                    ? 'bg-neutral-800 text-white'
                    : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}>
                {label}
              </button>
            ))}
            <button
              onClick={() => fetchNotifications(page)}
              disabled={loading}
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-80"
            >
              <Plus size={13} /> New {activeTab === 'host' ? 'Host' : 'User'} Notification
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
            <button onClick={() => fetchNotifications(page)}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading notifications…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {search || activeStatus ? 'No notifications match your filters' : 'No notifications yet'}
            </p>
            <p className="mt-1 text-xs text-neutral-300">Created notifications will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  <th className="px-4 py-3 sm:px-6">Title</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Push</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right sm:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredRows.map((note) => (
                  <tr key={note._id} className="transition-colors hover:bg-neutral-50/70">
                    <td className="max-w-[180px] truncate px-4 py-3 font-medium text-neutral-900 sm:px-6">{note.title}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-neutral-500">{note.message}</td>
                    <td className="px-4 py-3"><RoleBadge role={note.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status={note.status} /></td>
                    <td className="px-4 py-3"><PushBadge note={note} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-400">{fmtDateTime(note.createdAt)}</td>
                    <td className="px-4 py-3 text-right sm:pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditTarget(note)}
                          title="Edit"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => { setDeleteError(null); setDeleteTarget(note); }}
                          title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
            <p className="text-xs text-neutral-400">{pagination.total} total · page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => onPage(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => onPage(Math.min(pagination.pages, pagination.page + 1))} disabled={pagination.page >= pagination.pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateNotificationModal role={activeTab} onClose={() => setShowCreate(false)} onSuccess={handleCreated} />
      )}

      {editTarget && (
        <EditNotificationModal
          note={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={handleUpdated}
        />
      )}

      {deleteTarget && (
        <DeleteNotificationModal
          note={deleteTarget}
          busy={deleting}
          onCancel={() => { if (!deleting) setDeleteTarget(null); }}
          onConfirm={confirmDelete}
        />
      )}

      {deleteError && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-lg">
          <AlertCircle size={15} /> {deleteError}
        </div>
      )}
    </div>
  );
};

export default AdNotificationManagementSection;
