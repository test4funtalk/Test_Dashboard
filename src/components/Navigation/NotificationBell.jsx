import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Cloud, CheckCheck, Loader2, AlertCircle } from 'lucide-react';
import notificationService from '../../services/notificationService';

const POLL_MS = 60 * 1000;

const timeAgo = (iso) => {
  if (!iso) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
};

const ICON_BY_TYPE = { billing: Cloud };

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);

  const fetchUnreadCount = useCallback(() => {
    notificationService.getUnreadCount()
      .then(({ data }) => setUnreadCount(data?.data?.unreadCount ?? 0))
      .catch(() => {});
  }, []);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    setError(null);
    notificationService.getNotifications({ limit: 20 })
      .then(({ data }) => {
        setNotifications(data?.data?.notifications ?? []);
        setUnreadCount(data?.data?.unreadCount ?? 0);
      })
      .catch((err) => setError(err.response?.data?.message || err.message || 'Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  // Poll the unread count in the background so the badge stays fresh even
  // while the dropdown is closed.
  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, POLL_MS);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markOneRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    notificationService.markAsRead(id).catch(() => fetchNotifications());
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
    setUnreadCount(0);
    notificationService.markAllAsRead().catch(() => fetchNotifications());
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        title="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-red-600 ring-1 ring-red-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-800">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Loader2 size={20} className="mx-auto animate-spin text-neutral-300" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <AlertCircle size={18} className="text-red-500" />
                <p className="text-xs text-red-600">{error}</p>
                <button onClick={fetchNotifications} className="text-xs font-medium text-neutral-500 underline hover:text-neutral-900">
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <Bell size={22} className="text-neutral-200" />
                <p className="text-sm text-neutral-400">You're all caught up</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICON_BY_TYPE[n.type] || Bell;
                return (
                  <button
                    key={n._id}
                    onClick={() => !n.read && markOneRead(n._id)}
                    className={`flex w-full items-start gap-3 border-b border-neutral-50 px-4 py-3 text-left transition hover:bg-neutral-50 ${
                      n.read ? '' : 'bg-neutral-50/60'
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{n.message}</p>
                      <p className="mt-1 text-[11px] text-neutral-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
