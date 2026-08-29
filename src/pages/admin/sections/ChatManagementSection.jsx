import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageCircle, Search, RefreshCw, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Coins, Settings, CheckCircle,
  Save, Wallet, TrendingUp, Ban,
} from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtNum = (n) => (n == null ? '—' : n.toLocaleString());

// A gift message's `text` is the same chat_gift_v1 JSON the client sends over
// ZIM — {"kind":"chat_gift_v1","icon":"🌹","name":"Rose"} — parse it for display
// instead of showing raw JSON in the ledger.
const parseGiftText = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.kind === 'chat_gift_v1') return parsed;
  } catch { /* not gift JSON */ }
  return null;
};

const KIND_STYLES = {
  text: 'bg-neutral-100 text-neutral-600',
  gift: 'bg-pink-100 text-pink-600',
};

const KIND_OPTIONS = [
  { value: '',     label: 'All Kinds' },
  { value: 'text', label: 'Text'      },
  { value: 'gift', label: 'Gift'      },
];

const SECTION_TABS = [
  { id: 'messages', label: 'Messages',    Icon: MessageCircle },
  { id: 'config',   label: 'Chat Config', Icon: Settings      },
];

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

// deterministic bar-height pattern — matches CallManagementSection/OverviewSection's KPI cards
const BAR_HEIGHTS = [45, 90, 60, 100, 55, 80, 40, 95, 65, 85, 50, 75, 40, 100, 60, 90];
const BAR_COUNT = 32;

const KpiCard = ({ label, value, pct, Icon, trend, iconClass = 'bg-neutral-100 text-black' }) => {
  const filledBars = Math.round((pct / 100) * BAR_COUNT);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-neutral-700">{label}</span>
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={15} />
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-neutral-900 sm:text-3xl">{value}</span>
        {trend === 'up' && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-green-600"><TrendingUp size={20} /></span>
        )}
      </div>

      <div className="mt-3 flex h-6 items-end gap-[3px] overflow-hidden">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`w-[3px] flex-shrink-0 rounded-full ${i < filledBars ? 'bg-neutral-900' : 'bg-neutral-200'}`}
            style={{ height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}%` }}
          />
        ))}
      </div>
    </div>
  );
};

// ─── messages (ledger) tab ─────────────────────────────────────────────────────

const ChatMessagesTab = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [hostId, setHostId] = useState('');
  const [userId, setUserId] = useState('');
  const [kind, setKind]     = useState('');
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');

  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Global chat totals — reuses the existing /api/admin/stats call rather than
  // a new endpoint, since totalChatMessages/totalChatCash already live there.
  const [globalStats, setGlobalStats] = useState(null);

  // Per-host earnings breakdown, shown only once a valid hostId filter is set.
  const [hostEarnings, setHostEarnings] = useState(null);
  const [hostEarningsLoading, setHostEarningsLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/chat-messages', {
        params: {
          page, limit: 20,
          ...(hostId.trim() && { hostId: hostId.trim() }),
          ...(userId.trim() && { userId: userId.trim() }),
          ...(kind && { kind }),
          ...(from && { from: new Date(from).toISOString() }),
          ...(to && { to: new Date(to + 'T23:59:59').toISOString() }),
        },
      });
      const result = data?.data ?? {};
      setItems(Array.isArray(result.items) ? result.items : []);
      setTotal(result.total ?? 0);
      setPages(Math.max(1, Math.ceil((result.total ?? 0) / (result.limit || 20))));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  }, [page, hostId, userId, kind, from, to]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    api.get('/api/admin/stats')
      .then(({ data }) => setGlobalStats(data?.data ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const trimmed = hostId.trim();
    if (!OBJECT_ID_RE.test(trimmed)) { setHostEarnings(null); return; }
    let cancelled = false;
    setHostEarningsLoading(true);
    api.get(`/api/admin/hosts/${trimmed}/chat-earnings`)
      .then(({ data }) => { if (!cancelled) setHostEarnings(data?.data ?? null); })
      .catch(() => { if (!cancelled) setHostEarnings(null); })
      .finally(() => { if (!cancelled) setHostEarningsLoading(false); });
    return () => { cancelled = true; };
  }, [hostId]);

  const onFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const clearFilters = () => {
    setHostId(''); setUserId(''); setKind(''); setFrom(''); setTo(''); setPage(1);
  };

  const hasFilters = hostId || userId || kind || from || to;

  const pageNumbers = () => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= pages - 2) return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Global stat cards — from the existing /api/admin/stats response */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <KpiCard
          label="Total Chat Messages"
          value={fmtNum(globalStats?.totalChatMessages)}
          pct={100}
          Icon={MessageCircle}
          trend="up"
        />
        <KpiCard
          label="Total Chat Cash Paid Out"
          value={globalStats?.totalChatCash != null ? `₹${fmtNum(globalStats.totalChatCash)}` : '—'}
          pct={100}
          Icon={Wallet}
          iconClass="bg-green-100 text-green-700"
          trend="up"
        />
      </div>

      {/* Per-host earnings — appears once a valid Host ID filter is entered */}
      {hostId.trim() && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Chat Earnings for Host {hostId.trim()}
          </p>
          {!OBJECT_ID_RE.test(hostId.trim()) ? (
            <p className="text-xs text-neutral-400">Enter a full host ID to see their earnings breakdown.</p>
          ) : hostEarningsLoading ? (
            <div className="flex items-center gap-2 py-4 text-neutral-400">
              <Loader2 size={16} className="animate-spin" /> Loading host earnings…
            </div>
          ) : hostEarnings ? (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-neutral-100 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
                <span className="font-medium">All-time:</span> {fmtNum(hostEarnings.totalMessages)} msgs · ₹{fmtNum(hostEarnings.totalCashEarned)}
              </span>
              <span className="rounded-full border border-neutral-100 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
                <span className="font-medium">Today:</span> {fmtNum(hostEarnings.today?.messages)} msgs · ₹{fmtNum(hostEarnings.today?.cash)}
              </span>
              <span className="rounded-full border border-neutral-100 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
                <span className="font-medium">This week:</span> {fmtNum(hostEarnings.thisWeek?.messages)} msgs · ₹{fmtNum(hostEarnings.thisWeek?.cash)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-neutral-400">No chat earnings found for this host.</p>
          )}
        </div>
      )}

      {/* Main card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Toolbar */}
        <div className="border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Host ID (receiver)…"
                value={hostId}
                onChange={onFilterChange(setHostId)}
                className="w-44 rounded-xl border border-neutral-200 py-2 pl-8 pr-3 text-xs outline-none focus:border-neutral-400"
              />
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="User ID (sender)…"
                value={userId}
                onChange={onFilterChange(setUserId)}
                className="w-44 rounded-xl border border-neutral-200 py-2 pl-8 pr-3 text-xs outline-none focus:border-neutral-400"
              />
            </div>
            <select
              value={kind}
              onChange={onFilterChange(setKind)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
            >
              {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={onFilterChange(setFrom)}
              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
            />
            <span className="text-xs text-neutral-400">→</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={onFilterChange(setTo)}
              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
            />
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-neutral-400 hover:text-neutral-700 underline">
                Clear filters
              </button>
            )}
            <button
              onClick={fetchMessages}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-6 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading messages…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <MessageCircle size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {hasFilters ? 'No messages match your filters' : 'No chat messages yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50">
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 w-10">#</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Sender</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Receiver</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Kind</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Content</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Coins</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Cash</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Date / Time</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m, index) => {
                  const gift = m.kind === 'gift' ? parseGiftText(m.text) : null;
                  return (
                    <tr key={m._id} className="hover:bg-neutral-50">
                      <td className="border border-neutral-200 px-4 py-3 font-mono text-xs text-neutral-400">
                        {(page - 1) * 20 + index + 1}
                      </td>
                      <td className="border border-neutral-200 px-4 py-3">
                        <button
                          onClick={() => setUserId(m.senderId?._id || '')}
                          title="Filter by this sender"
                          className="flex items-center gap-2 text-left hover:opacity-70"
                        >
                          <AvatarDisplay src={m.senderId?.avatar} name={m.senderId?.username} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">{m.senderId?.username || '(deleted)'}</p>
                            {m.senderId?.phone && <p className="truncate text-xs text-neutral-400">{m.senderId.phone}</p>}
                          </div>
                        </button>
                      </td>
                      <td className="border border-neutral-200 px-4 py-3">
                        <button
                          onClick={() => setHostId(m.receiverId?._id || '')}
                          title="Filter by this receiver"
                          className="flex items-center gap-2 text-left hover:opacity-70"
                        >
                          <AvatarDisplay src={m.receiverId?.avatar} name={m.receiverId?.username} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">{m.receiverId?.username || '(deleted)'}</p>
                            {m.receiverId?.phone && <p className="truncate text-xs text-neutral-400">{m.receiverId.phone}</p>}
                          </div>
                        </button>
                      </td>
                      <td className="border border-neutral-200 px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${KIND_STYLES[m.kind] || 'bg-neutral-100 text-neutral-600'}`}>
                          {m.kind}
                        </span>
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 max-w-[260px]">
                        {gift ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-pink-700">
                            <span className="text-base">{gift.icon}</span> {gift.name}
                          </span>
                        ) : (
                          <span className="truncate text-xs text-neutral-700" title={m.text}>{m.text || '—'}</span>
                        )}
                        {m.deletedAt && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
                            <Ban size={9} /> deleted by sender
                          </span>
                        )}
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {m.coinsCost
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-amber-600"><Coins size={11} />{m.coinsCost}</span>
                          : <span className="text-xs text-neutral-300">Free</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {m.cashEarned
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><span className="font-bold">₹</span>{m.cashEarned}</span>
                          : <span className="text-xs text-neutral-300">—</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
                        {fmtDateTime(m.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length > 0 && pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
            <p className="text-xs text-neutral-400">{total} total · page {page} of {pages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              {pageNumbers().map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition ${
                    n === page
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── chat config tab ────────────────────────────────────────────────────────────

const CONFIG_FIELDS = [
  {
    key: 'coinsPerMessage',
    label: 'Coins / Message',
    desc: 'Coins deducted from the sending user per text message',
    unit: 'coins',
  },
  {
    key: 'cashPerMessage',
    label: 'Cash / Message',
    desc: 'Cash (₹) credited to the receiving host per message (e.g. 0.02 = ₹4 per 200 messages)',
    unit: '₹',
  },
];

const EMPTY_CONFIG = { coinsPerMessage: '', cashPerMessage: '' };

const applyConfig = (cfg, setConfig, setForm) => {
  setConfig(cfg);
  setForm({
    coinsPerMessage: cfg.coinsPerMessage ?? '',
    cashPerMessage:  cfg.cashPerMessage  ?? '',
  });
};

const ChatConfigTab = () => {
  const [config, setConfig]   = useState(null);
  const [form, setForm]       = useState(EMPTY_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [saved, setSaved]     = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/chat-config');
      const cfg = data?.data ?? data ?? {};
      applyConfig(cfg, setConfig, setForm);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body = {};
      CONFIG_FIELDS.forEach(({ key }) => {
        const v = form[key];
        if (v !== '' && v != null) body[key] = Number(v);
      });
      const { data } = await api.put('/api/admin/chat-config', body);
      const updated = data?.data ?? data ?? {};
      applyConfig(updated, setConfig, setForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      {/* Header */}
      <div className="border-b border-neutral-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900">
              <Settings size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">Chat Billing Configuration</p>
              <p className="text-xs text-neutral-400">Changes apply to new messages after ~5 min cache TTL</p>
            </div>
          </div>
          <button
            onClick={loadConfig}
            disabled={loading}
            title="Refresh config"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !config ? (
        <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
          <Loader2 size={20} className="animate-spin" /> Loading configuration…
        </div>
      ) : (
        <div className="p-6 space-y-6">

          {/* Fields grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            {CONFIG_FIELDS.map(({ key, label, desc, unit }) => (
              <div key={key} className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                  {label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form[key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-neutral-400"
                  />
                  <span className="flex-shrink-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium text-neutral-500">
                    {unit}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">{desc}</p>
              </div>
            ))}
          </div>

          {/* Current live values summary */}
          {config && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Live Values</p>
              <div className="flex flex-wrap gap-2">
                {CONFIG_FIELDS.map(({ key, label, unit }) => (
                  <span key={key} className="rounded-full border border-neutral-100 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
                    <span className="font-medium">{label}:</span> {config[key] ?? '—'} {unit}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-neutral-400">
                Last saved: {fmtDateTime(config.updatedAt)}
              </p>
            </div>
          )}

          {/* Feedback */}
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <span className="flex items-center gap-2"><AlertCircle size={14} /> {error}</span>
              <button onClick={loadConfig} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">
                Retry
              </button>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle size={14} /> Configuration saved and will take effect within 5 minutes.
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── main section ─────────────────────────────────────────────────────────────

const VALID_CTABS = new Set(['messages', 'config']);

// A distinct search-param key from CallManagementSection's own `ctab` — reusing
// that key would leak whichever call sub-tab was last open (e.g. ?ctab=config)
// into this section's initial tab when an admin switches between the two.
const ChatManagementSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = VALID_CTABS.has(searchParams.get('chatTab')) ? searchParams.get('chatTab') : 'messages';

  const setActiveTab = (id) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (id === 'messages') p.delete('chatTab'); else p.set('chatTab', id);
      return p;
    }, { replace: true });
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Section tab bar */}
      <div className="flex border-b border-neutral-200">
        {SECTION_TABS.map(({ id, label, Icon }) => (
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

      {activeTab === 'messages' && <ChatMessagesTab />}
      {activeTab === 'config'   && <ChatConfigTab />}
    </div>
  );
};

export default ChatManagementSection;
