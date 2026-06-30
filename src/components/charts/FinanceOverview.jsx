import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, IndianRupee, Wallet, RefreshCw, Loader2, AlertCircle,
} from 'lucide-react';
import api from '../../services/api';

const fmtINR = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const PERIODS = [
  { id: 'thisWeek',    label: 'This Week',     checkoutPeriod: 'thisWeek',    granularity: 'day'   },
  { id: 'thisMonth',   label: 'This Month',    checkoutPeriod: 'thisMonth',   granularity: 'day'   },
  { id: 'last6Months', label: 'Last 6 Months', checkoutPeriod: 'last6Months', granularity: 'month' },
];

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

const localDayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const localMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const getPeriodStart = (periodId) => {
  const now = new Date();
  if (periodId === 'thisWeek') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (periodId === 'thisMonth') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), now.getMonth() - 5, 1); // last6Months
};

const buildBucketKeys = (periodId, granularity) => {
  const now = new Date();
  const start = getPeriodStart(periodId);
  const keys = [];
  if (granularity === 'day') {
    const d = new Date(start);
    while (d <= now) {
      keys.push({ key: localDayKey(d), label: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) });
      d.setDate(d.getDate() + 1);
    }
  } else {
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= now) {
      keys.push({ key: localMonthKey(d), label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) });
      d.setMonth(d.getMonth() + 1);
    }
  }
  return keys;
};

const bucketKeyFor = (date, granularity) => {
  const d = new Date(date);
  return granularity === 'day' ? localDayKey(d) : localMonthKey(d);
};

const FinanceOverview = () => {
  const [periodId, setPeriodId]   = useState('thisMonth');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [chartData, setChartData] = useState([]);
  const [totals, setTotals]       = useState({ revenue: 0, expense: 0, income: 0 });

  const period = PERIODS.find((p) => p.id === periodId);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const periodStart = getPeriodStart(periodId);
      const bucketKeys  = buildBucketKeys(periodId, period.granularity);
      const buckets     = new Map(bucketKeys.map((b) => [b.key, { ...b, revenue: 0, expense: 0 }]));

      // Revenue: successful coin-package purchases, bucketed by purchase date.
      let revenuePage = 1;
      let revenueTotalPages = 1;
      while (revenuePage <= MAX_PAGES && revenuePage <= revenueTotalPages) {
        const { data } = await api.get('/api/purchase/admin/all', {
          params: { page: revenuePage, limit: PAGE_SIZE, status: 'success' },
        });
        const rows = Array.isArray(data?.data) ? data.data : [];
        revenueTotalPages = data?.pagination?.pages ?? 1;
        rows.forEach((r) => {
          const created = new Date(r.createdAt);
          if (created < periodStart) return;
          const bucket = buckets.get(bucketKeyFor(created, period.granularity));
          if (bucket) bucket.revenue += Number(r.amount) || 0;
        });
        if (rows.length === 0) break;
        revenuePage += 1;
      }

      // Expense: approved host payouts (checkouts), bucketed by processed date.
      let expensePage = 1;
      let expenseTotalPages = 1;
      while (expensePage <= MAX_PAGES && expensePage <= expenseTotalPages) {
        const { data } = await api.get('/api/admin/checkouts', {
          params: { page: expensePage, limit: PAGE_SIZE, status: 'approved', period: period.checkoutPeriod },
        });
        const rows = Array.isArray(data?.data) ? data.data : [];
        expenseTotalPages = data?.pagination?.pages ?? 1;
        rows.forEach((r) => {
          const when = r.processedAt ?? r.createdAt;
          if (new Date(when) < periodStart) return;
          const bucket = buckets.get(bucketKeyFor(when, period.granularity));
          if (bucket) bucket.expense += Number(r.netAmount) || 0;
        });
        if (rows.length === 0) break;
        expensePage += 1;
      }

      const series = bucketKeys.map((b) => {
        const bucket = buckets.get(b.key);
        return { ...bucket, income: bucket.revenue - bucket.expense };
      });

      const totalRevenue = series.reduce((s, b) => s + b.revenue, 0);
      const totalExpense = series.reduce((s, b) => s + b.expense, 0);

      setChartData(series);
      setTotals({ revenue: totalRevenue, expense: totalExpense, income: totalRevenue - totalExpense });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load financial overview');
    } finally {
      setLoading(false);
    }
  }, [periodId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const KPI_CARDS = [
    { label: 'Revenue',    value: totals.revenue, Icon: TrendingUp,   cls: 'bg-green-50 text-green-800 border border-green-200' },
    { label: 'Expense',    value: totals.expense, Icon: TrendingDown, cls: 'bg-red-50 text-red-800 border border-red-200' },
    {
      label: 'Net Income',
      value: totals.income,
      Icon: Wallet,
      cls: totals.income >= 0 ? 'bg-neutral-900 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200',
    },
  ];

  const hasData = chartData.some((d) => d.revenue !== 0 || d.expense !== 0);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900">
            <IndianRupee size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">Revenue, Expense &amp; Income</p>
            <p className="text-xs text-neutral-400">Platform purchase revenue vs. host payouts</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodId(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  periodId === p.id ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-200/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
          <button onClick={fetchData} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">Retry</button>
        </div>
      )}

      {/* KPI tiles */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {KPI_CARDS.map(({ label, value, Icon, cls }) => (
          <div key={label} className={`rounded-xl p-3 sm:rounded-2xl sm:p-4 ${cls}`}>
            <div className="flex items-start justify-between">
              <p className="text-base font-black sm:text-xl">{loading && chartData.length === 0 ? '—' : fmtINR(value)}</p>
              <Icon size={16} className="opacity-50" />
            </div>
            <p className="mt-0.5 text-xs font-medium opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-72 w-full">
        {loading && chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center gap-2 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading chart…
          </div>
        ) : !hasData ? (
          <div className="flex h-full flex-col items-center justify-center text-neutral-400">
            <IndianRupee size={32} className="mb-2 text-neutral-200" />
            <p className="text-sm">No revenue or expense recorded for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e5e5', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={18} />
              <Line dataKey="income" name="Net Income" stroke="#171717" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default FinanceOverview;
