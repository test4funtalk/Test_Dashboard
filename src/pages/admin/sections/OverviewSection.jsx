import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, IndianRupee, RefreshCw, Loader2, AlertCircle,
  PhoneCall, Gift, Star, Coins, ArrowUpRight, ArrowDownRight,
  Activity, BarChart3, ShoppingBag,
} from 'lucide-react';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (n) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-IN');

// ─── chart data helpers ───────────────────────────────────────────────────────

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

const localDayKey   = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const localMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

const getFilterRange = (filterType, selectedMonth, customFrom, customTo) => {
  const now = new Date();
  if (filterType === 'today') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start: s, end: new Date(s.getTime() + 86400000 - 1), gran: 'day' };
  }
  if (filterType === 'thisWeek') {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
    return { start: s, end: now, gran: 'day' };
  }
  if (filterType === 'thisMonth') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, gran: 'day' };
  }
  if (filterType === 'selectMonth' && selectedMonth) {
    const [y, m] = selectedMonth.split('-').map(Number);
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59), gran: 'day' };
  }
  if (filterType === 'custom') {
    const s = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const e = customTo   ? new Date(customTo + 'T23:59:59') : now;
    return { start: s, end: e, gran: (e - s) > 60 * 86400000 ? 'month' : 'day' };
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, gran: 'day' };
};

const buildBuckets = (start, end, gran) => {
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

const bucketKey = (date, gran) => {
  const d = new Date(date);
  return gran === 'day' ? localDayKey(d) : localMonthKey(d);
};

// ─── custom chart tooltip ─────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-xl text-xs">
      <p className="mb-1.5 font-semibold text-neutral-700">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-neutral-500">{p.name}</span>
          <span className="ml-auto font-bold text-neutral-800">{fmtINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── constants ────────────────────────────────────────────────────────────────

const BAR_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#a855f7','#ef4444','#14b8a6'];

// ─── main section ─────────────────────────────────────────────────────────────

const OverviewSection = () => {
  const now0 = new Date();
  const [filterType,    setFilterType]    = useState('thisMonth');
  const [selectedMonth, setSelectedMonth] = useState(`${now0.getFullYear()}-${String(now0.getMonth()+1).padStart(2,'0')}`);
  const [customFrom,    setCustomFrom]    = useState('');
  const [customTo,      setCustomTo]      = useState('');

  const [chartData,    setChartData]    = useState([]);
  const [totals,       setTotals]       = useState({ revenue: 0, expense: 0, income: 0 });
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError,   setChartError]   = useState(null);

  const [platformStats, setPlatformStats] = useState(null);
  const [statsLoading,  setStatsLoading]  = useState(false);

  const [topPackages,  setTopPackages]  = useState([]);
  const [pkgLoading,   setPkgLoading]   = useState(false);

  // ── Chart + period totals ──────────────────────────────────────────────────
  const fetchChart = useCallback(async () => {
    if (filterType === 'selectMonth' && !selectedMonth) return;
    if (filterType === 'custom' && !customFrom && !customTo) return;
    setChartLoading(true);
    setChartError(null);
    try {
      const { start, end, gran } = getFilterRange(filterType, selectedMonth, customFrom, customTo);
      const keys = buildBuckets(start, end, gran);
      const map  = new Map(keys.map((b) => [b.key, { ...b, revenue: 0, expense: 0 }]));

      let p1 = 1, t1 = 1;
      while (p1 <= MAX_PAGES && p1 <= t1) {
        const { data } = await api.get('/api/purchase/admin/all', { params: { page: p1, limit: PAGE_SIZE, status: 'success' } });
        const rows = Array.isArray(data?.data) ? data.data : [];
        t1 = data?.pagination?.pages ?? 1;
        rows.forEach((r) => {
          const d = new Date(r.createdAt);
          if (d < start || d > end) return;
          const b = map.get(bucketKey(d, gran));
          if (b) b.revenue += Number(r.amount) || 0;
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
          const b = map.get(bucketKey(when, gran));
          if (b) b.expense += Number(r.netAmount) || 0;
        });
        if (rows.length === 0) break;
        p2++;
      }

      const series   = keys.map((b) => { const bk = map.get(b.key); return { ...bk, income: bk.revenue - bk.expense }; });
      const totalRev = series.reduce((s, b) => s + b.revenue, 0);
      const totalExp = series.reduce((s, b) => s + b.expense, 0);
      setChartData(series);
      setTotals({ revenue: totalRev, expense: totalExp, income: totalRev - totalExp });
    } catch (err) {
      setChartError(err.response?.data?.message || err.message || 'Failed to load chart');
    } finally {
      setChartLoading(false);
    }
  }, [filterType, selectedMonth, customFrom, customTo]);

  // ── Platform stats ─────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get('/api/admin/stats');
      setPlatformStats(data?.data ?? null);
    } catch { /* silent */ } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Top-selling packages (aggregate all successful purchases by title) ───────
  const fetchTopPackages = useCallback(async () => {
    setPkgLoading(true);
    try {
      const agg = new Map(); // title -> { count, revenue, coins }
      let pg = 1, total = 1;
      while (pg <= MAX_PAGES && pg <= total) {
        const { data } = await api.get('/api/purchase/admin/all', { params: { page: pg, limit: PAGE_SIZE, status: 'success' } });
        const rows = Array.isArray(data?.data) ? data.data : [];
        total = data?.pagination?.pages ?? 1;
        rows.forEach((r) => {
          const key = r.title ?? 'Unknown Package';
          const cur = agg.get(key) ?? { count: 0, revenue: 0, coins: 0 };
          agg.set(key, {
            count:   cur.count   + 1,
            revenue: cur.revenue + (Number(r.amount) || 0),
            coins:   cur.coins   + (Number(r.coins)  || 0),
          });
        });
        if (rows.length === 0) break;
        pg++;
      }
      const sorted = [...agg.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setTopPackages(sorted);
    } catch { /* silent */ } finally {
      setPkgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (filterType === 'custom' && !customFrom && !customTo) return;
    fetchChart();
  }, [fetchChart, filterType, customFrom, customTo]);
  useEffect(() => { fetchStats(); fetchTopPackages(); }, [fetchStats, fetchTopPackages]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const calls      = platformStats?.calls   ?? {};
  const billing    = platformStats?.billing ?? {};
  const gifts      = platformStats?.gifts   ?? {};
  const ratings    = platformStats?.ratings ?? {};
  const callTotal  = calls.total ?? 0;
  const successRate = callTotal > 0 ? Math.round(((calls.ended  ?? 0) / callTotal) * 100) : 0;
  const giftRate    = callTotal > 0 ? Math.min(Math.round(((gifts.total ?? 0) / callTotal) * 100), 100) : 0;
  const ratingPct   = ratings.averageScore != null ? Math.round((ratings.averageScore / 5) * 100) : 0;
  const hasChart    = chartData.some((d) => d.revenue !== 0 || d.expense !== 0);

  const periodLabel = filterType === 'today' ? 'Today'
    : filterType === 'thisWeek'  ? 'This Week'
    : filterType === 'thisMonth' ? 'This Month'
    : filterType === 'selectMonth' && selectedMonth
      ? new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : filterType === 'custom' ? 'Custom Range'
    : 'This Month';

  const pieTotal = (calls.total ?? 0) + (gifts.total ?? 0) + (ratings.total ?? 0);
  const pieData = [
    { name: 'Total Calls',   value: calls.total   ?? 0, color: '#6366f1' },
    { name: 'Gifts Sent',    value: gifts.total   ?? 0, color: '#ec4899' },
    { name: 'Total Ratings', value: ratings.total ?? 0, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Welcome header ── */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Welcome back, Admin</h1>
        <p className="mt-0.5 text-sm text-neutral-400">Here's what's happening with your platform today.</p>
      </div>

      {/* ── 4 KPI stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        {/* Total Cash Earned — hero dark */}
        <div className="relative col-span-2 overflow-hidden rounded-2xl bg-neutral-900 p-4 text-white sm:p-5 lg:col-span-1">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest opacity-40">Total Balance</div>
          <p className="text-2xl font-black leading-tight sm:text-3xl">
            {statsLoading && !platformStats ? '—' : fmtINR(billing.totalCashEarned)}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] opacity-50">
            <TrendingUp size={11} /> All-time platform revenue
          </div>
          <IndianRupee size={72} className="pointer-events-none absolute -right-5 -bottom-5 opacity-[0.04]" />
        </div>

        {/* Incoming — period revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Incoming {periodLabel}</div>
          <p className="text-2xl font-black text-neutral-900 sm:text-3xl">
            {chartLoading && chartData.length === 0 ? '—' : fmtINR(totals.revenue)}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-green-600">
            <ArrowUpRight size={13} /> Purchase revenue
          </div>
        </div>

        {/* Outgoing — period expense */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Outgoing {periodLabel}</div>
          <p className="text-2xl font-black text-neutral-900 sm:text-3xl">
            {chartLoading && chartData.length === 0 ? '—' : fmtINR(totals.expense)}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-500">
            <ArrowDownRight size={13} /> Host payouts
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${
          totals.income >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Net Cash Flow</div>
          <p className={`text-2xl font-black sm:text-3xl ${totals.income >= 0 ? 'text-green-800' : 'text-red-700'}`}>
            {chartLoading && chartData.length === 0 ? '—' : fmtINR(totals.income)}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold">
            {totals.income >= 0
              ? <><TrendingUp size={11} className="text-green-500" /><span className="text-green-600">Positive flow</span></>
              : <><TrendingDown size={11} className="text-red-500" /><span className="text-red-600">Negative flow</span></>
            }
          </div>
        </div>
      </div>

      {/* ── Middle: Area Chart  +  Platform Stats ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Treasury Overview area chart */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-neutral-900">Treasury Overview</p>
              <p className="text-xs text-neutral-400">Real-time overview of your financial performance</p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {/* Period dropdown */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="selectMonth">Select Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {/* Month picker */}
              {filterType === 'selectMonth' && (
                <input
                  type="month"
                  value={selectedMonth}
                  max={`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              )}

              {/* Custom date range */}
              {filterType === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || undefined}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <span className="text-[10px] text-neutral-400">to</span>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              )}
            </div>
          </div>

          {chartError && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle size={13} /> {chartError}
              <button onClick={fetchChart} className="ml-auto font-medium underline">Retry</button>
            </div>
          )}

          <div className="h-52 w-full sm:h-60">
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
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.10} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#a3a3a3' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradRev)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradExp)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend + refresh */}
          <div className="mt-3 flex items-center gap-4 border-t border-neutral-50 pt-3">
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="h-2.5 w-5 rounded-sm bg-indigo-500 opacity-80" /> Revenue
            </span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="h-2.5 w-5 rounded-sm bg-red-400 opacity-70" /> Expense
            </span>
            <button
              onClick={fetchChart}
              disabled={chartLoading}
              className="ml-auto flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-700 disabled:opacity-40"
            >
              <RefreshCw size={10} className={chartLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Platform quick stats */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-neutral-900">Platform Stats</p>
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> Live
            </span>
          </div>

          {statsLoading && !platformStats ? (
            <div className="flex items-center justify-center py-12 text-neutral-300">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {[
                { label: 'Total Calls',     value: fmtNum(calls.total),              Icon: PhoneCall, iconCls: 'text-blue-500',   bg: 'bg-blue-50'   },
                { label: 'Active Now',      value: fmtNum(calls.active),             Icon: Activity,  iconCls: 'text-green-500',  bg: 'bg-green-50'  },
                { label: 'Total Gifts',     value: fmtNum(gifts.total),              Icon: Gift,      iconCls: 'text-pink-500',   bg: 'bg-pink-50'   },
                { label: 'Total Ratings',   value: fmtNum(ratings.total),            Icon: Star,      iconCls: 'text-amber-500',  bg: 'bg-amber-50'  },
                { label: 'Coins Deducted',  value: fmtNum(billing.totalCoinsDeducted), Icon: Coins,   iconCls: 'text-amber-600',  bg: 'bg-amber-50'  },
              ].map(({ label, value, Icon, iconCls, bg }) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${bg}`}>
                      <Icon size={13} className={iconCls} />
                    </div>
                    <span className="text-xs font-medium text-neutral-600">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-neutral-800">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Top Selling Packages  +  Insights & Metrics ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Top Selling Packages — vertical column chart */}
        <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-neutral-900">Top Selling Packages</p>
              <p className="text-xs text-neutral-400">Ranked by total number of purchases</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
              <ShoppingBag size={13} className="text-indigo-500" />
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
              <div className="min-h-48 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topPackages}
                    margin={{ top: 16, right: 4, left: -16, bottom: 0 }}
                    barCategoryGap="30%"
                  >
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
                              <p>Sales: <span className="font-semibold text-neutral-900">{fmtNum(d.count)}</span></p>
                              <p>Revenue: <span className="font-semibold text-neutral-900">{fmtINR(d.revenue)}</span></p>
                              {d.coins > 0 && <p>Coins: <span className="font-semibold text-neutral-900">{fmtNum(d.coins)}</span></p>}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" name="Sales" radius={[6, 6, 0, 0]} maxBarSize={36} label={{ position: 'top', fontSize: 10, fill: '#737373', formatter: (v) => fmtNum(v) }}>
                      {topPackages.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue summary row */}
              <div className="mt-3 flex items-center gap-2 border-t border-neutral-50 pt-3">
                <span className="text-[11px] text-neutral-400">Total revenue from top packages:</span>
                <span className="ml-auto text-xs font-bold text-neutral-800">
                  {fmtINR(topPackages.reduce((s, p) => s + p.revenue, 0))}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Insights + Operational Metrics */}
        <div className="flex flex-col gap-4">

          {/* Top row: Platform Insights pie (narrow) + Live Snapshot (wide) */}
          <div className="grid grid-cols-5 gap-4">

            {/* Platform Insights — taller, narrower */}
            <div className="col-span-2 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-neutral-900">Platform Insights</p>
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> Live
                </span>
              </div>

              {statsLoading && !platformStats ? (
                <div className="flex flex-1 items-center justify-center text-neutral-300">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : pieData.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-neutral-300">
                  <BarChart3 size={22} />
                  <p className="text-[10px]">No data yet</p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col">
                  {/* Pie — fills available space */}
                  <div className="flex-1" style={{ minHeight: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={34}
                          outerRadius={62}
                          paddingAngle={3}
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
                  </div>
                  {/* Legend below pie */}
                  <div className="mt-3 space-y-1.5 border-t border-neutral-50 pt-3">
                    {pieData.map((d) => {
                      const pct = pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0;
                      return (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="min-w-0 flex-1 truncate text-[10px] text-neutral-500">{d.name}</span>
                          <span className="text-[10px] font-bold text-neutral-800">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Live Snapshot — wider */}
            <div className="col-span-3 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold text-neutral-900">Live Snapshot</p>
              <div className="flex flex-1 flex-col justify-between gap-2">
                {[
                  {
                    label: 'Net Cash Flow',
                    value: fmtINR(totals.income),
                    sub: totals.income >= 0 ? 'Positive' : 'Negative',
                    color: totals.income >= 0 ? 'text-green-600' : 'text-red-500',
                    bg: totals.income >= 0 ? 'bg-green-50' : 'bg-red-50',
                    dot: totals.income >= 0 ? 'bg-green-500' : 'bg-red-500',
                  },
                  {
                    label: 'Active Calls',
                    value: fmtNum(calls.active ?? 0),
                    sub: 'Live right now',
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    dot: 'bg-blue-500',
                  },
                  {
                    label: 'Avg Rating',
                    value: ratings.averageScore != null ? Number(ratings.averageScore).toFixed(1) : '—',
                    sub: `from ${fmtNum(ratings.total ?? 0)} reviews`,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50',
                    dot: 'bg-amber-400',
                  },
                  {
                    label: 'Gifts Sent',
                    value: fmtNum(gifts.total ?? 0),
                    sub: `${fmtINR(gifts.totalCash ?? 0)} cash value`,
                    color: 'text-pink-600',
                    bg: 'bg-pink-50',
                    dot: 'bg-pink-500',
                  },
                ].map(({ label, value, sub, color, bg, dot }) => (
                  <div key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${bg}`}>
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-neutral-500">{label}</p>
                      <p className={`text-sm font-black ${color}`}>{value}</p>
                    </div>
                    <span className="text-[10px] text-neutral-400">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="flex flex-1 flex-col rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
            <p className="mb-4 text-sm font-bold text-neutral-900">Operational Metrics</p>
            <div className="space-y-4">
              {[
                { label: 'Call Success Rate', pct: successRate, bar: 'bg-indigo-500', sub: `${fmtNum(calls.ended ?? 0)} of ${fmtNum(callTotal)} calls` },
                { label: 'Gift Engagement',   pct: giftRate,    bar: 'bg-pink-400',   sub: `${fmtNum(gifts.total ?? 0)} gifts sent` },
                { label: 'Rating Score',      pct: ratingPct,   bar: 'bg-amber-400',  sub: `${ratings.averageScore != null ? Number(ratings.averageScore).toFixed(1) : '—'} / 5 avg` },
              ].map(({ label, pct, bar, sub }) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-700">{label}</span>
                    <span className="text-sm font-bold text-neutral-900">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
