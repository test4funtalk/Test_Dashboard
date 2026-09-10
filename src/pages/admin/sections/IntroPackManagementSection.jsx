import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles, Coins, Users, PhoneCall, MessageCircle, Clock,
  RefreshCw, AlertCircle, Loader2, Plus, Pencil, ToggleLeft, ToggleRight,
  CheckCircle, X, Search, ChevronLeft, ChevronRight, TrendingUp,
  PackageX, Gauge, CreditCard, IndianRupee, XCircle, Hourglass,
} from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-IN');

const fmtAmount = (n) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDuration = (secs) => {
  const s = Number(secs ?? 0);
  if (!s) return '0s';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
};

const STATUS_STYLES = {
  success:  'bg-green-100  text-green-700  border-green-200',
  pending:  'bg-amber-100  text-amber-700  border-amber-200',
  failed:   'bg-red-100    text-red-700    border-red-200',
  refunded: 'bg-blue-100   text-blue-700   border-blue-200',
};

// Same preset list/behavior as PaymentManagementSection's period filter — kept
// local since this codebase duplicates it per-section rather than sharing one.
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

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[s] || 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
      {s || '—'}
    </span>
  );
};

// Same shape/behavior as the PaginationBar in PaymentManagementSection — kept
// local since this codebase duplicates it per-section rather than sharing one.
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

const StatCard = ({ label, value, Icon, loading, tint = 'text-neutral-900', caption }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sm font-medium text-neutral-700">{label}</span>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
        <Icon size={15} />
      </div>
    </div>
    <div className="mt-2">
      {loading
        ? <Loader2 size={22} className="animate-spin text-neutral-300" />
        : <span className={`text-2xl font-bold sm:text-3xl ${tint}`}>{value}</span>}
    </div>
    {caption && <p className="mt-2 text-xs text-neutral-400">{caption}</p>}
  </div>
);

const SECTION_TABS = [
  { id: 'overview',     label: 'Overview',       Icon: TrendingUp   },
  { id: 'hostProgress', label: 'Host Progress',  Icon: PhoneCall    },
  { id: 'purchases',    label: 'Redemptions',    Icon: CreditCard   },
  { id: 'configure',    label: 'Configure Pack', Icon: Sparkles     },
];

// ─── Overview tab ───────────────────────────────────────────────────────────────

const OverviewTab = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [rows, setRows]             = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100, pages: 0 });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError]     = useState(null);
  const [page, setPage]             = useState(1);

  const [totalAmount, setTotalAmount]     = useState(0);
  const [amountLoading, setAmountLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/intro-pack/overview');
      setData(data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load intro-pack overview');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuccessPayments = useCallback(async (targetPage = 1) => {
    setPayLoading(true);
    setPayError(null);
    try {
      const params = { page: targetPage, limit: 100, isIntroPack: true, status: 'success' };
      const { data } = await api.get('/api/purchase/admin/all', { params });
      const list = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};
      setRows(list);
      setPagination({
        total: pg.total ?? list.length,
        page:  pg.page  ?? targetPage,
        limit: pg.limit ?? 100,
        pages: pg.pages ?? Math.ceil((pg.total ?? list.length) / 100),
      });
    } catch (err) {
      setPayError(err.response?.data?.message || 'Failed to load success payments');
    } finally {
      setPayLoading(false);
    }
  }, []);

  // Paginates through every successful intro-pack payment to sum the true total —
  // same approach as PurchasesTab's fetchAggStats (the table above only ever
  // holds one page of rows, so summing `rows` would undercount).
  const fetchTotalAmount = useCallback(async () => {
    setAmountLoading(true);
    try {
      const baseParams = { limit: 100, isIntroPack: true, status: 'success' };
      let curPage = 1;
      let totalPages = 1;
      let sum = 0;
      const MAX_PAGES = 9999999;

      do {
        const { data } = await api.get('/api/purchase/admin/all', { params: { ...baseParams, page: curPage } });
        const list = Array.isArray(data?.data) ? data.data : [];
        const pg   = data?.pagination ?? {};
        totalPages = pg.pages ?? 1;
        list.forEach((r) => { sum += r.amount ?? 0; });
        if (list.length === 0) break;
        curPage++;
      } while (curPage <= totalPages && curPage <= MAX_PAGES);

      setTotalAmount(sum);
    } catch {
      // total silently stays at previous value on error
    } finally {
      setAmountLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { fetchSuccessPayments(page); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fetchSuccessPayments]);
  useEffect(() => { fetchTotalAmount(); }, [fetchTotalAmount]);

  const onPage = (n) => { setPage(n); fetchSuccessPayments(n); };
  const refreshAll = () => { fetchOverview(); fetchSuccessPayments(page); fetchTotalAmount(); };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-400">The real cost of the intro-offer promo — coins issued vs. actually consumed.</p>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} /> {error}</span>
          <button onClick={fetchOverview} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Users Redeemed"     value={fmtNum(data?.totalRedeemed)}          Icon={Users}       loading={loading && !data} caption="Successful intro-pack purchases" />
        <StatCard label="Coins Issued"       value={fmtNum(data?.totalCoinsIssued)}       Icon={Coins}       loading={loading && !data} caption="Total intro coins ever credited" tint="text-amber-600" />
        <StatCard label="Consumed by Calls"  value={fmtNum(data?.consumedByCalls)}        Icon={PhoneCall}   loading={loading && !data} caption="Intro coins spent on calls" />
        <StatCard label="Consumed by Chat"   value={fmtNum(data?.consumedByChat)}         Icon={MessageCircle} loading={loading && !data} caption="Intro coins spent on chat messages" />
        <StatCard label="Remaining (Active)" value={fmtNum(data?.remainingOnActivePacks)} Icon={Gauge}       loading={loading && !data} caption="Still sitting on active user wallets" tint="text-blue-600" />
        <StatCard label="Unused / Lapsed"    value={fmtNum(data?.unusedCoins)}            Icon={PackageX}    loading={loading && !data} caption="Issued, forfeited on recharge, never spent" tint="text-red-600" />
      </div>

      {/* Success payments */}
      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <p className="text-sm font-semibold text-neutral-800">Success Payments</p>
          <div className="flex flex-shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <IndianRupee size={14} className="text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                {amountLoading ? <Loader2 size={14} className="animate-spin text-green-400" /> : fmtAmount(totalAmount)}
              </span>
            </div>
            <button
              onClick={() => { fetchSuccessPayments(page); fetchTotalAmount(); }}
              disabled={payLoading}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-40"
            >
              <RefreshCw size={13} className={payLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {payError && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{payError}</span>
            <button onClick={() => fetchSuccessPayments(page)} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">Retry</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-neutral-100">
                {['User', 'Coins', 'Amount', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {payLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <Loader2 size={24} className="mx-auto animate-spin text-neutral-300" />
                    <p className="mt-3 text-sm text-neutral-400">Loading success payments…</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <CreditCard size={36} className="mx-auto mb-3 text-neutral-200" />
                    <p className="text-sm font-medium text-neutral-400">No successful intro-pack payments yet</p>
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const user = typeof p.userId === 'object' && p.userId !== null ? p.userId : null;
                  return (
                    <tr key={p._id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-4 py-3 sm:px-5">
                        <p className="text-sm font-medium text-neutral-800">{p.username || user?.username || '—'}</p>
                        <p className="text-xs text-neutral-400">{p.phone || user?.phone || '—'}</p>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                          <Coins size={13} /> {fmtNum(p.coins)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-neutral-800 sm:px-5">{fmtAmount(p.amount)}</td>
                      <td className="px-4 py-3 text-xs text-neutral-400 sm:px-5">{fmtDate(p.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={onPage} />
      </div>
    </div>
  );
};

// ─── Configure tab — the singleton intro-pack package ──────────────────────────

const EMPTY_INTRO_FORM = { title: 'Intro Offer', subtitle: 'One-time new user offer', coins: '600', amount: '5', actualAmount: '', currency: 'INR' };

const IntroPackFormModal = ({ title, form, onChange, onSubmit, onClose, loading, error, isEdit }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
    <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <p className="font-semibold">{title}</p>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
          <X size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-5 py-3 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange('title', e.target.value)}
            required
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Subtitle</label>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => onChange('subtitle', e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Coins <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.coins}
              onChange={(e) => onChange('coins', e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Price <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => onChange('amount', e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Actual amount <span className="normal-case text-neutral-400">(MRP, optional — must be ≥ price)</span>
          </label>
          <input
            type="number"
            min="1"
            value={form.actualAmount}
            onChange={(e) => onChange('actualAmount', e.target.value)}
            placeholder="Leave blank if no discount"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => onChange('currency', e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
          >
            {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {!isEdit && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            <Sparkles size={14} className="mt-0.5 flex-shrink-0" />
            <span>Only one intro pack can exist at a time. Once created, price and coins can still be edited any time — this won't change what users who already redeemed it received.</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-sm font-medium text-white transition hover:opacity-80 disabled:opacity-50"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><CheckCircle size={14} /> {isEdit ? 'Save Changes' : 'Create Intro Pack'}</>}
          </button>
        </div>
      </form>
    </div>
  </div>
);

const ConfigureTab = () => {
  const [pkg, setPkg]         = useState(undefined); // undefined = loading, null = none exists
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState(EMPTY_INTRO_FORM);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError]     = useState(null);

  const [toggleLoading, setToggleLoading] = useState(false);

  const fetchPack = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/packages/admin/getallPackage');
      const list = Array.isArray(data?.data) ? data.data : [];
      setPkg(list.find((p) => p.isIntroPack) ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPack(); }, [fetchPack]);

  const openCreate = () => {
    setForm(EMPTY_INTRO_FORM);
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = () => {
    setForm({
      title:        pkg.title    ?? '',
      subtitle:     pkg.subtitle ?? '',
      coins:        pkg.coins    ?? '',
      amount:       pkg.amount   ?? '',
      actualAmount: pkg.actualAmount ?? '',
      currency:     pkg.currency ?? 'INR',
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      const payload = {
        title:        form.title.trim(),
        subtitle:     form.subtitle.trim() || undefined,
        coins:        Number(form.coins),
        amount:       Number(form.amount),
        actualAmount: form.actualAmount !== '' ? Number(form.actualAmount) : (pkg ? null : undefined),
        currency:     form.currency || 'INR',
      };

      if (pkg) {
        const { data } = await api.put(`/api/packages/admin/updatePackage/${pkg._id}`, payload);
        setPkg(data?.data ?? { ...pkg, ...payload });
      } else {
        const { data } = await api.post('/api/packages/admin/createPackage', { ...payload, isIntroPack: true });
        setPkg(data?.data ?? null);
      }
      setShowModal(false);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save intro pack');
    } finally {
      setModalLoading(false);
    }
  };

  const toggleActive = async () => {
    if (!pkg) return;
    setToggleLoading(true);
    try {
      const { data } = await api.put(`/api/packages/admin/updatePackage/${pkg._id}`, { isActive: !(pkg.isActive !== false) });
      setPkg(data?.data ?? { ...pkg, isActive: !(pkg.isActive !== false) });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading && pkg === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-neutral-400">
        <Loader2 size={20} className="animate-spin" /> Loading intro pack…
      </div>
    );
  }

  const isActive = pkg?.isActive !== false;
  const hasDiscount = pkg?.actualAmount != null && pkg?.amount != null && pkg.actualAmount > pkg.amount;
  const discountPct = hasDiscount ? Math.round((1 - pkg.amount / pkg.actualAmount) * 100) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} /> {error}</span>
          <button onClick={fetchPack} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium">Retry</button>
        </div>
      )}

      {!pkg ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-16 text-center">
          <Sparkles size={36} className="mx-auto mb-3 text-neutral-200" />
          <p className="text-sm font-medium text-neutral-500">No intro pack configured yet</p>
          <p className="mt-1 text-xs text-neutral-400">Create the one-time offer users see the first time they open the wallet.</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-80"
          >
            <Plus size={15} /> Create Intro Pack
          </button>
        </div>
      ) : (
        <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${isActive ? 'border-neutral-200' : 'border-neutral-200 opacity-60 grayscale-[15%]'}`}>
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 bg-neutral-50/60 px-5 py-3">
            <span className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
              <Sparkles size={11} /> Intro Offer — singleton package
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={openEdit}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-white hover:text-neutral-900 hover:shadow-sm"
                title="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={toggleActive}
                disabled={toggleLoading}
                className={`transition disabled:opacity-40 ${isActive ? 'text-green-600' : 'text-neutral-300'}`}
                title={isActive ? 'Deactivate' : 'Activate'}
              >
                {isActive ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <p className="text-lg font-bold text-neutral-900">{pkg.title}</p>
              {pkg.subtitle && <p className="mt-0.5 text-sm text-neutral-400">{pkg.subtitle}</p>}
              <div className="mt-4 flex items-center gap-1.5 text-xl font-bold text-neutral-800">
                <Coins size={20} className="text-amber-500" />
                {fmtNum(pkg.coins)} intro coins
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                {hasDiscount && (
                  <>
                    <p className="text-sm font-medium text-neutral-400 line-through">{pkg.currency} {pkg.actualAmount}</p>
                    <span className="rounded bg-green-100 px-1 py-0.5 text-[9px] font-bold text-green-700">-{discountPct}%</span>
                  </>
                )}
                <p className="text-2xl font-black text-neutral-900">{pkg.currency} {pkg.amount}</p>
              </div>
              <div className="mt-4">
                {isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active — visible to eligible users
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" /> Inactive — hidden from users
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-neutral-50 p-4 text-xs text-neutral-500">
              <p className="mb-2 font-semibold uppercase tracking-wide text-neutral-400">How this works</p>
              <ul className="space-y-1.5 list-disc pl-4">
                <li>Redeemable once per user, gated by <code className="text-neutral-700">redeemFirstoffer</code>.</li>
                <li>Spendable on calls and chat text messages to hosts only — never gifts.</li>
                <li>Hosts earn no cash while a call/message is billed from it — only progress.</li>
                <li>Buying any normal coin package forfeits whatever intro coins remain.</li>
                <li>Editing price/coins here takes effect on the <em>next</em> purchase — it never rewrites a purchase or wallet credit that already happened.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <IntroPackFormModal
          title={pkg ? `Edit "${pkg.title}"` : 'New Intro Pack'}
          form={form}
          onChange={(key, val) => setForm((f) => ({ ...f, [key]: val }))}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          loading={modalLoading}
          error={modalError}
          isEdit={Boolean(pkg)}
        />
      )}
    </div>
  );
};

// ─── Host Progress tab ──────────────────────────────────────────────────────────

const HostProgressTab = () => {
  const navigate = useNavigate();
  const goToHostProfile = useCallback((id) => {
    if (!id) return;
    navigate(`/admindashboard?tab=users&usersTab=hosts&userId=${id}`);
  }, [navigate]);

  const [rows, setRows]           = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100, pages: 0 });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [period,     setPeriod]     = useState('today');
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

  const fetchProgress = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: targetPage, limit: 100,
        ...getPeriodParams(period, customFrom, customTo),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await api.get('/api/admin/intro-pack/host-progress', { params });
      const list = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};
      setRows(list);
      setPagination({
        total: pg.total ?? list.length,
        page:  pg.page  ?? targetPage,
        limit: pg.limit ?? 100,
        pages: pg.pages ?? Math.ceil((pg.total ?? list.length) / 100),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load host progress');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, period, customFrom, customTo]);

  useEffect(() => { fetchProgress(page); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fetchProgress]);

  const onPage = (n) => { setPage(n); fetchProgress(n); };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by host username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
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
              onClick={() => fetchProgress(page)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
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

      {error && (
        <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
          <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
          <button onClick={() => fetchProgress(page)} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">Retry</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-neutral-100">
              {['Host', 'Minutes Served', 'Calls Served', 'Letters Served', 'Messages Served'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <Loader2 size={24} className="mx-auto animate-spin text-neutral-300" />
                  <p className="mt-3 text-sm text-neutral-400">Loading host progress…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <PhoneCall size={36} className="mx-auto mb-3 text-neutral-200" />
                  <p className="text-sm font-medium text-neutral-400">No intro-pack activity yet</p>
                  <p className="mt-1 text-xs text-neutral-300">Hosts will appear here once an intro-pack call or message is billed</p>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.hostId} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="px-4 py-3 sm:px-5">
                    <div
                      className="group flex cursor-pointer items-center gap-2.5"
                      onClick={() => goToHostProfile(r.hostId)}
                      title="View host profile"
                    >
                      <div className="flex-shrink-0 rounded-full transition group-hover:ring-2 group-hover:ring-neutral-900">
                        <AvatarDisplay src={r.avatar} name={r.username} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 group-hover:underline">{r.username || '—'}</p>
                        <p className="truncate text-xs text-neutral-400">{r.phone || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                      <Clock size={13} className="text-neutral-400" />
                      {fmtDuration(r.secondsServed)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 sm:px-5">{fmtNum(r.callsServed)}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600 sm:px-5">{fmtNum(r.lettersServed)}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600 sm:px-5">{fmtNum(r.messagesServed)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={onPage} />
    </div>
  );
};

// ─── Redemptions (purchases) tab ────────────────────────────────────────────────

const PURCHASE_STATUS_FILTERS = [
  { value: '',          label: 'All'      },
  { value: 'success',   label: 'Success'  },
  { value: 'pending',   label: 'Pending'  },
  { value: 'failed',    label: 'Failed'   },
  { value: 'refunded',  label: 'Refunded' },
];

const PurchasesTab = () => {
  const [rows, setRows]             = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100, pages: 0 });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [status, setStatus]         = useState('success');
  const [page, setPage]             = useState(1);
  const [period,     setPeriod]     = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const [aggStats, setAggStats] = useState({ total: 0, successCount: 0, pendingCount: 0, failedCount: 0, totalAmount: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchPurchases = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: targetPage, limit: 100, isIntroPack: true,
        ...getPeriodParams(period, customFrom, customTo),
      };
      if (status) params.status = status;
      const { data } = await api.get('/api/purchase/admin/all', { params });
      const list = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};
      setRows(list);
      setPagination({
        total: pg.total ?? list.length,
        page:  pg.page  ?? targetPage,
        limit: pg.limit ?? 100,
        pages: pg.pages ?? Math.ceil((pg.total ?? list.length) / 100),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load intro-pack redemptions');
    } finally {
      setLoading(false);
    }
  }, [status, period, customFrom, customTo]);

  // Paginates through every filtered record to compute accurate totals — same
  // approach as PaymentManagementSection's fetchAggStats.
  const fetchAggStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const baseParams = {
        limit: 100, isIntroPack: true,
        ...getPeriodParams(period, customFrom, customTo),
      };
      if (status) baseParams.status = status;

      let curPage = 1;
      let totalPages = 1;
      let total = 0;
      let totalAmount = 0;
      let successCount = 0;
      let pendingCount = 0;
      let failedCount  = 0;
      const MAX_PAGES = 9999999;

      do {
        const { data } = await api.get('/api/purchase/admin/all', { params: { ...baseParams, page: curPage } });
        const list = Array.isArray(data?.data) ? data.data : [];
        const pg   = data?.pagination ?? {};
        totalPages = pg.pages ?? 1;
        total      = pg.total ?? total + list.length;

        list.forEach((r) => {
          totalAmount += r.amount ?? 0;
          if (r.status === 'success') successCount++;
          else if (r.status === 'pending') pendingCount++;
          else if (r.status === 'failed')  failedCount++;
        });

        if (list.length === 0) break;
        curPage++;
      } while (curPage <= totalPages && curPage <= MAX_PAGES);

      setAggStats({ total, successCount, pendingCount, failedCount, totalAmount });
    } catch {
      // stats silently stay at previous values on error
    } finally {
      setStatsLoading(false);
    }
  }, [status, period, customFrom, customTo]);

  // Single effect keyed off fetchPurchases' identity: it changes whenever
  // `status` changes, which re-runs this with the fresh filter. Status
  // clicks reset `page` directly (not from inside an effect) so the reset
  // is already committed by the time this fires — one fetch per change,
  // not two. Same pattern as PaymentManagementSection.
  useEffect(() => { fetchPurchases(page); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fetchPurchases]);
  useEffect(() => { fetchAggStats(); }, [fetchAggStats]);

  const onStatusClick = (val) => { setStatus(val); setPage(1); };
  const onPage = (n) => { setPage(n); fetchPurchases(n); };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <StatCard label="Total"   value={statsLoading ? '—' : fmtNum(aggStats.total)}         Icon={CreditCard} loading={statsLoading && aggStats.total === 0} />
        <StatCard label="Success" value={statsLoading ? '—' : fmtNum(aggStats.successCount)}  Icon={CheckCircle} loading={statsLoading && aggStats.total === 0} tint="text-green-600" />
        <StatCard label="Pending" value={statsLoading ? '—' : fmtNum(aggStats.pendingCount)}  Icon={Hourglass}  loading={statsLoading && aggStats.total === 0} tint="text-amber-600" />
        <StatCard label="Failed"  value={statsLoading ? '—' : fmtNum(aggStats.failedCount)}   Icon={XCircle}    loading={statsLoading && aggStats.total === 0} tint="text-red-600" />
        <StatCard label="Amount"  value={statsLoading ? '—' : fmtAmount(aggStats.totalAmount)} Icon={IndianRupee} loading={statsLoading && aggStats.total === 0} />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {PURCHASE_STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value || 'all'}
                onClick={() => onStatusClick(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  status === value ? 'bg-neutral-900 text-white' : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
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
              onClick={() => { fetchPurchases(page); fetchAggStats(); }}
              disabled={loading}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
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

      {error && (
        <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
          <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
          <button onClick={() => fetchPurchases(page)} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">Retry</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="border-b border-neutral-100">
              {['User', 'Coins', 'Amount', 'Status', 'Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <Loader2 size={24} className="mx-auto animate-spin text-neutral-300" />
                  <p className="mt-3 text-sm text-neutral-400">Loading redemptions…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <CreditCard size={36} className="mx-auto mb-3 text-neutral-200" />
                  <p className="text-sm font-medium text-neutral-400">No intro-pack redemptions found</p>
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const user = typeof p.userId === 'object' && p.userId !== null ? p.userId : null;
                return (
                  <tr key={p._id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="px-4 py-3 sm:px-5">
                      <p className="text-sm font-medium text-neutral-800">{p.username || user?.username || '—'}</p>
                      <p className="text-xs text-neutral-400">{p.phone || user?.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                        <Coins size={13} /> {fmtNum(p.coins)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-neutral-800 sm:px-5">{fmtAmount(p.amount)}</td>
                    <td className="px-4 py-3 sm:px-5"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-neutral-400 sm:px-5">{fmtDate(p.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={onPage} />
      </div>
    </div>
  );
};

// ─── main section ─────────────────────────────────────────────────────────────

const VALID_INTRO_TABS = new Set(SECTION_TABS.map((t) => t.id));

// A distinct search-param key from other sections' own sub-tab keys (e.g.
// ChatManagementSection's `chatTab`) — reusing one would leak state between
// sections when an admin switches between them.
const IntroPackManagementSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = VALID_INTRO_TABS.has(searchParams.get('introTab')) ? searchParams.get('introTab') : 'overview';

  const setTab = (id) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (id === 'overview') p.delete('introTab'); else p.set('introTab', id);
      return p;
    }, { replace: true });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
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

      {tab === 'overview'     && <OverviewTab />}
      {tab === 'configure'    && <ConfigureTab />}
      {tab === 'hostProgress' && <HostProgressTab />}
      {tab === 'purchases'    && <PurchasesTab />}
    </div>
  );
};

export default IntroPackManagementSection;
