import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, X, Loader2, AlertCircle, CheckCircle, RefreshCw, Save } from 'lucide-react';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = { minVersion: '', latestVersion: '', androidUrl: '', iosUrl: '' };

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const FIELDS = [
  { key: 'minVersion',    label: 'Minimum Version', placeholder: 'e.g. 2.0.0' },
  { key: 'latestVersion', label: 'Latest Version',  placeholder: 'e.g. 2.1.0' },
  { key: 'androidUrl',    label: 'Android Store URL', placeholder: 'https://play.google.com/store/apps/details?id=...' },
  { key: 'iosUrl',        label: 'iOS Store URL',     placeholder: 'https://apps.apple.com/app/id...' },
];

// ─── component ────────────────────────────────────────────────────────────────

const AppVersionOverlay = ({ onClose }) => {
  const [record, setRecord]   = useState(null); // last saved doc from the server, or null if never configured
  const [form, setForm]       = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/app-version');
      const doc = data?.data ?? null;
      setRecord(doc);
      setForm(doc ? {
        minVersion: doc.minVersion || '',
        latestVersion: doc.latestVersion || '',
        androidUrl: doc.androidUrl || '',
        iosUrl: doc.iosUrl || '',
      } : EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load app version config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    // first-ever save: no existing record, so the upsert needs all four fields
    const payload = record
      ? Object.fromEntries(FIELDS.filter(({ key }) => form[key] !== (record[key] || '')).map(({ key }) => [key, form[key]]))
      : { ...form };

    if (Object.keys(payload).length === 0) {
      setSaveError('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.patch('/api/admin/app-version', payload);
      const doc = data?.data ?? null;
      setRecord(doc);
      setForm(doc ? {
        minVersion: doc.minVersion || '',
        latestVersion: doc.latestVersion || '',
        androidUrl: doc.androidUrl || '',
        iosUrl: doc.iosUrl || '',
      } : EMPTY_FORM);
      setSaveSuccess(true);
    } catch (err) {
      // 400s are validation errors — keep the form as-is so the admin can fix and resubmit
      setSaveError(err.response?.data?.message || err.message || 'Failed to save app version config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100">
              <Smartphone size={18} className="text-neutral-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold leading-none">App Version</h3>
              <p className="mt-1 text-xs text-neutral-400">
                {record ? `Updated ${fmtDateTime(record.updatedAt)}` : 'Not configured yet'}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={fetchConfig}
              disabled={loading}
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-40"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
            <button
              onClick={fetchConfig}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
              <Loader2 size={20} className="animate-spin" /> Loading app version config…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <CheckCircle size={16} /> App version config updated
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <AlertCircle size={16} /> {saveError}
                </div>
              )}

              {FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
                  <input
                    type="text"
                    required
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-medium text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppVersionOverlay;
