import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IdCard, Clock, CheckCircle2, XCircle, Search,
  AlertCircle, Loader2, ChevronLeft, ChevronRight,
  RefreshCw, X, Check, Ban, CreditCard, Landmark,
} from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

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

const VALID_STATUSES = new Set(STATUS_FILTERS.map((s) => s.value));

const StatusBadge = ({ status }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || 'bg-neutral-100 text-neutral-600'}`}>
    {status || '—'}
  </span>
);

// ─── action modal (view + approve/reject) ──────────────────────────────────────

const KycActionModal = ({ submission, mode, onClose, onDone }) => {
  const [note, setNote]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState(null);
  const [active, setActive]   = useState(mode); // 'view' | 'approve' | 'reject'

  const handleSubmit = async () => {
    if (active === 'reject' && !note.trim()) {
      setError('A note is required to reject a submission');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.patch(`/api/admin/kyc/${submission._id}/${active}`, { note: note.trim() });
      onDone(data?.data ?? { ...submission, status: active === 'approve' ? 'approved' : 'rejected' });
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${active} submission`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-3xl sm:rounded-2xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold">KYC Submission</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        {/* Submission summary */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-4">
            <AvatarDisplay name={submission.username} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-neutral-900">{submission.username || '—'}</p>
              <p className="truncate text-xs text-neutral-400">{submission.userId}</p>
            </div>
            <StatusBadge status={submission.status} />
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl border border-neutral-100 px-4 py-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <CreditCard size={13} /> PAN Details
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-400">Number</p>
                  <p className="font-mono font-medium">{submission.pan?.number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Date of Birth</p>
                  <p className="font-medium">{fmtDate(submission.pan?.dob)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-neutral-400">Name as per PAN</p>
                  <p className="font-medium">{submission.pan?.nameAsPerPan || '—'}</p>
                </div>
              </div>
              {submission.pan?.imageUrl && (
                <a href={submission.pan.imageUrl} target="_blank" rel="noreferrer" className="mt-3 block aspect-[1.586/1] w-full max-w-sm overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                  <img src={submission.pan.imageUrl} alt="PAN card" className="h-full w-full object-contain" />
                </a>
              )}
            </div>

            <div className="rounded-xl border border-neutral-100 px-4 py-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <IdCard size={13} /> Aadhaar Details
              </p>
              {(submission.aadhaar?.frontImageUrl || submission.aadhaar?.backImageUrl) ? (
                <div className="grid grid-cols-2 gap-3">
                  {submission.aadhaar?.frontImageUrl && (
                    <a href={submission.aadhaar.frontImageUrl} target="_blank" rel="noreferrer" className="block">
                      <div className="aspect-[1.586/1] w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        <img src={submission.aadhaar.frontImageUrl} alt="Aadhaar front" className="h-full w-full object-contain" />
                      </div>
                      <p className="mt-1 text-center text-[10px] text-neutral-400">Front</p>
                    </a>
                  )}
                  {submission.aadhaar?.backImageUrl && (
                    <a href={submission.aadhaar.backImageUrl} target="_blank" rel="noreferrer" className="block">
                      <div className="aspect-[1.586/1] w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        <img src={submission.aadhaar.backImageUrl} alt="Aadhaar back" className="h-full w-full object-contain" />
                      </div>
                      <p className="mt-1 text-center text-[10px] text-neutral-400">Back</p>
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">—</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-100 px-4 py-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              <Landmark size={13} /> Bank Details
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-neutral-400">Account Holder</p>
                <p className="font-medium">{submission.bank?.accountHolderName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Account Number</p>
                <p className="font-mono font-medium">{submission.bank?.accountNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Bank Name</p>
                <p className="font-medium">{submission.bank?.bankName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">IFSC Code</p>
                <p className="font-mono font-medium">{submission.bank?.ifscCode || '—'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span>Submitted {fmtDateTime(submission.createdAt)}</span>
            {submission.status !== 'pending' && (submission.reviewedAt || submission.reviewedBy) && (
              <span>Reviewed {fmtDateTime(submission.reviewedAt)}{submission.reviewedBy ? ` by ${submission.reviewedBy}` : ''}</span>
            )}
          </div>

          {submission.adminNote && (
            <p className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              <span className="font-semibold text-neutral-600">Admin note: </span>{submission.adminNote}
            </p>
          )}
        </div>

        {/* Mode switch (only when pending) */}
        {submission.status === 'pending' && (
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

        {(active === 'approve' || active === 'reject') && submission.status === 'pending' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                Note {active === 'reject' && <span className="text-red-500">(required)</span>}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={active === 'approve' ? 'All documents verified' : 'Aadhaar back image is blurry, please re-upload'}
                className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

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

        {submission.status !== 'pending' && (
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

// ─── main section ─────────────────────────────────────────────────────────────

const KycManagementSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus    = searchParams.get('kstatus') || '';
  const activeStatus = VALID_STATUSES.has(rawStatus) ? rawStatus : '';

  const setActiveStatus = useCallback((s) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (s) p.set('kstatus', s); else p.delete('kstatus');
      return p;
    }, { replace: true });
    setPage(1);
  }, [setSearchParams]);

  const [submissions, setSubmissions] = useState([]);
  const [pagination, setPagination]   = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [summary, setSummary]         = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');

  const [modalTarget, setModalTarget] = useState(null);
  const [modalMode, setModalMode]     = useState('view');

  const fetchKyc = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: targetPage, limit: 20 };
      if (activeStatus) params.status = activeStatus;

      const { data } = await api.get('/api/admin/kyc', { params });

      const rows = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};
      const sm   = data?.summary ?? {};

      setSubmissions(rows);
      setPagination({
        total: pg.total ?? rows.length,
        page:  pg.page  ?? targetPage,
        limit: pg.limit ?? 20,
        pages: pg.pages ?? Math.ceil((pg.total ?? rows.length) / 20),
      });
      setSummary({
        pending:  sm.pending  ?? 0,
        approved: sm.approved ?? 0,
        rejected: sm.rejected ?? 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load KYC submissions');
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    fetchKyc(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKyc]);

  const onPage = (n) => {
    setPage(n);
    fetchKyc(n);
  };

  const filteredRows = search.trim()
    ? submissions.filter((s) =>
        s.username?.toLowerCase().includes(search.trim().toLowerCase()) ||
        s.pan?.number?.toLowerCase().includes(search.trim().toLowerCase())
      )
    : submissions;

  const openModal = (submission, mode) => { setModalTarget(submission); setModalMode(mode); };
  const closeModal = () => { setModalTarget(null); setModalMode('view'); };

  const handleDone = (updated) => {
    setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? { ...s, ...updated } : s)));
    closeModal();
    fetchKyc(page);
  };

  const total = pagination.total;

  const STAT_CARDS = [
    { label: 'Total Submissions', value: total,            Icon: IdCard,       cls: 'bg-neutral-900 text-white' },
    { label: 'Pending',           value: summary.pending,  Icon: Clock,        cls: 'bg-amber-50 text-amber-800 border border-amber-200' },
    { label: 'Approved',          value: summary.approved, Icon: CheckCircle2, cls: 'bg-green-50 text-green-800 border border-green-200' },
    { label: 'Rejected',          value: summary.rejected, Icon: XCircle,      cls: 'bg-red-50 text-red-800 border border-red-200' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">

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
              placeholder="Filter by username or PAN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setActiveStatus(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeStatus === value
                    ? 'bg-neutral-900 text-white'
                    : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}>
                {label}
              </button>
            ))}
            <button
              onClick={() => fetchKyc(page)}
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
            <button onClick={() => fetchKyc(page)}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {loading && submissions.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading KYC submissions…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center">
            <IdCard size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {search || activeStatus ? 'No submissions match your filters' : 'No KYC submissions yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">PAN Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">Name as per PAN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">Submitted</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredRows.map((s) => (
                  <tr key={s._id} className="group hover:bg-neutral-50/70 transition-colors">
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <AvatarDisplay name={s.username} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-900">{s.username || '—'}</p>
                          <p className="truncate text-[10px] text-neutral-300 font-mono">{s.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600 sm:px-5">{s.pan?.number || '—'}</td>
                    <td className="px-4 py-3 text-neutral-700 sm:px-5">{s.pan?.nameAsPerPan || '—'}</td>
                    <td className="px-4 py-3 sm:px-5"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap sm:px-5">{fmtDateTime(s.createdAt)}</td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openModal(s, 'view')}
                          className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50"
                        >
                          View
                        </button>
                        {s.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openModal(s, 'approve')}
                              className="rounded-lg border border-green-200 px-2.5 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openModal(s, 'reject')}
                              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
            <p className="text-xs text-neutral-400">{pagination.total} total · page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => onPage(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => onPage(Math.min(pagination.pages, pagination.page + 1))} disabled={pagination.page >= pagination.pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalTarget && (
        <KycActionModal
          submission={modalTarget}
          mode={modalMode}
          onClose={closeModal}
          onDone={handleDone}
        />
      )}
    </div>
  );
};

export default KycManagementSection;
