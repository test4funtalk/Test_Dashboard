import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Megaphone, PlayCircle, PauseCircle, Crown, Users, Search,
  RefreshCw, Plus, X, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Image as ImageIcon, Video, Trash2, Eye, Upload, FileVideo, ImageOff, Pencil,
  Bell, Send, BellOff, RotateCw,
} from 'lucide-react';
import api from '../../../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const SECTION_TABS = [
  { id: 'ads',          label: 'Ads',                Icon: Megaphone },
  { id: 'notifications', label: 'Global Notification', Icon: Bell      },
];

const AD_TABS = [
  { id: 'user', label: 'User Ads', Icon: Users },
  { id: 'host', label: 'Host Ads', Icon: Crown },
];

const NOTIFICATION_TABS = [
  { id: 'user', label: 'User Notification', Icon: Users },
  { id: 'host', label: 'Host Notification', Icon: Crown },
];

const STATUS_FILTERS = [
  { value: '',         label: 'All'      },
  { value: 'active',   label: 'Active'   },
  { value: 'inactive', label: 'Inactive' },
];

const VALID_SECTION_TABS = new Set(SECTION_TABS.map((t) => t.id));
const VALID_AD_TABS  = new Set(AD_TABS.map((t) => t.id));
const VALID_NOTIFICATION_TABS = new Set(NOTIFICATION_TABS.map((t) => t.id));
const VALID_STATUSES = new Set(STATUS_FILTERS.map((s) => s.value));

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const RoleBadge = ({ role }) => (
  <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
    role === 'host' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
  }`}>
    {role === 'host' ? <Crown size={10} /> : <Users size={10} />}
    {role || '—'}
  </span>
);

const StatusBadge = ({ status }) => (
  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
    status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-neutral-400'}`} />
    {status || '—'}
  </span>
);

const MediaTypeBadge = ({ mediaType }) => (
  <span className="flex w-fit items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-600">
    {mediaType === 'video' ? <Video size={11} /> : <ImageIcon size={11} />}
    <span className="capitalize">{mediaType || '—'}</span>
  </span>
);

// ─── ad detail modal (ad is the already-fetched full record) ──────────────────

const AdDetailModal = ({ ad, onClose, onEdit, onDelete }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
    <div className="flex w-full max-h-[92vh] flex-col rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">

      <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
        <h3 className="text-base font-bold">Ad Details</h3>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          {/* Media preview */}
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
            {ad.mediaType === 'video' ? (
              <video src={ad.mediaUrl} controls className="max-h-72 w-full bg-black" />
            ) : (
              <img src={ad.mediaUrl} alt={ad.title} className="max-h-72 w-full object-contain" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={ad.role} />
            <StatusBadge status={ad.status} />
            <MediaTypeBadge mediaType={ad.mediaType} />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Title</p>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900">{ad.title || '—'}</p>
          </div>

          {ad.description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Description</p>
              <p className="mt-0.5 text-sm text-neutral-700">{ad.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3">
            <div>
              <p className="text-xs text-neutral-400">Created</p>
              <p className="text-sm text-neutral-700">{fmtDateTime(ad.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Updated</p>
              <p className="text-sm text-neutral-700">{fmtDateTime(ad.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 gap-2 border-t border-neutral-100 px-5 py-4">
        <button
          onClick={() => onEdit(ad)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          onClick={() => onDelete(ad)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          <Trash2 size={14} /> Delete
        </button>
        <button onClick={onClose} className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
          Close
        </button>
      </div>
    </div>
  </div>
);

// ─── delete confirm modal ───────────────────────────────────────────────────────

const DeleteAdModal = ({ ad, onCancel, onConfirm, busy }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
        <Trash2 size={22} className="text-red-600" />
      </div>
      <h3 className="text-base font-bold">Delete "{ad.title}"?</h3>
      <p className="mt-1.5 text-sm text-neutral-500">
        This permanently removes the ad and its media. This action cannot be undone.
      </p>
      <div className="mt-5 flex gap-3">
        <button onClick={onCancel} disabled={busy}
          className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {busy ? 'Deleting…' : 'Delete Forever'}
        </button>
      </div>
    </div>
  </div>
);

// ─── create ad modal ────────────────────────────────────────────────────────────

const CreateAdModal = ({ role, onClose, onSuccess }) => {
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus]           = useState('active');
  const [file, setFile]               = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileError, setFileError]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);
  const fileInputRef = useRef(null);

  const pickFile = (f) => {
    if (!f) return;
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setFileError('Only JPEG, PNG, WebP, MP4, MOV or WebM files are allowed');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError('File must be 50MB or smaller');
      return;
    }
    setFileError('');
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview); }, [filePreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setFileError('Please select a media file'); return; }
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('role', role);
      formData.append('status', status);
      formData.append('media', file);

      const { data } = await api.post('/api/admin/ads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess(data?.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create ad');
    } finally {
      setSaving(false);
    }
  };

  const isVideo = file?.type?.startsWith('video/');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full flex-col max-h-[92vh] rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">

        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="font-semibold">Create Ad for {role === 'host' ? 'Hosts' : 'Users'}</p>
            <p className="text-xs text-neutral-400">JPEG, PNG, WebP, MP4, MOV or WebM — max 50MB</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form id="create-ad-form" onSubmit={handleSubmit} className="space-y-4 p-5">

            {/* Media picker */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Media File *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_MIME_TYPES.join(',')}
                onChange={(e) => pickFile(e.target.files?.[0])}
                className="hidden"
              />
              {filePreview ? (
                <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                  {isVideo ? (
                    <video src={filePreview} controls className="max-h-56 w-full bg-black" />
                  ) : (
                    <img src={filePreview} alt="Preview" className="max-h-56 w-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => { setFile(null); setFilePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 py-8 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-600"
                >
                  <Upload size={22} />
                  <span className="text-sm font-medium">Click to choose a file</span>
                  <span className="flex items-center gap-3 text-xs text-neutral-300">
                    <span className="flex items-center gap-1"><ImageOff size={11} /> Image</span>
                    <span className="flex items-center gap-1"><FileVideo size={11} /> Video</span>
                  </span>
                </button>
              )}
              {fileError && <p className="mt-1.5 text-xs text-red-500">{fileError}</p>}
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Title *</label>
              <input
                type="text" required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Refer a friend, earn coins"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Invite friends and both of you get 50 bonus coins."
                className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Role — fixed to the tab the admin created this ad from */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Shown To</label>
                <div className="flex h-[42px] items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-medium capitalize text-neutral-700">
                  {role === 'host' ? <Crown size={14} className="text-amber-500" /> : <Users size={14} className="text-blue-500" />}
                  {role === 'host' ? 'Hosts' : 'Users'}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="flex flex-shrink-0 gap-2 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
            Cancel
          </button>
          <button type="submit" form="create-ad-form" disabled={saving || !!fileError}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
            {saving ? 'Creating…' : 'Create Ad'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── edit ad modal ──────────────────────────────────────────────────────────────

const EditAdModal = ({ ad, onClose, onSuccess }) => {
  const [title, setTitle]             = useState(ad.title || '');
  const [description, setDescription] = useState(ad.description || '');
  const [role, setRole]               = useState(ad.role || 'user');
  const [status, setStatus]           = useState(ad.status || 'active');
  const [file, setFile]               = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileError, setFileError]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);
  const fileInputRef = useRef(null);

  const pickFile = (f) => {
    if (!f) return;
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setFileError('Only JPEG, PNG, WebP, MP4, MOV or WebM files are allowed');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError('File must be 50MB or smaller');
      return;
    }
    setFileError('');
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview); }, [filePreview]);

  const clearNewFile = () => {
    setFile(null);
    setFilePreview(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('role', role);
      formData.append('status', status);
      if (file) formData.append('media', file);

      const { data } = await api.patch(`/api/admin/ads/${ad._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess(data?.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update ad');
    } finally {
      setSaving(false);
    }
  };

  const isNewVideo = file?.type?.startsWith('video/');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full flex-col max-h-[92vh] rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">

        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="font-semibold">Edit Ad</p>
            <p className="text-xs text-neutral-400">Leave media as-is, or replace it below</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form id="edit-ad-form" onSubmit={handleSubmit} className="space-y-4 p-5">

            {/* Media picker */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Media File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_MIME_TYPES.join(',')}
                onChange={(e) => pickFile(e.target.files?.[0])}
                className="hidden"
              />
              <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                {filePreview ? (
                  isNewVideo ? (
                    <video src={filePreview} controls className="max-h-56 w-full bg-black" />
                  ) : (
                    <img src={filePreview} alt="New preview" className="max-h-56 w-full object-contain" />
                  )
                ) : ad.mediaType === 'video' ? (
                  <video src={ad.mediaUrl} controls className="max-h-56 w-full bg-black" />
                ) : (
                  <img src={ad.mediaUrl} alt={ad.title} className="max-h-56 w-full object-contain" />
                )}
                {filePreview && (
                  <button
                    type="button"
                    onClick={clearNewFile}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800"
              >
                <Upload size={12} /> {filePreview ? 'Choose a different file' : 'Replace media'}
              </button>
              {fileError && <p className="mt-1.5 text-xs text-red-500">{fileError}</p>}
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Title *</label>
              <input
                type="text" required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Refer a friend, earn coins"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Invite friends and both of you get 50 bonus coins."
                className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Role */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Shown To *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="user">Users</option>
                  <option value="host">Hosts</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="flex flex-shrink-0 gap-2 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
            Cancel
          </button>
          <button type="submit" form="edit-ad-form" disabled={saving || !!fileError}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ad card (lazily fetches full detail for its thumbnail image) ──────────────

const AdCard = ({ ad, onView, onEdit, onDelete }) => {
  const [detail, setDetail]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get(`/api/admin/ads/${ad._id}`);
      setDetail(data?.data ?? null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [ad._id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:border-neutral-300 hover:shadow-sm">
      {/* Thumbnail */}
      <div className="p-3 pb-0">
        <div className="relative h-64 w-full overflow-hidden rounded-xl bg-neutral-100">
          {loading ? (
            <div className="h-full w-full animate-pulse bg-neutral-100" />
          ) : loadError || !detail?.mediaUrl ? (
            <button
              onClick={loadDetail}
              className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-neutral-300 transition hover:bg-neutral-50 hover:text-neutral-400"
            >
              <ImageOff size={22} />
              <span className="text-xs font-medium">{loadError ? 'Failed to load — retry' : 'No preview'}</span>
            </button>
          ) : (
            <>
              {detail.mediaType === 'video' ? (
                <video src={detail.mediaUrl} className="h-full w-full object-cover" muted preload="metadata" />
              ) : (
                <img src={detail.mediaUrl} alt={ad.title} className="h-full w-full object-cover" />
              )}
              {detail.mediaType === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <PlayCircle size={28} className="text-white drop-shadow" strokeWidth={1.5} />
                </div>
              )}
            </>
          )}

          <div className="absolute left-2 top-2">
            <StatusBadge status={ad.status} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        <p className="truncate text-sm font-semibold text-neutral-900">{ad.title || '—'}</p>
        {detail?.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-neutral-500">{detail.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <RoleBadge role={ad.role} />
          <MediaTypeBadge mediaType={ad.mediaType} />
        </div>
        <p className="mt-2 text-xs text-neutral-400">{fmtDateTime(ad.createdAt)}</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100">
        <button
          onClick={() => onView(detail)}
          disabled={!detail}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40"
        >
          <Eye size={13} /> View
        </button>
        <button
          onClick={() => onEdit(detail)}
          disabled={!detail}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40"
        >
          <Pencil size={13} /> Edit
        </button>
        <button
          onClick={() => onDelete(ad)}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
};

// ─── global notification form modal (create + edit) ────────────────────────────

const NotificationFormModal = ({ notification, defaultRole, onClose, onSuccess }) => {
  const isEdit = !!notification?._id;
  const [title, setTitle]     = useState(notification?.title || '');
  const [message, setMessage] = useState(notification?.message || '');
  const [role, setRole]       = useState(notification?.role || defaultRole || 'user');
  const [status, setStatus]   = useState(notification?.status || 'active');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isEdit) {
        const { data } = await api.put(`/api/admin/ad-notifications/${notification._id}`, {
          title: title.trim(), message: message.trim(), role, status,
        });
        onSuccess(data?.data);
      } else {
        const { data } = await api.post('/api/admin/ad-notifications', {
          title: title.trim(), message: message.trim(), role,
        });
        onSuccess(data?.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} notification`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full flex-col max-h-[92vh] rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">

        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="font-semibold">{isEdit ? 'Edit Notification' : 'Create Global Notification'}</p>
            <p className="text-xs text-neutral-400">
              {isEdit ? 'Re-sends the push only if it stays active' : 'Pushes via FCM to every matching device on save'}
            </p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form id="notification-form" onSubmit={handleSubmit} className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Title *</label>
              <input
                type="text" required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Diwali Offer"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Message *</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Get 20% extra coins this week!"
                className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div className={`grid gap-3 ${isEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Send To *</label>
                {isEdit ? (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                  >
                    <option value="user">Users</option>
                    <option value="host">Hosts</option>
                  </select>
                ) : (
                  <div className="flex h-[42px] items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-medium capitalize text-neutral-700">
                    {role === 'host' ? <Crown size={14} className="text-amber-500" /> : <Users size={14} className="text-blue-500" />}
                    {role === 'host' ? 'Hosts' : 'Users'}
                  </div>
                )}
              </div>

              {isEdit && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="flex flex-shrink-0 gap-2 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
            Cancel
          </button>
          <button type="submit" form="notification-form" disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create & Push'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── delete notification confirm modal ──────────────────────────────────────────

const DeleteNotificationModal = ({ notification, onCancel, onConfirm, busy }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
        <Trash2 size={22} className="text-red-600" />
      </div>
      <h3 className="text-base font-bold">Delete "{notification.title}"?</h3>
      <p className="mt-1.5 text-sm text-neutral-500">
        This permanently removes the notification. It does not recall already-delivered pushes. This action cannot be undone.
      </p>
      <div className="mt-5 flex gap-3">
        <button onClick={onCancel} disabled={busy}
          className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {busy ? 'Deleting…' : 'Delete Forever'}
        </button>
      </div>
    </div>
  </div>
);

// ─── resend notification confirm modal ──────────────────────────────────────────

const ResendNotificationModal = ({ notification, onCancel, onConfirm, busy }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
        <Send size={22} className="text-blue-600" />
      </div>
      <h3 className="text-base font-bold">{notification.pushSent ? 'Resend' : 'Send'} "{notification.title}"?</h3>
      <p className="mt-1.5 text-sm text-neutral-500">
        This pushes the notification via FCM to every {notification.role === 'host' ? 'host' : 'user'} device that matches.
        {notification.pushSent && ' Already-notified devices will receive it again.'}
      </p>
      <div className="mt-5 flex gap-3">
        <button onClick={onCancel} disabled={busy}
          className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {busy ? 'Sending…' : notification.pushSent ? 'Resend Push' : 'Send Push'}
        </button>
      </div>
    </div>
  </div>
);

// ─── global notification tab ────────────────────────────────────────────────────

const GlobalNotificationsTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawNotifTab = searchParams.get('notifTab') || 'user';
  const activeNotifTab = VALID_NOTIFICATION_TABS.has(rawNotifTab) ? rawNotifTab : 'user';

  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination]       = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [roleStats, setRoleStats]         = useState({ active: 0, inactive: 0 });
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [page, setPage]                   = useState(1);
  const [status, setStatus]               = useState('');

  const setActiveNotifTab = useCallback((t) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (t === 'user') p.delete('notifTab'); else p.set('notifTab', t);
      return p;
    }, { replace: true });
    setPage(1);
  }, [setSearchParams]);

  const [showCreate, setShowCreate]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState(null);

  const [resendTarget, setResendTarget]   = useState(null);
  const [resending, setResending]         = useState(false);
  const [resendError, setResendError]     = useState(null);
  const [resendSuccess, setResendSuccess] = useState(null);

  const fetchNotifications = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: targetPage, limit: 20, role: activeNotifTab };
      if (status) params.status = status;

      const { data } = await api.get('/api/admin/ad-notifications', { params });

      const rows = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};

      setNotifications(rows);
      setPagination({
        total: pg.total ?? rows.length,
        page:  pg.page  ?? targetPage,
        limit: pg.limit ?? 20,
        pages: pg.pages ?? Math.ceil((pg.total ?? rows.length) / 20),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [activeNotifTab, status]);

  // Active/Inactive counts scoped to the selected role tab — fetched separately
  // since the list query's own status pill filter would otherwise shrink these.
  const fetchRoleStats = useCallback(async () => {
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        api.get('/api/admin/ad-notifications', { params: { role: activeNotifTab, status: 'active', limit: 1 } }),
        api.get('/api/admin/ad-notifications', { params: { role: activeNotifTab, status: 'inactive', limit: 1 } }),
      ]);
      setRoleStats({
        active:   activeRes.data?.pagination?.total ?? 0,
        inactive: inactiveRes.data?.pagination?.total ?? 0,
      });
    } catch {
      // keep previous stats on failure
    }
  }, [activeNotifTab]);

  useEffect(() => { fetchRoleStats(); }, [fetchRoleStats]);

  useEffect(() => {
    fetchNotifications(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNotifications]);

  const onPage = (n) => { setPage(n); fetchNotifications(n); };

  const onStatusChange = (s) => { setStatus(s); setPage(1); };

  const handleCreated = () => {
    setShowCreate(false);
    fetchNotifications(1);
    fetchRoleStats();
    setPage(1);
  };

  const handleUpdated = () => {
    setEditTarget(null);
    fetchNotifications(page);
    fetchRoleStats();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/admin/ad-notifications/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchNotifications(page);
      fetchRoleStats();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete notification');
    } finally {
      setDeleting(false);
    }
  };

  // Re-uses the update endpoint with unchanged fields (forcing status to active) —
  // the backend re-pushes via FCM on every update where the notification stays active.
  const confirmResend = async () => {
    if (!resendTarget) return;
    setResending(true);
    setResendError(null);
    try {
      const { data } = await api.put(`/api/admin/ad-notifications/${resendTarget._id}`, {
        title: resendTarget.title,
        message: resendTarget.message,
        role: resendTarget.role,
        status: 'active',
      });
      setResendTarget(null);
      setResendSuccess(data?.message || 'Notification sent');
      fetchNotifications(page);
      fetchRoleStats();
    } catch (err) {
      setResendError(err.response?.data?.message || 'Failed to resend notification');
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (!resendSuccess) return;
    const t = setTimeout(() => setResendSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [resendSuccess]);

  const STAT_CARDS = [
    { label: 'Total', value: roleStats.active + roleStats.inactive, Icon: Bell, cls: 'bg-neutral-900 text-white' },
    activeNotifTab === 'host'
      ? { label: 'Host Notifications', value: roleStats.active + roleStats.inactive, Icon: Crown, cls: 'bg-amber-50 text-amber-800 border border-amber-200' }
      : { label: 'User Notifications', value: roleStats.active + roleStats.inactive, Icon: Users, cls: 'bg-blue-50 text-blue-800 border border-blue-200' },
    { label: 'Active',   value: roleStats.active,   Icon: PlayCircle,  cls: 'bg-green-50 text-green-800 border border-green-200' },
    { label: 'Inactive', value: roleStats.inactive, Icon: PauseCircle, cls: 'bg-neutral-100 text-neutral-600 border border-neutral-200' },
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

        {/* Host / User tabs */}
        <div className="flex border-b border-neutral-200 px-2 sm:px-4">
          {NOTIFICATION_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveNotifTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeNotifTab === id
                  ? '-mb-px border-black text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => onStatusChange(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  status === value ? 'bg-neutral-800 text-white' : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => fetchNotifications(page)}
              disabled={loading}
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-2.5 text-xs font-medium text-white transition hover:opacity-80"
            >
              <Plus size={13} /> {activeNotifTab === 'host' ? 'Host' : 'User'} Notification
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
            <button onClick={() => fetchNotifications(page)}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading notifications…
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {status ? 'No notifications match your filters' : `No ${activeNotifTab} notifications yet`}
            </p>
            <p className="mt-1 text-xs text-neutral-300">Created notifications will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50">
                  {['Title', 'Message', 'Role', 'Status', 'Push', 'Created', 'Actions'].map((h) => (
                    <th key={h} className={`border border-neutral-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n._id} className="transition-colors hover:bg-neutral-50">
                    <td className="border border-neutral-200 px-4 py-3 font-medium text-neutral-900">{n.title || '—'}</td>
                    <td className="max-w-[260px] border border-neutral-200 px-4 py-3 text-xs text-neutral-600">
                      <span className="line-clamp-2">{n.message || '—'}</span>
                    </td>
                    <td className="border border-neutral-200 px-4 py-3"><RoleBadge role={n.role} /></td>
                    <td className="border border-neutral-200 px-4 py-3"><StatusBadge status={n.status} /></td>
                    <td className="border border-neutral-200 px-4 py-3">
                      {n.pushSent ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                          <Send size={12} /> {n.pushDeviceCount ?? 0} devices
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <BellOff size={12} /> Not sent
                        </span>
                      )}
                    </td>
                    <td className="border border-neutral-200 px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">{fmtDateTime(n.createdAt)}</td>
                    <td className="border border-neutral-200 px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => { setResendError(null); setResendTarget(n); }}
                          disabled={n.status !== 'active'}
                          title={n.status !== 'active' ? 'Activate this notification to send' : n.pushSent ? 'Resend push notification' : 'Send push notification'}
                          className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <RotateCw size={12} />
                        </button>
                        <button
                          onClick={() => setEditTarget(n)}
                          className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => { setDeleteError(null); setDeleteTarget(n); }}
                          className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={12} />
                        </button>
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

      {showCreate && (
        <NotificationFormModal defaultRole={activeNotifTab} onClose={() => setShowCreate(false)} onSuccess={handleCreated} />
      )}

      {editTarget && (
        <NotificationFormModal
          notification={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={handleUpdated}
        />
      )}

      {deleteTarget && (
        <DeleteNotificationModal
          notification={deleteTarget}
          busy={deleting}
          onCancel={() => { if (!deleting) setDeleteTarget(null); }}
          onConfirm={confirmDelete}
        />
      )}

      {resendTarget && (
        <ResendNotificationModal
          notification={resendTarget}
          busy={resending}
          onCancel={() => { if (!resending) setResendTarget(null); }}
          onConfirm={confirmResend}
        />
      )}

      {deleteError && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-lg">
          <AlertCircle size={15} /> {deleteError}
        </div>
      )}

      {resendError && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-lg">
          <AlertCircle size={15} /> {resendError}
        </div>
      )}

      {resendSuccess && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-lg">
          <Send size={15} /> {resendSuccess}
        </div>
      )}
    </div>
  );
};

// ─── main section ─────────────────────────────────────────────────────────────

const AdsManagementSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawSection = searchParams.get('section') || 'ads';
  const rawAdTab   = searchParams.get('adTab') || 'user';
  const rawStatus  = searchParams.get('adStatus') || '';
  const activeSection = VALID_SECTION_TABS.has(rawSection) ? rawSection : 'ads';
  const activeAdTab   = VALID_AD_TABS.has(rawAdTab) ? rawAdTab : 'user';
  const activeStatus  = VALID_STATUSES.has(rawStatus) ? rawStatus : '';

  const setActiveSection = useCallback((s) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (s === 'ads') p.delete('section'); else p.set('section', s);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  const [ads, setAds]               = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [summary, setSummary]       = useState({ hostAds: 0, userAds: 0, active: 0, inactive: 0 });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');

  const [showCreate, setShowCreate]     = useState(false);
  const [viewTarget, setViewTarget]     = useState(null);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState(null);

  const fetchAds = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: targetPage, limit: 20, role: activeAdTab };
      if (activeStatus) params.status = activeStatus;

      const { data } = await api.get('/api/admin/ads', { params });

      const rows = Array.isArray(data?.data) ? data.data : [];
      const pg   = data?.pagination ?? {};
      const sm   = data?.summary ?? {};

      setAds(rows);
      setPagination({
        total: pg.total ?? rows.length,
        page:  pg.page  ?? targetPage,
        limit: pg.limit ?? 20,
        pages: pg.pages ?? Math.ceil((pg.total ?? rows.length) / 20),
      });
      setSummary({
        hostAds:  sm.hostAds  ?? 0,
        userAds:  sm.userAds  ?? 0,
        active:   sm.active   ?? 0,
        inactive: sm.inactive ?? 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load ads');
    } finally {
      setLoading(false);
    }
  }, [activeAdTab, activeStatus]);

  useEffect(() => {
    fetchAds(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAds]);

  const setActiveAdTab = useCallback((t) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (t === 'user') p.delete('adTab'); else p.set('adTab', t);
      return p;
    }, { replace: true });
    setPage(1);
  }, [setSearchParams]);

  const setActiveStatusFilter = useCallback((s) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (s) p.set('adStatus', s); else p.delete('adStatus');
      return p;
    }, { replace: true });
    setPage(1);
  }, [setSearchParams]);

  const onPage = (n) => { setPage(n); fetchAds(n); };

  const filteredRows = search.trim()
    ? ads.filter((a) => a.title?.toLowerCase().includes(search.trim().toLowerCase()))
    : ads;

  const handleCreated = () => {
    setShowCreate(false);
    fetchAds(1);
    setPage(1);
  };

  const handleUpdated = () => {
    setEditTarget(null);
    setViewTarget(null);
    fetchAds(page);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/admin/ads/${deleteTarget._id}`);
      setDeleteTarget(null);
      setViewTarget(null);
      fetchAds(page);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete ad');
    } finally {
      setDeleting(false);
    }
  };

  const STAT_CARDS = [
    { label: 'Total Ads', value: pagination.total, Icon: Megaphone,   cls: 'bg-neutral-900 text-white' },
    { label: 'Host Ads',  value: summary.hostAds,   Icon: Crown,       cls: 'bg-amber-50 text-amber-800 border border-amber-200' },
    { label: 'User Ads',  value: summary.userAds,   Icon: Users,       cls: 'bg-blue-50 text-blue-800 border border-blue-200' },
    { label: 'Active',    value: summary.active,    Icon: PlayCircle,  cls: 'bg-green-50 text-green-800 border border-green-200' },
    { label: 'Inactive',  value: summary.inactive,  Icon: PauseCircle, cls: 'bg-neutral-100 text-neutral-600 border border-neutral-200' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Top-level section tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-200">
        {SECTION_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`-mb-px flex flex-shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeSection === id
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'notifications' ? (
        <GlobalNotificationsTab />
      ) : (
      <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
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

        {/* Host / User tabs */}
        <div className="flex border-b border-neutral-200 px-2 sm:px-4">
          {AD_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveAdTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeAdTab === id
                  ? '-mb-px border-black text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setActiveStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeStatus === value
                    ? 'bg-neutral-800 text-white'
                    : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}>
                {label}
              </button>
            ))}
            <button
              onClick={() => fetchAds(page)}
              disabled={loading}
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-80"
            >
              <Plus size={13} /> Create {activeAdTab === 'host' ? 'Host' : 'User'} Ad
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
            <button onClick={() => fetchAds(page)}
              className="flex-shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50">
              Retry
            </button>
          </div>
        )}

        {/* Card grid */}
        {loading && ads.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 size={20} className="animate-spin" /> Loading ads…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center">
            <Megaphone size={36} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">
              {search || activeStatus ? 'No ads match your filters' : 'No ads yet'}
            </p>
            <p className="mt-1 text-xs text-neutral-300">Created ads will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRows.map((ad) => (
              <AdCard
                key={ad._id}
                ad={ad}
                onView={(detail) => detail && setViewTarget(detail)}
                onEdit={(detail) => detail && setEditTarget(detail)}
                onDelete={(a) => { setDeleteError(null); setDeleteTarget(a); }}
              />
            ))}
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

      {showCreate && (
        <CreateAdModal role={activeAdTab} onClose={() => setShowCreate(false)} onSuccess={handleCreated} />
      )}

      {viewTarget && (
        <AdDetailModal
          ad={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={(ad) => { setViewTarget(null); setEditTarget(ad); }}
          onDelete={(ad) => { setDeleteError(null); setDeleteTarget(ad); }}
        />
      )}

      {editTarget && (
        <EditAdModal
          ad={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={handleUpdated}
        />
      )}

      {deleteTarget && (
        <DeleteAdModal
          ad={deleteTarget}
          busy={deleting}
          onCancel={() => { if (!deleting) setDeleteTarget(null); }}
          onConfirm={confirmDelete}
        />
      )}

      {deleteError && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-lg">
          <AlertCircle size={15} /> {deleteError}
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default AdsManagementSection;
