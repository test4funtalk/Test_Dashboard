import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, RefreshCw, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Coins, Settings, CheckCircle,
  Save, Ban, Users, Gift,
} from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import ChatConversationDetail from './ChatConversationDetail';
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

const SECTION_TABS = [
  { id: 'conversations', label: 'Conversations', Icon: Users    },
  { id: 'config',        label: 'Chat Config',   Icon: Settings },
];

// ─── conversations (grouped by host<->user pair) tab ──────────────────────────

const ChatConversationsTab = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [hostId, setHostId]   = useState('');
  const [userId, setUserId]   = useState('');
  const [search, setSearch]   = useState('');

  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState(null); // { userId, hostId, userInfo, hostInfo }

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/chat-conversations', {
        params: {
          page, limit: 20,
          ...(hostId.trim() && { hostId: hostId.trim() }),
          ...(userId.trim() && { userId: userId.trim() }),
          ...(search.trim() && { search: search.trim() }),
        },
      });
      const result = data?.data ?? {};
      setItems(Array.isArray(result.items) ? result.items : []);
      setTotal(result.total ?? 0);
      setPages(Math.max(1, Math.ceil((result.total ?? 0) / (result.limit || 20))));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [page, hostId, userId, search]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const onFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const clearFilters = () => { setHostId(''); setUserId(''); setSearch(''); setPage(1); };

  const hasFilters = hostId || userId || search;

  const pageNumbers = () => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= pages - 2) return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  const openThread = (row) => {
    setSelected({
      userId: row.userId,
      hostId: row.hostId,
      userInfo: { username: row.userUsername, avatar: row.userAvatar, phone: row.userPhone },
      hostInfo: { username: row.hostUsername, avatar: row.hostAvatar, phone: row.hostPhone },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Toolbar */}
        <div className="border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search username / phone…"
                value={search}
                onChange={onFilterChange(setSearch)}
                className="w-52 rounded-xl border border-neutral-200 py-2 pl-8 pr-3 text-xs outline-none focus:border-neutral-400"
              />
            </div>
            <input
              type="text"
              placeholder="Host ID…"
              value={hostId}
              onChange={onFilterChange(setHostId)}
              className="w-44 rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
            />
            <input
              type="text"
              placeholder="User ID…"
              value={userId}
              onChange={onFilterChange(setUserId)}
              className="w-44 rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
            />
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-neutral-400 hover:text-neutral-700 underline">
                Clear filters
              </button>
            )}
            <button
              onClick={fetchConversations}
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

        {/* Table — one row per host<->user pair, click to open the full thread */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading conversations…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {hasFilters ? 'No conversations match your filters' : 'No chat conversations yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50">
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 w-10">#</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">User</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Host</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Last Message</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Messages</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Coins</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Cash</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Gifts</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 w-24">Gift Cash</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => {
                  const gift = row.lastMessageKind === 'gift' ? parseGiftText(row.lastMessageText) : null;
                  const rowKey = `${row.userId}_${row.hostId}`;
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => openThread(row)}
                      className="cursor-pointer hover:bg-neutral-50"
                      title="Open full conversation"
                    >
                      <td className="border border-neutral-200 px-4 py-3 font-mono text-xs text-neutral-400">
                        {(page - 1) * 20 + index + 1}
                      </td>
                      <td className="border border-neutral-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <AvatarDisplay src={row.userAvatar} name={row.userUsername} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">{row.userUsername || '(deleted)'}</p>
                            {row.userPhone && <p className="truncate text-xs text-neutral-400">{row.userPhone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="border border-neutral-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <AvatarDisplay src={row.hostAvatar} name={row.hostUsername} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">{row.hostUsername || '(deleted)'}</p>
                            {row.hostPhone && <p className="truncate text-xs text-neutral-400">{row.hostPhone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 max-w-[240px]">
                        {gift ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-pink-700">
                            <span className="text-base">{gift.icon}</span> {gift.name}
                          </span>
                        ) : (
                          <span className="truncate text-xs text-neutral-700" title={row.lastMessageText}>
                            {row.lastMessageText || '—'}
                          </span>
                        )}
                        {row.lastMessageDeleted && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
                            <Ban size={9} /> deleted
                          </span>
                        )}
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap text-xs font-semibold text-neutral-700">
                        {fmtNum(row.messageCount)}
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {row.totalCoins
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-amber-600"><Coins size={11} />{row.totalCoins}</span>
                          : <span className="text-xs text-neutral-300">—</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {row.totalCash
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><span className="font-bold">₹</span>{row.totalCash}</span>
                          : <span className="text-xs text-neutral-300">—</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {row.gifts?.totalGiftCoins
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-pink-600"><Gift size={11} />{row.gifts.totalGiftCoins}</span>
                          : <span className="text-xs text-neutral-300">—</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {row.gifts?.totalGiftCash
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><span className="font-bold">₹</span>{row.gifts.totalGiftCash}</span>
                          : <span className="text-xs text-neutral-300">—</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
                        {fmtDateTime(row.lastMessageAt)}
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

      {selected && (
        <ChatConversationDetail
          userId={selected.userId}
          hostId={selected.hostId}
          userInfo={selected.userInfo}
          hostInfo={selected.hostInfo}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

// ─── chat config tab ────────────────────────────────────────────────────────────

// Billed per letter (character), not per message — e.g. "apple" (5 letters)
// at coinsPerLetter:1 costs 5 coins. See chatController.sendChatMessage.
const CONFIG_FIELDS = [
  {
    key: 'coinsPerLetter',
    label: 'Coins / Letter',
    desc: 'Coins deducted from the sending user per character in the message (e.g. "apple" = 5 letters -> 5 coins at a rate of 1)',
    unit: 'coins',
  },
  {
    key: 'cashPerLetter',
    label: 'Cash / Letter',
    desc: 'Cash (₹) credited to the receiving host per character of every message received',
    unit: '₹',
  },
];

const EMPTY_CONFIG = { coinsPerLetter: '', cashPerLetter: '' };

const applyConfig = (cfg, setConfig, setForm) => {
  setConfig(cfg);
  setForm({
    coinsPerLetter: cfg.coinsPerLetter ?? '',
    cashPerLetter:  cfg.cashPerLetter  ?? '',
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

const VALID_CTABS = new Set(['conversations', 'config']);

// A distinct search-param key from CallManagementSection's own `ctab` — reusing
// that key would leak whichever call sub-tab was last open (e.g. ?ctab=config)
// into this section's initial tab when an admin switches between the two.
const ChatManagementSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = VALID_CTABS.has(searchParams.get('chatTab')) ? searchParams.get('chatTab') : 'conversations';

  const setActiveTab = (id) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (id === 'conversations') p.delete('chatTab'); else p.set('chatTab', id);
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

      {activeTab === 'conversations' && <ChatConversationsTab />}
      {activeTab === 'config'        && <ChatConfigTab />}
    </div>
  );
};

export default ChatManagementSection;
