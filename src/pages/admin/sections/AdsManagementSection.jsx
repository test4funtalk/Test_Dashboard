import React, { useState } from 'react';
import { Megaphone, PlayCircle, Clock, XCircle, PauseCircle, Plus, Search } from 'lucide-react';

const STATS = [
  { label: 'Total Ads', value: '0', icon: Megaphone, color: 'bg-neutral-900 text-white' },
  { label: 'Active', value: '0', icon: PlayCircle, color: 'bg-green-50 text-green-800 border border-green-200' },
  { label: 'Pending', value: '0', icon: Clock, color: 'bg-amber-50 text-amber-800 border border-amber-200' },
  { label: 'Expired', value: '0', icon: PauseCircle, color: 'bg-neutral-100 text-neutral-600 border border-neutral-200' },
];

const TABLE_HEADERS = ['Ad Title', 'Type', 'Status', 'Budget', 'Impressions', 'Clicks', 'Period', ''];
const AD_TYPES = ['all', 'banner', 'popup', 'video'];

const AdsManagementSection = () => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl p-3 sm:rounded-2xl sm:p-5 ${color}`}>
            <div className="flex items-start justify-between">
              <p className="text-2xl font-black sm:text-3xl">{value}</p>
              <Icon size={18} className="opacity-50" />
            </div>
            <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1 sm:text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search ads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {AD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  typeFilter === t ? 'bg-black text-white' : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-80"
            >
              <Plus size={13} /> Create Ad
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-neutral-100">
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="py-20 text-center">
                  <Megaphone size={36} className="mx-auto mb-3 text-neutral-200" />
                  <p className="text-sm font-medium text-neutral-400">No ad campaigns yet</p>
                  <p className="mt-1 text-xs text-neutral-300">Ad campaigns will appear here once created</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Ad Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <p className="font-semibold">Create Ad Campaign</p>
                <p className="text-sm text-neutral-400">Launch a new ad on the platform</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
                <Plus size={16} className="rotate-45" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Ad Title</label>
                <input type="text" placeholder="e.g. Summer Promo" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Type</label>
                <select className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400">
                  {['Banner', 'Popup', 'Video'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">Budget (₹)</label>
                  <input type="number" placeholder="1000" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">Duration (days)</label>
                  <input type="number" placeholder="7" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium transition hover:bg-neutral-50">Cancel</button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-medium text-white transition hover:opacity-80">
                  <Megaphone size={15} /> Launch Ad
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsManagementSection;
