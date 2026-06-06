import React, { useState } from 'react';
import { CreditCard, TrendingUp, Clock, XCircle, Search, Calendar } from 'lucide-react';

const STATS = [
  { label: 'Total Revenue', value: '₹0', icon: TrendingUp, color: 'bg-neutral-900 text-white' },
  { label: "Today's Revenue", value: '₹0', icon: CreditCard, color: 'bg-green-50 text-green-800 border border-green-200' },
  { label: 'Pending', value: '0', icon: Clock, color: 'bg-amber-50 text-amber-800 border border-amber-200' },
  { label: 'Failed', value: '0', icon: XCircle, color: 'bg-red-50 text-red-800 border border-red-200' },
];

const TABLE_HEADERS = ['User', 'Amount', 'Method', 'Status', 'Transaction ID', 'Date'];

const RANGES = ['Today', '7 Days', '30 Days', 'All'];

const PaymentManagementSection = () => {
  const [range, setRange] = useState('All');
  const [search, setSearch] = useState('');

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
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-neutral-400" />
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  range === r ? 'bg-black text-white' : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
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
                  <CreditCard size={36} className="mx-auto mb-3 text-neutral-200" />
                  <p className="text-sm font-medium text-neutral-400">No transactions yet</p>
                  <p className="mt-1 text-xs text-neutral-300">Payment records will appear here once the API is connected</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentManagementSection;
