import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, RefreshCw, Loader2, AlertCircle, Gift, PhoneCall,
  Coins, Clock, Banknote, TrendingUp, TrendingDown, BarChart3, Star,
  ChevronLeft, ChevronRight, MessageSquare, Video, Phone,
  Search, X, Wifi, WifiOff, Eye, History,
  IndianRupee, ArrowUpRight, ArrowDownRight, Wallet, ShoppingBag,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
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

// grayscale palette + decorative barcode pattern shared by the Platform Stats tab
const BAR_COLORS  = ['#171717', '#404040', '#525252', '#666666', '#737373', '#8a8a8a', '#a3a3a3', '#bdbdbd'];
const BAR_HEIGHTS = [45, 90, 60, 100, 55, 80, 40, 95, 65, 85, 50, 75, 40, 100, 60, 90];
const BAR_COUNT   = 56;

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
  { key: 'totalCashEarned',    label: 'Total Cash Earned',    Icon: Banknote,   cash: true,  caption: 'All cash earned by hosts'  },
  { key: 'callCashEarned',     label: 'Call Cash Earned',     Icon: PhoneCall,  cash: true,  caption: 'Cash earned from calls'    },
  { key: 'giftCashEarned',     label: 'Gift Cash Earned',     Icon: Gift,       cash: true,  caption: 'Cash earned from gifts'    },
  { key: 'totalCoinsDeducted', label: 'Total Coins Deducted', Icon: Coins,      cash: false, caption: 'Coins deducted from users' },
  { key: 'coinsDeducted',      label: 'Call Coins Deducted',  Icon: Coins,      cash: false, caption: 'Coins deducted for calls'  },
  { key: 'giftCoinsDeducted',  label: 'Gift Coins Deducted',  Icon: Coins,      cash: false, caption: 'Coins deducted for gifts'  },
  { key: 'calls',              label: 'Total Calls',          Icon: PhoneCall,  cash: false, caption: 'Calls in this period'      },
  { key: 'totalSeconds',       label: 'Total Call Duration',  Icon: Clock,      cash: false, duration: true, caption: 'Cumulative call time' },
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

      {/* Earnings summary tiles — styled like the Platform Stats overview KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
        {(() => {
          const maxAbs = Math.max(...SUMMARY_TILES.map(({ key }) => Math.abs(Number(summary?.[key] ?? 0))), 1);
          return SUMMARY_TILES.map(({ key, label, Icon, cash, duration, caption }) => {
            const raw = summary?.[key];
            const value = duration ? fmtDuration(raw) : cash ? fmtINR(raw) : fmtNum(raw);
            const pct = Math.round((Math.abs(Number(raw ?? 0)) / maxAbs) * 100);
            const filledBars = Math.round((pct / 100) * BAR_COUNT);
            return (
              <div key={key} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-neutral-700">{label}</span>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-black">
                    <Icon size={15} />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-2xl font-bold sm:text-3xl ${cash ? 'text-green-700' : 'text-neutral-900'}`}>
                    {loading && !data ? '—' : value}
                  </span>
                </div>
                <div className="mt-3 text-xs text-neutral-400">
                  <span className="truncate">{caption}</span>
                </div>
                <div className="mt-2.5 flex h-6 items-end gap-[2px] overflow-hidden">
                  {Array.from({ length: BAR_COUNT }).map((_, i) => (
                    <div
                      key={i}
                      className={`min-w-0 flex-1 rounded-full ${i < filledBars ? 'bg-neutral-800' : 'bg-neutral-200'}`}
                      style={{ height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}%` }}
                    />
                  ))}
                </div>
              </div>
            );
          });
        })()}
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

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

const localDayKey   = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const localMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

const getStatsRange = (period) => {
  const now = new Date();
  if (period === 'today') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start: s, end: new Date(s.getTime() + 86400000 - 1), gran: 'day' };
  }
  if (period === 'thisWeek') {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
    return { start: s, end: now, gran: 'day' };
  }
  if (period === 'thisMonth') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, gran: 'day' };
  }
  return { start: new Date(2020, 0, 1), end: now, gran: 'month' }; // allTime
};

const buildStatsBuckets = (start, end, gran) => {
  const keys = [];
  if (gran === 'day') {
    const d = new Date(start); d.setHours(0, 0, 0, 0);
    while (d <= end) {
      keys.push({ key: localDayKey(d), label: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) });
      d.setDate(d.getDate() + 1);
    }
  } else {
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= end) {
      keys.push({ key: localMonthKey(d), label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) });
      d.setMonth(d.getMonth() + 1);
    }
  }
  return keys;
};

const statsBucketKey = (date, gran) => {
  const d = new Date(date);
  return gran === 'day' ? localDayKey(d) : localMonthKey(d);
};

const PlatformStatsTab = () => {
  const [period, setPeriod]   = useState('thisMonth');

  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [chartData,    setChartData]    = useState([]);
  const [totals,       setTotals]       = useState({ revenue: 0, expense: 0, income: 0, coinsPurchased: 0 });
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError,   setChartError]   = useState(null);

  const [topPackages, setTopPackages] = useState([]);
  const [pkgLoading,  setPkgLoading]  = useState(false);

  const [earnings,       setEarnings]       = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(false);

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

  // ── Treasury — revenue (purchases) vs expense (host payouts) over the period ──
  const fetchTreasury = useCallback(async () => {
    setChartLoading(true);
    setChartError(null);
    try {
      const { start, end, gran } = getStatsRange(period);
      const keys = buildStatsBuckets(start, end, gran);
      const map  = new Map(keys.map((b) => [b.key, { ...b, revenue: 0, expense: 0 }]));
      let coinsPurchased = 0;

      let p1 = 1, t1 = 1;
      while (p1 <= MAX_PAGES && p1 <= t1) {
        const { data } = await api.get('/api/purchase/admin/all', { params: { page: p1, limit: PAGE_SIZE, status: 'success' } });
        const rows = Array.isArray(data?.data) ? data.data : [];
        t1 = data?.pagination?.pages ?? 1;
        rows.forEach((r) => {
          const d = new Date(r.createdAt);
          if (d < start || d > end) return;
          const b = map.get(statsBucketKey(d, gran));
          if (b) b.revenue += Number(r.amount) || 0;
          coinsPurchased += Number(r.coins) || 0;
        });
        if (rows.length === 0) break;
        p1++;
      }

      let p2 = 1, t2 = 1;
      while (p2 <= MAX_PAGES && p2 <= t2) {
        const { data } = await api.get('/api/admin/checkouts', { params: { page: p2, limit: PAGE_SIZE, status: 'approved' } });
        const rows = Array.isArray(data?.data) ? data.data : [];
        t2 = data?.pagination?.pages ?? 1;
        rows.forEach((r) => {
          const when = new Date(r.processedAt ?? r.createdAt);
          if (when < start || when > end) return;
          const b = map.get(statsBucketKey(when, gran));
          if (b) b.expense += Number(r.netAmount) || 0;
        });
        if (rows.length === 0) break;
        p2++;
      }

      const series   = keys.map((b) => { const bk = map.get(b.key); return { ...bk, income: bk.revenue - bk.expense }; });
      const totalRev = series.reduce((s, b) => s + b.revenue, 0);
      const totalExp = series.reduce((s, b) => s + b.expense, 0);
      setChartData(series);
      setTotals({ revenue: totalRev, expense: totalExp, income: totalRev - totalExp, coinsPurchased });
    } catch (err) {
      setChartError(err.response?.data?.message || err.message || 'Failed to load treasury data');
    } finally {
      setChartLoading(false);
    }
  }, [period]);

  // ── Host earnings summary (cash + coins attributed to hosts) for the same period ──
  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const { data } = await api.get('/api/admin/earnings', { params: { period } });
      setEarnings(data?.data?.earnings?.[period] ?? null);
    } catch { /* silent */ } finally {
      setEarningsLoading(false);
    }
  }, [period]);

  // ── Top-selling packages for the same period ──────────────────────────────
  const fetchTopPackages = useCallback(async () => {
    setPkgLoading(true);
    try {
      const params = { limit: 8 };
      if (period === 'today') params.period = 'today';
      else if (period === 'thisWeek') params.period = 'week';
      else if (period === 'thisMonth') params.period = 'month';
      const { data } = await api.get('/api/packages/admin/topSelling', { params });
      const rows = Array.isArray(data?.data) ? data.data : [];
      setTopPackages(rows
        .map((r) => ({
          name:    r.name ?? 'Unknown Package',
          count:   r.sales   ?? 0,
          revenue: r.revenue ?? 0,
          coins:   r.coins   ?? 0,
          price:   r.price   ?? 0,
        }))
        .sort((a, b) => b.revenue - a.revenue));
    } catch { /* silent */ } finally {
      setPkgLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchTreasury(); fetchTopPackages(); fetchEarnings(); }, [fetchTreasury, fetchTopPackages, fetchEarnings]);

  const calls   = stats?.calls   ?? {};
  const billing = stats?.billing ?? {};
  const gifts   = stats?.gifts   ?? {};
  const ratings = stats?.ratings ?? {};
  const hasChart = chartData.some((d) => d.revenue !== 0 || d.expense !== 0);
  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? 'This Month';

  const dash = (v) => (loading && !stats ? '—' : v);

  const refreshAll = () => { fetchStats(); fetchTreasury(); fetchTopPackages(); fetchEarnings(); };

  // Platform Insights donut — calls / gifts / ratings share, monochrome
  const pieTotal = (calls.total ?? 0) + (gifts.total ?? 0) + (ratings.total ?? 0);
  const pieData = [
    { name: 'Total Calls',   value: calls.total   ?? 0, color: '#171717' },
    { name: 'Gifts Sent',    value: gifts.total   ?? 0, color: '#a3a3a3' },
    { name: 'Total Ratings', value: ratings.total ?? 0, color: '#525252' },
  ].filter((d) => d.value > 0);
  const pieLead = pieData.length ? [...pieData].sort((a, b) => b.value - a.value)[0] : null;
  const pieLeadPct = pieLead && pieTotal > 0 ? ((pieLead.value / pieTotal) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header + period filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Platform Status</h2>
          <p className="text-xs text-neutral-400">Entire platform revenue, packages, coins & engagement — {periodLabel}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  period === p.id ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-200/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={refreshAll}
            disabled={loading || chartLoading || pkgLoading}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-40"
          >
            <RefreshCw size={13} className={(loading || chartLoading || pkgLoading) ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} /> {error}</span>
          <button onClick={fetchStats} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium">Retry</button>
        </div>
      )}

      {/* ── Row 1: 4 KPI hero cards — black & white, barcode mini-chart ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(() => {
          const rawBalance  = billing.totalCashEarned ?? 0;
          const rawIncoming = totals.revenue ?? 0;
          const rawOutgoing = totals.expense ?? 0;
          const rawNet      = totals.income ?? 0;
          const maxAbs = Math.max(Math.abs(rawBalance), Math.abs(rawIncoming), Math.abs(rawOutgoing), Math.abs(rawNet), 1);

          const cards = [
            { label: 'Total Balance',      raw: rawBalance,  value: dash(fmtINR(rawBalance)),  caption: 'All-time revenue',  Icon: IndianRupee,   trend: 'up' },
            { label: `Incoming`,           raw: rawIncoming, value: chartLoading && chartData.length === 0 ? '—' : fmtINR(rawIncoming), caption: 'Purchase revenue', Icon: ArrowUpRight, trend: 'up' },
            { label: `Outgoing`,           raw: rawOutgoing, value: chartLoading && chartData.length === 0 ? '—' : fmtINR(rawOutgoing), caption: 'Host payouts',     Icon: ArrowDownRight, trend: 'down' },
            { label: 'Net Cash Flow',      raw: rawNet,      value: chartLoading && chartData.length === 0 ? '—' : fmtINR(rawNet),      caption: rawNet >= 0 ? 'Positive flow' : 'Negative flow', Icon: Wallet, trend: rawNet >= 0 ? 'up' : 'down' },
          ];

          return cards.map(({ label, raw, value, caption, Icon, trend }) => {
            const pct = Math.round((Math.abs(raw) / maxAbs) * 100);
            const filledBars = Math.round((pct / 100) * BAR_COUNT);
            return (
              <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-neutral-700">{label}</span>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-black">
                    <Icon size={15} />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-neutral-900 sm:text-3xl">{value}</span>
                  {trend === 'up'
                    ? <span className="text-green-600"><TrendingUp size={20} /></span>
                    : <span className="text-red-500"><TrendingDown size={20} /></span>}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                  <span className="truncate">{caption}</span>
                  <span className="flex-shrink-0 font-semibold text-neutral-500">{pct}% of total</span>
                </div>
                <div className="mt-2.5 flex h-6 items-end gap-[2px] overflow-hidden">
                  {Array.from({ length: BAR_COUNT }).map((_, i) => (
                    <div
                      key={i}
                      className={`min-w-0 flex-1 rounded-full ${i < filledBars ? 'bg-neutral-800' : 'bg-neutral-200'}`}
                      style={{ height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}%` }}
                    />
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* ── Row 1b: Coins & Cash — purchased by users vs. earned by hosts ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(() => {
          const rawCoinsPurchased = totals.coinsPurchased ?? 0;
          const rawCashSpent      = totals.revenue ?? 0;
          const rawCoinsHost      = earnings?.totalCoinsDeducted ?? 0;
          const rawCashHost       = earnings?.totalCashEarned ?? 0;
          const rawGiftCoins      = earnings?.giftCoinsDeducted ?? 0;
          const rawGiftCash       = earnings?.giftCashEarned ?? 0;
          const maxAbs = Math.max(rawCoinsPurchased, rawCashSpent, rawCoinsHost, rawCashHost, rawGiftCoins, rawGiftCash, 1);
          const busy = chartLoading || earningsLoading;

          const cards = [
            { label: 'Total Coins Purchased', raw: rawCoinsPurchased, value: busy && chartData.length === 0 ? '—' : fmtNum(rawCoinsPurchased), caption: 'Coins bought via packages', Icon: Coins },
            { label: 'Total Cash User Spent', raw: rawCashSpent,      value: busy && chartData.length === 0 ? '—' : fmtINR(rawCashSpent),      caption: 'Cash spent on packages',  Icon: IndianRupee },
            { label: 'Coins Host Got',        raw: rawCoinsHost,      value: busy && !earnings ? '—' : fmtNum(rawCoinsHost),                    caption: 'Coins consumed for hosts', Icon: Coins },
            { label: 'Cash Host Got',         raw: rawCashHost,       value: busy && !earnings ? '—' : fmtINR(rawCashHost),                     caption: 'Calls + gift cash earned', Icon: Banknote },
            { label: 'Gift Coins',            raw: rawGiftCoins,      value: busy && !earnings ? '—' : fmtNum(rawGiftCoins),                    caption: 'Coins spent on gifts',    Icon: Gift },
            { label: 'Cash Earned From Gift', raw: rawGiftCash,       value: busy && !earnings ? '—' : fmtINR(rawGiftCash),                     caption: 'Host cash from gifts',     Icon: Gift },
          ];

          return cards.map(({ label, raw, value, caption, Icon }) => {
            const pct = Math.round((raw / maxAbs) * 100);
            const filledBars = Math.round((pct / 100) * BAR_COUNT);
            return (
              <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-neutral-700">{label}</span>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-black">
                    <Icon size={15} />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-neutral-900 sm:text-3xl">{value}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                  <span className="truncate">{caption}</span>
                  <span className="flex-shrink-0 font-semibold text-neutral-500">{pct}% of total</span>
                </div>
                <div className="mt-2.5 flex h-6 items-end gap-[2px] overflow-hidden">
                  {Array.from({ length: BAR_COUNT }).map((_, i) => (
                    <div
                      key={i}
                      className={`min-w-0 flex-1 rounded-full ${i < filledBars ? 'bg-neutral-800' : 'bg-neutral-200'}`}
                      style={{ height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}%` }}
                    />
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* ── Row 2: Treasury Overview area chart ── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-black text-neutral-900">Treasury Overview</p>
            <p className="mt-0.5 text-xs text-neutral-400">{periodLabel}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
          </span>
        </div>

        {chartError && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertCircle size={13} /> {chartError}
            <button onClick={fetchTreasury} className="ml-auto font-medium underline">Retry</button>
          </div>
        )}

        <div style={{ height: 320 }} className="w-full">
          {chartLoading && chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-neutral-300">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : !hasChart ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-300">
              <BarChart3 size={30} />
              <p className="text-xs">No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="lbGradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#171717" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#171717" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lbGradExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a3a3a3" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a3a3a3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#a3a3a3' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}
                  formatter={(v) => fmtINR(v)}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#171717" strokeWidth={2.5} fill="url(#lbGradRev)" dot={{ r: 3, strokeWidth: 0, fill: '#171717' }} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#a3a3a3" strokeWidth={1.5} fill="url(#lbGradExp)" dot={{ r: 3, strokeWidth: 0, fill: '#a3a3a3' }} activeDot={{ r: 3, strokeWidth: 0 }} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 border-t border-neutral-50 pt-3">
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: '#171717' }} /> Revenue
          </span>
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: '#a3a3a3' }} /> Expense
          </span>
          <button
            onClick={fetchTreasury}
            disabled={chartLoading}
            className="ml-auto flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-700 disabled:opacity-40"
          >
            <RefreshCw size={10} className={chartLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Row 3: Platform Insights donut  +  Platform Stats barcode ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Platform Insights — monochrome donut */}
        <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-neutral-900">Platform Insights</p>
              <p className="text-[10px] text-neutral-400">Calls · Gifts · Ratings share</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
            </span>
          </div>

          {loading && !stats ? (
            <div className="flex flex-1 items-center justify-center py-12 text-neutral-300">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : pieData.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-neutral-300">
              <BarChart3 size={26} />
              <p className="text-xs">No data yet</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="relative flex-1" style={{ minHeight: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={96}
                      paddingAngle={3}
                      cornerRadius={8}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        const pct = pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0;
                        return (
                          <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-xl text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="font-semibold text-neutral-800">{d.name}</span>
                            </div>
                            <p className="mt-0.5 text-neutral-500">{fmtNum(d.value)} · {pct}%</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {pieLead && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-black text-neutral-900">{pieLeadPct}%</p>
                    <p className="text-xs font-medium text-neutral-400">{pieLead.name}</p>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1.5 border-t border-neutral-50 pt-3">
                {pieData.map((d) => {
                  const pct = pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-neutral-500">{d.name}</span>
                      <span className="text-[11px] font-bold text-neutral-800">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Platform Stats — barcode rows, filled relative to the largest stat */}
        <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-neutral-900">Platform Stats</p>
              <p className="text-[10px] text-neutral-400">All-time totals</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
            </span>
          </div>

          {loading && !stats ? (
            <div className="flex flex-1 items-center justify-center py-12 text-neutral-300">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (() => {
            const statRows = [
              { label: 'Total Calls',    raw: calls.total   ?? 0 },
              { label: 'Active Now',     raw: calls.active  ?? 0 },
              { label: 'Total Gifts',    raw: gifts.total   ?? 0 },
              { label: 'Total Ratings',  raw: ratings.total ?? 0 },
              { label: 'Coins Deducted', raw: billing.totalCoinsDeducted ?? 0 },
            ];
            const maxRaw = Math.max(...statRows.map((s) => s.raw), 1);

            return (
              <div className="flex flex-1 flex-col justify-between gap-3">
                {statRows.map(({ label, raw }) => {
                  const pct = Math.round((raw / maxRaw) * 100);
                  const filledBars = Math.round((pct / 100) * BAR_COUNT);
                  return (
                    <div key={label} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-medium text-neutral-500">{label}</span>
                        <span className="flex-shrink-0 text-sm font-bold text-neutral-900">{fmtNum(raw)}</span>
                      </div>
                      <div className="mt-2.5 flex h-6 items-end gap-[2px] overflow-hidden">
                        {Array.from({ length: BAR_COUNT }).map((_, i) => (
                          <div
                            key={i}
                            className={`min-w-0 flex-1 rounded-full ${i < filledBars ? 'bg-neutral-800' : 'bg-neutral-200'}`}
                            style={{ height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Row 4: Top Selling Packages — grayscale bar chart ── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-neutral-900">Top Selling Packages</p>
            <p className="text-xs text-neutral-400">Ranked by revenue generated · {periodLabel}</p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100">
            <ShoppingBag size={13} className="text-neutral-700" />
          </div>
        </div>

        {pkgLoading && topPackages.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-neutral-300">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : topPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-neutral-300">
            <BarChart3 size={28} />
            <p className="text-xs">No package data available</p>
          </div>
        ) : (
          <>
            <div style={{ height: 260 }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPackages} margin={{ top: 24, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#a3a3a3' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.length > 10 ? v.slice(0, 9) + '…' : v}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#a3a3a3' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tickFormatter={(v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#f5f5f5', radius: 6 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-xl text-xs">
                          <p className="mb-1.5 font-bold text-neutral-800">{d.name}</p>
                          <div className="space-y-0.5 text-neutral-600">
                            <p>Price: <span className="font-semibold text-neutral-900">{fmtINR(d.price)}</span></p>
                            <p>Revenue: <span className="font-semibold text-neutral-900">{fmtINR(d.revenue)}</span></p>
                            <p>Sales: <span className="font-semibold text-neutral-900">{fmtNum(d.count)}</span></p>
                            {d.coins > 0 && <p>Coins: <span className="font-semibold text-neutral-900">{fmtNum(d.coins)}</span></p>}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                    label={({ x, y, width, index }) => (
                      <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="#404040">
                        {fmtINR(topPackages[index]?.price ?? 0)}
                      </text>
                    )}
                  >
                    {topPackages.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-neutral-50 pt-3">
              <span className="text-[11px] text-neutral-400">Total revenue from top packages:</span>
              <span className="ml-auto text-xs font-bold text-neutral-800">
                {fmtINR(topPackages.reduce((s, p) => s + p.revenue, 0))}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Row 5: Call Details · Billing · Engagement (monochrome) ── */}
      <div className="grid gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <PhoneCall size={12} /> Call Details
          </p>
          <div className="space-y-2.5">
            {[
              { label: 'Ended',     val: calls.ended     },
              { label: 'Active',    val: calls.active    },
              { label: 'Missed',    val: calls.missed    },
              { label: 'Rejected',  val: calls.rejected  },
              { label: 'Cancelled', val: calls.cancelled },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-neutral-400" /> {label}
                </span>
                <span className="text-xs font-semibold text-neutral-800">{dash(fmtNum(val))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <Banknote size={12} /> Billing
          </p>
          <div className="space-y-3">
            <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
              <p className="text-[10px] font-medium text-neutral-500 mb-0.5">Cash Earned</p>
              <p className="text-lg font-black text-neutral-900">{dash(fmtINR(billing.totalCashEarned))}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
              <p className="text-[10px] font-medium text-neutral-500 mb-0.5">Coins Deducted</p>
              <p className="text-lg font-black text-neutral-900">{dash(fmtNum(billing.totalCoinsDeducted))}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <Gift size={12} /> Engagement
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-neutral-500"><Gift size={11} /> Gifts Sent</span>
              <span className="text-xs font-semibold text-neutral-800">{dash(fmtNum(gifts.total))}</span>
            </div>
            {gifts.totalCoins != null && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-neutral-500"><Coins size={11} /> Gift Coins</span>
                <span className="text-xs font-semibold text-neutral-800">{dash(fmtNum(gifts.totalCoins))}</span>
              </div>
            )}
            {gifts.totalCash != null && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-neutral-500"><Banknote size={11} /> Gift Cash</span>
                <span className="text-xs font-semibold text-neutral-800">{dash(fmtINR(gifts.totalCash))}</span>
              </div>
            )}
            <div className="border-t border-neutral-50 pt-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-neutral-500"><Star size={11} /> Total Ratings</span>
                <span className="text-xs font-semibold text-neutral-800">{dash(fmtNum(ratings.total))}</span>
              </div>
              {ratings.averageScore != null && (
                <div className="flex items-center justify-between mt-2">
                  <span className="flex items-center gap-2 text-xs text-neutral-500"><Star size={11} /> Avg Score</span>
                  <span className="text-xs font-semibold text-neutral-900">{Number(ratings.averageScore).toFixed(1)} / 5</span>
                </div>
              )}
            </div>
          </div>
        </div>
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

// The two rating directions on the platform — a user rating the host after a call,
// and a host rating the user after a call. Each gets its own ranking + filtered list.
const RATING_DIRECTIONS = [
  {
    id: 'userToHost', label: 'User → Host', Icon: ArrowUpRight,
    raterRole: 'user', rateeRole: 'host',
    rankTitle: 'Top Rated Hosts', rankEmpty: 'No host ratings yet',
    tableTitle: 'All Hosts by Rating', entityLabel: 'Host',
  },
  {
    id: 'hostToUser', label: 'Host → User', Icon: ArrowDownRight,
    raterRole: 'host', rateeRole: 'user',
    rankTitle: 'Top Rated Users', rankEmpty: 'No user ratings yet',
    tableTitle: 'All Users by Rating', entityLabel: 'User',
  },
];

const RATING_PERIODS = [
  { id: 'today',     label: 'Today'       },
  { id: 'thisWeek',  label: 'This Week'   },
  { id: 'thisMonth', label: 'This Month'  },
  { id: 'allTime',   label: 'All Time'    },
  { id: 'custom',    label: 'Custom Range' },
];

const StarRow = ({ score }) => (
  <span className="flex items-center gap-0.5 text-amber-500">
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={12} className={i < (score ?? 0) ? 'fill-amber-400' : 'fill-none text-neutral-200'} />
    ))}
  </span>
);

// Ratees are ranked across the whole platform — pull every rating for the requested
// direction (paginating in large batches, capped for safety) and aggregate
// client-side, since the API only exposes individual rating records, not a rollup.
const MAX_RATING_PAGES = 30;
const RATING_PAGE_SIZE = 100;

const fetchRatingAggregate = async (raterRole, rateeRole, extraParams = {}) => {
  const byRatee = new Map();
  let page = 1;
  let totalPages = 1;
  do {
    const { data } = await api.get('/api/admin/ratings', {
      params: { page, limit: RATING_PAGE_SIZE, raterRole, rateeRole, ...extraParams },
    });
    const rows = Array.isArray(data?.data) ? data.data : [];
    totalPages = data?.pagination?.pages ?? 1;
    rows.forEach((r) => {
      const id = r.rateeId?._id ?? r.rateeId;
      if (!id || !r.score) return;
      const entry = byRatee.get(id) || { host: r.rateeId, total: 0, count: 0 };
      entry.total += r.score;
      entry.count += 1;
      entry.host = r.rateeId;
      byRatee.set(id, entry);
    });
    page += 1;
  } while (page <= totalPages && page <= MAX_RATING_PAGES);

  return Array.from(byRatee.values())
    .map((e) => ({ host: e.host, avgRating: e.total / e.count, count: e.count }))
    .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count);
};

const RatingsTab = () => {
  const [direction, setDirection] = useState('userToHost');
  const current = RATING_DIRECTIONS.find((d) => d.id === direction);

  const [periodFilter, setPeriodFilter] = useState('allTime');
  const [customStart, setCustomStart]   = useState('');
  const [customEnd, setCustomEnd]       = useState('');

  // shared by the podium, the ranking aggregation and the paginated list —
  // resolves the active period/custom-range selection into API date params
  const dateParams = useCallback(() => {
    if (periodFilter === 'custom') {
      return {
        ...(customStart && { startDate: customStart }),
        ...(customEnd   && { endDate: customEnd }),
      };
    }
    if (periodFilter !== 'allTime') return { period: periodFilter };
    return {};
  }, [periodFilter, customStart, customEnd]);

  // ── Animated "Top Rated Hosts" podium — always user→host, stays fixed across
  //    both breakdown tabs below it; only the period filter affects it ──
  const [hostPodium, setHostPodium]     = useState([]);
  const [podiumLoading, setPodiumLoading] = useState(false);
  const [podiumError, setPodiumError]     = useState(null);

  const fetchHostPodium = useCallback(async () => {
    setPodiumLoading(true);
    setPodiumError(null);
    try {
      setHostPodium(await fetchRatingAggregate('user', 'host', dateParams()));
    } catch (err) {
      setPodiumError(err.response?.data?.message || 'Failed to load host ratings');
    } finally {
      setPodiumLoading(false);
    }
  }, [dateParams]);

  useEffect(() => { fetchHostPodium(); }, [fetchHostPodium]);

  // ── Breakdown ranking table — switches with the User→Host / Host→User tabs ──
  const [ranking, setRanking]         = useState([]);
  const [aggLoading, setAggLoading]   = useState(false);
  const [aggError, setAggError]       = useState(null);

  const fetchRanking = useCallback(async () => {
    setAggLoading(true);
    setAggError(null);
    try {
      setRanking(await fetchRatingAggregate(current.raterRole, current.rateeRole, dateParams()));
    } catch (err) {
      setAggError(err.response?.data?.message || 'Failed to load ratings');
    } finally {
      setAggLoading(false);
    }
  }, [current.raterRole, current.rateeRole, dateParams]);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [score, setScore] = useState('');

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/ratings', {
        params: {
          page, limit: 15,
          raterRole: current.raterRole,
          rateeRole: current.rateeRole,
          ...(score && { score }),
          ...dateParams(),
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
  }, [page, score, current.raterRole, current.rateeRole, dateParams]);

  useEffect(() => { fetchRatings(); }, [fetchRatings]);

  const onDirectionChange = (id) => { setDirection(id); setPage(1); };
  const onFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };
  const onPeriodChange = (id) => { setPeriodFilter(id); setPage(1); };

  const pageNumbers = () => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= pages - 2) return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Period filter — applies to the podium, both breakdown tabs, and the list */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
          {RATING_PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPeriodChange(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                periodFilter === p.id ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-200/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periodFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
              className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 outline-none focus:border-neutral-400"
            />
            <span className="text-xs text-neutral-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
              className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 outline-none focus:border-neutral-400"
            />
          </div>
        )}
      </div>

      {/* Animated "Top Rated Hosts" podium — fixed, stays visible under both tabs below */}
      <RatedHostsAside hosts={hostPodium} loading={podiumLoading} error={podiumError} title="Top Rated Hosts" emptyLabel="No host ratings yet" />

      {/* Breakdown tabs — switch the ranking table + ratings list below */}
      <div className="flex gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 p-1.5 sm:inline-flex">
        {RATING_DIRECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onDirectionChange(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
              direction === id ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-200/60'
            }`}
          >
            <Icon size={14} /> {label} Ratings
          </button>
        ))}
      </div>

      {/* Full ranking */}
      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
            <Star size={15} className="text-neutral-400" /> {current.tableTitle}
          </p>
          <button onClick={fetchRanking}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800">
            <RefreshCw size={13} className={aggLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {aggLoading && ranking.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Crunching ratings…
          </div>
        ) : ranking.length === 0 ? (
          <div className="py-16 text-center">
            <Star size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">{current.rankEmpty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Rank', current.entityLabel, 'Average Rating', 'Ratings'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {ranking.map((entry, i) => (
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
          <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1">{current.label} Ratings</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:rounded-2xl sm:p-4 sm:col-span-2">
          <div className="flex h-full flex-wrap items-center gap-2">
            <select value={score} onChange={onFilterChange(setScore)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400">
              {SCORE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
