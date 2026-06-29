import React, { useState, useEffect, useCallback } from 'react';
import {
  Banknote, IndianRupee, Percent, Plus, Minus, Trash2, RefreshCw, Search,
  ChevronLeft, ChevronRight, AlertCircle, AlertTriangle, Loader2, X, Check, Ban, Pencil,
  Landmark, FileText, Download, Receipt, Settings2, Wallet, TrendingUp, Gift,
} from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (amount) => {
  if (amount == null) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(amount));
};

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDeduction = (d) => (d.type === 'percent' ? `${d.value}%` : fmtINR(d.value));

// A deduction rule named like "Platform Fee" or "GST" double-charges the host —
// those are already deducted via the dedicated platformFeePercent/gstPercent fields.
const OVERLAP_LABEL_RE = /platform\s*fee|\bgst\b/i;
const isOverlapDeduction = (label) => OVERLAP_LABEL_RE.test(label || '');

const STATUS_STYLES = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_FILTERS = [
  { value: '',         label: 'All'      },
  { value: 'pending',  label: 'Pending'  },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const PERIOD_FILTERS = [
  { value: '',            label: 'All'        },
  { value: 'today',       label: 'Today'      },
  { value: 'yesterday',   label: 'Yesterday'  },
  { value: 'thisWeek',    label: 'This Week'  },
  { value: 'thisMonth',   label: 'This Month' },
  { value: 'last6Months', label: 'Last 6mo'   },
];

const DEDUCTION_TYPES = [
  { value: 'percent', label: '% of gross' },
  { value: 'flat',    label: '₹ flat'      },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || 'bg-neutral-100 text-neutral-600'}`}>
    {status || '—'}
  </span>
);

// ─── checkout config card (min amount, GST, deductions) ────────────────────────

const CheckoutConfigCard = () => {
  const [config, setConfig]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [minAmount, setMinAmount]             = useState('');
  const [gstPercent, setGstPercent]           = useState('');
  const [platformFeePercent, setPlatformFeePercent] = useState('');
  const [savingMeta, setSavingMeta]   = useState(false);
  const [metaError, setMetaError]     = useState(null);
  const [metaSaved, setMetaSaved]     = useState(false);

  const [newLabel, setNewLabel]     = useState('');
  const [newType, setNewType]       = useState('percent');
  const [newValue, setNewValue]     = useState('');
  const [newReason, setNewReason]   = useState('');
  const [newHostId, setNewHostId]   = useState('');
  const [addingDeduction, setAddingDeduction] = useState(false);
  const [deductionError, setDeductionError]   = useState(null);

  const [deletingId, setDeletingId]   = useState(null);
  const [hostFilter, setHostFilter]   = useState('');

  const [editingId, setEditingId]       = useState(null);
  const [editLabel, setEditLabel]       = useState('');
  const [editType, setEditType]         = useState('percent');
  const [editValue, setEditValue]       = useState('');
  const [editReason, setEditReason]     = useState('');
  const [editHostId, setEditHostId]     = useState('');
  const [savingEditId, setSavingEditId] = useState(null);
  const [editError, setEditError]       = useState(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/checkout-config');
      const cfg = data?.data ?? null;
      setConfig(cfg);
      setMinAmount(cfg?.minCheckoutAmount ?? '');
      setGstPercent(cfg?.gstPercent ?? '');
      setPlatformFeePercent(cfg?.platformFeePercent ?? '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load checkout config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveMeta = async () => {
    setSavingMeta(true);
    setMetaError(null);
    setMetaSaved(false);
    try {
      const { data } = await api.put('/api/admin/checkout-config', {
        minCheckoutAmount:  minAmount === '' ? undefined : Number(minAmount),
        gstPercent:         gstPercent === '' ? undefined : Number(gstPercent),
        platformFeePercent: platformFeePercent === '' ? undefined : Number(platformFeePercent),
      });
      setConfig(data?.data ?? config);
      setMetaSaved(true);
      setTimeout(() => setMetaSaved(false), 2000);
    } catch (err) {
      setMetaError(err.response?.data?.message || 'Failed to update checkout config');
    } finally {
      setSavingMeta(false);
    }
  };

  const addDeduction = async () => {
    if (!newLabel.trim() || newValue === '') {
      setDeductionError('Label and value are required');
      return;
    }
    if (newHostId.trim() && newHostId.trim().length !== 24) {
      setDeductionError('Host ID must be a valid 24-character ID, or left blank for a global deduction');
      return;
    }
    setAddingDeduction(true);
    setDeductionError(null);
    try {
      const { data } = await api.post('/api/admin/checkout-config/deductions', {
        label:  newLabel.trim(),
        type:   newType,
        value:  Number(newValue),
        reason: newReason.trim(),
        hostId: newHostId.trim() || undefined,
      });
      setConfig(data?.data ?? config);
      setNewLabel(''); setNewValue(''); setNewReason(''); setNewType('percent'); setNewHostId('');
    } catch (err) {
      setDeductionError(err.response?.data?.message || 'Failed to add deduction');
    } finally {
      setAddingDeduction(false);
    }
  };

  const removeDeduction = async (id) => {
    setDeletingId(id);
    try {
      const { data } = await api.delete(`/api/admin/checkout-config/deductions/${id}`);
      setConfig(data?.data ?? config);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove deduction');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (d) => {
    setEditingId(d._id);
    setEditLabel(d.label);
    setEditType(d.type);
    setEditValue(String(d.value));
    setEditReason(d.reason || '');
    setEditHostId(d.hostId?._id ?? d.hostId ?? '');
    setEditError(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditError(null); };

  const saveEdit = async (id) => {
    if (!editLabel.trim() || editValue === '') {
      setEditError('Label and value are required');
      return;
    }
    if (editHostId.trim() && editHostId.trim().length !== 24) {
      setEditError('Host ID must be a valid 24-character ID, or left blank for a global deduction');
      return;
    }
    setSavingEditId(id);
    setEditError(null);
    try {
      const { data } = await api.put(`/api/admin/checkout-config/deductions/${id}`, {
        label:  editLabel.trim(),
        type:   editType,
        value:  Number(editValue),
        reason: editReason.trim(),
        hostId: editHostId.trim() || null,
      });
      setConfig(data?.data ?? config);
      setEditingId(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update deduction');
    } finally {
      setSavingEditId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 size={15} className="text-neutral-400" />
          <p className="text-sm font-semibold text-neutral-800">Checkout Config</p>
        </div>
        <button onClick={loadConfig} disabled={loading} title="Refresh"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-40">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !config ? (
        <div className="flex items-center justify-center gap-2 py-10 text-neutral-400">
          <Loader2 size={18} className="animate-spin" /> Loading config…
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
          <button onClick={loadConfig} className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium">Retry</button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* min amount + gst + platform fee */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">Min Checkout Amount</label>
              <div className="relative">
                <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="number" min="0" value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">GST %</label>
              <div className="relative">
                <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="number" min="0" max="100" value={gstPercent}
                  onChange={(e) => setGstPercent(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">Platform Fee %</label>
              <div className="relative">
                <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="number" min="0" max="100" value={platformFeePercent}
                  onChange={(e) => setPlatformFeePercent(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={saveMeta}
                disabled={savingMeta}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {savingMeta && <Loader2 size={13} className="animate-spin" />}
                {savingMeta ? 'Saving…' : metaSaved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          </div>
          {metaError && (
            <p className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle size={12} /> {metaError}
            </p>
          )}

          {/* deductions list */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Deductions</p>
              <input
                placeholder="Filter by host ID…"
                value={hostFilter}
                onChange={(e) => setHostFilter(e.target.value)}
                className="w-44 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-mono outline-none focus:border-neutral-400"
              />
            </div>
            {config?.deductions?.length ? (
              (() => {
                const visible = hostFilter.trim()
                  ? config.deductions.filter((d) => !d.hostId || (d.hostId?._id ?? d.hostId) === hostFilter.trim())
                  : config.deductions;
                return visible.length ? (
                  <div className="divide-y divide-neutral-50 rounded-xl border border-neutral-100">
                    {visible.map((d) => (
                      editingId === d._id ? (
                        <div key={d._id} className="space-y-2 bg-neutral-50 px-3 py-3">
                          <div className="grid gap-2 sm:grid-cols-5">
                            <input
                              placeholder="Label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
                            />
                            <select
                              value={editType} onChange={(e) => setEditType(e.target.value)}
                              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
                            >
                              {DEDUCTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <input
                              type="number" min="0" placeholder="Value" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
                            />
                            <input
                              placeholder="Reason (optional)" value={editReason} onChange={(e) => setEditReason(e.target.value)}
                              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
                            />
                            <input
                              placeholder="Host ID (blank = global)" value={editHostId} onChange={(e) => setEditHostId(e.target.value)}
                              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm font-mono outline-none focus:border-neutral-400"
                            />
                          </div>
                          {editError && (
                            <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={12} /> {editError}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(d._id)}
                              disabled={savingEditId === d._id}
                              className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                            >
                              {savingEditId === d._id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                            </button>
                            <button onClick={cancelEdit}
                              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-white">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={d._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-medium text-neutral-800">
                              {d.label} <span className="text-neutral-400">— {fmtDeduction(d)}</span>
                              {d.hostId ? (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  Host: {d.hostId?.username ? `@${d.hostId.username}` : (d.hostId?._id ?? d.hostId)}
                                </span>
                              ) : (
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">Global</span>
                              )}
                            </p>
                            {d.reason && <p className="truncate text-xs text-neutral-400">{d.reason}</p>}
                            {isOverlapDeduction(d.label) && (
                              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                <AlertTriangle size={11} /> Duplicates the dedicated {OVERLAP_LABEL_RE.exec(d.label)?.[0]?.toLowerCase().includes('gst') ? 'GST %' : 'Platform Fee %'} field above — host is charged this twice. Consider deleting this rule.
                              </p>
                            )}
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1.5">
                            <button
                              onClick={() => startEdit(d)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 hover:bg-neutral-50"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => removeDeduction(d._id)}
                              disabled={deletingId === d._id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                            >
                              {deletingId === d._id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-center text-sm text-neutral-400">No deductions for this host</p>
                );
              })()
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-center text-sm text-neutral-400">No deductions configured</p>
            )}
          </div>

          {/* add deduction */}
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Add Deduction</p>
            <div className="grid gap-2 sm:grid-cols-5">
              <input
                placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <select
                value={newType} onChange={(e) => setNewType(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              >
                {DEDUCTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                type="number" min="0" placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <input
                placeholder="Reason (optional)" value={newReason} onChange={(e) => setNewReason(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <input
                placeholder="Host ID (optional)" value={newHostId} onChange={(e) => setNewHostId(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono outline-none focus:border-neutral-400"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-neutral-400">Leave Host ID blank to apply this deduction to every host. Set it to scope the deduction to one host only — it stacks on top of global deductions.</p>
            {isOverlapDeduction(newLabel) && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <AlertTriangle size={11} /> This overlaps with the dedicated GST %/Platform Fee % fields above — adding it will charge the host twice.
              </p>
            )}
            {deductionError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={12} /> {deductionError}</p>
            )}
            <button
              onClick={addDeduction}
              disabled={addingDeduction}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-white disabled:opacity-50"
            >
              {addingDeduction ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add Deduction
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── host wallet lookup & manual correction ────────────────────────────────────

const CASH_PRESET_AMOUNTS = [100, 500, 1000, 5000, 10000];

const HostWalletCard = () => {
  const [hostId, setHostId]   = useState('');
  const [wallet, setWallet]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [type, setType]               = useState('add');
  const [amount, setAmount]           = useState('');
  const [note, setNote]               = useState('');
  const [adjusting, setAdjusting]     = useState(false);
  const [adjustError, setAdjustError] = useState(null);
  const [adjustSuccess, setAdjustSuccess] = useState(null);

  const [history, setHistory]               = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError]     = useState(null);

  const canLookup = hostId.trim().length === 24;

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data } = await api.get(`/api/admin/checkouts/host/${hostId.trim()}`, { params: { page: 1, limit: 5 } });
      setHistory(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setHistory([]);
      setHistoryError(err.response?.data?.message || 'Failed to load checkout history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const lookupWallet = async () => {
    if (!canLookup) {
      setError('Enter a valid 24-character host ID');
      return;
    }
    setLoading(true);
    setError(null);
    setAdjustSuccess(null);
    try {
      const { data } = await api.get(`/api/admin/host-wallet/${hostId.trim()}`);
      setWallet(data?.data ?? null);
    } catch (err) {
      setWallet(null);
      setError(err.response?.data?.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
    fetchHistory();
  };

  const n            = parseFloat(amount) || 0;
  const isAdd        = type === 'add';
  const currentCash  = wallet?.cash ?? 0;
  const newBalance   = isAdd ? currentCash + n : currentCash - n;
  const willOverdraw = !isAdd && n > currentCash;

  const submitAdjust = async () => {
    if (!wallet) {
      setAdjustError('Look up a host wallet first');
      return;
    }
    if (!n || n <= 0) {
      setAdjustError('Enter a positive amount');
      return;
    }
    setAdjusting(true);
    setAdjustError(null);
    setAdjustSuccess(null);
    try {
      const { data } = await api.post(`/api/admin/host-wallet/${hostId.trim()}/adjust`, {
        type,
        amount: n,
        note: note.trim() || undefined,
      });
      const result = data?.data ?? {};
      setWallet((prev) => ({ ...prev, ...result }));
      setAdjustSuccess(data?.message ?? `Wallet ${isAdd ? 'credited' : 'deducted'} by ${fmtINR(n)}`);
      setAmount(''); setNote('');
    } catch (err) {
      setAdjustError(err.response?.data?.message || 'Failed to adjust wallet');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Wallet size={15} className="text-neutral-400" />
        <p className="text-sm font-semibold text-neutral-800">Host Wallet — Lookup &amp; Manual Correction</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Host ID"
          value={hostId}
          onChange={(e) => { setHostId(e.target.value); setWallet(null); setAdjustSuccess(null); setError(null); setHistory([]); setHistoryError(null); }}
          className="min-w-[220px] flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono outline-none focus:border-neutral-400"
        />
        <button
          onClick={lookupWallet}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading && <Loader2 size={13} className="animate-spin" />} Look Up
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {wallet && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
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

          {/* recent checkout history */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Recent Checkout Requests</p>
            {historyLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-neutral-400">
                <Loader2 size={13} className="animate-spin" /> Loading history…
              </div>
            ) : historyError ? (
              <p className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle size={12} /> {historyError}
              </p>
            ) : history.length ? (
              <div className="divide-y divide-neutral-50 rounded-xl border border-neutral-100">
                {history.map((h) => (
                  <div key={h._id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-neutral-800">{fmtINR(h.netAmount)}</p>
                      <p className="text-[11px] text-neutral-400">{fmtDateTime(h.createdAt)}</p>
                    </div>
                    <StatusBadge status={h.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-center text-xs text-neutral-400">No checkout requests yet</p>
            )}
          </div>

          {/* manual correction */}
          <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Manual Correction</p>

            <div className="mb-2 flex gap-1 rounded-xl border border-neutral-200 bg-white p-1">
              {[{ id: 'add', label: 'Add', Icon: Plus }, { id: 'deduct', label: 'Deduct', Icon: Minus }].map(({ id, label, Icon }) => (
                <button key={id} type="button"
                  onClick={() => { setType(id); setAdjustError(null); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
                    type === id
                      ? id === 'add' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }`}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="relative">
                <IndianRupee size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="number" min="0.01" step="0.01" placeholder="Amount"
                  value={amount} onChange={(e) => { setAmount(e.target.value); setAdjustError(null); }}
                  className="w-full rounded-lg border border-neutral-200 py-2 pl-7 pr-2 text-sm outline-none focus:border-neutral-400"
                />
              </div>
              <input
                placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
                className="rounded-lg border border-neutral-200 px-2.5 py-2 text-sm outline-none focus:border-neutral-400 sm:col-span-2"
              />
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CASH_PRESET_AMOUNTS.map((p) => (
                <button key={p} type="button"
                  onClick={() => setAmount(String(p))}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    amount === String(p)
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}>
                  {fmtINR(p)}
                </button>
              ))}
            </div>

            {n > 0 && (
              <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                willOverdraw ? 'border border-amber-200 bg-amber-50' : 'border border-neutral-200 bg-white'
              }`}>
                <span className="text-neutral-500">New balance after {isAdd ? 'add' : 'deduct'}</span>
                <span className={`font-bold ${willOverdraw ? 'text-amber-600' : isAdd ? 'text-green-700' : 'text-neutral-800'}`}>
                  {fmtINR(newBalance)}
                </span>
              </div>
            )}
            {willOverdraw && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle size={11} /> This will take the wallet balance below zero.
              </p>
            )}

            {adjustError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={12} /> {adjustError}</p>
            )}
            {adjustSuccess && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-green-600"><Check size={12} /> {adjustSuccess}</p>
            )}

            <button
              onClick={submitAdjust}
              disabled={adjusting}
              className={`mt-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${
                isAdd ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {adjusting ? <Loader2 size={13} className="animate-spin" /> : (isAdd ? <Plus size={13} /> : <Minus size={13} />)}
              Confirm {isAdd ? 'Add' : 'Deduct'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── checkout detail / approve-reject modal ─────────────────────────────────────

const CheckoutActionModal = ({ checkout: initialCheckout, mode, onClose, onDone, onAdjusted }) => {
  const [checkout, setCheckout] = useState(initialCheckout);
  const [active, setActive]     = useState(mode); // 'view' | 'approve' | 'reject'
  const [note, setNote]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [newLabel, setNewLabel]   = useState('');
  const [newType, setNewType]     = useState('percent');
  const [newValue, setNewValue]   = useState('');
  const [newReason, setNewReason] = useState('');
  const [addingDeduction, setAddingDeduction] = useState(false);
  const [deductionError, setDeductionError]   = useState(null);
  const [removingId, setRemovingId]           = useState(null);

  // direct GST / platform-fee override on this one bill
  const [gstMode, setGstMode]   = useState('percent'); // 'percent' | 'amount'
  const [gstValue, setGstValue] = useState('');
  const [feeMode, setFeeMode]   = useState('percent');
  const [feeValue, setFeeValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting]       = useState(false);
  const [adjustError, setAdjustError]   = useState(null);

  const isPending = checkout.status === 'pending';

  const applyUpdate = (updated) => {
    setCheckout(updated);
    onAdjusted?.(updated);
  };

  // Re-fetch the single checkout on open so deductions/totals reflect the latest
  // server-side snapshot rather than whatever the paginated list last cached.
  useEffect(() => {
    let ignore = false;
    (async () => {
      setDetailLoading(true);
      try {
        const { data } = await api.get(`/api/admin/checkouts/${initialCheckout._id}`);
        if (!ignore && data?.data) setCheckout(data.data);
      } catch {
        // fall back silently to the row data passed in from the list
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [initialCheckout._id]);

  const addDeduction = async () => {
    if (!newLabel.trim() || newValue === '') {
      setDeductionError('Label and value are required');
      return;
    }
    setAddingDeduction(true);
    setDeductionError(null);
    try {
      const { data } = await api.post(`/api/admin/checkouts/${checkout._id}/deductions`, {
        label:  newLabel.trim(),
        type:   newType,
        value:  Number(newValue),
        reason: newReason.trim(),
      });
      applyUpdate(data?.data ?? checkout);
      setNewLabel(''); setNewValue(''); setNewReason(''); setNewType('percent');
    } catch (err) {
      setDeductionError(err.response?.data?.message || 'Failed to add deduction');
    } finally {
      setAddingDeduction(false);
    }
  };

  const removeDeduction = async (deductionId) => {
    setRemovingId(deductionId);
    setDeductionError(null);
    try {
      const { data } = await api.delete(`/api/admin/checkouts/${checkout._id}/deductions/${deductionId}`);
      applyUpdate(data?.data ?? checkout);
    } catch (err) {
      setDeductionError(err.response?.data?.message || 'Failed to remove deduction');
    } finally {
      setRemovingId(null);
    }
  };

  // Directly override GST and/or platform fee on this one bill — by rate or by a flat
  // amount override. Either/both may be sent; reason is optional context for the audit trail.
  const adjustBilling = async () => {
    if (gstValue === '' && feeValue === '') {
      setAdjustError('Enter a new GST or Platform Fee value');
      return;
    }
    setAdjusting(true);
    setAdjustError(null);
    try {
      const body = { reason: adjustReason.trim() };
      if (gstValue !== '') body[gstMode === 'percent' ? 'gstPercent' : 'gstAmount'] = Number(gstValue);
      if (feeValue !== '') body[feeMode === 'percent' ? 'platformFeePercent' : 'platformFeeAmount'] = Number(feeValue);
      const { data } = await api.put(`/api/admin/checkouts/${checkout._id}/adjust-billing`, body);
      applyUpdate(data?.data ?? checkout);
      setGstValue(''); setFeeValue(''); setAdjustReason('');
    } catch (err) {
      setAdjustError(err.response?.data?.message || 'Failed to adjust GST/platform fee');
    } finally {
      setAdjusting(false);
    }
  };

  const handleSubmit = async () => {
    if (active === 'reject' && !note.trim()) {
      setError('A note is required to reject a checkout request');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = active === 'reject' ? { note: note.trim() } : undefined;
      const { data } = await api.put(`/api/admin/checkouts/${checkout._id}/${active}`, body);
      onDone(data?.data ?? { ...checkout, status: active === 'approve' ? 'approved' : 'rejected' });
    } catch (err) {
      const httpStatus = err.response?.status;
      if (httpStatus === 409) {
        setError(err.response?.data?.message || "This host's wallet balance has dropped below the gross amount since the request was submitted — it can't be approved as-is. Adjust the deductions or have the host resubmit.");
      } else if (httpStatus === 404) {
        setError('This request was already processed, likely by another admin. Refreshing…');
        try {
          const { data: fresh } = await api.get(`/api/admin/checkouts/${checkout._id}`);
          if (fresh?.data) { applyUpdate(fresh.data); setActive('view'); }
        } catch {
          // ignore — the table will still show the stale row until the admin refreshes
        }
      } else {
        setError(err.response?.data?.message || `Failed to ${active} checkout request`);
      }
    } finally {
      setBusy(false);
    }
  };

  const host     = checkout.hostId;
  const hostName = typeof host === 'object' ? host?.username : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-3xl sm:rounded-2xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            Checkout Request
            {detailLoading && <Loader2 size={14} className="animate-spin text-neutral-400" />}
          </h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={17} />
          </button>
        </div>

        <div className="mb-5 space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3">
            <AvatarDisplay src={typeof host === 'object' ? host?.avatar : null} name={hostName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-900">{hostName || '—'}</p>
              <p className="truncate text-xs text-neutral-400">{typeof host === 'object' ? host?._id : host}</p>
            </div>
            <StatusBadge status={checkout.status} />
          </div>

          <div className="rounded-xl border border-neutral-100 px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Amount Breakdown</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Gross Amount</span>
                <span className="font-medium">{fmtINR(checkout.grossAmount)}</span>
              </div>
              {checkout.deductions?.map((d) => (
                <div key={d._id ?? d.label} className="flex items-center justify-between gap-2 text-neutral-500">
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    {d.label} ({fmtDeduction(d)})
                    {isOverlapDeduction(d.label) && (
                      <span title="Duplicates the dedicated Platform Fee/GST field below — this host is being charged twice" className="flex-shrink-0">
                        <AlertTriangle size={11} className="text-amber-500" />
                      </span>
                    )}
                    {d.addedBy && (
                      <span className="flex-shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
                        +{d.addedBy?.username ? `@${d.addedBy.username}` : 'admin'}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-1.5">
                    − {fmtINR(d.amount)}
                    {isPending && d.addedBy && (
                      <button
                        onClick={() => removeDeduction(d._id)}
                        disabled={removingId === d._id}
                        title="Remove this deduction"
                        className="flex h-5 w-5 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                      >
                        {removingId === d._id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    )}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-neutral-500">
                <span>Platform Fee ({checkout.platformFeePercent ?? 0}%)</span><span>− {fmtINR(checkout.platformFeeAmount)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>GST ({checkout.gstPercent ?? 0}%)</span><span>− {fmtINR(checkout.gstAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-100 pt-1.5 text-base font-bold text-emerald-700">
                <span>Net Amount (to host)</span><span>{fmtINR(checkout.netAmount)}</span>
              </div>
            </div>

            {isPending && (
              <div className="mt-3 rounded-lg border border-neutral-100 bg-neutral-50 p-2.5">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Add Deduction to This Bill</p>
                <div className="grid gap-1.5 sm:grid-cols-4">
                  <input
                    placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                    className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
                  />
                  <select
                    value={newType} onChange={(e) => setNewType(e.target.value)}
                    className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
                  >
                    {DEDUCTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input
                    type="number" min="0" placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                    className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
                  />
                  <input
                    placeholder="Reason (optional)" value={newReason} onChange={(e) => setNewReason(e.target.value)}
                    className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
                  />
                </div>
                {deductionError && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={11} /> {deductionError}</p>
                )}
                <button
                  onClick={addDeduction}
                  disabled={addingDeduction}
                  className="mt-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50"
                >
                  {addingDeduction ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Add &amp; Recalculate
                </button>
              </div>
            )}

            {isPending && (
              <div className="mt-3 rounded-lg border border-neutral-100 bg-neutral-50 p-2.5">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Override GST / Platform Fee</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div className="flex gap-1.5">
                    <select
                      value={gstMode} onChange={(e) => setGstMode(e.target.value)}
                      className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs outline-none focus:border-neutral-400"
                    >
                      <option value="percent">GST %</option>
                      <option value="amount">GST ₹</option>
                    </select>
                    <input
                      type="number" min="0"
                      placeholder={gstMode === 'percent' ? `Currently ${checkout.gstPercent}%` : `Currently ${fmtINR(checkout.gstAmount)}`}
                      value={gstValue} onChange={(e) => setGstValue(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <select
                      value={feeMode} onChange={(e) => setFeeMode(e.target.value)}
                      className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs outline-none focus:border-neutral-400"
                    >
                      <option value="percent">Fee %</option>
                      <option value="amount">Fee ₹</option>
                    </select>
                    <input
                      type="number" min="0"
                      placeholder={feeMode === 'percent' ? `Currently ${checkout.platformFeePercent}%` : `Currently ${fmtINR(checkout.platformFeeAmount)}`}
                      value={feeValue} onChange={(e) => setFeeValue(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
                    />
                  </div>
                </div>
                <input
                  placeholder="Reason (optional)" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
                />
                {adjustError && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={11} /> {adjustError}</p>
                )}
                <button
                  onClick={adjustBilling}
                  disabled={adjusting}
                  className="mt-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50"
                >
                  {adjusting ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
                  Apply Override
                </button>
                <p className="mt-1.5 text-[10px] text-neutral-400">Send the % or the ₹ for either field, not both. Leave a field blank to leave it untouched.</p>
              </div>
            )}

            {checkout.billingAdjustments?.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Billing Adjustment History</p>
                <div className="space-y-1.5">
                  {checkout.billingAdjustments.map((a) => (
                    <div key={a._id} className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                      <p className="font-semibold">
                        {a.target === 'gst' ? 'GST' : 'Platform Fee'}: {a.previousPercent}% ({fmtINR(a.previousAmount)}) → {a.newPercent}% ({fmtINR(a.newAmount)})
                      </p>
                      <p className="text-amber-700">
                        {a.reason} — {a.adjustedBy?.username ? `@${a.adjustedBy.username}` : 'admin'}, {fmtDateTime(a.adjustedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-100 px-4 py-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              <Landmark size={13} /> Bank Details
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-neutral-400">Account Holder</p>
                <p className="font-medium">{checkout.bank?.accountHolderName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Account Number</p>
                <p className="font-mono font-medium">{checkout.bank?.accountNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Bank Name</p>
                <p className="font-medium">{checkout.bank?.bankName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">IFSC Code</p>
                <p className="font-mono font-medium">{checkout.bank?.ifscCode || '—'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span>Requested {fmtDateTime(checkout.createdAt)}</span>
            {checkout.status !== 'pending' && checkout.processedAt && (
              <span>Processed {fmtDateTime(checkout.processedAt)}{checkout.processedBy?.username ? ` by @${checkout.processedBy.username}` : ''}</span>
            )}
          </div>

          {checkout.note && (
            <p className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              <span className="font-semibold text-neutral-600">Note: </span>{checkout.note}
            </p>
          )}
        </div>

        {checkout.status === 'pending' && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => { setActive('approve'); setError(null); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition ${
                active === 'approve' ? 'border-green-600 bg-green-50 text-green-700' : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
            >
              <Check size={14} /> Approve
            </button>
            <button
              onClick={() => { setActive('reject'); setError(null); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition ${
                active === 'reject' ? 'border-red-600 bg-red-50 text-red-700' : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
            >
              <Ban size={14} /> Reject
            </button>
          </div>
        )}

        {(active === 'approve' || active === 'reject') && checkout.status === 'pending' && (
          <div className="space-y-3">
            {active === 'reject' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  Note <span className="text-red-500">(required)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Bank details could not be verified"
                  className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            )}

            {active === 'approve' && (
              <p className="rounded-xl border border-green-100 bg-green-50 px-3 py-2.5 text-xs text-green-700">
                This will deduct {fmtINR(checkout.grossAmount)} from the host's wallet and mark the request approved.
              </p>
            )}

            {error && (
              <p className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle size={12} /> {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={busy}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
                  active === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                {busy ? 'Submitting…' : active === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}

        {checkout.status !== 'pending' && (
          <div className="flex justify-end pt-1">
            <button onClick={onClose} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── host monthly invoice lookup ────────────────────────────────────────────────

const HostInvoiceCard = () => {
  const now = new Date();
  const [hostId, setHostId] = useState('');
  const [year, setYear]     = useState(String(now.getFullYear()));
  const [month, setMonth]   = useState(String(now.getMonth() + 1));

  const [invoice, setInvoice]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]             = useState(null);

  const canLookup = hostId.trim().length === 24 && year && month;

  const lookupInvoice = async () => {
    if (!canLookup) {
      setError('Enter a valid 24-character host ID, year and month');
      return;
    }
    setLoading(true);
    setError(null);
    setInvoice(null);
    try {
      const { data } = await api.get(`/api/admin/checkouts/host/${hostId.trim()}/invoice/${year}/${month}`);
      setInvoice(data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!canLookup) {
      setError('Enter a valid 24-character host ID, year and month');
      return;
    }
    setDownloading(true);
    setError(null);
    try {
      const res = await api.get(`/api/admin/checkouts/host/${hostId.trim()}/invoice/${year}/${month}/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${hostId.trim()}-${year}-${String(month).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download invoice PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <FileText size={15} className="text-neutral-400" />
        <p className="text-sm font-semibold text-neutral-800">Host Monthly Invoice</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <input
          placeholder="Host ID" value={hostId} onChange={(e) => setHostId(e.target.value)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono outline-none focus:border-neutral-400 sm:col-span-2"
        />
        <input
          type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <select
          value={month} onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        >
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={lookupInvoice}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading && <Loader2 size={13} className="animate-spin" />} View Invoice
        </button>
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
        >
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={14} />} Download PDF
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {invoice && (
        <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm">
          <p className="text-xs text-neutral-400">Invoice Number</p>
          <p className="font-mono font-semibold text-neutral-800">{invoice.invoiceNumber}</p>
          <p className="mt-1 text-xs text-neutral-400">Period</p>
          <p className="font-medium text-neutral-800">{invoice.period?.label}</p>
        </div>
      )}
    </div>
  );
};

// ─── main section ─────────────────────────────────────────────────────────────

const SECTION_TABS = [
  { id: 'requests', label: 'Requests',          Icon: Banknote  },
  { id: 'wallet',   label: 'Host Wallet',       Icon: Wallet    },
  { id: 'invoice',  label: 'Invoice Generator', Icon: FileText  },
  { id: 'config',   label: 'Checkout Config',   Icon: Settings2 },
];

const CheckoutManagementSection = () => {
  const [tab, setTab] = useState('requests');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [total, setTotal]       = useState(0);
  const [status, setStatus]     = useState('');
  const [period, setPeriod]     = useState('');
  const [search, setSearch]     = useState('');

  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });

  const [modalTarget, setModalTarget] = useState(null);
  const [modalMode, setModalMode]     = useState('view');

  const fetchCheckouts = useCallback(async (targetPage, targetStatus, targetPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: targetPage, limit: 20 };
      if (targetStatus) params.status = targetStatus;
      if (targetPeriod) params.period = targetPeriod;
      const { data } = await api.get('/api/admin/checkouts', { params });
      const rows = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};
      setRequests(rows);
      setPages(pg.pages ?? 1);
      setTotal(pg.total ?? rows.length);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load checkout requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const statuses = ['', 'pending', 'approved', 'rejected'];
      const results = await Promise.all(
        statuses.map((s) => api.get('/api/admin/checkouts', { params: { page: 1, limit: 1, ...(s ? { status: s } : {}) } }))
      );
      const [all, pending, approved, rejected] = results.map((r) => r.data?.pagination?.total ?? 0);
      setCounts({ all, pending, approved, rejected });
    } catch {
      // stat tiles are a nice-to-have — a failure here shouldn't block the main table
    }
  }, []);

  useEffect(() => { fetchCheckouts(1, '', ''); fetchCounts(); }, [fetchCheckouts, fetchCounts]);

  const onStatusChange = (s) => { setStatus(s); setPage(1); fetchCheckouts(1, s, period); };
  const onPeriodChange = (p) => { setPeriod(p); setPage(1); fetchCheckouts(1, status, p); };
  const onPage          = (n) => { setPage(n); fetchCheckouts(n, status, period); };
  const refreshAll      = () => { fetchCheckouts(page, status, period); fetchCounts(); };

  const filteredRows = search.trim()
    ? requests.filter((r) => {
        const host  = r.hostId;
        const name  = typeof host === 'object' ? host?.username : '';
        const phone = typeof host === 'object' ? host?.phone : '';
        const q = search.trim().toLowerCase();
        return name?.toLowerCase().includes(q) || phone?.toLowerCase().includes(q);
      })
    : requests;

  const openModal  = (checkout, mode) => { setModalTarget(checkout); setModalMode(mode); };
  const closeModal = () => { setModalTarget(null); setModalMode('view'); };

  const handleDone = (updated) => {
    setRequests((prev) => prev.map((r) => (r._id === updated._id ? { ...r, ...updated } : r)));
    closeModal();
    fetchCounts();
  };

  // Bill edited (deduction added/removed) without approving/rejecting yet — patch
  // the row in place so the table reflects the new net amount if the modal is closed.
  const handleAdjusted = (updated) => {
    setRequests((prev) => prev.map((r) => (r._id === updated._id ? { ...r, ...updated } : r)));
  };

  const STAT_CARDS = [
    { label: 'Total Requests', value: counts.all,      Icon: Receipt,  cls: 'bg-neutral-900 text-white' },
    { label: 'Pending',        value: counts.pending,  Icon: Banknote, cls: 'bg-amber-50 text-amber-800 border border-amber-200' },
    { label: 'Approved',       value: counts.approved, Icon: Check,    cls: 'bg-green-50 text-green-800 border border-green-200' },
    { label: 'Rejected',       value: counts.rejected, Icon: Ban,      cls: 'bg-red-50 text-red-800 border border-red-200' },
  ];

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

      {tab === 'requests' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {STAT_CARDS.map(({ label, value, Icon, cls }) => (
              <div key={label} className={`rounded-xl p-3 sm:rounded-2xl sm:p-5 ${cls}`}>
                <div className="flex items-start justify-between">
                  <p className="text-2xl font-black sm:text-3xl">{value}</p>
                  <Icon size={18} className="opacity-50" />
                </div>
                <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>

          {/* Main card */}
          <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter by host username or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => onStatusChange(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  status === value
                    ? 'bg-neutral-900 text-white'
                    : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}>
                {label}
              </button>
            ))}
            <select
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
            >
              {PERIOD_FILTERS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button
              onClick={refreshAll}
              disabled={loading}
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
            <button onClick={() => fetchCheckouts(page, status, period)}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading checkout requests…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center">
            <Banknote size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {search || status ? 'No requests match your filters' : 'No checkout requests yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Host', 'Gross', 'Deductions', 'Platform Fee', 'GST', 'Net Amount', 'Status', 'Processed By', 'Date', 'Actions'].map((h) => (
                    <th key={h} className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5 ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredRows.map((r) => {
                  const host     = r.hostId;
                  const hostName = typeof host === 'object' ? host?.username : null;
                  const st       = r.status;
                  return (
                    <tr key={r._id} className="group hover:bg-neutral-50/70 transition-colors">
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-2.5">
                          <AvatarDisplay src={typeof host === 'object' ? host?.avatar : null} name={hostName} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">{hostName || '—'}</p>
                            <p className="truncate text-[10px] text-neutral-300 font-mono">{typeof host === 'object' ? host?._id : host}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-base font-semibold text-neutral-800 sm:px-5">{fmtINR(r.grossAmount)}</td>
                      <td
                        className="px-4 py-4 text-sm text-neutral-600 sm:px-5"
                        title={r.deductions?.length
                          ? r.deductions.map((d) => `${d.label}: ${fmtINR(d.amount)} (${fmtDeduction(d)})`).join('\n')
                          : undefined}
                      >
                        <span className="flex items-center gap-1.5">
                          {fmtINR(r.totalDeductionAmount)}
                          {r.deductions?.length > 0 && <span className="text-neutral-300"> ({r.deductions.length})</span>}
                          {r.deductions?.some((d) => isOverlapDeduction(d.label)) && (
                            <AlertTriangle size={12} className="flex-shrink-0 text-amber-500" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-600 sm:px-5">
                        {fmtINR(r.platformFeeAmount)} <span className="text-neutral-400">({r.platformFeePercent ?? 0}%)</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-600 sm:px-5">
                        {fmtINR(r.gstAmount)} <span className="text-neutral-400">({r.gstPercent ?? 0}%)</span>
                      </td>
                      <td className="px-4 py-4 text-base font-bold text-emerald-700 sm:px-5">{fmtINR(r.netAmount)}</td>
                      <td className="px-4 py-4 sm:px-5"><StatusBadge status={st} /></td>
                      <td className="px-4 py-4 text-xs text-neutral-500 sm:px-5">
                        {r.processedBy?.username
                          ? <span>@{r.processedBy.username}</span>
                          : <span className="text-neutral-300">—</span>}
                        {r.processedAt && <p className="text-[10px] text-neutral-300">{fmtDateTime(r.processedAt)}</p>}
                      </td>
                      <td className="px-4 py-4 text-xs text-neutral-400 whitespace-nowrap sm:px-5">{fmtDateTime(r.createdAt)}</td>
                      <td className="px-4 py-4 text-right sm:px-5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openModal(r, 'view')}
                            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50"
                          >
                            View
                          </button>
                          {st === 'pending' && (
                            <>
                              <button
                                onClick={() => openModal(r, 'approve')}
                                className="rounded-lg border border-green-200 px-2.5 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openModal(r, 'reject')}
                                className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
            <p className="text-xs text-neutral-400">{total} total · page {page} of {pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={page >= pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
          </div>
        </>
      )}

      {tab === 'wallet' && <HostWalletCard />}

      {tab === 'invoice' && <HostInvoiceCard />}

      {tab === 'config' && <CheckoutConfigCard />}

      {modalTarget && (
        <CheckoutActionModal
          checkout={modalTarget}
          mode={modalMode}
          onClose={closeModal}
          onDone={handleDone}
          onAdjusted={handleAdjusted}
        />
      )}
    </div>
  );
};

export default CheckoutManagementSection;
