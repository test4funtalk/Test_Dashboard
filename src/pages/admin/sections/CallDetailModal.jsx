import React, { useState, useEffect } from 'react';
import {
  X, Loader2, AlertCircle, Phone, Video, Clock, Coins,
  Gift, Star, Calendar, MessageSquare,
} from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import api from '../../../services/api';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDuration = (secs) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const CALL_STATUS_STYLES = {
  ended:    'bg-neutral-100 text-neutral-600',
  missed:   'bg-red-100 text-red-600',
  rejected: 'bg-red-100 text-red-600',
  ongoing:  'bg-blue-100 text-blue-600',
  ringing:  'bg-amber-100 text-amber-700',
};

const StatTile = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
      <Icon size={12} /> {label}
    </div>
    <p className="mt-0.5 text-sm font-semibold text-neutral-800">{value}</p>
  </div>
);

const ParticipantCard = ({ role, person }) => (
  <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3">
    <AvatarDisplay src={person?.avatar} name={person?.username} size="sm" />
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{role}</p>
      <p className="truncate text-sm font-semibold">{person?.username || '—'}</p>
      {person?.phone && <p className="truncate text-xs text-neutral-400">{person.phone}</p>}
    </div>
  </div>
);

// ─── modal ────────────────────────────────────────────────────────────────────

const CallDetailModal = ({ callId, onClose }) => {
  const [call, setCall]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!callId) return;
    let cancelled = false;
    setCall(null);
    setLoading(true);
    setError(null);
    api.get(`/api/admin/calls/${callId}`)
      .then(({ data }) => { if (!cancelled) setCall(data?.data ?? data); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Failed to load call details'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [callId]);

  if (!callId) return null;

  const TypeIcon = call?.callType === 'video' ? Video : Phone;
  const hostRating = call?.ratings?.hostRating;
  const userRating = call?.ratings?.userRating;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">Call Details</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading call details…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        ) : call && (
          <div className="space-y-5">

            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium capitalize text-white">
                <TypeIcon size={12} /> {call.callType}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${CALL_STATUS_STYLES[call.status] || 'bg-neutral-100 text-neutral-600'}`}>
                {call.status}
              </span>
              {call.endedBy && (
                <span className="text-xs text-neutral-400">Ended by <span className="font-medium capitalize text-neutral-600">{call.endedBy}</span></span>
              )}
            </div>

            {/* Participants */}
            <div className="grid gap-3 sm:grid-cols-2">
              <ParticipantCard role="Caller" person={call.callerId} />
              <ParticipantCard role="Host"   person={call.hostId} />
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile icon={Clock}    label="Duration"   value={fmtDuration(call.duration)} />
              <StatTile icon={Calendar} label="Started"    value={fmtDateTime(call.startedAt)} />
              <StatTile icon={Calendar} label="Ended"      value={fmtDateTime(call.endedAt)} />
              <StatTile icon={Coins}    label="Coins Billed" value={call.billing?.totalCoinsDeducted ?? 0} />
            </div>

            {/* Billing */}
            <div className="rounded-2xl border border-neutral-100 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Billing</p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><p className="text-xs text-neutral-400">Coins / sec</p><p className="font-medium">{call.billing?.coinsPerSecond ?? '—'}</p></div>
                <div><p className="text-xs text-neutral-400">Cash / sec</p><p className="font-medium">{call.billing?.cashPerSecond ?? '—'}</p></div>
                <div><p className="text-xs text-neutral-400">Coins Deducted</p><p className="font-medium">{call.billing?.totalCoinsDeducted ?? 0}</p></div>
                <div><p className="text-xs text-neutral-400">Cash Earned</p><p className="font-medium">{call.billing?.totalCashEarned ?? 0}</p></div>
              </div>
            </div>

            {/* Gifts */}
            <div className="rounded-2xl border border-neutral-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Gifts</p>
                <span className="flex items-center gap-1 text-xs text-neutral-500">
                  <Gift size={12} /> {call.gifts?.totalGiftCoins ?? 0} coins · {call.gifts?.totalGiftCash ?? 0} cash
                </span>
              </div>
              {call.giftRecords?.length ? (
                <div className="divide-y divide-neutral-50">
                  {call.giftRecords.map((g) => (
                    <div key={g._id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="text-xl leading-none">{g.giftIcon || '🎁'}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{g.giftName}</p>
                          <p className="truncate text-xs text-neutral-400">
                            from {g.senderId?.username || '—'} · {fmtDateTime(g.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2 text-xs text-neutral-500">
                        <span className="flex items-center gap-1"><Coins size={11} /> {g.coinsCost}</span>
                        <span className="flex items-center gap-1">+{g.cashEarned} cash</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-sm text-neutral-400">No gifts sent during this call</p>
              )}
            </div>

            {/* Ratings */}
            <div className="rounded-2xl border border-neutral-100 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Ratings</p>
              {!hostRating?.score && !userRating?.score && !call.ratingRecords?.length ? (
                <p className="py-2 text-sm text-neutral-400">No ratings submitted for this call</p>
              ) : (
                <div className="space-y-3">
                  {call.ratingRecords?.length ? (
                    call.ratingRecords.map((r) => (
                      <div key={r._id} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {r.raterId?.username || '—'} <span className="font-normal text-neutral-400">rated</span> {r.rateeId?.username || '—'}
                            <span className="ml-1.5 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-600">{r.raterRole}</span>
                          </p>
                          <span className="flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-amber-500">
                            <Star size={13} className="fill-amber-400" /> {r.score}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="mt-1 flex items-start gap-1.5 text-xs text-neutral-500">
                            <MessageSquare size={12} className="mt-0.5 flex-shrink-0" /> {r.comment}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-neutral-300">{fmtDateTime(r.createdAt)}</p>
                      </div>
                    ))
                  ) : (
                    <>
                      {hostRating?.score && (
                        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Host Rating</p>
                            <span className="flex items-center gap-1 text-sm font-semibold text-amber-500"><Star size={13} className="fill-amber-400" /> {hostRating.score}</span>
                          </div>
                          {hostRating.comment && <p className="mt-1 text-xs text-neutral-500">{hostRating.comment}</p>}
                        </div>
                      )}
                      {userRating?.score && (
                        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">User Rating</p>
                            <span className="flex items-center gap-1 text-sm font-semibold text-amber-500"><Star size={13} className="fill-amber-400" /> {userRating.score}</span>
                          </div>
                          {userRating.comment && <p className="mt-1 text-xs text-neutral-500">{userRating.comment}</p>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallDetailModal;
