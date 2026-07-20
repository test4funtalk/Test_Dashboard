import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PhoneCall, Search, RefreshCw, AlertCircle,
  Loader2, ChevronLeft, ChevronRight, Coins, Gift,
  Settings, Plus, Pencil, Trash2, X, CheckCircle, Save, Wallet,
  TrendingUp, TrendingDown, PhoneOff, PhoneMissed, PhoneIncoming,
  Clock, Ban,
} from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import api from '../../../services/api';
import CallDetailModal from './CallDetailModal';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtNum = (n) => (n == null ? '—' : n.toLocaleString());

const fmtDuration = (secs) => {
  if (secs == null || secs < 0) return '—';
  if (secs === 0) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const CALL_STATUS_STYLES = {
  ended:     'bg-neutral-100 text-neutral-600',
  missed:    'bg-red-100 text-red-600',
  rejected:  'bg-red-100 text-red-600',
  cancelled: 'bg-orange-100 text-orange-600',
  active:    'bg-blue-100 text-blue-600',
  pending:   'bg-amber-100 text-amber-700',
};

const STATUS_OPTIONS = [
  { value: '',           label: 'All Statuses' },
  { value: 'ended',      label: 'Ended'        },
  { value: 'missed',     label: 'Missed'       },
  { value: 'rejected',   label: 'Rejected'     },
  { value: 'cancelled',  label: 'Cancelled'    },
  { value: 'active',     label: 'Active'       },
  { value: 'pending',    label: 'Pending'      },
];

const STATUS_CARDS = [
  { key: 'ended',     label: 'Ended Calls',     Icon: PhoneOff,      iconClass: CALL_STATUS_STYLES.ended     },
  { key: 'missed',    label: 'Missed Calls',    Icon: PhoneMissed,   iconClass: CALL_STATUS_STYLES.missed    },
  { key: 'rejected',  label: 'Rejected Calls',  Icon: Ban,           iconClass: CALL_STATUS_STYLES.rejected  },
  { key: 'active',    label: 'Active Calls',    Icon: PhoneIncoming, iconClass: CALL_STATUS_STYLES.active    },
  { key: 'pending',   label: 'Pending Calls',   Icon: Clock,         iconClass: CALL_STATUS_STYLES.pending   },
  { key: 'cancelled', label: 'Cancelled Calls', Icon: X,             iconClass: CALL_STATUS_STYLES.cancelled },
];

const TYPE_OPTIONS = [
  { value: '',      label: 'All Types' },
  { value: 'voice', label: 'Voice'     },
  { value: 'video', label: 'Video'     },
];

// Matches the period buckets accepted by GET /api/admin/calls (adminController.callDateRange)
const PERIOD_OPTIONS = [
  { value: '',            label: 'All Time'      },
  { value: 'today',       label: 'Today'         },
  { value: 'thisWeek',    label: 'This Week'     },
  { value: 'thisMonth',   label: 'This Month'    },
  { value: 'last6Months', label: 'Last 6 Months' },
  { value: 'custom',      label: 'Custom Range'  },
];

const SECTION_TABS = [
  { id: 'calls',  label: 'Calls',       Icon: PhoneCall },
  { id: 'config', label: 'Call Config', Icon: Settings  },
  { id: 'gifts',  label: 'Gift Config', Icon: Gift      },
];

// deterministic bar-height pattern for the barcode-style mini chart on KPI cards
// (matches OverviewSection's stat cards for visual consistency across admin sections)
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
        {trend && (
          trend === 'up'
            ? <span className="flex items-center gap-0.5 text-xs font-medium text-green-600"><TrendingUp size={20} /></span>
            : <span className="flex items-center gap-0.5 text-xs font-medium text-red-500"><TrendingDown size={20} /></span>
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

// ─── calls tab ────────────────────────────────────────────────────────────────

const CallsTab = () => {
  const [calls, setCalls]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [search, setSearch]      = useState('');
  const [debouncedSearch, setDs] = useState('');
  const [status, setStatus]      = useState('');
  const [callType, setCallType]  = useState('');
  const [period, setPeriod]      = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, active: 0, ended: 0, rejected: 0, missed: 0, cancelled: 0 });

  const [activeCallId, setActiveCallId] = useState(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/calls', {
        params: {
          page, limit: 100,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(status   && { status }),
          ...(callType && { callType }),
          ...(period && period !== 'custom' && { period }),
          ...(period === 'custom' && customFrom && { startDate: new Date(customFrom).toISOString() }),
          ...(period === 'custom' && customTo   && { endDate: new Date(customTo + 'T23:59:59').toISOString() }),
        },
      });
      const list       = Array.isArray(data?.data) ? data.data : [];
      const pagination = data?.pagination ?? {};
      setCalls(list);
      setPages(pagination.pages ?? 1);
      setTotal(pagination.total ?? list.length);
      if (data?.statusCounts) setStatusCounts(data.statusCounts);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load calls');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, callType, period, customFrom, customTo]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  useEffect(() => {
    const t = setTimeout(() => { setDs(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const onFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const pageNumbers = () => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= pages - 2) return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  const onPeriodChange = (e) => {
    const value = e.target.value;
    setPeriod(value);
    setPage(1);
    if (value !== 'custom') { setCustomFrom(''); setCustomTo(''); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Calls"
          value={fmtNum(total)}
          pct={100}
          Icon={PhoneCall}
          trend="up"
        />
        {STATUS_CARDS.map(({ key, label, Icon, iconClass }) => (
          <KpiCard
            key={key}
            label={label}
            value={fmtNum(statusCounts[key])}
            pct={total > 0 ? Math.round(((statusCounts[key] ?? 0) / total) * 100) : 0}
            Icon={Icon}
            trend="up"
            iconClass={iconClass}
          />
        ))}
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Toolbar */}
        <div className="border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by username or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={status}
                onChange={onFilterChange(setStatus)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={callType}
                onChange={onFilterChange(setCallType)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
              >
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={period}
                onChange={onPeriodChange}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
              >
                {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button
                onClick={fetchCalls}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* Custom date range — shown only when "Custom Range" is selected */}
          {period === 'custom' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:justify-end">
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
              />
              <span className="text-xs text-neutral-400">→</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
              />
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(''); setCustomTo(''); setPage(1); }}
                  className="text-xs text-neutral-400 hover:text-neutral-700 underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-6 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading calls…
          </div>
        ) : calls.length === 0 ? (
          <div className="py-16 text-center">
            <PhoneCall size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {search || status || callType || period ? 'No calls match your filters' : 'No calls yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50">
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 w-10">#</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Caller</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Host</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">End Reason</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Duration</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Coins Deducted</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Cash Earned</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Gifts</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 w-24">Gift Cash</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">User Wallet</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Host Wallet</th>
                  <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Date / Time</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call, index) => {
                  return (
                    <tr
                      key={call._id}
                      onClick={() => setActiveCallId(call._id)}
                      className="cursor-pointer transition-colors hover:bg-neutral-50"
                    >
                      <td className="border border-neutral-200 px-4 py-3 font-mono text-xs text-neutral-400">
                        {(page - 1) * 100 + index + 1}
                      </td>
                      <td className="border border-neutral-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <AvatarDisplay src={call.callerId?.avatar} name={call.callerId?.username} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">{call.callerId?.username || '—'}</p>
                            {call.callerId?.phone && <p className="truncate text-xs text-neutral-400">{call.callerId.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="border border-neutral-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <AvatarDisplay src={call.hostId?.avatar} name={call.hostId?.username} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">{call.hostId?.username || '—'}</p>
                            {call.hostId?.phone && <p className="truncate text-xs text-neutral-400">{call.hostId.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="border border-neutral-200 px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CALL_STATUS_STYLES[call.status] || 'bg-neutral-100 text-neutral-600'}`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 max-w-[180px] truncate text-xs text-neutral-600" title={call.endReason || ''}>
                        {call.endReason || <span className="text-neutral-300">—</span>}
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 font-mono text-xs text-neutral-600 whitespace-nowrap">
                        {fmtDuration(call.duration)}
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {call.billing?.totalCoinsDeducted
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-amber-600"><Coins size={11} />{call.billing.totalCoinsDeducted}</span>
                          : <span className="text-xs text-neutral-300">—</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {call.billing?.totalCashEarned != null
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><span className="font-bold">₹</span>{call.billing.totalCashEarned}</span>
                          : <span className="text-xs text-neutral-300">—</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {call.gifts?.totalGiftCoins
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-pink-600"><Gift size={11} />{call.gifts.totalGiftCoins}</span>
                          : <span className="text-xs text-neutral-300">—</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {call.gifts?.totalGiftCash
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><span className="font-bold">₹</span>{call.gifts.totalGiftCash}</span>
                          : <span className="text-xs text-neutral-300">—</span>
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {call.walletSnapshot?.callerCoinsAtStart == null && call.walletSnapshot?.callerCoinsAtEnd == null
                          ? <span className="text-xs text-neutral-300">—</span>
                          : (
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
                              <Coins size={11} className="flex-shrink-0 text-amber-500" />
                              {fmtNum(call.walletSnapshot?.callerCoinsAtStart)} → {fmtNum(call.walletSnapshot?.callerCoinsAtEnd)}
                            </span>
                          )
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                        {call.walletSnapshot?.hostCashAtStart == null && call.walletSnapshot?.hostCashAtEnd == null
                          ? <span className="text-xs text-neutral-300">—</span>
                          : (
                            <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                              <Wallet size={11} className="flex-shrink-0 text-green-500" />
                              ₹{fmtNum(call.walletSnapshot?.hostCashAtStart)} → ₹{fmtNum(call.walletSnapshot?.hostCashAtEnd)}
                            </span>
                          )
                        }
                      </td>
                      <td className="border border-neutral-200 px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
                        {fmtDateTime(call.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && calls.length > 0 && pages > 1 && (
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

      {activeCallId && <CallDetailModal callId={activeCallId} onClose={() => setActiveCallId(null)} />}
    </div>
  );
};

// ─── call config tab ──────────────────────────────────────────────────────────

const CONFIG_FIELDS = [
  {
    key: 'coinsPerSecond',
    label: 'Coins / Second',
    desc: 'Coins deducted from user per second of active call',
    unit: 'coins',
  },
  {
    key: 'cashPerSecond',
    label: 'Cash / Second',
    desc: 'Cash (₹) credited to host per second of active call',
    unit: '₹',
  },
  {
    key: 'minimumCallCoins',
    label: 'Minimum Call Coins',
    desc: 'User must hold at least this many coins to initiate a call',
    unit: 'coins',
  },
  {
    key: 'lowBalanceWarningSeconds',
    label: 'Low Balance Warning',
    desc: "Warn when user coins last fewer than N seconds",
    unit: 'sec',
  },
];

const EMPTY_CONFIG = {
  coinsPerSecond: '', cashPerSecond: '',
  minimumCallCoins: '', lowBalanceWarningSeconds: '',
};

const applyConfig = (cfg, setConfig, setForm) => {
  setConfig(cfg);
  setForm({
    coinsPerSecond:           cfg.coinsPerSecond           ?? '',
    cashPerSecond:            cfg.cashPerSecond            ?? '',
    minimumCallCoins:         cfg.minimumCallCoins         ?? '',
    lowBalanceWarningSeconds: cfg.lowBalanceWarningSeconds ?? '',
  });
};

const CallConfigTab = () => {
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
      const { data } = await api.get('/api/admin/call-config');
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
      const { data } = await api.put('/api/admin/call-config', body);
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
              <p className="font-semibold text-neutral-900">Billing Configuration</p>
              <p className="text-xs text-neutral-400">Changes apply to new calls after ~5 min cache TTL</p>
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

// ─── gift config tab ──────────────────────────────────────────────────────────

const GIFT_FILTER_TABS = [
  { id: 'all',      label: 'All'      },
  { id: 'active',   label: 'Active'   },
  { id: 'inactive', label: 'Inactive' },
];

const GIFT_EMPTY_FORM = { name: '', icon: '', coinCost: '', cashValue: '', sortOrder: '0', isActive: true };

// ─── emoji icon picker ────────────────────────────────────────────────────────

const GIFT_ICONS = [
  // Hearts & Love
  '❤️','💕','💖','💗','💓','💞','💝','🥰','😍','💋','💏','💑',
  // Gifts & Celebration
  '🎁','🎀','🎊','🎉','🎈','🎆','🎇','🪅','🎠','🎡',
  // Flowers & Nature
  '🌹','🌸','🌺','💐','🌼','🌻','🌷','🍀','🌿','🌴','🦋','🐝',
  // Stars & Magic
  '⭐','🌟','💫','✨','🌠','🌈','🪄','🔮','💥','⚡',
  // Crown & Luxury
  '👑','💎','💍','🏆','🥇','🎖️','🏅','💰','💵','🪙',
  // Fire & Energy
  '🔥','💯','🚀','⚡','💪','🦁','🐉','🦄','🦅','🐬',
  // Music & Art
  '🎵','🎶','🎸','🎹','🎤','🎭','🎨','🎬','🎧','🎺',
  // Food & Drinks
  '🍰','🎂','🍫','🍷','🥂','🍾','🍓','🍒','🍑','🍭',
  // Fun & Games
  '🎮','🎯','🎳','🎪','🃏','🎲','🧩','🪁','🛸','🎋',
  // Misc Cute
  '🌙','☀️','❄️','🌊','🦩','🐠','🦜','🌺','🪷','🧸',
];

const ICON_CATEGORIES = [
  { label: 'Hearts',      icons: GIFT_ICONS.slice(0,  12) },
  { label: 'Gifts',       icons: GIFT_ICONS.slice(12, 22) },
  { label: 'Flowers',     icons: GIFT_ICONS.slice(22, 34) },
  { label: 'Stars',       icons: GIFT_ICONS.slice(34, 44) },
  { label: 'Luxury',      icons: GIFT_ICONS.slice(44, 54) },
  { label: 'Energy',      icons: GIFT_ICONS.slice(54, 64) },
  { label: 'Music',       icons: GIFT_ICONS.slice(64, 74) },
  { label: 'Food',        icons: GIFT_ICONS.slice(74, 84) },
  { label: 'Fun',         icons: GIFT_ICONS.slice(84, 94) },
  { label: 'Misc',        icons: GIFT_ICONS.slice(94)     },
];

const EmojiPicker = ({ value, onChange }) => {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref                 = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allIcons    = GIFT_ICONS;
  const searchLower = search.trim().toLowerCase();
  const filtered    = searchLower
    ? allIcons.filter((_, i) => {
        const cat = ICON_CATEGORIES.find((c) => c.icons.includes(allIcons[i]));
        return cat?.label.toLowerCase().includes(searchLower);
      })
    : null;

  return (
    <div ref={ref} className="relative w-20 flex-shrink-0">
      <label className="block text-xs font-semibold text-neutral-600 mb-1">Icon</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-xl border px-2 py-2.5 text-center text-2xl transition ${
          open ? 'border-neutral-400' : 'border-neutral-200 hover:border-neutral-300'
        }`}
      >
        {value || <span className="text-neutral-300 text-base">🎁</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-2xl border border-neutral-200 bg-white shadow-xl">
          {/* Search */}
          <div className="border-b border-neutral-100 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category…"
              autoFocus
              className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs outline-none focus:border-neutral-400"
            />
          </div>

          {/* Icon grid */}
          <div className="max-h-64 overflow-y-auto p-2 space-y-2">
            {(filtered ? [{ label: 'Results', icons: filtered }] : ICON_CATEGORIES).map(({ label, icons }) =>
              icons.length === 0 ? null : (
                <div key={label}>
                  <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {icons.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => { onChange(emoji); setOpen(false); setSearch(''); }}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-neutral-100 ${
                          value === emoji ? 'bg-neutral-900 text-white' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
            {filtered?.length === 0 && (
              <p className="py-4 text-center text-xs text-neutral-400">No icons found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const GiftFormModal = ({ initial, onSave, onClose, saving, error }) => {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState(
    isEdit
      ? { name: initial.name, icon: initial.icon, coinCost: initial.coinCost, cashValue: initial.cashValue ?? '', sortOrder: initial.sortOrder, isActive: initial.isActive }
      : GIFT_EMPTY_FORM
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = {
      name:      form.name.trim(),
      icon:      form.icon.trim(),
      coinCost:  Number(form.coinCost),
      cashValue: Number(form.cashValue),
      sortOrder: Number(form.sortOrder),
    };
    if (isEdit) body.isActive = form.isActive;
    onSave(body);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold">{isEdit ? 'Edit Gift Type' : 'Create Gift Type'}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon picker + Name */}
          <div className="flex gap-3">
            <EmojiPicker value={form.icon} onChange={(v) => set('icon', v)} />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Rose"
                required
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          {/* Coin cost + Cash value + Sort order */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Coin Cost</label>
              <div className="relative">
                <Coins size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                <input
                  type="number" min="1" required
                  value={form.coinCost}
                  onChange={(e) => set('coinCost', e.target.value)}
                  placeholder="50"
                  className="w-full rounded-xl border border-neutral-200 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Cash Value (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-600 pointer-events-none">₹</span>
                <input
                  type="number" min="0" required
                  value={form.cashValue}
                  onChange={(e) => set('cashValue', e.target.value)}
                  placeholder="30"
                  className="w-full rounded-xl border border-neutral-200 py-2.5 pl-6 pr-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Sort Order</label>
              <input
                type="number" min="0"
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-700">Active</p>
                <p className="text-xs text-neutral-400">Visible in the gift picker</p>
              </div>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-neutral-900' : 'bg-neutral-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50">
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Gift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GiftConfigTab = () => {
  const [gifts, setGifts]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('all');

  const [modalMode, setModalMode]   = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadGifts = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/api/admin/gift-types')
      .then(({ data }) => setGifts(Array.isArray(data?.data) ? data.data : []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load gift types'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadGifts(); }, [loadGifts]);

  const total    = gifts.length;
  const activeCount   = gifts.filter((g) => g.isActive !== false).length;
  const inactiveCount = gifts.filter((g) => g.isActive === false).length;

  const filtered = filter === 'active'   ? gifts.filter((g) => g.isActive !== false)
                 : filter === 'inactive' ? gifts.filter((g) => g.isActive === false)
                 : gifts;

  const openCreate = () => { setEditTarget(null); setModalError(null); setModalMode('create'); };
  const openEdit   = (g) => { setEditTarget(g);   setModalError(null); setModalMode('edit'); };
  const closeModal = () => { setModalMode(null); setEditTarget(null); setModalError(null); };

  const handleSave = async (body) => {
    setSaving(true);
    setModalError(null);
    try {
      if (modalMode === 'create') {
        const { data } = await api.post('/api/admin/gift-types', body);
        setGifts((prev) => [...prev, data.data]);
      } else {
        const { data } = await api.put(`/api/admin/gift-types/${editTarget._id}`, body);
        setGifts((prev) => prev.map((g) => g._id === editTarget._id ? (data?.data ?? { ...g, ...body }) : g));
      }
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/gift-types/${id}`);
      setGifts((prev) => prev.map((g) => g._id === id ? { ...g, isActive: false } : g));
    } catch {
      // soft-delete failures are silent; user can retry via reload
    } finally {
      setDeletingId(null);
    }
  };

  const TABS_WITH_COUNT = GIFT_FILTER_TABS.map((t) => ({
    ...t,
    count: t.id === 'all' ? total : t.id === 'active' ? activeCount : inactiveCount,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          label="Total Gifts"
          value={fmtNum(total)}
          pct={100}
          Icon={Gift}
          trend="up"
        />
        <KpiCard
          label="Active"
          value={fmtNum(activeCount)}
          pct={total > 0 ? Math.round((activeCount / total) * 100) : 0}
          Icon={CheckCircle}
          trend="up"
        />
        <KpiCard
          label="Inactive"
          value={fmtNum(inactiveCount)}
          pct={total > 0 ? Math.round((inactiveCount / total) * 100) : 0}
          Icon={X}
          trend="down"
        />
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          {/* Filter tabs */}
          <div className="flex gap-1">
            {TABS_WITH_COUNT.map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                }`}
              >
                {label}
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${filter === id ? 'bg-white/20' : 'bg-neutral-100'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={loadGifts}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-700">
              <Plus size={13} /> New Gift
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-6 py-3 text-sm text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Gift grid */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-neutral-400">
              <Loader2 size={20} className="animate-spin" /> Loading gift types…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Gift size={32} className="mx-auto mb-3 text-neutral-200" />
              <p className="text-sm font-medium text-neutral-400">
                {filter !== 'all' ? `No ${filter} gift types` : 'No gift types yet'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((gift) => (
                <div
                  key={gift._id}
                  className={`relative rounded-2xl border p-4 transition ${
                    gift.isActive !== false
                      ? 'border-neutral-200 bg-white'
                      : 'border-neutral-100 bg-neutral-50 opacity-60'
                  }`}
                >
                  {/* Status badge */}
                  <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    gift.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-500'
                  }`}>
                    {gift.isActive !== false ? 'Active' : 'Inactive'}
                  </span>

                  {/* Icon + Name */}
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-2xl">
                      {gift.icon || '🎁'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-900">{gift.name}</p>
                      <p className="text-xs text-neutral-400">Order: {gift.sortOrder ?? 0}</p>
                    </div>
                  </div>

                  {/* Coin cost + Cash value */}
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2">
                      <Coins size={12} className="flex-shrink-0 text-amber-500" />
                      <span className="text-sm font-bold text-amber-700">{gift.coinCost}</span>
                      <span className="text-[10px] text-amber-500">coins</span>
                    </div>
                    {gift.cashValue != null && (
                      <div className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-2">
                        <span className="text-xs font-bold text-green-600">₹</span>
                        <span className="text-sm font-bold text-green-700">{gift.cashValue}</span>
                        <span className="text-[10px] text-green-500">cash</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(gift)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    {gift.isActive !== false && (
                      <button
                        onClick={() => handleDelete(gift._id)}
                        disabled={deletingId === gift._id}
                        className="flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === gift._id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Trash2 size={11} />
                        }
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalMode && (
        <GiftFormModal
          initial={editTarget}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          error={modalError}
        />
      )}
    </div>
  );
};

// ─── main section ─────────────────────────────────────────────────────────────

const VALID_CTABS = new Set(['calls', 'config', 'gifts']);

const CallManagementSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = VALID_CTABS.has(searchParams.get('ctab')) ? searchParams.get('ctab') : 'calls';

  const setActiveTab = (id) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (id === 'calls') p.delete('ctab'); else p.set('ctab', id);
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

      {activeTab === 'calls'  && <CallsTab />}
      {activeTab === 'config' && <CallConfigTab />}
      {activeTab === 'gifts'  && <GiftConfigTab />}
    </div>
  );
};

export default CallManagementSection;
