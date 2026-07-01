import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard, TrendingUp, Clock, XCircle, Search,
  AlertCircle, Loader2, ChevronLeft, ChevronRight,
  RefreshCw, CheckCircle, IndianRupee, Package, Coins, Copy, Check,
} from 'lucide-react';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

const fmtAmount = (n) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  success:   'bg-green-100  text-green-700  border-green-200',
  pending:   'bg-amber-100  text-amber-700  border-amber-200',
  failed:    'bg-red-100    text-red-700    border-red-200',
  refunded:  'bg-blue-100   text-blue-700   border-blue-200',
  cancelled: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

const STATUS_FILTERS = [
  { value: '',          label: 'All'       },
  { value: 'success',   label: 'Success'   },
  { value: 'pending',   label: 'Pending'   },
  { value: 'failed',    label: 'Failed'    },
  { value: 'refunded',  label: 'Refunded'  },
  { value: 'cancelled', label: 'Cancelled' },
];

const VALID_STATUSES = new Set(STATUS_FILTERS.map((s) => s.value));

const PERIOD_FILTERS = [
  { id: 'all',       label: 'All Time'     },
  { id: 'today',     label: 'Today'        },
  { id: 'yesterday', label: 'Yesterday'    },
  { id: 'thisWeek',  label: 'This Week'    },
  { id: 'thisMonth', label: 'This Month'   },
  { id: 'custom',    label: 'Custom Range' },
];

const getPeriodParams = (period, from, to) => {
  if (!period || period === 'all') return {};
  if (period === 'custom') {
    const params = {};
    if (from) params.startDate = new Date(from).toISOString();
    if (to)   params.endDate   = new Date(to + 'T23:59:59').toISOString();
    return params;
  }
  const now        = new Date();
  const dayMs      = 86400000;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'today')
    return { startDate: todayStart.toISOString(), endDate: new Date(todayStart.getTime() + dayMs - 1).toISOString() };
  if (period === 'yesterday')
    return { startDate: new Date(todayStart.getTime() - dayMs).toISOString(), endDate: new Date(todayStart.getTime() - 1).toISOString() };
  if (period === 'thisWeek')
    return { startDate: new Date(todayStart.getTime() - todayStart.getDay() * dayMs).toISOString(), endDate: now.toISOString() };
  if (period === 'thisMonth')
    return { startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), endDate: now.toISOString() };
  return {};
};

// ─── sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[s] || STATUS_STYLES.cancelled}`}>
      {s || '—'}
    </span>
  );
};

const CopyChip = ({ value, display }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="group flex items-center gap-1 font-mono text-[11px] text-neutral-400 hover:text-neutral-700">
      {display}
      {copied
        ? <Check size={10} className="text-green-500" />
        : <Copy size={10} className="opacity-0 group-hover:opacity-100" />}
    </button>
  );
};

const PaginationBar = ({ page, pages, total, limit, onPage }) => {
  if (pages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  const pageNums = () => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3)  return [1, 2, 3, 4, 5];
    if (page >= pages - 2) return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  return (
    <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
      <p className="text-xs text-neutral-400">{start}–{end} of {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40">
          <ChevronLeft size={14} />
        </button>
        {pageNums().map((n) => (
          <button key={n} onClick={() => onPage(n)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium ${
              n === page ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}>
            {n}
          </button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── main section ─────────────────────────────────────────────────────────────

const PaymentManagementSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus   = searchParams.get('pstatus') || '';
  const activeStatus = VALID_STATUSES.has(rawStatus) ? rawStatus : '';

  const setActiveStatus = useCallback((s) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (s) p.set('pstatus', s); else p.delete('pstatus');
      return p;
    }, { replace: true });
    setPage(1);
  }, [setSearchParams]);

  const [purchases,    setPurchases]    = useState([]);
  const [pagination,   setPagination]   = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [aggStats,     setAggStats]     = useState({ totalAmount: 0, totalCoins: 0, successCount: 0, pendingCount: 0, failedCount: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [period,     setPeriod]     = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchPurchases = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: targetPage, limit: 20,
        ...getPeriodParams(period, customFrom, customTo),
      };
      if (activeStatus)    params.status = activeStatus;
      if (debouncedSearch) params.userId  = debouncedSearch;

      const { data } = await api.get('/api/purchase/admin/all', { params });

      const rows = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};

      setPurchases(rows);
      setPagination({
        total: pg.total  ?? rows.length,
        page:  pg.page   ?? targetPage,
        limit: pg.limit  ?? 20,
        pages: pg.pages  ?? Math.ceil((pg.total ?? rows.length) / 20),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [activeStatus, debouncedSearch, period, customFrom, customTo]);

  // Paginate through ALL filtered records to compute accurate totals
  const fetchAggStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const baseParams = {
        limit: 100,
        ...getPeriodParams(period, customFrom, customTo),
      };
      if (activeStatus)    baseParams.status = activeStatus;
      if (debouncedSearch) baseParams.userId  = debouncedSearch;

      let curPage = 1;
      let totalPages = 1;
      let totalAmount = 0;
      let totalCoins  = 0;
      let successCount = 0;
      let pendingCount = 0;
      let failedCount  = 0;
      const MAX_PAGES = 20;

      do {
        const { data } = await api.get('/api/purchase/admin/all', { params: { ...baseParams, page: curPage } });
        const rows = Array.isArray(data?.data) ? data.data : [];
        const pg   = data?.pagination ?? {};
        totalPages = pg.pages ?? 1;

        rows.forEach((r) => {
          totalAmount += r.amount ?? 0;
          totalCoins  += r.coins  ?? 0;
          if (r.status === 'success') successCount++;
          else if (r.status === 'pending') pendingCount++;
          else if (r.status === 'failed')  failedCount++;
        });

        if (rows.length === 0) break;
        curPage++;
      } while (curPage <= totalPages && curPage <= MAX_PAGES);

      setAggStats({ totalAmount, totalCoins, successCount, pendingCount, failedCount });
    } catch {
      // stats silently stay at 0 on error
    } finally {
      setStatsLoading(false);
    }
  }, [activeStatus, debouncedSearch, period, customFrom, customTo]);

  useEffect(() => {
    fetchPurchases(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPurchases]);

  useEffect(() => { fetchAggStats(); }, [fetchAggStats]);

  const onPage = (n) => {
    setPage(n);
    fetchPurchases(n);
  };

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Purchase Amount */}
        <div className="rounded-xl bg-neutral-900 p-3 text-white sm:rounded-2xl sm:p-5">
          <div className="flex items-start justify-between">
            {statsLoading
              ? <Loader2 size={22} className="animate-spin opacity-50 mt-1" />
              : <p className="text-xl font-black sm:text-2xl leading-tight">{fmtAmount(aggStats.totalAmount)}</p>
            }
            <IndianRupee size={18} className="opacity-40 flex-shrink-0" />
          </div>
          <p className="mt-1 text-xs font-medium opacity-60 sm:text-sm">Total Amount</p>
        </div>

        {/* Total Coins */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-start justify-between">
            {statsLoading
              ? <Loader2 size={22} className="animate-spin text-amber-400 mt-1" />
              : <p className="text-2xl font-black text-amber-700 sm:text-3xl">{aggStats.totalCoins.toLocaleString()}</p>
            }
            <Coins size={18} className="text-amber-400 opacity-60 flex-shrink-0" />
          </div>
          <p className="mt-0.5 text-xs font-medium text-amber-600 sm:mt-1 sm:text-sm">Total Coins</p>
        </div>

        {/* Successful */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-start justify-between">
            {statsLoading
              ? <Loader2 size={22} className="animate-spin text-green-400 mt-1" />
              : <p className="text-2xl font-black text-green-700 sm:text-3xl">{aggStats.successCount}</p>
            }
            <CheckCircle size={18} className="text-green-400 opacity-60 flex-shrink-0" />
          </div>
          <p className="mt-0.5 text-xs font-medium text-green-600 sm:mt-1 sm:text-sm">Successful</p>
        </div>

        {/* Pending + Failed */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-start justify-between">
            {statsLoading
              ? <Loader2 size={22} className="animate-spin text-neutral-400 mt-1" />
              : <p className="text-2xl font-black text-neutral-700 sm:text-3xl">{pagination.total}</p>
            }
            <CreditCard size={18} className="text-neutral-400 opacity-60 flex-shrink-0" />
          </div>
          <div className="mt-0.5 flex items-center gap-2 sm:mt-1">
            <p className="text-xs font-medium text-neutral-500 sm:text-sm">Total Records</p>
            {!statsLoading && (aggStats.pendingCount > 0 || aggStats.failedCount > 0) && (
              <span className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                <span className="text-amber-500">{aggStats.pendingCount}p</span>
                <span className="text-red-500">{aggStats.failedCount}f</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Toolbar */}
        <div className="border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Filter by user ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button key={value} onClick={() => { setActiveStatus(value); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    activeStatus === value
                      ? 'bg-neutral-900 text-white'
                      : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}>
                  {label}
                </button>
              ))}

              {/* Period filter */}
              <select
                value={period}
                onChange={(e) => {
                  const val = e.target.value;
                  setPeriod(val);
                  setPage(1);
                  if (val !== 'custom') { setCustomFrom(''); setCustomTo(''); }
                }}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
              >
                {PERIOD_FILTERS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>

              <button
                onClick={() => fetchPurchases(page)}
                disabled={loading}
                title="Refresh"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Custom date range — visible only when Custom Range is selected */}
          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
            <button onClick={() => fetchPurchases(page)}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-neutral-100">
                {[
                  { label: 'User ID',     cls: '' },
                  { label: 'Package',     cls: '' },
                  { label: 'Coins',       cls: '' },
                  { label: 'Amount',      cls: '' },
                  { label: 'Status',      cls: '' },
                  { label: 'Order ID',    cls: 'hidden lg:table-cell' },
                  { label: 'Payment ID',  cls: 'hidden xl:table-cell' },
                  { label: 'Date',        cls: 'hidden md:table-cell' },
                ].map(({ label, cls }) => (
                  <th key={label} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5 ${cls}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-50">
              {loading && purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Loader2 size={24} className="mx-auto animate-spin text-neutral-300" />
                    <p className="mt-3 text-sm text-neutral-400">Loading purchases…</p>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <CreditCard size={36} className="mx-auto mb-3 text-neutral-200" />
                    <p className="text-sm font-medium text-neutral-400">No purchases found</p>
                    <p className="mt-1 text-xs text-neutral-300">
                      {activeStatus || debouncedSearch
                        ? 'Try clearing the filters'
                        : 'Purchase records will appear here'}
                    </p>
                  </td>
                </tr>
              ) : (
                purchases.map((p) => {
                  const pkg      = p.packageId ?? {};
                  const orderId  = p.cashfree?.orderId ?? '—';
                  const paymentId = p.cashfree?.paymentId ?? null;

                  return (
                    <tr key={p._id} className="group hover:bg-neutral-50/70 transition-colors">

                      {/* User ID */}
                      <td className="px-4 py-3 sm:px-5">
                        <div className="space-y-0.5">
                          <CopyChip value={p.userId} display={`#${String(p.userId).slice(-10)}`} />
                          <p className="text-[10px] text-neutral-300 font-mono">{p._id.slice(-8)}</p>
                        </div>
                      </td>

                      {/* Package */}
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-start gap-1.5">
                          <Package size={13} className="mt-0.5 flex-shrink-0 text-neutral-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-800">
                              {p.title ?? pkg.title ?? '—'}
                            </p>
                            {p.subtitle && (
                              <p className="text-[10px] text-neutral-400">{p.subtitle}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Coins */}
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                          <Coins size={13} />
                          {(p.coins ?? pkg.coins ?? '—').toLocaleString()}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 sm:px-5">
                        <span className="text-sm font-bold text-neutral-800">
                          {fmtAmount(p.amount)}
                        </span>
                        {p.currency && (
                          <span className="ml-1 text-[10px] text-neutral-400">{p.currency}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 sm:px-5">
                        <StatusBadge status={p.status} />
                      </td>

                      {/* Order ID */}
                      <td className="hidden px-4 py-3 lg:table-cell sm:px-5">
                        <CopyChip value={orderId} display={orderId.length > 32 ? `…${orderId.slice(-20)}` : orderId} />
                      </td>

                      {/* Payment ID */}
                      <td className="hidden px-4 py-3 xl:table-cell sm:px-5">
                        {paymentId
                          ? <CopyChip value={paymentId} display={paymentId} />
                          : <span className="text-xs text-neutral-300">—</span>}
                      </td>

                      {/* Date */}
                      <td className="hidden px-4 py-3 text-xs text-neutral-400 md:table-cell sm:px-5">
                        {fmtDate(p.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <PaginationBar
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          limit={pagination.limit}
          onPage={onPage}
        />

        {/* Footer note */}
        {!loading && purchases.length > 0 && (
          <div className="border-t border-neutral-50 px-4 py-2 sm:px-5">
            <p className="text-xs text-neutral-300">
              {purchases.length} records on this page · {pagination.total} total
              {activeStatus && ` · status: ${activeStatus}`}
              {debouncedSearch && ` · user: ${debouncedSearch}`}
              {period !== 'all' && ` · ${PERIOD_FILTERS.find((p) => p.id === period)?.label ?? period}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManagementSection;
