import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2, AlertCircle, Coins, Ban, ChevronUp } from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import api from '../../../services/api';

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const sameDay = (a, b) => a && b && fmtDay(a) === fmtDay(b);

const parseGiftText = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.kind === 'chat_gift_v1') return parsed;
  } catch { /* not gift JSON */ }
  return null;
};

// WhatsApp-style thread: the user's own messages sit right-aligned in a dark
// bubble, the host's replies sit left-aligned in a light bubble — mirrors the
// "who's talking" convention from a chat-app UI even though this is a 3rd-party
// admin view of both sides, not a single participant's own history.
const ChatConversationDetail = ({ userId, hostId, userInfo, hostInfo, onClose }) => {
  const [items, setItems]       = useState([]);
  const [hasMore, setHasMore]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]       = useState(null);

  const scrollRef = useRef(null);
  const prevHeightRef = useRef(0);

  const fetchThread = useCallback(async ({ before } = {}) => {
    const { data } = await api.get(`/api/admin/chat-conversations/${userId}/${hostId}/messages`, {
      params: { limit: 50, ...(before && { before }) },
    });
    return data?.data ?? { items: [], hasMore: false };
  }, [userId, hostId]);

  useEffect(() => {
    if (!userId || !hostId) return;
    let cancelled = false;
    setItems([]);
    setError(null);
    setLoading(true);
    fetchThread()
      .then((result) => { if (!cancelled) { setItems(result.items || []); setHasMore(Boolean(result.hasMore)); } })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Failed to load conversation'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, hostId, fetchThread]);

  // Scroll to the latest message once the first page lands.
  useEffect(() => {
    if (!loading && items.length && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preserve scroll position after prepending older messages so the view
  // doesn't jump to the top of the newly-loaded batch.
  useEffect(() => {
    if (!loadingMore && scrollRef.current && prevHeightRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeightRef.current;
      prevHeightRef.current = 0;
    }
  }, [loadingMore]);

  const loadOlder = async () => {
    if (!items.length || loadingMore) return;
    prevHeightRef.current = scrollRef.current?.scrollHeight || 0;
    setLoadingMore(true);
    try {
      const result = await fetchThread({ before: items[0].createdAt });
      setItems((prev) => [...(result.items || []), ...prev]);
      setHasMore(Boolean(result.hasMore));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load older messages');
    } finally {
      setLoadingMore(false);
    }
  };

  if (!userId || !hostId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">

        {/* Header — both participants, user right-side/host left-side to match the bubble layout below */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex items-center gap-2">
              <AvatarDisplay src={hostInfo?.avatar} name={hostInfo?.username} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{hostInfo?.username || '(deleted)'}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Host</p>
              </div>
            </div>
            <span className="text-neutral-300">↔</span>
            <div className="flex items-center gap-2">
              <AvatarDisplay src={userInfo?.avatar} name={userInfo?.username} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{userInfo?.username || '(deleted)'}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">User</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {/* Thread */}
        {error && (
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading conversation…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
            No messages between these two yet.
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto bg-neutral-50 px-3 py-4 sm:px-5">
            {hasMore && (
              <div className="mb-2 flex justify-center">
                <button
                  onClick={loadOlder}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 size={12} className="animate-spin" /> : <ChevronUp size={12} />}
                  Load older messages
                </button>
              </div>
            )}

            {items.map((m, i) => {
              const isUser = String(m.senderId) === String(userId);
              const gift = m.kind === 'gift' ? parseGiftText(m.text) : null;
              const prev = items[i - 1];
              const showDaySeparator = !prev || !sameDay(prev.createdAt, m.createdAt);

              return (
                <React.Fragment key={m._id}>
                  {showDaySeparator && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-medium text-neutral-400 shadow-sm">
                        {fmtDay(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                        isUser
                          ? 'rounded-br-sm bg-neutral-900 text-white'
                          : 'rounded-bl-sm bg-neutral-200 text-neutral-900'
                      }`}
                    >
                      {gift ? (
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="text-base">{gift.icon}</span> {gift.name}
                        </span>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{m.text}</span>
                      )}

                      <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isUser ? 'justify-end text-neutral-300' : 'justify-start text-neutral-500'}`}>
                        {m.coinsCost > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Coins size={9} /> {m.coinsCost}
                          </span>
                        )}
                        {m.deletedAt && (
                          <span className="flex items-center gap-0.5">
                            <Ban size={9} /> deleted
                          </span>
                        )}
                        <span>{fmtTime(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-neutral-900" /> User</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-neutral-200" /> Host</span>
        </div>
      </div>
    </div>
  );
};

export default ChatConversationDetail;
