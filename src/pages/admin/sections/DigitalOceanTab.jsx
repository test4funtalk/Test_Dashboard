import React, { useCallback, useEffect, useState } from 'react';
import {
  Wallet, TrendingUp, PiggyBank, RefreshCw, AlertCircle,
  Loader2, Receipt, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtUSD = (v) =>
  v == null || v === '' ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

const PER_PAGE = 20;

// ─── sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ label, value, loading, Icon, iconClass }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sm font-medium text-neutral-700">{label}</span>
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 ${iconClass}`}>
        <Icon size={15} />
      </div>
    </div>
    <div className="mt-2">
      {loading
        ? <Loader2 size={22} className="animate-spin text-neutral-300" />
        : <span className="text-2xl font-bold text-neutral-900 sm:text-3xl">{value}</span>}
    </div>
  </div>
);

const PaginationBar = ({ page, pages, total, limit, onPage }) => {
  if (pages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
      <p className="text-xs text-neutral-400">{start}–{end} of {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40">
          <ChevronLeft size={14} />
        </button>
        <span className="px-2 text-xs font-medium text-neutral-600">{page} / {pages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── main tab ─────────────────────────────────────────────────────────────────

const DigitalOceanTab = () => {
  const [summary,        setSummary]        = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError,   setSummaryError]   = useState(null);

  const [history,        setHistory]        = useState([]);
  const [historyTotal,   setHistoryTotal]   = useState(0);
  const [page,           setPage]           = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError,   setHistoryError]   = useState(null);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const { data } = await api.get('/api/admin/billing/summary');
      setSummary(data?.data ?? null);
    } catch (err) {
      setSummaryError(err.response?.data?.message || err.message || 'Failed to load DigitalOcean balance');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (targetPage = 1) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data } = await api.get('/api/admin/billing/history', {
        params: { page: targetPage, per_page: PER_PAGE },
      });
      const rows = Array.isArray(data?.data?.billing_history) ? data.data.billing_history : [];
      setHistory(rows);
      setHistoryTotal(data?.data?.meta?.total ?? rows.length);
      setPage(targetPage);
    } catch (err) {
      setHistoryError(err.response?.data?.message || err.message || 'Failed to load DigitalOcean billing history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const refreshAll = () => { fetchSummary(); fetchHistory(page); };

  const pages = Math.max(Math.ceil(historyTotal / PER_PAGE), 1);

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Account Balance"
          value={fmtUSD(summary?.account_balance)}
          loading={summaryLoading}
          Icon={Wallet}
          iconClass="text-neutral-900"
        />
        <StatCard
          label="Month-to-Date Usage"
          value={fmtUSD(summary?.month_to_date_usage)}
          loading={summaryLoading}
          Icon={TrendingUp}
          iconClass="text-amber-600"
        />
        <StatCard
          label="Month-to-Date Balance"
          value={fmtUSD(summary?.month_to_date_balance)}
          loading={summaryLoading}
          Icon={PiggyBank}
          iconClass="text-green-600"
        />
      </div>

      {summaryError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
          <span className="flex items-center gap-2"><AlertCircle size={14} />{summaryError}</span>
          <button onClick={fetchSummary}
            className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">
            Retry
          </button>
        </div>
      )}

      {summary?.generated_at && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Clock size={12} /> Balance as of {fmtDate(summary.generated_at)}
        </p>
      )}

      {/* History table card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="text-sm font-semibold text-neutral-800">Billing History</p>
            <p className="text-xs text-neutral-400">Charges and payments on your DigitalOcean account</p>
          </div>
          <button
            onClick={refreshAll}
            disabled={historyLoading || summaryLoading}
            title="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
          >
            <RefreshCw size={13} className={(historyLoading || summaryLoading) ? 'animate-spin' : ''} />
          </button>
        </div>

        {historyError && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{historyError}</span>
            <button onClick={() => fetchHistory(page)}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-neutral-100">
                {['Date', 'Description', 'Type', 'Category', 'Amount'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-50">
              {historyLoading && history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={24} className="mx-auto animate-spin text-neutral-300" />
                    <p className="mt-3 text-sm text-neutral-400">Loading billing history…</p>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Receipt size={36} className="mx-auto mb-3 text-neutral-200" />
                    <p className="text-sm font-medium text-neutral-400">No billing history yet</p>
                  </td>
                </tr>
              ) : (
                history.map((h, i) => (
                  <tr key={h.invoice_uuid || h.invoice_id || i} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="px-4 py-3 text-xs text-neutral-500 sm:px-5">{fmtDate(h.date)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-800 sm:px-5">{h.description || '—'}</td>
                    <td className="px-4 py-3 sm:px-5">
                      <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                        {h.type || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400 sm:px-5">{h.category || '—'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-neutral-800 sm:px-5">{fmtUSD(h.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar page={page} pages={pages} total={historyTotal} limit={PER_PAGE} onPage={fetchHistory} />
      </div>
    </div>
  );
};

export default DigitalOceanTab;
