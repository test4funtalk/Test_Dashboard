import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, RefreshCw, Loader2, AlertCircle, Gift, PhoneCall,
  Coins, Clock, Banknote, TrendingUp, BarChart3, Star,
  ChevronLeft, ChevronRight, MessageSquare, Video, Phone,
  Search, X, Wifi, WifiOff, Eye, History,
} from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import api from '../../../services/api';
import { getLanguages } from '../../../services/languageService';
import LeaderboardAside from './LeaderboardAside';
import RatedHostsAside from './RatedHostsAside';

const fmtINR = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-IN');

const fmtDuration = (secs) => {
  if (!secs) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const getLangName = (l) => l?.name ?? l?.languageName ?? l?.language ?? String(l);

const SECTION_TABS = [
  { id: 'hosts',      label: 'Top Hosts',      Icon: Trophy    },
  { id: 'stats',      label: 'Platform Stats', Icon: BarChart3 },
  { id: 'ratings',    label: 'Ratings',        Icon: Star      },
  { id: 'onlineTime', label: 'Host Online Time', Icon: Clock   },
];

// ─── top hosts tab ─────────────────────────────────────────────────────────────

const PERIODS = [
  { id: 'today',     label: 'Today'      },
  { id: 'thisWeek',  label: 'This Week'  },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'allTime',   label: 'All Time'   },
];

const SUMMARY_TILES = [
  { key: 'totalCashEarned',    label: 'Total Cash Earned',    Icon: Banknote,   cash: true  },
  { key: 'callCashEarned',     label: 'Call Cash Earned',     Icon: PhoneCall,  cash: true  },
  { key: 'giftCashEarned',     label: 'Gift Cash Earned',     Icon: Gift,       cash: true  },
  { key: 'totalCoinsDeducted', label: 'Total Coins Deducted', Icon: Coins,      cash: false },
  { key: 'coinsDeducted',      label: 'Call Coins Deducted',  Icon: Coins,      cash: false },
  { key: 'giftCoinsDeducted',  label: 'Gift Coins Deducted',  Icon: Coins,      cash: false },
  { key: 'calls',              label: 'Total Calls',          Icon: PhoneCall,  cash: false },
  { key: 'totalSeconds',       label: 'Total Call Duration',  Icon: Clock,      cash: false, duration: true },
];

const RANK_STYLES = [
  'bg-amber-100 text-amber-700',
  'bg-neutral-200 text-neutral-600',
  'bg-orange-100 text-orange-700',
];

const TopHostsTab = () => {
  const [period, setPeriod]             = useState('thisMonth');
  const [motherTongue, setMotherTongue] = useState('');
  const [languages, setLanguages]       = useState([]);

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getLanguages().then(setLanguages).catch(() => {});
  }, []);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/earnings', {
        params: { period, ...(motherTongue && { motherTongue }) },
      });
      setData(data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }, [period, motherTongue]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const summary  = data?.earnings?.[period];
  const topHosts = data?.topHosts ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">

      <LeaderboardAside topHosts={topHosts} loading={loading && !data} error={error} period={period} />

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900">
            <Trophy size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">Platform Earnings & Top Hosts</p>
            <p className="text-xs text-neutral-400">Period-based earnings and the top 10 earning hosts</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  period === p.id ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-200/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <select
            value={motherTongue}
            onChange={(e) => setMotherTongue(e.target.value)}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
          >
            <option value="">All Mother Tongues</option>
            {languages.map((l) => {
              const name = getLangName(l);
              return name ? <option key={name} value={name}>{name}</option> : null;
            })}
          </select>

          <button
            onClick={fetchEarnings}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} /> {error}</span>
          <button onClick={fetchEarnings} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium">Retry</button>
        </div>
      )}

      {/* Earnings summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SUMMARY_TILES.map(({ key, label, Icon, cash, duration }) => {
          const raw = summary?.[key];
          const value = duration ? fmtDuration(raw) : cash ? fmtINR(raw) : fmtNum(raw);
          return (
            <div key={key} className="rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <p className={`text-lg font-black sm:text-xl ${cash ? 'text-green-700' : 'text-neutral-800'}`}>
                  {loading && !data ? '—' : value}
                </p>
                <Icon size={16} className="opacity-30" />
              </div>
              <p className="mt-0.5 text-xs font-medium text-neutral-400">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Top hosts table */}
      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
            <TrendingUp size={15} className="text-neutral-400" /> Top Earning Hosts
          </p>
          {motherTongue && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
              Filtered: {motherTongue}
            </span>
          )}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading leaderboard…
          </div>
        ) : topHosts.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">No earnings data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50">
                  {['Rank', 'Host', 'Call Cash', 'Gift Cash', 'Total Cash', 'Total Calls', 'Total Duration'].map((h) => (
                    <th key={h} className="border border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topHosts.map((h, i) => (
                  <tr key={h._id} className="transition-colors hover:bg-neutral-50">
                    <td className="border border-neutral-200 px-4 py-3 sm:px-5">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        RANK_STYLES[i] || 'bg-neutral-100 text-neutral-400'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <AvatarDisplay src={h.host?.avatar} name={h.host?.username} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-900">{h.host?.username || '—'}</p>
                          <p className="truncate text-[10px] text-neutral-300 font-mono">{h.host?._id ?? h._id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 sm:px-5">{fmtINR(h.callCash)}</td>
                    <td className="border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 sm:px-5">{fmtINR(h.giftCash)}</td>
                    <td className="border border-neutral-200 px-4 py-3 text-base font-bold text-green-700 sm:px-5">{fmtINR(h.totalCash)}</td>
                    <td className="border border-neutral-200 px-4 py-3 text-sm text-neutral-600 sm:px-5">{fmtNum(h.totalCalls)}</td>
                    <td className="border border-neutral-200 px-4 py-3 text-sm text-neutral-600 sm:px-5">{fmtDuration(h.totalSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── platform stats tab ─────────────────────────────────────────────────────────

const PlatformStatsTab = () => {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/stats');
      setStats(data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load platform stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const tiles = [
    { label: 'Total Calls',         value: fmtNum(stats?.calls?.total),  Icon: PhoneCall, cls: 'bg-neutral-900 text-white' },
    { label: 'Active Calls',        value: fmtNum(stats?.calls?.active), Icon: PhoneCall, cls: 'border border-neutral-200 bg-white' },
    { label: 'Ended Calls',         value: fmtNum(stats?.calls?.ended),  Icon: PhoneCall, cls: 'border border-neutral-200 bg-white' },
    { label: 'Total Coins Deducted', value: fmtNum(stats?.billing?.totalCoinsDeducted), Icon: Coins, cls: 'border border-neutral-200 bg-white' },
    { label: 'Total Cash Earned',   value: fmtINR(stats?.billing?.totalCashEarned), Icon: Banknote, cls: 'border border-green-200 bg-green-50' },
    { label: 'Total Gifts Sent',    value: fmtNum(stats?.gifts?.total), Icon: Gift, cls: 'border border-neutral-200 bg-white' },
    { label: 'Total Ratings',       value: fmtNum(stats?.ratings?.total), Icon: Star, cls: 'border border-neutral-200 bg-white' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900">
            <BarChart3 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">System-Wide Stats</p>
            <p className="text-xs text-neutral-400">High-level counters across the whole platform</p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} /> {error}</span>
          <button onClick={fetchStats} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(({ label, value, Icon, cls }) => (
          <div key={label} className={`rounded-2xl p-3 sm:p-4 ${cls}`}>
            <div className="flex items-start justify-between">
              <p className="text-lg font-black sm:text-xl">{loading && !stats ? '—' : value}</p>
              <Icon size={16} className="opacity-40" />
            </div>
            <p className="mt-0.5 text-xs font-medium opacity-70">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── ratings tab ────────────────────────────────────────────────────────────────

const SCORE_OPTIONS = [
  { value: '', label: 'All Scores' },
  { value: '5', label: '5 Stars' },
  { value: '4', label: '4 Stars' },
  { value: '3', label: '3 Stars' },
  { value: '2', label: '2 Stars' },
  { value: '1', label: '1 Star'  },
];

const ROLE_OPTIONS = [
  { value: '',     label: 'All Roles' },
  { value: 'user', label: 'User'      },
  { value: 'host', label: 'Host'      },
];

const StarRow = ({ score }) => (
  <span className="flex items-center gap-0.5 text-amber-500">
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={12} className={i < (score ?? 0) ? 'fill-amber-400' : 'fill-none text-neutral-200'} />
    ))}
  </span>
);

// Hosts are ranked across the whole platform — pull every host-targeted rating
// (paginating in large batches, capped for safety) and aggregate client-side,
// since the API only exposes individual rating records, not a per-host rollup.
const MAX_HOST_RATING_PAGES = 30;
const HOST_RATING_PAGE_SIZE = 100;

const RatingsTab = () => {
  const [hostRanking, setHostRanking] = useState([]);
  const [aggLoading, setAggLoading]   = useState(false);
  const [aggError, setAggError]       = useState(null);

  const fetchHostRanking = useCallback(async () => {
    setAggLoading(true);
    setAggError(null);
    try {
      const byHost = new Map();
      let page = 1;
      let totalPages = 1;
      do {
        const { data } = await api.get('/api/admin/ratings', {
          params: { page, limit: HOST_RATING_PAGE_SIZE, rateeRole: 'host' },
        });
        const rows = Array.isArray(data?.data) ? data.data : [];
        totalPages = data?.pagination?.pages ?? 1;
        rows.forEach((r) => {
          const id = r.rateeId?._id ?? r.rateeId;
          if (!id || !r.score) return;
          const entry = byHost.get(id) || { host: r.rateeId, total: 0, count: 0 };
          entry.total += r.score;
          entry.count += 1;
          entry.host = r.rateeId;
          byHost.set(id, entry);
        });
        page += 1;
      } while (page <= totalPages && page <= MAX_HOST_RATING_PAGES);

      const ranked = Array.from(byHost.values())
        .map((e) => ({ host: e.host, avgRating: e.total / e.count, count: e.count }))
        .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count);

      setHostRanking(ranked);
    } catch (err) {
      setAggError(err.response?.data?.message || 'Failed to load host ratings');
    } finally {
      setAggLoading(false);
    }
  }, []);

  useEffect(() => { fetchHostRanking(); }, [fetchHostRanking]);

  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [score, setScore]         = useState('');
  const [raterRole, setRaterRole] = useState('');
  const [rateeRole, setRateeRole] = useState('');

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/ratings', {
        params: {
          page, limit: 15,
          ...(score     && { score }),
          ...(raterRole && { raterRole }),
          ...(rateeRole && { rateeRole }),
        },
      });
      const list       = Array.isArray(data?.data) ? data.data : [];
      const pagination = data?.pagination ?? {};
      setRatings(list);
      setPages(pagination.pages ?? 1);
      setTotal(pagination.total ?? list.length);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [page, score, raterRole, rateeRole]);

  useEffect(() => { fetchRatings(); }, [fetchRatings]);

  const onFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const pageNumbers = () => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= pages - 2) return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      <RatedHostsAside hosts={hostRanking} loading={aggLoading} error={aggError} />

      {/* Full host ranking */}
      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
            <Star size={15} className="text-neutral-400" /> All Hosts by Rating
          </p>
          <button onClick={fetchHostRanking}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800">
            <RefreshCw size={13} className={aggLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {aggLoading && hostRanking.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Crunching ratings…
          </div>
        ) : hostRanking.length === 0 ? (
          <div className="py-16 text-center">
            <Star size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">No host ratings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Rank', 'Host', 'Average Rating', 'Ratings'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {hostRanking.map((entry, i) => (
                  <tr key={entry.host?._id || i} className="transition-colors hover:bg-neutral-50/70">
                    <td className="px-4 py-3 sm:px-5">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        RANK_STYLES[i] || 'bg-neutral-100 text-neutral-400'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <AvatarDisplay src={entry.host?.avatar} name={entry.host?.username} size="sm" />
                        <p className="truncate font-medium text-neutral-900">{entry.host?.username || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                        <Star size={13} className="fill-current" /> {entry.avgRating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600 sm:px-5">{entry.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl bg-neutral-900 p-3 text-white sm:rounded-2xl sm:p-4">
          <div className="flex items-start justify-between">
            <p className="text-2xl font-black sm:text-3xl">{total}</p>
            <Star size={17} className="opacity-50" />
          </div>
          <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1">Total Ratings</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:rounded-2xl sm:p-4 sm:col-span-2">
          <div className="flex h-full flex-wrap items-center gap-2">
            <select value={score} onChange={onFilterChange(setScore)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400">
              {SCORE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={raterRole} onChange={onFilterChange(setRaterRole)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400">
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>Rater: {o.label}</option>)}
            </select>
            <select value={rateeRole} onChange={onFilterChange(setRateeRole)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400">
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>Ratee: {o.label}</option>)}
            </select>
            <button onClick={fetchRatings}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white">
        {error && (
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-6 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading ratings…
          </div>
        ) : ratings.length === 0 ? (
          <div className="py-16 text-center">
            <Star size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">No ratings match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Rater', 'Ratee', 'Score', 'Comment', 'Call', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {ratings.map((r) => {
                  const CallIcon = r.callId?.callType === 'video' ? Video : Phone;
                  return (
                    <tr key={r._id} className="transition-colors hover:bg-neutral-50/70">
                      <td className="px-4 py-3 sm:px-5">
                        <p className="truncate font-medium text-neutral-900">{r.raterId?.username || '—'}</p>
                        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-500">{r.raterRole}</span>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <p className="truncate font-medium text-neutral-900">{r.rateeId?.username || '—'}</p>
                        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-500">{r.rateeRole}</span>
                      </td>
                      <td className="px-4 py-3 sm:px-5"><StarRow score={r.score} /></td>
                      <td className="max-w-[220px] px-4 py-3 text-xs text-neutral-500 sm:px-5">
                        {r.comment
                          ? <span className="flex items-start gap-1.5"><MessageSquare size={11} className="mt-0.5 flex-shrink-0" /><span className="truncate">{r.comment}</span></span>
                          : <span className="text-neutral-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap sm:px-5">
                        <span className="flex items-center gap-1.5">
                          <CallIcon size={12} /> {fmtDuration(r.callId?.duration)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap sm:px-5">{fmtDateTime(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && ratings.length > 0 && pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
            <p className="text-xs text-neutral-400">{total} total · page {page} of {pages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              {pageNumbers().map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition ${
                    n === page ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}>
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

// ─── host online time tab ───────────────────────────────────────────────────────

const ONLINE_TIME_PERIODS = [
  { id: 'today',     label: 'Today'      },
  { id: 'thisweek',  label: 'This Week'  },
  { id: 'thismonth', label: 'This Month' },
  { id: 'all',       label: 'All Time'   },
];

const StatusDot = ({ status, lastSeen }) => (
  <span className="flex items-center gap-1.5 text-xs">
    {status === 'online' ? (
      <span className="flex items-center gap-1 font-medium text-green-600"><Wifi size={11} /> Online</span>
    ) : (
      <span className="flex items-center gap-1 text-neutral-400"><WifiOff size={11} /> {fmtDateTime(lastSeen)}</span>
    )}
  </span>
);

const MotherTongueChips = ({ tongues }) => (
  !tongues?.length ? <span className="text-neutral-300">—</span> : (
    <div className="flex flex-wrap gap-1">
      {tongues.slice(0, 3).map((t) => (
        <span key={t} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">{t}</span>
      ))}
      {tongues.length > 3 && <span className="text-[10px] text-neutral-300">+{tongues.length - 3}</span>}
    </div>
  )
);

const HostOnlineTimeDetailModal = ({ hostId, period, onClose }) => {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setLoading(true);
    setError(null);
    api.get(`/api/host-online-time/admin/host/${hostId}`, { params: { period } })
      .then(({ data }) => { if (!cancelled) setDetail(data?.data ?? null); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Failed to load host online time'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hostId, period]);

  const host = detail?.host;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full flex-col rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h3 className="text-base font-bold">Host Online Time</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
              <Loader2 size={20} className="animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              <AlertCircle size={14} /> {error}
            </div>
          ) : detail && (
            <div className="space-y-5">
              {/* Host profile */}
              <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                <AvatarDisplay src={host?.avatar} name={host?.username} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{host?.username || '—'}</p>
                  <StatusDot status={host?.userCurrentStatus} lastSeen={host?.lastSeen} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-400">Member Since</p>
                  <p className="text-xs font-medium text-neutral-600">{fmtDateTime(host?.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">Mother Tongue</p>
                <MotherTongueChips tongues={host?.motherTongue} />
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-neutral-900 p-3 text-white">
                  <p className="text-lg font-black sm:text-xl">{detail.totalFormatted ?? '—'}</p>
                  <p className="mt-0.5 text-xs opacity-70">Online Time</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <p className="text-lg font-black text-neutral-800 sm:text-xl">{fmtNum(detail.sessionCount)}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">Sessions</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <p className="text-lg font-black capitalize text-neutral-800 sm:text-xl">{detail.period ?? '—'}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">Period</p>
                </div>
              </div>

              {/* Session history */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  <History size={12} /> Session History
                </p>
                {detail.sessions?.length ? (
                  <div className="overflow-hidden rounded-xl border border-neutral-100">
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-neutral-50">
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
      </div>
    </div>
  );
};

const HostOnlineTimeTab = () => {
  const [hosts, setHosts]           = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const [period, setPeriod]         = useState('thismonth');
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDs]    = useState('');
  const [page, setPage]             = useState(1);

  const [viewHostId, setViewHostId] = useState(null);

  const fetchHosts = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/host-online-time/admin/all', {
        params: { period, page: targetPage, limit: 20, ...(debouncedSearch && { search: debouncedSearch }) },
      });
      const d  = data?.data ?? {};
      const pg = d.pagination ?? {};
      setHosts(Array.isArray(d.hosts) ? d.hosts : []);
      setPagination({
        total: pg.total ?? 0,
        page:  pg.page  ?? targetPage,
        limit: pg.limit ?? 20,
        pages: pg.pages ?? 1,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load host online time');
    } finally {
      setLoading(false);
    }
  }, [period, debouncedSearch]);

  useEffect(() => { fetchHosts(1); setPage(1); }, [fetchHosts]);

  useEffect(() => {
    const t = setTimeout(() => setDs(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const onPage = (n) => { setPage(n); fetchHosts(n); };

  const pageNumbers = () => {
    const { pages } = pagination;
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= pages - 2) return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
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
          <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
            {ONLINE_TIME_PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  period === p.id ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-200/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchHosts(page)}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} /> {error}</span>
          <button onClick={() => fetchHosts(page)} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-neutral-900 p-3 text-white sm:rounded-2xl sm:p-4">
          <div className="flex items-start justify-between">
            <p className="text-2xl font-black sm:text-3xl">{pagination.total}</p>
            <Clock size={17} className="opacity-50" />
          </div>
          <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1">Hosts Tracked</p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white">
        {loading && hosts.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading online time…
          </div>
        ) : hosts.length === 0 ? (
          <div className="py-16 text-center">
            <Clock size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {search ? 'No hosts match your search' : 'No online time recorded for this period'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Rank', 'Host', 'Mother Tongue', 'Status', 'Online Time', 'Sessions', 'Actions'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5 ${h === 'Actions' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {hosts.map((entry, i) => {
                  const h = entry.host;
                  const rank = (pagination.page - 1) * pagination.limit + i + 1;
                  return (
                    <tr key={h?._id || i} className="transition-colors hover:bg-neutral-50/70">
                      <td className="px-4 py-3 sm:px-5">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          RANK_STYLES[rank - 1] || 'bg-neutral-100 text-neutral-400'
                        }`}>
                          {rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-2.5">
                          <AvatarDisplay src={h?.avatar} name={h?.username} size="sm" />
                          <p className="truncate font-medium text-neutral-900">{h?.username || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-5"><MotherTongueChips tongues={h?.motherTongue} /></td>
                      <td className="px-4 py-3 sm:px-5"><StatusDot status={h?.userCurrentStatus} lastSeen={h?.lastSeen} /></td>
                      <td className="px-4 py-3 text-sm font-bold text-neutral-800 sm:px-5">{entry.totalFormatted}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600 sm:px-5">{fmtNum(entry.sessionCount)}</td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        <button
                          onClick={() => setViewHostId(h?._id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50"
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && hosts.length > 0 && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
            <p className="text-xs text-neutral-400">{pagination.total} total · page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => onPage(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              {pageNumbers().map((n) => (
                <button key={n} onClick={() => onPage(n)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition ${
                    n === pagination.page ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}>
                  {n}
                </button>
              ))}
              <button onClick={() => onPage(Math.min(pagination.pages, pagination.page + 1))} disabled={pagination.page >= pagination.pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {viewHostId && (
        <HostOnlineTimeDetailModal hostId={viewHostId} period={period} onClose={() => setViewHostId(null)} />
      )}
    </div>
  );
};

// ─── main section ─────────────────────────────────────────────────────────────

const LeaderboardSection = () => {
  const [tab, setTab] = useState('hosts');

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-200">
        {SECTION_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`-mb-px flex flex-shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === id
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'hosts'   && <TopHostsTab />}
      {tab === 'stats'   && <PlatformStatsTab />}
      {tab === 'ratings' && <RatingsTab />}
      {tab === 'onlineTime' && <HostOnlineTimeTab />}
    </div>
  );
};

export default LeaderboardSection;
