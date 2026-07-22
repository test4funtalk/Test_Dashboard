import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  Search, RefreshCw, Pencil, Trash2, Crown, X, ArrowLeft,
  ChevronLeft, ChevronRight, Users, UserCheck, ShieldCheck,
  Wifi, AlertCircle, Loader2, CheckCircle, Phone, Calendar,
  Lock, Globe, Clock, UserCircle, Shield, Video, Coins, Gift,
  PhoneCall, Wallet, TrendingUp, TrendingDown, Minus, Plus,
  Copy, Check, Receipt, Package, IndianRupee,
  IdCard, Banknote, Landmark, ExternalLink, ImageOff, Ban, CreditCard,
  PhoneOff, PhoneMissed, Upload,
} from 'lucide-react';
import {
  fetchUsers, updateUser, deleteUser,
  changeToHost, resetUpdateStatus, clearUserErrors,
  adjustWallet, resetAdjustStatus,
} from '../../../store/slices/userSlice';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import { TableRowsSkeleton } from '../../../components/ui/Skeleton';
import { getLanguages } from '../../../services/languageService';
import api from '../../../services/api';
import CallDetailModal from './CallDetailModal';

// ─── tiny helpers ─────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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

const fmtINR = (amount) => {
  if (amount == null) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(amount));
};

const fmtNum = (n) => (n == null ? '—' : n.toLocaleString());

// Only the first character is capitalized — every other character, including
// later words, is forced lowercase. Matches the rule used in Profile Management's
// Language/Tags tabs, applied here to mother-tongue language display.
const formatLangDisplay = (val) => {
  if (!val) return val;
  const lower = String(val).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const CALL_STATUS_STYLES = {
  ended:     'bg-neutral-100 text-neutral-600',
  missed:    'bg-red-100 text-red-600',
  rejected:  'bg-red-100 text-red-600',
  cancelled: 'bg-orange-100 text-orange-600',
  active:    'bg-blue-100 text-blue-600',
  pending:   'bg-amber-100 text-amber-700',
};

// Machine-readable `reason` (always set by the server) mapped to a friendly
// label + color; the optional free-text `endReason` a client may additionally
// supply is surfaced as a hover tooltip on the badge rather than its own column.
const REASON_LABELS = {
  user_ended:               'Ended by User',
  host_ended:                'Ended by Host',
  rejected_by_host:          'Rejected',
  cancelled_by_user:         'Cancelled by User',
  cancelled_by_host:         'Cancelled by Host',
  no_answer:                 'No Answer',
  insufficient_balance:      'Insufficient Balance',
  participant_disconnected:  'Disconnected',
  stale_call_recovered:      'Recovered (Stale)',
  server_shutdown:           'Server Shutdown',
};

const REASON_STYLES = {
  user_ended:               'bg-neutral-100 text-neutral-600',
  host_ended:                'bg-neutral-100 text-neutral-600',
  rejected_by_host:          'bg-red-100 text-red-600',
  cancelled_by_user:         'bg-orange-100 text-orange-600',
  cancelled_by_host:         'bg-orange-100 text-orange-600',
  no_answer:                 'bg-amber-100 text-amber-700',
  insufficient_balance:      'bg-red-100 text-red-600',
  participant_disconnected:  'bg-amber-100 text-amber-700',
  stale_call_recovered:      'bg-purple-100 text-purple-600',
  server_shutdown:           'bg-blue-100 text-blue-600',
};

const ReasonBadge = ({ reason, endReason }) => {
  if (!reason) return <span className="text-xs text-neutral-300">—</span>;
  return (
    <span
      title={endReason || undefined}
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${REASON_STYLES[reason] || 'bg-neutral-100 text-neutral-600'}`}
    >
      {REASON_LABELS[reason] || reason}
    </span>
  );
};

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt',  label: 'Oldest first' },
  { value: 'username',   label: 'Username A–Z' },
  { value: '-username',  label: 'Username Z–A' },
  { value: '-lastSeen',  label: 'Last active'  },
];

// ─── status / role badges ─────────────────────────────────────────────────────

const StatusBadge = ({ status }) => (
  <span className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
    status === 'active'  ? 'bg-green-100 text-green-700' :
    status === 'blocked' ? 'bg-red-100 text-red-600'    :
                           'bg-amber-100 text-amber-700'
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${
      status === 'active'  ? 'bg-green-500' :
      status === 'blocked' ? 'bg-red-500'   : 'bg-amber-500'
    }`} />
    <span className="capitalize">{status || '—'}</span>
  </span>
);

const OnlineBadge = ({ status }) => (
  <span className={`text-xs font-medium ${
    status === 'online' ? 'text-green-500' :
    status === 'incall' ? 'text-blue-500' : 'text-neutral-400'
  }`}>
    {status === 'online' ? '● Online' : status === 'incall' ? '● In Call' : '○ Offline'}
  </span>
);

const RoleBadge = ({ role }) => (
  <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
    role === 'host'  ? 'bg-amber-100 text-amber-700' :
    role === 'admin' ? 'bg-purple-100 text-purple-700' :
                       'bg-neutral-100 text-neutral-600'
  }`}>
    {role === 'host' && <Crown size={10} />}
    {role === 'admin' && <Shield size={10} />}
    <span className="capitalize">{role}</span>
  </span>
);

// ─── mother tongue multi-select ───────────────────────────────────────────────

const MotherTongueSelect = ({ value = [], onChange, languages, loading }) => {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-remove values not in the API list (case-insensitive), and canonicalise casing
  useEffect(() => {
    if (!languages.length) return;
    const lName  = (l) => l?.name ?? l?.languageName ?? l?.language ?? String(l);
    const lwr    = new Map(languages.map((l) => [lName(l).toLowerCase(), lName(l)]));
    const fixed  = value
      .filter((v) => lwr.has(String(v).toLowerCase()))
      .map((v) => lwr.get(String(v).toLowerCase()));
    const changed = fixed.length !== value.length || fixed.some((f, i) => f !== value[i]);
    if (changed) onChange(fixed);
  }, [languages]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDropdown = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < 230);
    }
    setOpen((o) => !o);
  };

  const getLangName = (l) => l?.name ?? l?.languageName ?? l?.language ?? String(l);

  // Case-insensitive lookup map: lowercase → canonical API name
  const nameMap     = new Map(languages.map((l) => [getLangName(l).toLowerCase(), getLangName(l)]));
  const validSetLwr = new Set(nameMap.keys());

  // Auto-remove: use case-insensitive check
  // (handled in the useEffect above; overridden here for consistency)
  const validChips = languages.length
    ? value.filter((v) => validSetLwr.has(String(v).toLowerCase()))
    : value;

  const filtered = languages.filter((l) =>
    getLangName(l).toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (name) => {
    const lower = String(name).toLowerCase();
    if (languages.length && !validSetLwr.has(lower)) return;
    // Always store the canonical (API-cased) name when adding
    const canonical = nameMap.get(lower) ?? name;
    const isSelected = value.some((v) => String(v).toLowerCase() === lower);
    onChange(isSelected
      ? value.filter((v) => String(v).toLowerCase() !== lower)
      : [...value, canonical]
    );
  };

  return (
    <div ref={ref} className="relative">
      {/* Selected chips */}
      <div
        onClick={openDropdown}
        className="min-h-[42px] w-full cursor-pointer rounded-xl border border-neutral-200 px-3 py-2 focus-within:border-neutral-400 flex flex-wrap gap-1.5 items-start"
      >
        {validChips.length === 0 && (
          <span className="text-sm text-neutral-400 py-0.5">
            {loading ? 'Loading languages…' : 'Choose from listed languages…'}
          </span>
        )}
        {validChips.map((lang) => (
          <span key={lang} className="flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-medium text-white">
            {formatLangDisplay(lang)}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(lang); }}
              className="hover:opacity-70"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <span className="ml-auto py-0.5 text-neutral-400">
          <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 w-full rounded-xl border border-neutral-200 bg-white shadow-lg ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <div className="p-2 border-b border-neutral-50">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter listed languages…"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-neutral-50">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-neutral-400 text-sm gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-5 text-center">
                <p className="text-xs font-medium text-neutral-400">No match in available languages</p>
                <p className="mt-0.5 text-xs text-neutral-300">Only languages from the system list can be selected</p>
              </div>
            ) : (
              filtered.map((lang) => {
                const name = getLangName(lang);
                const checked = value.some((v) => String(v).toLowerCase() === name.toLowerCase());
                return (
                  <label
                    key={lang._id ?? name}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(name)}
                      className="h-4 w-4 rounded accent-black"
                    />
                    <span className="text-sm">{formatLangDisplay(name)}</span>
                  </label>
                );
              })
            )}
          </div>
          <div className="border-t border-neutral-50 px-3 py-2">
            <p className="text-[10px] text-neutral-300">Only listed languages can be selected</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── copyable user id (table rows) ─────────────────────────────────────────────

const CopyableUserId = ({ id }) => {
  const [copied, setCopied] = useState(false);

  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={copy}
      title="Copy user ID"
      className="mt-0.5 flex max-w-full items-center gap-1 text-neutral-300 transition hover:text-neutral-600"
    >
      <span className="truncate font-mono text-[10px] leading-none">{id}</span>
      {copied
        ? <Check size={10} className="flex-shrink-0 text-green-500" />
        : <Copy size={10} className="flex-shrink-0" />}
    </button>
  );
};

// ─── row wallet balance (coins for users, cash for hosts) ─────────────────────

const RowWalletBalance = ({ userId, isHost }) => {
  const [wallet, setWallet]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(isHost ? `/api/admin/host-wallet/${userId}` : `/api/wallet/admin/${userId}`)
      .then(({ data }) => { if (alive) setWallet(data?.data ?? null); })
      .catch(() => { if (alive) setWallet(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId, isHost]);

  if (loading) return <span className="text-xs text-neutral-300">…</span>;

  if (isHost) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
        <IndianRupee size={11} />{(wallet?.cash ?? 0).toLocaleString()}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
      <Coins size={11} />{(wallet?.coins ?? wallet?.balance ?? 0).toLocaleString()}
    </span>
  );
};

// ─── stat card skyline bars (matches OverviewSection stat cards) ──────────────

const STAT_BAR_HEIGHTS = [45, 90, 60, 100, 55, 80, 40, 95, 65, 85, 50, 75, 40, 100, 60, 90];
const STAT_BAR_COUNT = 32;

const StatSkylineBars = ({ pct }) => {
  const filledBars = Math.round((pct / 100) * STAT_BAR_COUNT);
  return (
    <div className="mt-2.5 flex h-6 items-end gap-[3px] overflow-hidden">
      {Array.from({ length: STAT_BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] flex-shrink-0 rounded-full ${i < filledBars ? 'bg-neutral-900' : 'bg-neutral-200'}`}
          style={{ height: `${STAT_BAR_HEIGHTS[i % STAT_BAR_HEIGHTS.length]}%` }}
        />
      ))}
    </div>
  );
};

// ─── pagination ───────────────────────────────────────────────────────────────

const PaginationBar = ({ pagination, onPage }) => {
  const { page = 1, pages = 1, total = 0 } = pagination;
  return (
    <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
      <p className="text-xs text-neutral-400">{total} total</p>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs text-neutral-500">{page} / {pages || 1}</span>
        <button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

// ─── date filter helper ───────────────────────────────────────────────────────

const DATE_FILTERS = [
  { id: 'all',       label: 'All'        },
  { id: 'today',     label: 'Today'      },
  { id: 'yesterday', label: 'Yesterday'  },
  { id: 'week',      label: 'This Week'  },
  { id: 'month',     label: 'This Month' },
  { id: 'custom',    label: 'Custom Range' },
];

const CALL_STATUS_OPTIONS = [
  { value: '',          label: 'All Statuses' },
  { value: 'ended',     label: 'Ended'        },
  { value: 'missed',    label: 'Missed'       },
  { value: 'rejected',  label: 'Rejected'     },
  { value: 'cancelled', label: 'Cancelled'    },
  { value: 'active',    label: 'Active'       },
  { value: 'pending',   label: 'Pending'      },
];

const CALL_TYPE_OPTIONS = [
  { value: '',      label: 'All Types' },
  { value: 'voice', label: 'Voice'     },
  { value: 'video', label: 'Video'     },
];

const getDateRange = (period) => {
  if (period === 'all') return {};
  const now = new Date();
  const dayMs = 86400000;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'today')
    return { startDate: todayStart.toISOString(), endDate: new Date(todayStart.getTime() + dayMs - 1).toISOString() };
  if (period === 'yesterday')
    return { startDate: new Date(todayStart.getTime() - dayMs).toISOString(), endDate: new Date(todayStart.getTime() - 1).toISOString() };
  if (period === 'week')
    return { startDate: new Date(todayStart.getTime() - todayStart.getDay() * dayMs).toISOString(), endDate: now.toISOString() };
  if (period === 'month')
    return { startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), endDate: now.toISOString() };
  return {};
};

// ─── call history (used in the user/host detail page) ────────────────────────

// matches Call Management → Calls tab's KpiCard, reusing StatSkylineBars for the mini chart
const KpiCard = ({ label, value, pct, Icon, trend, iconClass = 'bg-neutral-100 text-black' }) => (
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

    <StatSkylineBars pct={pct} />
  </div>
);

const CallHistoryCard = ({ userId, role }) => {
  const [calls, setCalls]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [total, setTotal]     = useState(0);
  const [period, setPeriod]     = useState('all');
  const [status, setStatus]     = useState('');
  const [callType, setCallType] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [activeCallId, setActiveCallId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState(null);

  const isHost = role === 'host';

  useEffect(() => {
    let alive = true;
    setWalletLoading(true);
    api.get(isHost ? `/api/admin/host-wallet/${userId}` : `/api/wallet/admin/${userId}`)
      .then(({ data }) => { if (alive) setWallet(data?.data ?? data ?? null); })
      .catch(() => { if (alive) setWallet(null); })
      .finally(() => { if (alive) setWalletLoading(false); });
    return () => { alive = false; };
  }, [userId, isHost]);

  const fetchHistory = useCallback(async (targetPage) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = isHost
        ? `/api/admin/hosts/${userId}/calls/earnings`
        : `/api/admin/users/${userId}/calls`;
      const { data } = await api.get(endpoint, {
        params: {
          page: targetPage,
          limit: 70,
          ...(period !== 'custom' && getDateRange(period)),
          ...(period === 'custom' && customFrom && { startDate: new Date(customFrom).toISOString() }),
          ...(period === 'custom' && customTo   && { endDate: new Date(customTo + 'T23:59:59').toISOString() }),
          ...(status   && { status }),
          ...(callType && { callType }),
        },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      const pagination = data?.pagination ?? {};
      setCalls(list);
      setPages(pagination.pages ?? 1);
      setTotal(pagination.total ?? list.length);
      if (data?.statusCounts) setStatusCounts(data.statusCounts);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load call history');
    } finally {
      setLoading(false);
    }
  }, [isHost, userId, period, status, callType, customFrom, customTo]);

  useEffect(() => { fetchHistory(page); }, [fetchHistory, page]);

  const onFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const onPeriodChange = (e) => {
    const value = e.target.value;
    setPeriod(value);
    setPage(1);
    if (value !== 'custom') { setCustomFrom(''); setCustomTo(''); }
  };

  return (
    <>
      {/* ── Call status stat cards (host only, styled like Call Management → Calls tab) ── */}
      {isHost && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {loading && !statusCounts ? (
            <div className="col-span-full flex items-center gap-2 text-xs text-neutral-400">
              <Loader2 size={13} className="animate-spin" /> Loading call stats…
            </div>
          ) : (
            <>
              <KpiCard
                label="Ended Calls"
                value={fmtNum(statusCounts?.ended)}
                pct={total > 0 ? Math.round(((statusCounts?.ended ?? 0) / total) * 100) : 0}
                Icon={PhoneOff}
                trend="up"
                iconClass={CALL_STATUS_STYLES.ended}
              />
              <KpiCard
                label="Missed Calls"
                value={fmtNum(statusCounts?.missed)}
                pct={total > 0 ? Math.round(((statusCounts?.missed ?? 0) / total) * 100) : 0}
                Icon={PhoneMissed}
                trend="down"
                iconClass={CALL_STATUS_STYLES.missed}
              />
              <KpiCard
                label="Rejected Calls"
                value={fmtNum(statusCounts?.rejected)}
                pct={total > 0 ? Math.round(((statusCounts?.rejected ?? 0) / total) * 100) : 0}
                Icon={Ban}
                trend="down"
                iconClass={CALL_STATUS_STYLES.rejected}
              />
            </>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white sm:col-span-2">

      {/* ── Header + filters (styled like Call Management → Calls tab) ── */}
      <div className="border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall size={15} className="text-neutral-400" />
            <p className="text-sm font-semibold text-neutral-800">Call History</p>
            {total > 0 && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{total}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={onFilterChange(setStatus)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
            >
              {CALL_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={callType}
              onChange={onFilterChange(setCallType)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
            >
              {CALL_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={period}
              onChange={onPeriodChange}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
            >
              {DATE_FILTERS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <button
              onClick={() => fetchHistory(page)}
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

      {/* ── Wallet snapshot strip (non-host only — host stats moved to KPI cards above) ── */}
      {!isHost && (
        <div className="border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          {walletLoading ? (
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Loader2 size={13} className="animate-spin" /> Loading wallet…
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-neutral-900 p-3 text-white">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium opacity-60">
                  <Wallet size={11} /> Coin Balance
                </div>
                <p className="text-lg font-black">{(wallet?.coins ?? wallet?.balance ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                  <TrendingUp size={11} /> Total Purchased
                </div>
                <p className="text-lg font-black text-neutral-800">{(wallet?.totalPurchased ?? 0).toLocaleString()}</p>
              </div>
              {wallet?.totalSpent != null && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                    <Coins size={11} /> Total Spent
                  </div>
                  <p className="text-lg font-black text-neutral-800">{(wallet.totalSpent ?? 0).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Body — table styled exactly like Call Management → Calls tab ── */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
          <Loader2 size={20} className="animate-spin" /> Loading calls…
        </div>
      ) : error ? (
        <div className="m-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      ) : calls.length === 0 ? (
        <div className="py-16 text-center">
          <PhoneCall size={36} className="mx-auto mb-3 text-neutral-200" />
          <p className="text-sm font-medium text-neutral-400">
            {period !== 'all' || status || callType ? 'No calls match your filters' : 'No calls yet'}
          </p>
        </div>
      ) : isHost ? (
        /* ════════════════════════════════════════════
           HOST TABLE  –  /calls/earnings response shape
           ════════════════════════════════════════════ */
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50">
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 w-10">#</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Caller</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Type</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Reason</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Duration</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Cash Earned</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Host Cash</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Gifts</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Date / Time</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call, index) => {
                const TypeIcon  = call.callType === 'video' ? Video : Phone;
                const giftCount = call.gifts?.length ?? 0;
                const cashAtStart = call.wallet?.cashAtStart;
                const cashAtEnd   = call.wallet?.cashAtEnd;
                return (
                  <tr
                    key={call._id ?? index}
                    onClick={() => call._id && setActiveCallId(call._id)}
                    className="cursor-pointer transition-colors hover:bg-neutral-50"
                  >
                    <td className="border border-neutral-200 px-4 py-3 font-mono text-xs text-neutral-400">
                      {(page - 1) * 70 + index + 1}
                    </td>
                    <td className="border border-neutral-200 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AvatarDisplay src={call.user?.avatar} name={call.user?.username} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-900">{call.user?.username || '—'}</p>
                          {call.user?.phone && <p className="truncate text-xs text-neutral-400">{call.user.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-xs text-neutral-600">
                        <TypeIcon size={12} />
                        <span className="capitalize">{call.callType}</span>
                      </span>
                    </td>
                    <td className="border border-neutral-200 px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CALL_STATUS_STYLES[call.status] || 'bg-neutral-100 text-neutral-600'}`}>
                        {call.status}
                      </span>
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                      <ReasonBadge reason={call.reason} endReason={call.endReason} />
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 font-mono text-xs text-neutral-600 whitespace-nowrap">
                      {fmtDuration(call.duration)}
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                      {call.earnings?.totalCash != null
                        ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><span className="font-bold">₹</span>{call.earnings.totalCash}</span>
                        : <span className="text-xs text-neutral-300">—</span>
                      }
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                      {cashAtStart != null && cashAtEnd != null
                        ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                            <span className="font-bold">₹</span>{cashAtStart} → <span className="font-bold">₹</span>{cashAtEnd}
                          </span>
                        : <span className="text-xs text-neutral-300">—</span>
                      }
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                      {giftCount > 0
                        ? <span className="flex items-center gap-1 text-xs font-semibold text-pink-600"><Gift size={11} />{giftCount}</span>
                        : <span className="text-xs text-neutral-300">—</span>
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
      ) : (
        /* ═══════════════════════════════════════
           USER TABLE  –  /calls response shape
           ═══════════════════════════════════════ */
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px] border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50">
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 w-10">#</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Caller</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Host</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Type</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Reason</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Duration</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Coins Deducted</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Caller Coins</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Cash Earned</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Gifts</th>
                <th className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Date / Time</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call, index) => {
                const TypeIcon = call.callType === 'video' ? Video : Phone;
                const coinsAtStart = call.walletSnapshot?.callerCoinsAtStart;
                const coinsAtEnd   = call.walletSnapshot?.callerCoinsAtEnd;
                return (
                  <tr
                    key={call._id ?? index}
                    onClick={() => setActiveCallId(call._id)}
                    className="cursor-pointer transition-colors hover:bg-neutral-50"
                  >
                    <td className="border border-neutral-200 px-4 py-3 font-mono text-xs text-neutral-400">
                      {(page - 1) * 70 + index + 1}
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
                    <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-xs text-neutral-600">
                        <TypeIcon size={12} />
                        <span className="capitalize">{call.callType}</span>
                      </span>
                    </td>
                    <td className="border border-neutral-200 px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CALL_STATUS_STYLES[call.status] || 'bg-neutral-100 text-neutral-600'}`}>
                        {call.status}
                      </span>
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 whitespace-nowrap">
                      <ReasonBadge reason={call.reason} endReason={call.endReason} />
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
                      {coinsAtStart != null && coinsAtEnd != null
                        ? <span className="flex items-center gap-1 text-xs font-medium text-neutral-600">
                            {coinsAtStart.toLocaleString()} → {coinsAtEnd.toLocaleString()}
                          </span>
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

      {activeCallId && <CallDetailModal callId={activeCallId} onClose={() => setActiveCallId(null)} />}

      {!loading && !error && pages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
          <p className="text-xs text-neutral-400">Page {page} of {pages}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-neutral-500">{page} / {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
};


// ─── payment history card ─────────────────────────────────────────────────────

const PURCHASE_STATUS_STYLES = {
  success:  'bg-green-100  text-green-700  border-green-200',
  pending:  'bg-amber-100  text-amber-700  border-amber-200',
  failed:   'bg-red-100    text-red-700    border-red-200',
  refunded: 'bg-blue-100   text-blue-700   border-blue-200',
};

const PURCHASE_STATUS_FILTERS = [
  { value: '',          label: 'All'      },
  { value: 'success',   label: 'Success'  },
  { value: 'pending',   label: 'Pending'  },
  { value: 'failed',    label: 'Failed'   },
  { value: 'refunded',  label: 'Refunded' },
];

const PAYMENT_DATE_FILTERS = [
  { id: 'all',    label: 'All'        },
  { id: 'today',  label: 'Today'      },
  { id: 'week',   label: 'This Week'  },
  { id: 'month',  label: 'This Month' },
  { id: 'custom', label: 'Custom'     },
];

// 'today'/'week'/'month' are sent as-is — the API resolves the range
// server-side so the admin's browser clock/timezone can't drift from
// what the DB query uses.
const buildDateParams = (p, from, to) => {
  if (p === 'custom') {
    const params = {};
    if (from) params.startDate = new Date(from).toISOString();
    if (to)   params.endDate   = new Date(to + 'T23:59:59').toISOString();
    return params;
  }
  if (!p || p === 'all') return {};
  return { period: p };
};

const PaymentHistoryCard = ({ userId }) => {
  const [purchases,   setPurchases]   = useState([]);
  const [wallet,      setWallet]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [page,        setPage]        = useState(1);
  const [pages,       setPages]       = useState(1);
  const [total,       setTotal]       = useState(0);
  const [status,      setStatus]      = useState('');
  const [period,      setPeriod]      = useState('all');
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');

  const fetchPurchases = useCallback(async (targetPage, targetStatus, targetPeriod, from, to) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: targetPage,
        limit: 20,
        ...buildDateParams(targetPeriod, from, to),
      };
      if (targetStatus) params.status = targetStatus;
      const { data } = await api.get(`/api/purchase/admin/user/${userId}`, { params });
      const inner = data?.data ?? {};
      const rows  = Array.isArray(inner.purchases) ? inner.purchases : [];
      const pg    = data?.pagination ?? {};
      setPurchases(rows);
      setWallet(inner.wallet ?? null);
      setPages(pg.pages ?? 1);
      setTotal(pg.total ?? rows.length);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchPurchases(1, '', 'all', '', ''); }, [fetchPurchases]);

  const onStatusChange = (s) => {
    setStatus(s);
    setPage(1);
    fetchPurchases(1, s, period, customFrom, customTo);
  };

  const onPeriodChange = (p) => {
    setPeriod(p);
    setPage(1);
    if (p !== 'custom') fetchPurchases(1, status, p, '', '');
  };

  const applyCustom = () => {
    setPage(1);
    fetchPurchases(1, status, 'custom', customFrom, customTo);
  };

  return (
    <div className="space-y-3">

      {/* Wallet summary strip */}
      {wallet && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
            <p className="text-xs text-neutral-400 mb-1">Current Balance</p>
            <div className="flex items-center gap-1.5 text-amber-600 font-bold text-lg">
              <Coins size={15} />{(wallet.coins ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
            <p className="text-xs text-neutral-400 mb-1">Total Purchased</p>
            <div className="flex items-center gap-1.5 text-green-700 font-bold text-lg">
              <IndianRupee size={15} />{(wallet.totalPurchased ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
            <p className="text-xs text-neutral-400 mb-1">Last Purchase</p>
            <p className="text-sm font-medium text-neutral-700 leading-tight">
              {wallet.lastTransactionAt ? fmtDateTime(wallet.lastTransactionAt) : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Purchases table card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Header */}
        <div className="border-b border-neutral-100 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            {/* Left: title */}
            <div className="flex items-center gap-2">
              <Receipt size={15} className="text-neutral-400" />
              <p className="text-sm font-semibold text-neutral-800">Purchase History</p>
              {total > 0 && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{total}</span>
              )}
            </div>

            {/* Right: filters + refresh */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status — segmented control */}
              <div className="flex flex-wrap gap-0.5 rounded-lg border border-neutral-200 p-0.5">
                {PURCHASE_STATUS_FILTERS.map(({ value, label }) => (
                  <button key={value} onClick={() => onStatusChange(value)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                      status === value
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Period — dropdown */}
              <select
                value={period}
                onChange={(e) => onPeriodChange(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
              >
                {PAYMENT_DATE_FILTERS.map(({ id, label }) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>

              <button
                onClick={() => fetchPurchases(page, status, period, customFrom, customTo)}
                disabled={loading}
                title="Refresh"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-40"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Custom date pickers — shown below when Custom is active */}
          {period === 'custom' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:justify-end">
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
              />
              <span className="text-xs text-neutral-400">→</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
              />
              <button
                onClick={applyCustom}
                disabled={!customFrom && !customTo}
                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:bg-neutral-700"
              >
                Apply
              </button>
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(''); setCustomTo(''); fetchPurchases(1, status, 'custom', '', ''); }}
                  className="text-xs text-neutral-400 hover:text-neutral-700 underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-neutral-400">
            <Loader2 size={18} className="animate-spin" /> Loading purchases…
          </div>
        ) : error ? (
          <div className="m-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
            <button onClick={() => fetchPurchases(page, status, period, customFrom, customTo)}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2 py-1 text-xs font-medium">
              Retry
            </button>
          </div>
        ) : purchases.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt size={30} className="mx-auto mb-2 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {status ? `No ${status} purchases` : 'No purchases yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Package', 'Coins', 'Amount', 'Status', 'Order ID', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {purchases.map((p, idx) => {
                  const status  = (p.status || '').toLowerCase();
                  const orderId = p.cashfree?.orderId ?? p._id;
                  return (
                    <tr key={p._id ?? idx} className="transition hover:bg-neutral-50">

                      {/* Package */}
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-start gap-1.5">
                          <Package size={12} className="mt-0.5 flex-shrink-0 text-neutral-400" />
                          <div>
                            <p className="text-sm font-medium text-neutral-800">{p.title ?? '—'}</p>
                            {p.subtitle && <p className="text-[10px] text-neutral-400">{p.subtitle}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Coins */}
                      <td className="px-4 py-3 sm:px-5">
                        <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                          <Coins size={12} />{(p.coins ?? 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 sm:px-5">
                        <span className="text-sm font-bold text-neutral-800">{fmtINR(p.amount)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 sm:px-5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${PURCHASE_STATUS_STYLES[status] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                          {status || '—'}
                        </span>
                      </td>

                      {/* Order ID */}
                      <td className="px-4 py-3 sm:px-5">
                        <span className="font-mono text-[11px] text-neutral-400" title={orderId}>
                          {String(orderId).slice(-18)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-neutral-500 sm:px-5">
                        {fmtDateTime(p.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
            <p className="text-xs text-neutral-400">Page {page} of {pages} · {total} total</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const n = Math.max(1, page - 1); setPage(n); fetchPurchases(n, status, period, customFrom, customTo); }}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-neutral-500">{page} / {pages}</span>
              <button
                onClick={() => { const n = Math.min(pages, page + 1); setPage(n); fetchPurchases(n, status, period, customFrom, customTo); }}
                disabled={page >= pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── adjust coins modal ───────────────────────────────────────────────────────

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

const AdjustCoinsModal = ({ userId, currentBalance, onClose, onSuccess }) => {
  const [mode,    setMode]    = useState('credit');
  const [amount,  setAmount]  = useState('');
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(null); // holds API response message

  const n          = parseInt(amount, 10) || 0;
  const isCredit   = mode === 'credit';
  const delta      = isCredit ? n : -n;
  const newBalance = currentBalance + delta;
  const willOverdraw = !isCredit && n > currentBalance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!n || n <= 0)    { setError('Enter a positive whole number.'); return; }
    if (willOverdraw)    { setError(`Cannot deduct more than current balance (${currentBalance.toLocaleString()} coins).`); return; }
    if (!reason.trim())  { setError('Reason is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(`/api/wallet/admin/adjust/${userId}`, {
        adjustment: delta,
        reason: reason.trim(),
      });
      // data.data = { userId, adjustment, coins (new balance), totalPurchased, reason }
      const result = data?.data ?? {};
      setSuccess(data?.message ?? `Wallet adjusted by ${delta > 0 ? '+' : ''}${delta} coins`);
      // bubble new balance up so WalletCard updates without re-fetching
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Adjustment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-5 sm:rounded-2xl sm:p-6">

        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold">Adjust Coins</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Current balance: <span className="font-semibold text-neutral-700">{currentBalance.toLocaleString()} coins</span>
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-center">
              <CheckCircle size={24} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm font-semibold text-green-800">{success}</p>
            </div>
            <button onClick={onClose}
              className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="mb-4 flex gap-1 rounded-xl border border-neutral-200 p-1">
              {[{ id: 'credit', label: 'Credit', Icon: Plus }, { id: 'deduct', label: 'Deduct', Icon: Minus }].map(({ id, label, Icon }) => (
                <button key={id} type="button"
                  onClick={() => { setMode(id); setError(''); setAmount(''); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
                    mode === id
                      ? id === 'credit' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                      : 'text-neutral-500 hover:bg-neutral-50'
                  }`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">

              {/* Amount input + presets */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">Amount (coins)</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  placeholder="Enter coin amount…"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESET_AMOUNTS.map((p) => (
                    <button key={p} type="button"
                      onClick={() => { setAmount(String(p)); setError(''); }}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                        amount === String(p)
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                      }`}>
                      {p.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* New balance preview */}
              {n > 0 && (
                <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
                  willOverdraw
                    ? 'border border-red-200 bg-red-50'
                    : 'border border-neutral-100 bg-neutral-50'
                }`}>
                  <span className="text-xs text-neutral-500">New balance after {isCredit ? 'credit' : 'deduct'}</span>
                  <span className={`font-bold ${willOverdraw ? 'text-red-500' : isCredit ? 'text-green-700' : 'text-neutral-800'}`}>
                    {willOverdraw ? 'Insufficient balance' : `${newBalance.toLocaleString()} coins`}
                  </span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setError(''); }}
                  placeholder="e.g. manual_top_up, goodwill_credit"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium hover:bg-neutral-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading || willOverdraw}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition disabled:opacity-50 ${
                    isCredit ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                  }`}>
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                    : <>{isCredit ? <Plus size={14} /> : <Minus size={14} />} Confirm {isCredit ? 'Credit' : 'Deduct'}</>}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// ─── wallet card ──────────────────────────────────────────────────────────────

const WalletCard = ({ userId }) => {
  const [wallet, setWallet]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [showAdjust, setShowAdjust] = useState(false);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/wallet/admin/${userId}`);
      // API may return { data: {...} } or the wallet object at the top level
      const raw = data?.data ?? data;
      setWallet(raw && typeof raw === 'object' ? raw : { balance: 0, totalPurchased: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  return (
    <>
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Coin Wallet</p>
          <div className="flex items-center gap-2">
            <button
              onClick={loadWallet}
              disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-40"
              title="Refresh wallet"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAdjust(true)}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-50"
            >
              <Coins size={12} /> Adjust Coins
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-4 text-sm text-neutral-400">
            <Loader2 size={14} className="animate-spin" /> Loading wallet…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs text-red-500">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={loadWallet} className="ml-auto text-xs font-medium underline">Retry</button>
          </div>
        )}

        {!loading && !error && wallet && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-neutral-900 p-4 text-white">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium opacity-60">
                <Wallet size={11} /> Balance
              </div>
              <p className="text-2xl font-black">{(wallet.coins ?? wallet.balance ?? 0).toLocaleString()}</p>
              <p className="text-xs opacity-50 mt-0.5">coins</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                <TrendingUp size={11} /> Total Purchased
              </div>
              <p className="text-2xl font-black text-neutral-800">{(wallet.totalPurchased ?? 0).toLocaleString()}</p>
              <p className="text-xs text-neutral-400 mt-0.5">lifetime</p>
            </div>
            {wallet.totalSpent != null && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                  <Coins size={11} /> Total Spent
                </div>
                <p className="text-2xl font-black text-neutral-800">{(wallet.totalSpent ?? 0).toLocaleString()}</p>
                <p className="text-xs text-neutral-400 mt-0.5">coins used</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdjust && (
        <AdjustCoinsModal
          userId={userId}
          currentBalance={wallet?.coins ?? wallet?.balance ?? 0}
          onClose={() => setShowAdjust(false)}
          onSuccess={(result) => {
            // result = { coins, totalPurchased, adjustment, reason } from API response
            if (result?.coins != null) {
              setWallet((prev) => ({
                ...prev,
                coins: result.coins,
                totalPurchased: result.totalPurchased ?? prev?.totalPurchased,
              }));
            } else {
              loadWallet();
            }
          }}
        />
      )}
    </>
  );
};

// ─── host wallet card (cash earnings balance) ──────────────────────────────────

const HostWalletCard = ({ hostId }) => {
  const [wallet, setWallet]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/admin/host-wallet/${hostId}`);
      setWallet(data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Cash Wallet</p>
        <button
          onClick={loadWallet}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-40"
          title="Refresh wallet"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-neutral-400">
          <Loader2 size={14} className="animate-spin" /> Loading wallet…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs text-red-500">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadWallet} className="ml-auto text-xs font-medium underline">Retry</button>
        </div>
      )}

      {!loading && !error && wallet && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-neutral-900 p-4 text-white">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium opacity-60">
                <Wallet size={11} /> Balance
              </div>
              <p className="text-xl font-black sm:text-2xl">{fmtINR(wallet.cash)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                <TrendingUp size={11} /> Total Earned
              </div>
              <p className="text-lg font-black text-neutral-800">{fmtINR(wallet.totalEarned)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                <Gift size={11} /> Gift Cash
              </div>
              <p className="text-lg font-black text-neutral-800">{fmtINR(wallet.totalGiftCash)}</p>
            </div>
          </div>
          {wallet.lastTransactionAt && (
            <p className="mt-3 text-xs text-neutral-400">Last transaction: {fmtDateTime(wallet.lastTransactionAt)}</p>
          )}
        </>
      )}
    </div>
  );
};

// ─── withdrawal history card (host checkout requests) ──────────────────────────

const CHECKOUT_STATUS_STYLES = {
  pending:  'bg-amber-100  text-amber-700  border-amber-200',
  approved: 'bg-green-100  text-green-700  border-green-200',
  rejected: 'bg-red-100    text-red-700    border-red-200',
};

const CHECKOUT_STATUS_FILTERS = [
  { value: '',         label: 'All'      },
  { value: 'pending',  label: 'Pending'  },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// Matches the exact period values accepted by GET /api/admin/checkouts/host/:hostId
const CHECKOUT_PERIOD_FILTERS = [
  { value: '',             label: 'All'        },
  { value: 'today',        label: 'Today'      },
  { value: 'yesterday',    label: 'Yesterday'  },
  { value: 'thisWeek',     label: 'This Week'  },
  { value: 'thisMonth',    label: 'This Month' },
  { value: 'last6Months',  label: 'Last 6mo'   },
];

const WithdrawalHistoryCard = ({ hostId }) => {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [total,    setTotal]    = useState(0);
  const [status,   setStatus]   = useState('');
  const [period,   setPeriod]   = useState('');

  const [actionTarget, setActionTarget] = useState(null); // checkout request being approved/rejected
  const [actionMode,   setActionMode]   = useState(null); // 'approve' | 'reject'
  const [actionNote,   setActionNote]   = useState('');
  const [actionBusy,   setActionBusy]   = useState(false);
  const [actionError,  setActionError]  = useState(null);

  const openAction = (request, mode) => {
    setActionTarget(request);
    setActionMode(mode);
    setActionNote('');
    setActionError(null);
  };
  const closeAction = () => {
    setActionTarget(null);
    setActionMode(null);
    setActionNote('');
    setActionError(null);
  };

  const submitAction = async () => {
    if (actionMode === 'reject' && !actionNote.trim()) {
      setActionError('A note is required to reject a withdrawal request');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const { data } = await api.put(`/api/admin/checkouts/${actionTarget._id}/${actionMode}`, { note: actionNote.trim() });
      const updated = data?.data ?? {};
      setRequests((prev) => prev.map((r) => (r._id === actionTarget._id ? { ...r, ...updated } : r)));
      closeAction();
    } catch (err) {
      setActionError(err.response?.data?.message || `Failed to ${actionMode} withdrawal request`);
    } finally {
      setActionBusy(false);
    }
  };

  const fetchHistory = useCallback(async (targetPage, targetStatus, targetPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: targetPage, limit: 20 };
      if (targetStatus) params.status = targetStatus;
      if (targetPeriod) params.period = targetPeriod;
      const { data } = await api.get(`/api/admin/checkouts/host/${hostId}`, { params });
      const rows = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};
      setRequests(rows);
      setPages(pg.pages ?? 1);
      setTotal(pg.total ?? rows.length);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load withdrawal history');
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  useEffect(() => { fetchHistory(1, '', ''); }, [fetchHistory]);

  const onStatusChange = (s) => { setStatus(s); setPage(1); fetchHistory(1, s, period); };
  const onPeriodChange = (p) => { setPeriod(p); setPage(1); fetchHistory(1, status, p); };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">

      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Banknote size={15} className="text-neutral-400" />
          <p className="text-sm font-semibold text-neutral-800">Withdrawal History</p>
          {total > 0 && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{total}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status — segmented control */}
          <div className="flex flex-wrap gap-0.5 rounded-lg border border-neutral-200 p-0.5">
            {CHECKOUT_STATUS_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => onStatusChange(value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  status === value
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Period — dropdown (too many options for a pill row) */}
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
          >
            {CHECKOUT_PERIOD_FILTERS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <button
            onClick={() => fetchHistory(page, status, period)}
            disabled={loading}
            title="Refresh"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-neutral-400">
          <Loader2 size={18} className="animate-spin" /> Loading withdrawal requests…
        </div>
      ) : error ? (
        <div className="m-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
          <button onClick={() => fetchHistory(page, status, period)}
            className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2 py-1 text-xs font-medium">
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center">
          <Banknote size={30} className="mx-auto mb-2 text-neutral-200" />
          <p className="text-sm font-medium text-neutral-400">
            {status ? `No ${status} withdrawal requests` : 'No withdrawal requests yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-neutral-100">
                {['Gross', 'Deductions', 'GST', 'Net Amount', 'Status', 'Processed By', 'Date', 'Actions'].map((h) => (
                  <th
                    key={h}
                    title={h === 'GST' ? "Carved out of the platform fee for tax remittance — not an additional deduction from Net Amount" : undefined}
                    className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5 ${h === 'Actions' ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {requests.map((r) => {
                const st = (r.status || '').toLowerCase();
                return (
                  <tr key={r._id} className="transition hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm font-medium text-neutral-800 sm:px-5">{fmtINR(r.grossAmount)}</td>
                    <td
                      className="px-4 py-3 text-xs text-neutral-500 sm:px-5"
                      title={r.deductions?.length
                        ? r.deductions.map((d) => `${d.label}: ${fmtINR(d.amount)}${d.type === 'percent' ? ` (${d.value}%)` : ''}`).join('\n')
                        : undefined}
                    >
                      {fmtINR(r.totalDeductionAmount)}
                      {r.deductions?.length > 0 && <span className="text-neutral-300"> ({r.deductions.length})</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 sm:px-5">
                      {fmtINR(r.gstAmount)} <span className="text-neutral-300">({r.gstPercent ?? 0}%)</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700 sm:px-5">{fmtINR(r.netAmount)}</td>
                    <td className="px-4 py-3 sm:px-5">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${CHECKOUT_STATUS_STYLES[st] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                        {st || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 sm:px-5">
                      {r.processedBy?.username
                        ? <span>@{r.processedBy.username}</span>
                        : <span className="text-neutral-300">—</span>}
                      {r.processedAt && <p className="text-[10px] text-neutral-300">{fmtDateTime(r.processedAt)}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 sm:px-5">{fmtDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      {st === 'pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openAction(r, 'approve')}
                            className="rounded-lg border border-green-200 px-2.5 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openAction(r, 'reject')}
                            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
          <p className="text-xs text-neutral-400">Page {page} of {pages} · {total} total</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const n = Math.max(1, page - 1); setPage(n); fetchHistory(n, status, period); }}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-neutral-500">{page} / {pages}</span>
            <button
              onClick={() => { const n = Math.min(pages, page + 1); setPage(n); fetchHistory(n, status, period); }}
              disabled={page >= pages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Approve / reject confirmation modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {actionMode === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
              </h3>
              <button onClick={closeAction} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 space-y-1 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Net Amount</span>
                <span className="font-bold text-emerald-700">{fmtINR(actionTarget.netAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Gross Amount</span>
                <span className="font-medium">{fmtINR(actionTarget.grossAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Requested</span>
                <span className="font-medium">{fmtDateTime(actionTarget.createdAt)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                Note {actionMode === 'reject' && <span className="text-red-500">(required)</span>}
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
                placeholder={actionMode === 'approve' ? 'Payout processed via bank transfer' : 'Bank details could not be verified'}
                className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            {actionError && (
              <p className="mb-3 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle size={12} /> {actionError}
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={closeAction}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={actionBusy}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
                  actionMode === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionBusy && <Loader2 size={13} className="animate-spin" />}
                {actionBusy ? 'Submitting…' : actionMode === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── host online time card (single host, with period filter) ───────────────────

const ONLINE_TIME_PERIODS = [
  { id: 'today',     label: 'Today'      },
  { id: 'thisweek',  label: 'This Week'  },
  { id: 'thismonth', label: 'This Month' },
  { id: 'all',       label: 'All Time'   },
];

const HostOnlineTimeCard = ({ hostId }) => {
  const [period,  setPeriod]  = useState('today');
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchOnlineTime = useCallback(async (targetPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/host-online-time/admin/host/${hostId}`, { params: { period: targetPeriod } });
      setDetail(data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load host online time');
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  useEffect(() => { fetchOnlineTime(period); }, [fetchOnlineTime, period]);

  const onPeriodChange = (p) => setPeriod(p);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">

      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-neutral-400" />
          <p className="text-sm font-semibold text-neutral-800">Online Time</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-0.5 rounded-lg border border-neutral-200 p-0.5">
            {ONLINE_TIME_PERIODS.map(({ id, label }) => (
              <button key={id} onClick={() => onPeriodChange(id)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  period === id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchOnlineTime(period)}
            disabled={loading}
            title="Refresh"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-neutral-400">
          <Loader2 size={18} className="animate-spin" /> Loading online time…
        </div>
      ) : error ? (
        <div className="m-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
          <button onClick={() => fetchOnlineTime(period)}
            className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2 py-1 text-xs font-medium">
            Retry
          </button>
        </div>
      ) : (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Totals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-neutral-900 p-3 text-white">
              <p className="text-lg font-black sm:text-xl">{detail?.totalFormatted ?? '—'}</p>
              <p className="mt-0.5 text-xs opacity-70">Online Time</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-lg font-black text-neutral-800 sm:text-xl">{fmtNum(detail?.sessionCount)}</p>
              <p className="mt-0.5 text-xs text-neutral-400">Sessions</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-lg font-black capitalize text-neutral-800 sm:text-xl">{detail?.period ?? '—'}</p>
              <p className="mt-0.5 text-xs text-neutral-400">Period</p>
            </div>
          </div>

          {/* Session history */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Session History</p>
            {detail?.sessions?.length ? (
              <div className="overflow-x-auto rounded-xl border border-neutral-100">
                <table className="w-full min-w-[500px] text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      {['Start', 'End', 'Duration', 'Status'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {detail.sessions.map((s) => (
                      <tr key={s._id}>
                        <td className="px-3 py-2 text-xs text-neutral-600 whitespace-nowrap">{fmtDateTime(s.startTime)}</td>
                        <td className="px-3 py-2 text-xs text-neutral-600 whitespace-nowrap">
                          {s.endTime ? fmtDateTime(s.endTime) : <span className="text-green-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-neutral-600 whitespace-nowrap">{fmtDuration(s.durationSeconds)}</td>
                        <td className="px-3 py-2">
                          {s.isActive ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Active</span>
                          ) : (
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">Closed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-sm text-neutral-400">
                No sessions recorded for this period
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── host KYC details card (view + inline approve/reject) ──────────────────────

const KYC_STATUS_STYLES = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// ID-1 card size (ISO/IEC 7810) — the standard physical dimensions of both
// Aadhaar and PAN cards, 85.60mm × 53.98mm — so previews match the real card shape.
const ID_CARD_ASPECT = '85.6 / 53.98';

const ImageLink = ({ label, url, className = '' }) => (
  <div className={`min-w-0 flex-1 basis-[160px] ${className}`}>
    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">{label}</p>
    {url ? (
      <button
        type="button"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        style={{ aspectRatio: ID_CARD_ASPECT }}
        className="group relative block w-full max-w-[220px] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
      >
        <img src={url} alt={label} className="h-full w-full object-contain transition group-hover:opacity-80" />
        <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          <ExternalLink size={10} /> View
        </span>
      </button>
    ) : (
      <div
        style={{ aspectRatio: ID_CARD_ASPECT }}
        className="flex w-full max-w-[220px] items-center justify-center rounded-lg border border-dashed border-neutral-200 text-neutral-300"
      >
        <ImageOff size={20} />
      </div>
    )}
  </div>
);

const editFormFromKyc = (kyc) => ({
  panNumber:         kyc.pan?.number || '',
  nameAsPerPan:      kyc.pan?.nameAsPerPan || '',
  dob:               kyc.pan?.dob ? new Date(kyc.pan.dob).toISOString().slice(0, 10) : '',
  accountHolderName: kyc.bank?.accountHolderName || '',
  accountNumber:     kyc.bank?.accountNumber || '',
  bankName:          kyc.bank?.bankName || '',
  ifscCode:          kyc.bank?.ifscCode || '',
  status:            kyc.status || 'pending',
  adminNote:         kyc.adminNote || '',
});

const ImageEditPicker = ({ label, currentUrl, file, onChange }) => {
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : (currentUrl || null)),
    [file, currentUrl]
  );
  useEffect(() => {
    if (!file) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [file, previewUrl]);

  return (
    <div className="min-w-0 flex-1 basis-[160px]">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">{label}</p>
      {previewUrl ? (
        <div style={{ aspectRatio: ID_CARD_ASPECT }} className="mb-2 w-full max-w-[220px] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
          <img src={previewUrl} alt={label} className="h-full w-full object-contain" />
        </div>
      ) : (
        <div style={{ aspectRatio: ID_CARD_ASPECT }} className="mb-2 flex w-full max-w-[220px] items-center justify-center rounded-lg border border-dashed border-neutral-200 text-neutral-300">
          <ImageOff size={20} />
        </div>
      )}
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50">
        <Upload size={12} /> {file ? 'Change file' : 'Replace image'}
        <input
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
      {file && <p className="mt-1 truncate text-[11px] text-neutral-400">{file.name}</p>}
    </div>
  );
};

const HostKycDetailsCard = ({ userId }) => {
  const [kyc, setKyc]           = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [actionMode, setActionMode]   = useState(null); // 'approve' | 'reject' | 'edit'
  const [note, setNote]               = useState('');
  const [actionBusy, setActionBusy]   = useState(false);
  const [actionError, setActionError] = useState(null);
  const [editForm, setEditForm]       = useState(null);
  const [editFiles, setEditFiles]     = useState({ panImage: null, aadhaarFront: null, aadhaarBack: null });
  const setEditField = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));
  const setEditFile  = (k, file) => setEditFiles((f) => ({ ...f, [k]: file }));

  const loadKyc = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const { data } = await api.get(`/api/admin/kyc/${userId}`);
      setKyc(data?.data ?? null);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else setError(err.response?.data?.message || 'Failed to load KYC submission');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadKyc(); }, [loadKyc]);

  const startAction = (mode) => {
    setActionMode(mode);
    setNote('');
    setActionError(null);
    if (mode === 'edit') {
      setEditForm(editFormFromKyc(kyc));
      setEditFiles({ panImage: null, aadhaarFront: null, aadhaarBack: null });
    }
  };
  const cancelAction = () => { setActionMode(null); setNote(''); setActionError(null); };

  const submitAction = async () => {
    if (actionMode === 'reject' && !note.trim()) {
      setActionError('A note is required to reject a submission');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const { data } = await api.patch(`/api/admin/kyc/${kyc._id}/${actionMode}`, { note: note.trim() });
      setKyc((prev) => ({ ...prev, ...(data?.data ?? {}) }));
      cancelAction();
    } catch (err) {
      setActionError(err.response?.data?.message || `Failed to ${actionMode} submission`);
    } finally {
      setActionBusy(false);
    }
  };

  const submitEdit = async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      const fields = {
        panNumber:         editForm.panNumber.trim(),
        nameAsPerPan:      editForm.nameAsPerPan.trim(),
        dob:               editForm.dob,
        accountHolderName: editForm.accountHolderName.trim(),
        accountNumber:     editForm.accountNumber.trim(),
        bankName:          editForm.bankName.trim(),
        ifscCode:          editForm.ifscCode.trim().toUpperCase(),
        status:            editForm.status,
        adminNote:         editForm.adminNote.trim(),
      };

      const hasFiles = editFiles.panImage || editFiles.aadhaarFront || editFiles.aadhaarBack;
      let payload = fields;
      if (hasFiles) {
        payload = new FormData();
        Object.entries(fields).forEach(([k, v]) => payload.append(k, v));
        if (editFiles.panImage)     payload.append('panImage', editFiles.panImage);
        if (editFiles.aadhaarFront) payload.append('aadhaarFront', editFiles.aadhaarFront);
        if (editFiles.aadhaarBack)  payload.append('aadhaarBack', editFiles.aadhaarBack);
      }

      const { data } = await api.patch(`/api/admin/kyc/${kyc._id}`, payload);
      setKyc((prev) => ({ ...prev, ...(data?.data ?? fields) }));
      cancelAction();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update KYC submission');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
        <Loader2 size={20} className="animate-spin" /> Loading KYC submission…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <IdCard size={36} className="mx-auto mb-3 text-neutral-200" />
        <p className="text-sm font-medium text-neutral-400">No KYC submission found for this host</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
        <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
        <button onClick={loadKyc} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2 py-1 text-xs font-medium">
          Retry
        </button>
      </div>
    );
  }

  if (!kyc) return null;

  return (
    <div className="space-y-3">

      {/* Status header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${KYC_STATUS_STYLES[kyc.status] || 'bg-neutral-100 text-neutral-600'}`}>
            {kyc.status || '—'}
          </span>
          <p className="text-xs text-neutral-400">Submitted {fmtDateTime(kyc.createdAt)}</p>
        </div>
        {!actionMode && (
          <div className="flex gap-2">
            {kyc.status === 'pending' && (
              <>
                <button onClick={() => startAction('approve')}
                  className="flex items-center gap-1.5 rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-50">
                  <CheckCircle size={13} /> Approve
                </button>
                <button onClick={() => startAction('reject')}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50">
                  <Ban size={13} /> Reject
                </button>
              </>
            )}
            {kyc.status === 'approved' && (
              <button onClick={() => startAction('edit')}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50">
                <Pencil size={13} /> Edit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action panel */}
      {(actionMode === 'approve' || actionMode === 'reject') && (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-semibold capitalize">{actionMode} this submission</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Note {actionMode === 'reject' && <span className="text-red-500">(required)</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={actionMode === 'approve' ? 'All documents verified' : 'Aadhaar back image is blurry, please re-upload'}
              className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          {actionError && (
            <p className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle size={12} /> {actionError}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={cancelAction}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
              Cancel
            </button>
            <button onClick={submitAction} disabled={actionBusy}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
                actionMode === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {actionBusy && <Loader2 size={13} className="animate-spin" />}
              {actionBusy ? 'Submitting…' : `Confirm ${actionMode === 'approve' ? 'Approval' : 'Rejection'}`}
            </button>
          </div>
        </div>
      )}

      {actionMode === 'edit' && editForm && (
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-semibold">Edit KYC Details</p>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              <CreditCard size={12} /> PAN Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">PAN Number</label>
                <input
                  value={editForm.panNumber}
                  onChange={(e) => setEditField('panNumber', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Date of Birth</label>
                <input
                  type="date"
                  value={editForm.dob}
                  onChange={(e) => setEditField('dob', e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-500">Name as per PAN</label>
                <input
                  value={editForm.nameAsPerPan}
                  onChange={(e) => setEditField('nameAsPerPan', e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            </div>
            <div className="mt-3">
              <ImageEditPicker
                label="PAN Image"
                currentUrl={kyc.pan?.imageUrl}
                file={editFiles.panImage}
                onChange={(f) => setEditFile('panImage', f)}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              <IdCard size={12} /> Aadhaar
            </p>
            <div className="flex flex-wrap gap-3">
              <ImageEditPicker
                label="Front"
                currentUrl={kyc.aadhaar?.frontImageUrl}
                file={editFiles.aadhaarFront}
                onChange={(f) => setEditFile('aadhaarFront', f)}
              />
              <ImageEditPicker
                label="Back"
                currentUrl={kyc.aadhaar?.backImageUrl}
                file={editFiles.aadhaarBack}
                onChange={(f) => setEditFile('aadhaarBack', f)}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              <Landmark size={12} /> Bank Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Account Holder</label>
                <input
                  value={editForm.accountHolderName}
                  onChange={(e) => setEditField('accountHolderName', e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Account Number</label>
                <input
                  value={editForm.accountNumber}
                  onChange={(e) => setEditField('accountNumber', e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Bank Name</label>
                <input
                  value={editForm.bankName}
                  onChange={(e) => setEditField('bankName', e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">IFSC Code</label>
                <input
                  value={editForm.ifscCode}
                  onChange={(e) => setEditField('ifscCode', e.target.value.toUpperCase())}
                  placeholder="HDFC0001234"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditField('status', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm capitalize outline-none focus:border-neutral-400"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Admin Note</label>
              <input
                value={editForm.adminNote}
                onChange={(e) => setEditField('adminNote', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          {actionError && (
            <p className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle size={12} /> {actionError}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={cancelAction}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
              Cancel
            </button>
            <button onClick={submitEdit} disabled={actionBusy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50">
              {actionBusy && <Loader2 size={13} className="animate-spin" />}
              {actionBusy ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {kyc.adminNote && (
        <p className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-600">
          <span className="font-semibold text-neutral-700">Admin note: </span>{kyc.adminNote}
        </p>
      )}

      {/* Identity Documents — PAN + Aadhaar side by side, image widths capped to card size */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2 sm:divide-x sm:divide-neutral-100">

          {/* PAN */}
          <div className="space-y-3 sm:pr-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              <CreditCard size={12} /> PAN Details
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <p className="text-xs text-neutral-400">Number</p>
                <p className="font-mono text-sm font-medium">{kyc.pan?.number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Date of Birth</p>
                <p className="text-sm font-medium">{fmtDate(kyc.pan?.dob)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-neutral-400">Name as per PAN</p>
                <p className="text-sm font-medium">{kyc.pan?.nameAsPerPan || '—'}</p>
              </div>
            </div>
            <ImageLink label="PAN Image" url={kyc.pan?.imageUrl} />
          </div>

          {/* Aadhaar */}
          <div className="space-y-3 sm:pl-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              <IdCard size={12} /> Aadhaar
            </p>
            <div className="flex flex-wrap gap-3">
              <ImageLink label="Front" url={kyc.aadhaar?.frontImageUrl} />
              <ImageLink label="Back"  url={kyc.aadhaar?.backImageUrl} />
            </div>
          </div>
        </div>
      </div>

      {/* Bank */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          <Landmark size={12} /> Bank Details
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-neutral-400">Account Holder</p>
            <p className="text-sm font-medium">{kyc.bank?.accountHolderName || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Account Number</p>
            <p className="font-mono text-sm font-medium">{kyc.bank?.accountNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Bank Name</p>
            <p className="text-sm font-medium">{kyc.bank?.bankName || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">IFSC Code</p>
            <p className="font-mono text-sm font-medium">{kyc.bank?.ifscCode || '—'}</p>
          </div>
        </div>
      </div>

      {/* Review meta */}
      {(kyc.reviewedBy || kyc.reviewedAt) && (
        <p className="text-xs text-neutral-400">
          Reviewed {fmtDateTime(kyc.reviewedAt)}{kyc.reviewedBy && ` by ${kyc.reviewedBy}`}
        </p>
      )}
    </div>
  );
};

// ─── user detail page ─────────────────────────────────────────────────────────

const USER_DETAIL_TABS = [
  { id: 'payments', label: 'Payments', Icon: Receipt  },
  { id: 'calls',    label: 'Calls',    Icon: PhoneCall },
];

const HOST_DETAIL_TABS = [
  { id: 'wallet',     label: 'Wallet',      Icon: Wallet  },
  { id: 'calls',      label: 'Calls',       Icon: PhoneCall },
  { id: 'kyc',        label: 'KYC Details', Icon: IdCard  },
  { id: 'onlineTime', label: 'Online Time', Icon: Clock   },
];

const USER_DTAB_IDS = new Set(USER_DETAIL_TABS.map((t) => t.id));
const HOST_DTAB_IDS = new Set(HOST_DETAIL_TABS.map((t) => t.id));

// ─── header wallet badges (coin balance + total purchased, shown near username) ──
const HeaderWalletBadges = ({ userId }) => {
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get(`/api/wallet/admin/${userId}`)
      .then(({ data }) => { if (alive) setWallet(data?.data ?? data ?? null); })
      .catch(() => { if (alive) setWallet(null); });
    return () => { alive = false; };
  }, [userId]);

  return (
    <>
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <Coins size={10} /> {(wallet?.coins ?? wallet?.balance ?? 0).toLocaleString()} coins
      </span>
      <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
        <TrendingUp size={10} /> {(wallet?.totalPurchased ?? 0).toLocaleString()} purchased
      </span>
    </>
  );
};

const UserDetailPage = ({ user, activeTab, dtab, onDtab, onBack, onEdit, onDelete, onPromote, promotingId }) => {
  const isHostDetail = activeTab === 'hosts';
  const canPromote  = activeTab === 'users' && user.gender === 'female' && user.role === 'user';
  const isPromoting = promotingId === user._id;
  const [copied, setCopied] = useState(false);
  const [kycStatus, setKycStatus] = useState(null); // null = loading/unknown, 'approved' | 'pending' | 'rejected' | 'none'

  useEffect(() => {
    if (!isHostDetail) return;
    let cancelled = false;
    setKycStatus(null);
    api.get(`/api/admin/kyc/${user._id}`)
      .then(({ data }) => { if (!cancelled) setKycStatus(data?.data?.status ?? 'none'); })
      .catch(() => { if (!cancelled) setKycStatus('none'); });
    return () => { cancelled = true; };
  }, [isHostDetail, user._id]);

  const copyId = () => {
    navigator.clipboard.writeText(user._id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-neutral-50 last:border-0">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</p>
        <div className="mt-0.5 text-sm text-neutral-800">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-900"
      >
        <ArrowLeft size={16} />
        Back to {activeTab === 'users' ? 'Users' : 'Hosts'}
      </button>

      {/* Profile header */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: avatar + identity */}
          <div className="flex items-start gap-4">
            <AvatarDisplay src={user.avatar} name={user.username} size="xl" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight">{user.username || '—'}</h2>
              <p className="text-sm text-neutral-400">{user.phone || 'No phone'}</p>
              {/* Copyable User ID */}
              <button
                onClick={copyId}
                title="Copy user ID"
                className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 transition hover:border-neutral-400 hover:bg-neutral-100"
              >
                <span className="font-mono text-[11px] text-neutral-500">{user._id}</span>
                {copied
                  ? <Check size={11} className="text-green-500 flex-shrink-0" />
                  : <Copy size={11} className="text-neutral-400 flex-shrink-0" />
                }
              </button>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
                {!isHostDetail && <HeaderWalletBadges userId={user._id} />}
                {user.isVerified && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <ShieldCheck size={10} /> Verified
                  </span>
                )}
                {isHostDetail && (
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    kycStatus === 'approved' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    <IdCard size={10} /> KYC Verified: {kycStatus === null ? '…' : kycStatus === 'approved' ? 'Yes' : 'No'}
                  </span>
                )}
                <OnlineBadge status={user.userCurrentStatus} />
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
            >
              <Pencil size={14} /> Edit Profile
            </button>
            {canPromote && (
              <button
                onClick={onPromote}
                disabled={!!promotingId}
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                {isPromoting ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
                Make Host
              </button>
            )}
            <button
              onClick={onDelete}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
            >
              <Trash2 size={14} /> Delete User
            </button>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Personal Info */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Personal</p>
          <InfoRow icon={UserCircle} label="Gender" value={<span className="capitalize">{user.gender || '—'}</span>} />
          <InfoRow icon={Calendar}   label="Date of Birth" value={fmtDate(user.dob)} />
          <InfoRow icon={Globe}      label="Mother Tongue" value={
            user.motherTongue?.length
              ? <div className="flex flex-wrap gap-1 mt-0.5">{user.motherTongue.map((l) => (
                  <span key={l} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{formatLangDisplay(l)}</span>
                ))}</div>
              : '—'
          } />
          <InfoRow icon={Lock} label="Screen Lock" value={
            user.activateScreenlock === 'allowed'
              ? <span className="text-green-600">Allowed</span>
              : user.activateScreenlock === 'not_allowed'
              ? <span className="text-red-500">Not Allowed</span>
              : '—'
          } />
        </div>

        {/* Account Info */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Account</p>
          <InfoRow icon={Phone}       label="Phone"   value={user.phone || '—'} />
          <InfoRow icon={ShieldCheck} label="Verified" value={
            user.isVerified
              ? <span className="text-blue-600 font-medium">Yes</span>
              : <span className="text-neutral-400">No</span>
          } />
          <InfoRow icon={Wifi} label="Current Status" value={<OnlineBadge status={user.userCurrentStatus} />} />
        </div>

        {/* Timestamps */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Timeline</p>
          <div className="grid gap-0 sm:grid-cols-3">
            <InfoRow icon={Clock} label="Joined"           value={fmtDateTime(user.createdAt)} />
            <InfoRow icon={Clock} label="Last Seen"        value={fmtDateTime(user.lastSeen)} />
            <InfoRow icon={Clock} label="Username Updated" value={fmtDate(user.lastUsernameUpdate)} />
          </div>
        </div>
      </div>

      {!isHostDetail && <WalletCard userId={user._id} />}

      {/* ── Detail tabs ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-neutral-100 px-4 pt-3 pb-0 sm:px-5">
          {(isHostDetail ? HOST_DETAIL_TABS : USER_DETAIL_TABS).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onDtab(id)}
              className={`-mb-px flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all ${
                dtab === id
                  ? 'border-b-2 border-neutral-900 text-neutral-900'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {isHostDetail ? (
          dtab === 'wallet' ? (
            <div className="space-y-4 p-4 sm:p-5">
              <HostWalletCard hostId={user._id} />
              <WithdrawalHistoryCard hostId={user._id} />
            </div>
          ) : dtab === 'kyc' ? (
            <div className="p-4 sm:p-5">
              <HostKycDetailsCard userId={user._id} />
            </div>
          ) : dtab === 'onlineTime' ? (
            <div className="p-4 sm:p-5">
              <HostOnlineTimeCard hostId={user._id} />
            </div>
          ) : (
            <CallHistoryCard userId={user._id} role="host" />
          )
        ) : (
          dtab === 'payments' ? (
            <div className="space-y-4 p-4 sm:p-5">
              <PaymentHistoryCard userId={user._id} />
            </div>
          ) : (
            <CallHistoryCard userId={user._id} role="user" />
          )
        )}
      </div>
    </div>
  );
};

// ─── main section ─────────────────────────────────────────────────────────────

const UserManagementSection = () => {
  const dispatch = useDispatch();
  // Separate selectors — each subscribes only to the fields it needs so unrelated
  // state changes (e.g. adjustLoading) don't re-render the whole section.
  const users        = useSelector((s) => s.user.users);
  const hosts        = useSelector((s) => s.user.hosts);
  const loading      = useSelector((s) => s.user.loading);
  const error        = useSelector((s) => s.user.error);
  const pagination   = useSelector((s) => s.user.pagination);
  const stats        = useSelector((s) => s.user.stats);
  const updateLoading  = useSelector((s) => s.user.updateLoading);
  const updateError    = useSelector((s) => s.user.updateError);
  const updateSuccess  = useSelector((s) => s.user.updateSuccess);
  const deletingId     = useSelector((s) => s.user.deletingId);
  const deleteError    = useSelector((s) => s.user.deleteError);
  const promotingId    = useSelector((s) => s.user.promotingId);
  const promoteError   = useSelector((s) => s.user.promoteError);

  const [searchParams, setSearchParams] = useSearchParams();

  // all URL-persisted state — one hook, one source of truth
  const activeTab  = searchParams.get('usersTab') === 'hosts' ? 'hosts' : 'users';
  const selectedId = searchParams.get('userId') || null;

  const defaultDtab  = activeTab === 'hosts' ? 'wallet' : 'payments';
  const allowedDtabs = activeTab === 'hosts' ? HOST_DTAB_IDS : USER_DTAB_IDS;
  const rawDtab       = searchParams.get('dtab');
  const dtab          = allowedDtabs.has(rawDtab) ? rawDtab : defaultDtab;

  const setActiveTab = useCallback((tab) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (tab === 'hosts') p.set('usersTab', 'hosts'); else p.delete('usersTab');
      p.delete('userId');
      p.delete('dtab');
      return p;
    }, { replace: false });
    setPage(1);
    setOnlineOnly(false);
  }, [setSearchParams]);

  const setSelectedId = useCallback((id) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (id) {
        p.set('userId', id);
        p.delete('dtab'); // reset detail tab when opening a new user
      } else {
        p.delete('userId');
        p.delete('dtab');
      }
      return p;
    }, { replace: !id });
  }, [setSearchParams]);

  const setDtab = useCallback((tab) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      const def = (prev.get('usersTab') === 'hosts') ? 'wallet' : 'payments';
      if (tab === def) p.delete('dtab'); else p.set('dtab', tab);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  // tab / filter (ephemeral — intentionally reset on reload)
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDs]    = useState('');
  const [sort, setSort]             = useState('-createdAt');
  const [page, setPage]             = useState(1);
  const [onlineOnly, setOnlineOnly] = useState(false); // toggled by clicking the "Online Now" stat card

  // modals
  const [editTarget, setEditTarget]     = useState(null);
  const [editForm, setEditForm]         = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // languages
  const [languages, setLanguages]     = useState([]);
  const [langsLoading, setLangsLoading] = useState(false);

  // ── fetch languages once ────────────────────────────────────────────────
  useEffect(() => {
    setLangsLoading(true);
    getLanguages()
      .then(setLanguages)
      .catch(() => {})
      .finally(() => setLangsLoading(false));
  }, []);


  // ── debounce search ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDs(search); setPage(1); }, 450);
    return () => clearTimeout(t);
  }, [search]);

  // ── fetch on filter change (role-scoped so each tab gets its own page) ──
  const doFetch = useCallback(() => {
    const params = {
      page, limit: 20, sort,
      role: activeTab === 'hosts' ? 'host' : 'user',
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(onlineOnly && { userCurrentStatus: 'online' }),
    };
    dispatch(fetchUsers(params));
  }, [dispatch, page, sort, debouncedSearch, activeTab, onlineOnly]);

  useEffect(() => { doFetch(); }, [doFetch]);

  // ── KYC-approved count for the Hosts tab stat card ──────────────────────
  // `stats.verifiedHosts` (from the users API) only reflects the generic
  // isVerified account flag, not actual KYC approval. The admin KYC list
  // endpoint already computes a real `summary.approved` count server-side
  // (only hosts ever submit KYC) — reused here as-is, no backend change.
  const [hostKycApprovedCount, setHostKycApprovedCount] = useState(null);
  const [hostKycLoading, setHostKycLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'hosts') return;
    let cancelled = false;
    setHostKycLoading(true);
    api.get('/api/admin/kyc', { params: { limit: 1 } })
      .then(({ data }) => { if (!cancelled) setHostKycApprovedCount(data?.summary?.approved ?? 0); })
      .catch(() => { if (!cancelled) setHostKycApprovedCount(0); })
      .finally(() => { if (!cancelled) setHostKycLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab]);

  // ── close edit on success ───────────────────────────────────────────────
  useEffect(() => {
    if (updateSuccess) {
      setEditTarget(null);
      const t = setTimeout(() => dispatch(resetUpdateStatus()), 100);
      return () => clearTimeout(t);
    }
  }, [updateSuccess, dispatch]);

  // ── close detail after promote (user removed from list) ─────────────────
  // Only acts on the promotingId truthy→falsy transition (a promote just
  // finished) — not on every list change — so it doesn't fire on initial
  // mount/reload while `users`/`hosts` are still empty and haven't loaded yet.
  const prevPromotingIdRef = useRef(null);
  useEffect(() => {
    const justFinishedPromoting = prevPromotingIdRef.current != null && promotingId == null;
    prevPromotingIdRef.current = promotingId;
    if (justFinishedPromoting && selectedId) {
      const inList = [...users, ...hosts].find((u) => u._id === selectedId);
      if (!inList) setSelectedId(null);
    }
  }, [promotingId, users, hosts, selectedId]);

  // ── handlers ────────────────────────────────────────────────────────────

  const normLang = (l) => (typeof l === 'string' ? l : (l?.name ?? l?.languageName ?? l?.language ?? null));

  const openEdit = (user) => {
    setEditTarget(user);
    setEditForm({
      username:           user.username           || '',
      phone:              user.phone              || '',
      dob:                user.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
      gender:             user.gender             || '',
      activateScreenlock: user.activateScreenlock || '',
      motherTongue:       Array.isArray(user.motherTongue)
                            ? user.motherTongue.map(normLang).filter(Boolean)
                            : user.motherTongue
                              ? [normLang(user.motherTongue)].filter(Boolean)
                              : [],
      role:               user.role               || 'user',
      status:             user.status             || 'active',
      avatar:             user.avatar             || '',
      isVerified:         !!user.isVerified,
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    dispatch(updateUser({ userId: editTarget._id, payload: { ...editForm } }));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    dispatch(deleteUser(deleteTarget._id));
    setDeleteTarget(null);
    if (deleteTarget._id === selectedId) setSelectedId(null);
  };

  const handlePromote = (userId) => {
    dispatch(clearUserErrors());
    dispatch(changeToHost(userId));
  };

  // ── derived ─────────────────────────────────────────────────────────────

  const isUsersTab  = activeTab === 'users';
  const list        = isUsersTab ? users : hosts;
  const listLoading = loading;
  const listError   = error;

  // derive selected user from Redux list so edits instantly reflect
  const selectedUser = selectedId ? [...users, ...hosts].find((u) => u._id === selectedId) : null;

  const displayStats = {
    totalUsers:    stats.totalUsers    || users.length,
    activeUsers:   stats.activeUsers   || users.filter((u) => u.status === 'active').length,
    verifiedUsers: stats.verifiedUsers || users.filter((u) => u.isVerified).length,
    onlineUsers:   stats.onlineUsers   || users.filter((u) => u.userCurrentStatus === 'online').length,
    totalHosts:    stats.totalHosts    || hosts.length,
    activeHosts:   stats.activeHosts   || hosts.filter((h) => h.status === 'active').length,
    verifiedHosts: stats.verifiedHosts || hosts.filter((h) => h.isVerified).length,
    onlineHosts:   stats.onlineHosts   || hosts.filter((h) => h.userCurrentStatus === 'online').length,
  };

  const usersTotal = displayStats.totalUsers;
  const hostsTotal  = displayStats.totalHosts;

  const STAT_CARDS = isUsersTab ? [
    { label: 'Total Users', value: displayStats.totalUsers,    total: usersTotal, icon: Users,      caption: 'All registered users', dot: 'bg-neutral-900' },
    { label: 'Active',      value: displayStats.activeUsers,   total: usersTotal, icon: UserCheck,  caption: 'Currently active',      dot: 'bg-green-500'   },
    { label: 'Verified',    value: displayStats.verifiedUsers, total: usersTotal, icon: ShieldCheck,caption: 'KYC verified',          dot: 'bg-blue-500'    },
    { label: 'Online Now',  value: displayStats.onlineUsers,   total: usersTotal, icon: Wifi,       caption: 'Online right now',      dot: 'bg-emerald-500', filterKey: 'online' },
  ] : [
    { label: 'Total Hosts', value: displayStats.totalHosts,    total: hostsTotal,  icon: Crown,      caption: 'All registered hosts',  dot: 'bg-amber-500'   },
    { label: 'Active',      value: displayStats.activeHosts,   total: hostsTotal,  icon: UserCheck,  caption: 'Currently active',      dot: 'bg-green-500'   },
    { label: 'Verified',    value: hostKycLoading ? 0 : (hostKycApprovedCount ?? 0), total: hostsTotal, icon: ShieldCheck, caption: 'KYC approved', dot: 'bg-blue-500' },
    { label: 'Online Now',  value: displayStats.onlineHosts,   total: hostsTotal,  icon: Wifi,       caption: 'Online right now',      dot: 'bg-emerald-500', filterKey: 'online' },
  ];

  const COL_HEADERS = isUsersTab
    ? ['User', 'Phone', 'Gender', 'Status', 'Verified', 'Joined', 'Coin Wallet', 'Actions']
    : ['Host', 'Phone', 'Status', 'Verified', 'Last Seen', 'Cash Wallet', 'Actions'];

  // ── detail page view ─────────────────────────────────────────────────────

  // Deep-linked (reload) into a detail view — the list for this tab hasn't
  // resolved yet, so the user genuinely isn't in `users`/`hosts` yet. Show a
  // spinner instead of falling through to the list view below.
  if (selectedId && !selectedUser && loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-neutral-400">
        <Loader2 size={20} className="animate-spin" /> Loading details…
      </div>
    );
  }

  if (selectedUser) {
    return (
      <>
        <UserDetailPage
          user={selectedUser}
          activeTab={activeTab}
          dtab={dtab}
          onDtab={setDtab}
          onBack={() => setSelectedId(null)}
          onEdit={() => openEdit(selectedUser)}
          onDelete={() => setDeleteTarget(selectedUser)}
          onPromote={() => handlePromote(selectedUser._id)}
          promotingId={promotingId}
        />
        {/* Error toast */}
        {(deleteError || promoteError) && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-lg">
            <AlertCircle size={15} /> {deleteError || promoteError}
          </div>
        )}
        {/* Edit + delete modals rendered on top of detail page */}
        {editTarget && <EditModal {...{ editTarget, editForm, setEditForm, handleEditSubmit, updateLoading, updateError, languages, langsLoading, dispatch, resetUpdateStatus, setEditTarget }} />}
        {deleteTarget && <DeleteModal deleteTarget={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
      </>
    );
  }

  // ── table view ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {STAT_CARDS.map(({ label, value, total, icon: Icon, caption, dot, filterKey }) => {
          const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
          const isOnlineCard = filterKey === 'online';
          const isActive = isOnlineCard && onlineOnly;
          const CardTag = isOnlineCard ? 'button' : 'div';
          return (
            <CardTag
              key={label}
              type={isOnlineCard ? 'button' : undefined}
              onClick={isOnlineCard ? () => { setOnlineOnly((v) => !v); setPage(1); } : undefined}
              title={isOnlineCard ? (isActive ? 'Showing online only — click to clear' : 'Click to show only online') : undefined}
              className={`rounded-2xl border bg-white p-4 text-left sm:p-5 ${
                isOnlineCard ? 'cursor-pointer transition hover:border-neutral-400' : ''
              } ${isActive ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-neutral-200'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-neutral-700">{label}</span>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-black">
                  <Icon size={15} />
                </div>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-neutral-900 sm:text-3xl">{value.toLocaleString()}</span>
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dot}`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                <span className="truncate">{isActive ? 'Filtering: online only' : caption}</span>
                <span className="flex-shrink-0 font-semibold text-neutral-500">{pct}% of total</span>
              </div>

              <StatSkylineBars pct={pct} />
            </CardTag>
          );
        })}
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-neutral-100 px-4 pt-3 sm:px-6">
          {[
            { id: 'users', label: 'Users', count: displayStats.totalUsers },
            { id: 'hosts', label: 'Hosts', count: displayStats.totalHosts },
          ].map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => { if (id !== activeTab) setActiveTab(id); }}
              className={`-mb-px flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === id
                  ? 'border-b-2 border-black text-black'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === id ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-500'
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:px-6 sm:py-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search username or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex flex-1 items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button
                onClick={doFetch}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
              >
                <RefreshCw size={13} className={listLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-700"
            >
              <Plus size={13} /> Add {isUsersTab ? 'User' : 'Host'}
            </button>
          </div>
        </div>

        {/* Error bar */}
        {(listError || deleteError || promoteError) && (
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-6 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {listError || deleteError || promoteError}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-neutral-100">
                {COL_HEADERS.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {listLoading ? (
                <TableRowsSkeleton rows={8} />
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={COL_HEADERS.length} className="py-20 text-center">
                    <Users size={36} className="mx-auto mb-3 text-neutral-200" />
                    <p className="text-sm font-medium text-neutral-400">No {activeTab} found</p>
                    {debouncedSearch && <p className="mt-1 text-xs text-neutral-300">Try a different search term</p>}
                  </td>
                </tr>
              ) : (
                list.map((u) => {
                  const isDeleting  = deletingId === u._id;
                  const isPromoting = promotingId === u._id;
                  const canPromote  = isUsersTab && u.gender === 'female' && u.role === 'user';

                  return (
                    <tr
                      key={u._id}
                      onClick={() => { dispatch(clearUserErrors()); setSelectedId(u._id); }}
                      className="cursor-pointer transition hover:bg-neutral-50"
                    >
                      {/* User */}
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-3">
                          <AvatarDisplay src={u.avatar} name={u.username} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{u.username || '—'}</p>
                            <CopyableUserId id={u._id} />
                            <OnlineBadge status={u.userCurrentStatus} />
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-sm text-neutral-600 sm:px-6">{u.phone || '—'}</td>

                      {/* Gender (users only) */}
                      {isUsersTab && (
                        <td className="px-4 py-3 text-sm capitalize text-neutral-600 sm:px-6">{u.gender || '—'}</td>
                      )}

                      {/* Status */}
                      <td className="px-4 py-3 sm:px-6"><StatusBadge status={u.status} /></td>

                      {/* Verified */}
                      <td className="px-4 py-3 sm:px-6">
                        {u.isVerified
                          ? <CheckCircle size={16} className="text-blue-500" />
                          : <span className="text-xs text-neutral-300">—</span>}
                      </td>

                      {/* Joined / Last Seen */}
                      <td className="px-4 py-3 text-xs text-neutral-500 sm:px-6">
                        {isUsersTab ? fmtDate(u.createdAt) : fmtDate(u.lastSeen)}
                      </td>

                      {/* Wallet */}
                      <td className="px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
                        <RowWalletBalance userId={u._id} isHost={!isUsersTab} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(u)}
                            title="Edit"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900"
                          >
                            <Pencil size={13} />
                          </button>
                          {canPromote && (
                            <button
                              onClick={() => handlePromote(u._id)}
                              disabled={!!promotingId}
                              title="Promote to Host"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 text-amber-600 transition hover:bg-amber-50 disabled:opacity-50"
                            >
                              {isPromoting ? <Loader2 size={13} className="animate-spin" /> : <Crown size={13} />}
                            </button>
                          )}
                          <button
                            onClick={() => { dispatch(clearUserErrors()); setDeleteTarget(u); }}
                            disabled={!!deletingId}
                            title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!listLoading && list.length > 0 && (
          <PaginationBar pagination={pagination} onPage={(p) => setPage(p)} />
        )}
      </div>

      {/* Modals */}
      {editTarget && (
        <EditModal
          editTarget={editTarget}
          editForm={editForm}
          setEditForm={setEditForm}
          handleEditSubmit={handleEditSubmit}
          updateLoading={updateLoading}
          updateError={updateError}
          languages={languages}
          langsLoading={langsLoading}
          dispatch={dispatch}
          resetUpdateStatus={resetUpdateStatus}
          setEditTarget={setEditTarget}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          deleteTarget={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
      {showAddModal && (
        <AddUserModal
          role={isUsersTab ? 'user' : 'host'}
          onClose={() => setShowAddModal(false)}
          onSuccess={doFetch}
          languages={languages}
          langsLoading={langsLoading}
        />
      )}
    </div>
  );
};

// ─── add user / host modal ────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { flag: '🇮🇳', name: 'India',          dial: '+91'  },
  { flag: '🇺🇸', name: 'United States',  dial: '+1'   },
  { flag: '🇬🇧', name: 'United Kingdom', dial: '+44'  },
  { flag: '🇦🇺', name: 'Australia',      dial: '+61'  },
  { flag: '🇨🇦', name: 'Canada',         dial: '+1'   },
  { flag: '🇦🇪', name: 'UAE',            dial: '+971' },
  { flag: '🇸🇦', name: 'Saudi Arabia',   dial: '+966' },
  { flag: '🇸🇬', name: 'Singapore',      dial: '+65'  },
  { flag: '🇲🇾', name: 'Malaysia',       dial: '+60'  },
  { flag: '🇳🇿', name: 'New Zealand',    dial: '+64'  },
  { flag: '🇵🇰', name: 'Pakistan',       dial: '+92'  },
  { flag: '🇧🇩', name: 'Bangladesh',     dial: '+880' },
  { flag: '🇱🇰', name: 'Sri Lanka',      dial: '+94'  },
  { flag: '🇳🇵', name: 'Nepal',          dial: '+977' },
  { flag: '🇲🇻', name: 'Maldives',       dial: '+960' },
  { flag: '🇿🇦', name: 'South Africa',   dial: '+27'  },
  { flag: '🇳🇬', name: 'Nigeria',        dial: '+234' },
  { flag: '🇰🇪', name: 'Kenya',          dial: '+254' },
  { flag: '🇩🇪', name: 'Germany',        dial: '+49'  },
  { flag: '🇫🇷', name: 'France',         dial: '+33'  },
  { flag: '🇮🇹', name: 'Italy',          dial: '+39'  },
  { flag: '🇪🇸', name: 'Spain',          dial: '+34'  },
  { flag: '🇳🇱', name: 'Netherlands',    dial: '+31'  },
  { flag: '🇨🇭', name: 'Switzerland',    dial: '+41'  },
  { flag: '🇸🇪', name: 'Sweden',         dial: '+46'  },
  { flag: '🇳🇴', name: 'Norway',         dial: '+47'  },
  { flag: '🇩🇰', name: 'Denmark',        dial: '+45'  },
  { flag: '🇷🇺', name: 'Russia',         dial: '+7'   },
  { flag: '🇨🇳', name: 'China',          dial: '+86'  },
  { flag: '🇯🇵', name: 'Japan',          dial: '+81'  },
  { flag: '🇰🇷', name: 'South Korea',    dial: '+82'  },
  { flag: '🇵🇭', name: 'Philippines',    dial: '+63'  },
  { flag: '🇮🇩', name: 'Indonesia',      dial: '+62'  },
  { flag: '🇻🇳', name: 'Vietnam',        dial: '+84'  },
  { flag: '🇹🇭', name: 'Thailand',       dial: '+66'  },
  { flag: '🇧🇷', name: 'Brazil',         dial: '+55'  },
  { flag: '🇲🇽', name: 'Mexico',         dial: '+52'  },
  { flag: '🇦🇷', name: 'Argentina',      dial: '+54'  },
  { flag: '🇶🇦', name: 'Qatar',          dial: '+974' },
  { flag: '🇰🇼', name: 'Kuwait',         dial: '+965' },
  { flag: '🇧🇭', name: 'Bahrain',        dial: '+973' },
  { flag: '🇴🇲', name: 'Oman',           dial: '+968' },
  { flag: '🇮🇷', name: 'Iran',           dial: '+98'  },
  { flag: '🇹🇷', name: 'Turkey',         dial: '+90'  },
  { flag: '🇮🇱', name: 'Israel',         dial: '+972' },
  { flag: '🇪🇬', name: 'Egypt',          dial: '+20'  },
];

const PhoneInput = ({ value, onChange }) => {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref                 = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = COUNTRY_CODES.find((c) => c.dial === value.dial && c.name === value.countryName)
    ?? COUNTRY_CODES.find((c) => c.dial === value.dial)
    ?? COUNTRY_CODES[0];

  const filtered = search.trim()
    ? COUNTRY_CODES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search)
      )
    : COUNTRY_CODES;

  return (
    <div ref={ref} className="relative flex rounded-xl border border-neutral-200 focus-within:border-neutral-400 overflow-hidden">
      {/* Country picker trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-shrink-0 items-center gap-1.5 border-r border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm transition hover:bg-neutral-100"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="font-mono font-medium text-neutral-700">{selected.dial}</span>
        <ChevronRight size={12} className={`text-neutral-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {/* Number input */}
      <input
        type="tel"
        required
        value={value.number}
        onChange={(e) => onChange({ ...value, number: e.target.value })}
        placeholder="9000000001"
        className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-neutral-200 bg-white shadow-xl">
          <div className="p-2 border-b border-neutral-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code…"
              autoFocus
              className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs outline-none focus:border-neutral-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-400">No results</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={`${c.name}-${c.dial}`}
                  type="button"
                  onClick={() => {
                    onChange({ ...value, dial: c.dial, countryName: c.name });
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition hover:bg-neutral-50 ${
                    selected?.name === c.name ? 'bg-neutral-100 font-semibold' : ''
                  }`}
                >
                  <span className="text-base leading-none w-6 text-center">{c.flag}</span>
                  <span className="flex-1 text-left text-neutral-800">{c.name}</span>
                  <span className="font-mono text-xs text-neutral-400">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const EMPTY_ADD_FORM = {
  phone: { dial: '+91', number: '', countryName: 'India' },
  username: '', gender: '', dob: '', avatar: '',
  motherTongue: [], activateScreenlock: 'not_allowed',
};

const AddUserModal = ({ role, onClose, onSuccess, languages, langsLoading }) => {
  const isHost = role === 'host';
  const [form, setForm]     = useState({ ...EMPTY_ADD_FORM, gender: isHost ? 'female' : '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        role,
        phone:              `${form.phone.dial}${form.phone.number.trim()}`,
        username:           form.username.trim(),
        gender:             form.gender,
        activateScreenlock: form.activateScreenlock,
        ...(form.dob        && { dob: form.dob }),
        ...(form.avatar.trim() && { avatar: form.avatar.trim() }),
        motherTongue: form.motherTongue.length ? form.motherTongue : null,
      };
      await api.post('/api/admin-auth/adminAddUsers', body);
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full flex-col max-h-[92vh] rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="font-semibold">Add {isHost ? 'Host' : 'User'}</p>
            <p className="text-xs text-neutral-400">Bypass OTP — account is created verified</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={15} /> {error}
            </div>
          )}
          {success && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle size={15} /> Account created successfully!
            </div>
          )}

          <form id="add-user-form" onSubmit={handleSubmit} className="grid gap-4 p-5 sm:grid-cols-2">

            {/* Phone */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Phone *</label>
              <PhoneInput value={form.phone} onChange={(v) => set('phone', v)} />
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Username *</label>
              <input
                type="text" required
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                placeholder="priya_seed"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Gender *</label>
              <select
                required
                value={form.gender}
                onChange={(e) => set('gender', e.target.value)}
                disabled={isHost}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed"
              >
                <option value="">— select —</option>
                {(isHost ? ['female'] : ['male', 'female', 'other']).map((g) => (
                  <option key={g} value={g} className="capitalize">{g}</option>
                ))}
              </select>
              {isHost && <p className="mt-1 text-xs text-amber-600">Hosts must be female</p>}
            </div>

            {/* DOB */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => set('dob', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            {/* Screen Lock */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Screen Lock</label>
              <select
                value={form.activateScreenlock}
                onChange={(e) => set('activateScreenlock', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              >
                <option value="not_allowed">Not Allowed</option>
                <option value="allowed">Allowed</option>
              </select>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Avatar URL</label>
              <input
                type="url"
                value={form.avatar}
                onChange={(e) => set('avatar', e.target.value)}
                placeholder="https://cdn.example.com/avatar.jpg"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            {/* Mother Tongue */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Mother Tongue</label>
              <MotherTongueSelect
                value={form.motherTongue}
                onChange={(v) => set('motherTongue', v)}
                languages={languages}
                loading={langsLoading}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 gap-2 border-t border-neutral-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-user-form"
            disabled={saving || success}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? 'Creating…' : `Create ${isHost ? 'Host' : 'User'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── edit modal (extracted to keep JSX readable) ──────────────────────────────

const EditModal = ({
  editTarget, editForm, setEditForm, handleEditSubmit,
  updateLoading, updateError,
  languages, langsLoading,
  dispatch, resetUpdateStatus, setEditTarget,
}) => {
  const closeEdit = () => { setEditTarget(null); dispatch(resetUpdateStatus()); };
  const set = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full flex-col max-h-[92vh] rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">

        {/* Sticky header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <AvatarDisplay src={editTarget.avatar} name={editTarget.username} size="sm" />
            <div>
              <p className="font-semibold">Edit {editTarget.username}</p>
              <p className="text-xs capitalize text-neutral-400">{editTarget.role}</p>
            </div>
          </div>
          <button onClick={closeEdit} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {updateError && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={15} /> {updateError}
            </div>
          )}

          <form id="edit-user-form" onSubmit={handleEditSubmit} className="grid gap-4 p-5 sm:grid-cols-2">

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Username</label>
              <input type="text" value={editForm.username} onChange={(e) => set('username', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400" />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Phone</label>
              <input type="text" value={editForm.phone} onChange={(e) => set('phone', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400" />
            </div>

            {/* DOB */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Date of Birth</label>
              <input type="date" value={editForm.dob} onChange={(e) => set('dob', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400" />
            </div>

            {/* Gender */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Gender</label>
              <select value={editForm.gender} onChange={(e) => set('gender', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400">
                <option value="">— select —</option>
                {['male', 'female', 'other'].map((g) => <option key={g} value={g} className="capitalize">{g}</option>)}
              </select>
            </div>

            {/* Role */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Role</label>
              <select
                value={editForm.role}
                onChange={(e) => set('role', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400">
                {['user', 'host', 'admin'].map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Status</label>
              <select value={editForm.status} onChange={(e) => set('status', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400">
                {['active', 'blocked', 'suspended'].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>

            {/* Screen Lock */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Screen Lock</label>
              <select value={editForm.activateScreenlock} onChange={(e) => set('activateScreenlock', e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400">
                <option value="">— select —</option>
                <option value="allowed">Allowed</option>
                <option value="not_allowed">Not Allowed</option>
              </select>
            </div>

            {/* Avatar URL */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Avatar URL</label>
              <input type="text" value={editForm.avatar} onChange={(e) => set('avatar', e.target.value)}
                placeholder="https://cdn.example.com/avatar.jpg"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400" />
            </div>

            {/* Mother Tongue */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                Mother Tongue
                <span className="ml-1 font-normal normal-case text-neutral-400">(multi-select)</span>
              </label>
              <MotherTongueSelect
                value={editForm.motherTongue}
                onChange={(v) => set('motherTongue', v)}
                languages={languages}
                loading={langsLoading}
              />
            </div>

            {/* Verified toggle */}
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Verified Account</p>
                <p className="text-xs text-neutral-400">Show verified badge on profile</p>
              </div>
              <div className="flex flex-shrink-0 items-center">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={editForm.isVerified}
                  onChange={() => set('isVerified', !editForm.isVerified)}
                />
                <div className={`relative h-7 w-12 rounded-full transition-colors ${editForm.isVerified ? 'bg-black' : 'bg-neutral-200'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${editForm.isVerified ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </div>
            </label>
          </form>
        </div>

        {/* Sticky footer */}
        <div className="flex flex-shrink-0 gap-3 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={closeEdit}
            className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium transition hover:bg-neutral-50">
            Cancel
          </button>
          <button type="submit" form="edit-user-form" disabled={updateLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-medium text-white transition hover:opacity-80 disabled:opacity-50">
            {updateLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            {updateLoading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── delete confirm modal ─────────────────────────────────────────────────────

const DeleteModal = ({ deleteTarget, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
        <Trash2 size={22} className="text-red-600" />
      </div>
      <h3 className="text-base font-bold">Delete @{deleteTarget.username}?</h3>
      <p className="mt-1.5 text-sm text-neutral-500">
        This permanently removes the user from the database. This action cannot be undone.
      </p>
      <div className="mt-5 flex gap-3">
        <button onClick={onCancel}
          className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
          Cancel
        </button>
        <button onClick={onConfirm}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700">
          <Trash2 size={14} /> Delete Forever
        </button>
      </div>
    </div>
  </div>
);

export default UserManagementSection;
