import React, { useState } from 'react';
import { Package, CheckCircle, Star, Plus, Edit2, ToggleLeft } from 'lucide-react';

const STATS = [
  { label: 'Total Packages', value: '0', color: 'bg-neutral-900 text-white' },
  { label: 'Active', value: '0', color: 'bg-green-50 text-green-800 border border-green-200' },
  { label: 'Premium', value: '0', color: 'bg-amber-50 text-amber-800 border border-amber-200' },
];

const PackageManagementSection = () => {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 grid-cols-3 gap-3">
          {STATS.map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl p-3 sm:rounded-2xl sm:p-5 ${color}`}>
              <p className="text-2xl font-black sm:text-3xl">{value}</p>
              <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1 sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex flex-shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-80"
        >
          <Plus size={16} /> Add Package
        </button>
      </div>

      {/* Packages grid */}
      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <p className="font-semibold">All Packages</p>
        </div>

        {/* Empty state */}
        <div className="py-20 text-center">
          <Package size={40} className="mx-auto mb-3 text-neutral-200" />
          <p className="text-sm font-medium text-neutral-400">No packages created yet</p>
          <p className="mt-1 text-xs text-neutral-300">Create subscription packages to offer users</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-400"
          >
            <Plus size={15} /> Create your first package
          </button>
        </div>
      </div>

      {/* Create Package Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <p className="font-semibold">New Package</p>
                <p className="text-sm text-neutral-400">Define a new subscription plan</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
                <Plus size={16} className="rotate-45" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              {[
                { label: 'Package Name', placeholder: 'e.g. Premium Monthly' },
                { label: 'Price (₹)', placeholder: '299' },
                { label: 'Duration (days)', placeholder: '30' },
              ].map(({ label, placeholder }) => (
                <div key={label}>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Features (one per line)</label>
                <textarea
                  rows={3}
                  placeholder="Unlimited swipes&#10;Profile boost&#10;See who liked you"
                  className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium transition hover:bg-neutral-50">Cancel</button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-medium text-white transition hover:opacity-80">
                  <CheckCircle size={15} /> Save Package
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageManagementSection;
