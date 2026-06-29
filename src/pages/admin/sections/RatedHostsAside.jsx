import React, { useState, useEffect } from 'react';
import { Star, Crown, Medal, Award, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';

const RANK_META = {
  1: { Icon: Crown, ring: 'ring-amber-300',   badge: 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-900',      bar: 'bg-gradient-to-t from-amber-500 to-amber-300',    avatarSize: 'xl', minH: 168, rating: 'text-amber-600',   num: 'text-amber-900/30' },
  2: { Icon: Medal, ring: 'ring-neutral-300', badge: 'bg-gradient-to-b from-neutral-200 to-neutral-400 text-neutral-700', bar: 'bg-gradient-to-t from-neutral-400 to-neutral-200', avatarSize: 'lg', minH: 122, rating: 'text-neutral-600', num: 'text-neutral-700/30' },
  3: { Icon: Award, ring: 'ring-orange-300',  badge: 'bg-gradient-to-b from-orange-200 to-orange-400 text-orange-900',   bar: 'bg-gradient-to-t from-orange-400 to-orange-200',  avatarSize: 'lg', minH: 92,  rating: 'text-orange-600',  num: 'text-orange-900/30' },
};

// Reveal order builds suspense toward the winner: 3rd place grows first, 1st place last.
const REVEAL_THRESHOLD = { 3: 1, 2: 2, 1: 3 };

// Animates a number from 0 up to `target` whenever `active` flips true —
// gives the rating figure a "counting up" reveal instead of popping in flat.
const useCountUp = (target, active, duration = 1000) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf;
    const to = Number(target) || 0;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(to * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
};

const PodiumColumn = ({ entry, rank, barHeight, revealed }) => {
  const meta  = RANK_META[rank];
  const count = useCountUp(entry.avgRating, revealed);

  return (
    <div className="flex w-28 flex-shrink-0 flex-col items-center sm:w-36 md:w-44">
      {/* avatar + medal badge */}
      <div
        className={`relative mb-3 transition-all duration-500 ease-out ${
          revealed ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-90 opacity-0'
        }`}
      >
        {rank === 1 && (
          <Sparkles size={18} className="absolute -left-6 -top-2 animate-pulse text-amber-400" />
        )}
        <div className={`rounded-full bg-white p-0.5 ring-2 ring-offset-2 ring-offset-white ${meta.ring}`}>
          <AvatarDisplay src={entry.host?.avatar} name={entry.host?.username} size={meta.avatarSize} />
        </div>
        <span className={`absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full shadow-lg ${meta.badge}`}>
          <meta.Icon size={14} />
        </span>
      </div>

      <p className="w-full truncate text-center text-sm font-semibold text-neutral-900 sm:text-base">
        {entry.host?.username || '—'}
      </p>
      <p className={`mb-2 flex items-center gap-1 text-lg font-black sm:text-xl ${meta.rating}`}>
        <Star size={15} className="fill-current" /> {count.toFixed(1)}
      </p>
      <p className="mb-2 text-[11px] text-neutral-400">{entry.count} ratings</p>

      {/* podium block */}
      <div
        className={`relative flex w-full items-start justify-center overflow-hidden rounded-t-2xl transition-[height] duration-700 ease-out ${meta.bar}`}
        style={{ height: revealed ? barHeight : 0 }}
      >
        <span className={`pt-2 text-4xl font-black sm:text-5xl ${meta.num}`}>{rank}</span>
      </div>
    </div>
  );
};

const RatedHostsAside = ({ hosts: allHosts = [], loading, error }) => {
  const [revealCount, setRevealCount] = useState(0);
  const hosts = allHosts.slice(0, 3);

  // Countdown reveal: 3rd place shows first, building suspense up to the 1st place host.
  useEffect(() => {
    setRevealCount(0);
    if (!hosts.length) return;
    const timers = [1, 2, 3].map((n) =>
      setTimeout(() => setRevealCount((c) => Math.max(c, n)), 450 * n)
    );
    return () => timers.forEach(clearTimeout);
  }, [hosts.map((h) => h.host?._id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const heightFor = (rank, avgRating) => Math.max(RANK_META[rank].minH * Math.max(avgRating / 5, 0.3), 60);

  // Classic podium order: 2nd on the left, 1st in the middle, 3rd on the right.
  const podium = hosts.length === 3 ? [hosts[1], hosts[0], hosts[2]] : hosts;
  const ranks  = hosts.length === 3 ? [2, 1, 3] : hosts.map((_, i) => i + 1);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white px-4 py-8 shadow-sm sm:px-10 sm:py-12">
      {/* decorative glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative mb-8 flex items-center justify-center gap-2 sm:mb-12">
        <Star size={20} className="fill-amber-500 text-amber-500" />
        <p className="text-base font-bold text-neutral-900 sm:text-lg">Top Rated Hosts</p>
      </div>

      {error ? (
        <p className="relative flex items-center justify-center gap-1.5 py-6 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
        </p>
      ) : loading ? (
        <div className="relative flex items-center justify-center gap-2 py-12 text-neutral-400">
          <Loader2 size={20} className="animate-spin" /> Crunching ratings…
        </div>
      ) : hosts.length === 0 ? (
        <p className="relative py-10 text-center text-sm text-neutral-400">No host ratings yet</p>
      ) : (
        <div className="relative mx-auto flex max-w-2xl items-end justify-center gap-6 border-b-2 border-neutral-100 px-2 pb-0 sm:gap-10 md:gap-14">
          {podium.map((entry, i) => {
            const rank = ranks[i];
            return (
              <PodiumColumn
                key={entry.host?._id || i}
                entry={entry}
                rank={rank}
                barHeight={heightFor(rank, entry.avgRating)}
                revealed={revealCount >= REVEAL_THRESHOLD[rank]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RatedHostsAside;
