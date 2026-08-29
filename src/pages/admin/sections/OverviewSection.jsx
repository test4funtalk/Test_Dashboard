import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, IndianRupee, RefreshCw, Loader2, AlertCircle,
  PhoneCall, Gift, Star, Coins, ArrowUpRight, ArrowDownRight, Wallet,
  Activity, BarChart3, ShoppingBag,
} from 'lucide-react';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (n) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-IN');

// deterministic bar-height pattern for the barcode-style mini chart on KPI cards
const BAR_HEIGHTS = [45, 90, 60, 100, 55, 80, 40, 95, 65, 85, 50, 75, 40, 100, 60, 90];
const BAR_COUNT = 32;

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

const BAR_COLORS = ['#171717','#404040','#525252','#666666','#737373','#8a8a8a','#a3a3a3','#bdbdbd'];

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

  const [allTimeRevenue,        setAllTimeRevenue]        = useState(0);
  const [allTimeRevenueLoading, setAllTimeRevenueLoading] = useState(false);

  const [topPackages,  setTopPackages]  = useState([]);
  const [pkgLoading,   setPkgLoading]   = useState(false);
  const [pkgInView,    setPkgInView]    = useState(false);
  const pkgSectionRef = useRef(null);

  // ── Reveal the Top Selling Packages chart (and its bar animation) on scroll ──
  useEffect(() => {
    const el = pkgSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPkgInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // ── All-time purchase revenue (added to Total Balance alongside /api/admin/stats) ──
  const fetchAllTimeRevenue = useCallback(async () => {
    setAllTimeRevenueLoading(true);
    try {
      let page = 1, pages = 1, sum = 0;
      while (page <= MAX_PAGES && page <= pages) {
        const { data } = await api.get('/api/purchase/admin/all', { params: { page, limit: PAGE_SIZE, status: 'success' } });
        const rows = Array.isArray(data?.data) ? data.data : [];
        pages = data?.pagination?.pages ?? 1;
        sum += rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        if (rows.length === 0) break;
        page++;
      }
      setAllTimeRevenue(sum);
    } catch { /* silent */ } finally {
      setAllTimeRevenueLoading(false);
    }
  }, []);

  // ── Top-selling packages ────────────────────────────────────────────────────
  const fetchTopPackages = useCallback(async () => {
    if (filterType === 'selectMonth' && !selectedMonth) return;
    if (filterType === 'custom' && !customFrom && !customTo) return;
    setPkgLoading(true);
    try {
      const params = { limit: 8 };
      if (filterType === 'today') params.period = 'today';
      else if (filterType === 'thisWeek') params.period = 'week';
      else if (filterType === 'thisMonth') params.period = 'month';
      else {
        const { start, end } = getFilterRange(filterType, selectedMonth, customFrom, customTo);
        params.startDate = start.toISOString();
        params.endDate = end.toISOString();
      }

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
  }, [filterType, selectedMonth, customFrom, customTo]);

  useEffect(() => {
    if (filterType === 'selectMonth' && !selectedMonth) return;
    if (filterType === 'custom' && !customFrom && !customTo) return;
    fetchChart();
    fetchTopPackages();
  }, [fetchChart, fetchTopPackages, filterType, selectedMonth, customFrom, customTo]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchAllTimeRevenue(); }, [fetchAllTimeRevenue]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const calls      = platformStats?.calls   ?? {};
  const billing    = platformStats?.billing ?? {};
  const gifts      = platformStats?.gifts   ?? {};
  const ratings    = platformStats?.ratings ?? {};
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
    { name: 'Total Calls',   value: calls.total   ?? 0, color: '#171717' },
    { name: 'Gifts Sent',    value: gifts.total   ?? 0, color: '#a3a3a3' },
    { name: 'Total Ratings', value: ratings.total ?? 0, color: '#525252' },
  ].filter((d) => d.value > 0);
  const pieLead = pieData.length
    ? [...pieData].sort((a, b) => b.value - a.value)[0]
    : null;
  const pieLeadPct = pieLead && pieTotal > 0 ? ((pieLead.value / pieTotal) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Global period filter — drives KPI cards, Treasury chart & Top Packages ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4">
        <div>
          <p className="text-sm font-bold text-neutral-900">Showing data for {periodLabel}</p>
          <p className="text-xs text-neutral-400">Revenue, expenses & package sales for the selected period</p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
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

          {filterType === 'selectMonth' && (
            <input
              type="month"
              value={selectedMonth}
              max={`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          )}

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

          <button
            onClick={() => { fetchChart(); fetchTopPackages(); fetchStats(); fetchAllTimeRevenue(); }}
            disabled={chartLoading || pkgLoading || statsLoading || allTimeRevenueLoading}
            title="Refresh overview"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-100 disabled:opacity-40"
          >
            <RefreshCw size={13} className={(chartLoading || pkgLoading || statsLoading || allTimeRevenueLoading) ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── 4 KPI stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        {(() => {
          const rawBalance  = allTimeRevenue;
          const rawIncoming = totals.revenue ?? 0;
          const rawOutgoing = totals.expense ?? 0;
          const rawNet      = totals.income ?? 0;
          const maxAbs = Math.max(Math.abs(rawBalance), Math.abs(rawIncoming), Math.abs(rawOutgoing), Math.abs(rawNet), 1);

          const balanceStillLoading = allTimeRevenueLoading && allTimeRevenue === 0;
          const cards = [
            {
              label: 'Total Revenue',
              raw: rawBalance,
              value: balanceStillLoading ? '—' : fmtINR(rawBalance),
              caption: 'All-time payments received',
              Icon: IndianRupee,
              iconColor: 'text-black',
              trend: 'up',
            },
            {
              label: `Incoming ${periodLabel}`,
              raw: rawIncoming,
              value: chartLoading && chartData.length === 0 ? '—' : fmtINR(rawIncoming),
              caption: 'Purchase revenue',
              Icon: ArrowUpRight,
              iconColor: 'text-black',
              trend: 'up',
            },
            {
              label: `Outgoing ${periodLabel}`,
              raw: rawOutgoing,
              value: chartLoading && chartData.length === 0 ? '—' : fmtINR(rawOutgoing),
              caption: 'Host payouts',
              Icon: ArrowDownRight,
              iconColor: 'text-black',
              trend: 'down',
            },
            {
              label: 'Net Cash Flow',
              raw: rawNet,
              value: chartLoading && chartData.length === 0 ? '—' : fmtINR(rawNet),
              caption: rawNet >= 0 ? 'Positive flow' : 'Negative flow',
              Icon: Wallet,
              iconColor: 'text-black',
              trend: rawNet >= 0 ? 'up' : 'down',
            },
          ];

          return cards.map(({ label, raw, value, caption, Icon, iconColor, trend }) => {
            const pct = Math.round((Math.abs(raw) / maxAbs) * 100);
            const filledBars = Math.round((pct / 100) * BAR_COUNT);

            return (
              <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-neutral-700">{label}</span>
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 ${iconColor}`}>
                    <Icon size={15} />
                  </div>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-neutral-900 sm:text-3xl">{value}</span>
                  {trend === 'up'
                    ? <span className="flex items-center gap-0.5 text-xs font-medium text-green-600"><TrendingUp size={20} /></span>
                    : <span className="flex items-center gap-0.5 text-xs font-medium text-red-500"><TrendingDown size={20} /></span>
                  }
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                  <span className="truncate">{caption}</span>
                  <span className="flex-shrink-0 font-semibold text-neutral-500">{pct}% of total</span>
                </div>

                <div className="mt-2.5 flex h-6 items-end gap-[3px] overflow-hidden">
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
          });
        })()}
      </div>

      {/* ── Middle: Cashflow Chart  +  Platform Stats ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Treasury Overview area chart */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-black text-neutral-900">Treasury Overview</p>
              <p className="mt-0.5 text-xs text-neutral-400">{periodLabel}</p>
            </div>
          </div>

          {chartError && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle size={13} /> {chartError}
              <button onClick={fetchChart} className="ml-auto font-medium underline">Retry</button>
            </div>
          )}

          <div style={{ height: 380 }} className="w-full">
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
                      <stop offset="5%"  stopColor="#6b7280" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
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
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6b7280" strokeWidth={2.5} fill="url(#gradRev)" dot={{ r: 3, strokeWidth: 0, fill: '#6b7280' }} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradExp)" dot={{ r: 3, strokeWidth: 0, fill: '#ef4444' }} activeDot={{ r: 3, strokeWidth: 0 }} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend + refresh */}
          <div className="mt-3 flex items-center gap-4 border-t border-neutral-50 pt-3">
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="h-2.5 w-5 rounded-sm opacity-80" style={{ backgroundColor: '#6b7280' }} /> Revenue
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

          {statsLoading && !platformStats ? (
            <div className="flex flex-1 items-center justify-center py-12 text-neutral-300">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (() => {
            const statRows = [
              { label: 'Total Calls',    raw: calls.total   ?? 0, color: '#171717' },
              { label: 'Active Now',     raw: calls.active  ?? 0, color: '#525252' },
              { label: 'Total Gifts',    raw: gifts.total   ?? 0, color: '#8a8a8a' },
              { label: 'Chat Messages',  raw: platformStats?.totalChatMessages ?? 0, color: '#737373' },
              { label: 'Total Ratings',  raw: ratings.total ?? 0, color: '#a3a3a3' },
              { label: 'Coins Deducted', raw: billing.totalCoinsDeducted ?? 0, color: '#404040' },
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
                      <div className="mt-2.5 flex h-6 items-end gap-[3px] overflow-hidden">
                        {Array.from({ length: BAR_COUNT }).map((_, i) => (
                          <div
                            key={i}
                            className={`min-w-0 flex-1 rounded-full ${i < filledBars ? 'bg-neutral-900' : 'bg-neutral-200'}`}
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

      {/* ── Bottom: Top Selling Packages  +  Insights & Metrics ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Top Selling Packages — vertical column chart */}
        <div ref={pkgSectionRef} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
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
              <div className="min-h-48 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pkgInView ? topPackages : topPackages.map((p) => ({ ...p, revenue: 0 }))}
                    margin={{ top: 24, right: 4, left: -16, bottom: 0 }}
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
                      isAnimationActive
                      animationDuration={900}
                      animationEasing="ease-out"
                      label={({ x, y, width, index }) => (
                        <text
                          x={x + width / 2}
                          y={y - 6}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={700}
                          fill="#404040"
                        >
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

          {/* Platform Insights */}
          <div className="grid grid-cols-1 gap-4">

            <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-900">Platform Insights</p>
                  <p className="text-[9px] text-neutral-400">All-time totals</p>
                </div>
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
                  <div className="relative flex-1" style={{ minHeight: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={110}
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
                        <p className="text-2xl font-black text-neutral-900">{pieLeadPct}%</p>
                        <p className="text-xs font-medium text-neutral-400">{pieLead.name}</p>
                      </div>
                    )}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
