import React, { useState, useEffect } from 'react';
import {
  X, Loader2, AlertCircle, Phone, Video, Clock, Coins,
  Gift, Star, Calendar, MessageSquare, Wallet, Bell,
} from 'lucide-react';

// Matches BILLING_TYPE_FILTERS in Backend3/controllers/adminController.js
const BILLING_TYPE_STYLES = {
  intro:  'bg-purple-100 text-purple-700',
  mixed:  'bg-blue-100 text-blue-600',
  billed: 'bg-neutral-100 text-neutral-500',
  none:   'bg-neutral-50 text-neutral-300',
};

const BILLING_TYPE_LABELS = { intro: 'Intro Pack', mixed: 'Mixed', billed: 'Billed', none: 'None' };
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

const fmtNum = (n) => (n == null ? '—' : n.toLocaleString());

const fmtDelta = (start, end) => {
  if (start == null || end == null) return null;
  const delta = end - start;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString()}`;
};

// Wallet Snapshot is the raw balance before/after the call, so its delta includes
// gift spend/earnings on top of per-second billing — the two are tracked as separate
// ledgers (call.billing vs call.gifts) that both move the same wallet. Without this
// breakdown the delta looks like a billing mismatch whenever a gift was sent mid-call.
const fmtBreakdown = (billingAmt, giftAmt) => {
  if (!giftAmt) return null;
  return `${fmtNum(billingAmt ?? 0)} call + ${fmtNum(giftAmt)} gifts`;
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

const ParticipantCard = ({ role, person, fallback }) => (
  <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3">
    <AvatarDisplay src={person?.avatar || fallback?.avatar} name={person?.username || fallback?.username} size="sm" />
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{role}</p>
      <p className="truncate text-sm font-semibold">
        {person?.username || fallback?.username || '—'}
        {!person && fallback?.username && <span className="ml-1 text-[10px] font-normal italic text-neutral-300">(deleted)</span>}
      </p>
      {(person?.phone || fallback?.phone) && <p className="truncate text-xs text-neutral-400">{person?.phone || fallback.phone}</p>}
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
  const walletSnapshot = call?.walletSnapshot;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:max-w-4xl sm:rounded-2xl">
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
              {call.billingType && (
                <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${BILLING_TYPE_STYLES[call.billingType] || 'bg-neutral-100 text-neutral-600'}`}>
                  {(call.billingType === 'intro' || call.billingType === 'mixed') && <Gift size={12} />}
                  {BILLING_TYPE_LABELS[call.billingType] || call.billingType}
                </span>
              )}
              {call.endedBy && (
                <span className="text-xs text-neutral-400">Ended by <span className="font-medium capitalize text-neutral-600">{call.endedBy}</span></span>
              )}
            </div>

            {/* Reason — reason (server classification) and endReason (frontend free text) side by side, each grid cell in its own highlighted badge */}
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Reason</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Classification</p>
                  {call.reason ? (
                    <span className="text-xs font-semibold text-neutral-900">
                      {call.reason}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-400">Not recorded</span>
                  )}
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Frontend</p>
                  {call.endReason ? (
                    <span className="break-words text-xs font-semibold text-neutral-900">
                      {call.endReason}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-400">Not provided</span>
                  )}
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="grid gap-3 sm:grid-cols-2">
              <ParticipantCard role="Caller" person={call.callerId} fallback={{ username: call.callerUsername, phone: call.callerPhone, avatar: call.callerAvatar }} />
              <ParticipantCard role="Host"   person={call.hostId}   fallback={{ username: call.hostUsername,   phone: call.hostPhone,   avatar: call.hostAvatar }} />
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile icon={Clock}    label="Duration"   value={fmtDuration(call.duration)} />
              <StatTile icon={Calendar} label="Started"    value={fmtDateTime(call.startedAt)} />
              <StatTile icon={Calendar} label="Ended"      value={fmtDateTime(call.endedAt)} />
              <StatTile icon={Coins}    label="Coins Billed" value={(call.billing?.totalCoinsDeducted ?? 0) + (call.billing?.introCoinsDeducted ?? 0)} />
            </div>

            {/* Push Notification */}
            <div className="rounded-2xl border border-neutral-100 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <Bell size={12} /> Push Notification
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-400">Delivered</p>
                  <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    call.pushNotification?.sent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {call.pushNotification?.sent ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Devices</p>
                  <p className="font-medium">{call.pushNotification?.deviceCount ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Sent At</p>
                  <p className="font-medium">{fmtDateTime(call.pushNotification?.sentAt)}</p>
                </div>
              </div>
            </div>

            {/* Billing */}
            <div className="rounded-2xl border border-neutral-100 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Billing</p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><p className="text-xs text-neutral-400">Coins / sec</p><p className="font-medium">{call.billing?.coinsPerSecond ?? '—'}</p></div>
                <div><p className="text-xs text-neutral-400">Cash / sec</p><p className="font-medium">{call.billing?.cashPerSecond ?? '—'}</p></div>
                <div><p className="text-xs text-neutral-400">Coins Deducted</p><p className="font-medium">{(call.billing?.totalCoinsDeducted ?? 0) + (call.billing?.introCoinsDeducted ?? 0)}</p></div>
                <div><p className="text-xs text-neutral-400">Cash Earned</p><p className="font-medium">{call.billing?.totalCashEarned ?? 0}</p></div>
              </div>
              {call.billing?.introCoinsDeducted > 0 && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700">
                  <Gift size={12} /> {call.billing.introCoinsDeducted} coins from Intro Pack
                  {call.billingType === 'mixed' && call.billing?.totalCoinsDeducted > 0 && (
                    <span className="font-normal text-purple-500"> · {call.billing.totalCoinsDeducted} normal coins</span>
                  )}
                </div>
              )}
            </div>

            {/* Wallet Snapshot */}
            <div className="rounded-2xl border border-neutral-100 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <Wallet size={12} /> Wallet Snapshot
              </p>
              {!walletSnapshot || (
                walletSnapshot.callerCoinsAtStart == null &&
                walletSnapshot.hostCashAtStart == null &&
                walletSnapshot.callerCoinsAtEnd == null &&
                walletSnapshot.hostCashAtEnd == null
              ) ? (
                <p className="py-2 text-sm text-neutral-400">No wallet snapshot recorded for this call</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                    <p className="text-xs text-neutral-400">Caller Coins</p>
                    <p className="mt-0.5 text-sm font-semibold text-neutral-800">
                      {fmtNum(walletSnapshot.callerCoinsAtStart)} → {fmtNum(walletSnapshot.callerCoinsAtEnd)}
                    </p>
                    {fmtDelta(walletSnapshot.callerCoinsAtStart, walletSnapshot.callerCoinsAtEnd) && (
                      <p className="text-xs text-neutral-400">
                        {fmtDelta(walletSnapshot.callerCoinsAtStart, walletSnapshot.callerCoinsAtEnd)} coins
                        {fmtBreakdown(call.billing?.totalCoinsDeducted, call.gifts?.totalGiftCoins) && (
                          <> ({fmtBreakdown(call.billing?.totalCoinsDeducted, call.gifts?.totalGiftCoins)})</>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                    <p className="text-xs text-neutral-400">Host Cash</p>
                    <p className="mt-0.5 text-sm font-semibold text-neutral-800">
                      {fmtNum(walletSnapshot.hostCashAtStart)} → {fmtNum(walletSnapshot.hostCashAtEnd)}
                    </p>
                    {fmtDelta(walletSnapshot.hostCashAtStart, walletSnapshot.hostCashAtEnd) && (
                      <p className="text-xs text-neutral-400">
                        {fmtDelta(walletSnapshot.hostCashAtStart, walletSnapshot.hostCashAtEnd)} cash
                        {fmtBreakdown(call.billing?.totalCashEarned, call.gifts?.totalGiftCash) && (
                          <> ({fmtBreakdown(call.billing?.totalCashEarned, call.gifts?.totalGiftCash)})</>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
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
