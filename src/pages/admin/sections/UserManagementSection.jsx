import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Search, RefreshCw, Pencil, Trash2, Crown, X, ArrowLeft,
  ChevronLeft, ChevronRight, Users, UserCheck, ShieldCheck,
  Wifi, AlertCircle, Loader2, CheckCircle, Phone, Calendar,
  Lock, Globe, CreditCard, Clock, UserCircle, Shield,
} from 'lucide-react';
import {
  fetchUsers, fetchHosts, updateUser, deleteUser,
  changeToHost, resetUpdateStatus, clearUserErrors,
} from '../../../store/slices/userSlice';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';
import { TableRowsSkeleton } from '../../../components/ui/Skeleton';
import { getLanguages } from '../../../services/languageService';

// ─── tiny helpers ─────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt',  label: 'Oldest first' },
  { value: 'username',   label: 'Username A–Z' },
  { value: '-username',  label: 'Username Z–A' },
  { value: '-lastSeen',  label: 'Last active'  },
];

// ─── status / role badges ─────────────────────────────────────────────────────

const StatusBadge = ({ status }) => (
  <span className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
    status === 'active'  ? 'bg-green-100 text-green-700' :
    status === 'blocked' ? 'bg-red-100 text-red-600'    :
                           'bg-amber-100 text-amber-700'
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${
      status === 'active'  ? 'bg-green-500' :
      status === 'blocked' ? 'bg-red-500'   : 'bg-amber-500'
    }`} />
    <span className="capitalize">{status || '—'}</span>
  </span>
);

const OnlineBadge = ({ status }) => (
  <span className={`text-xs font-medium ${
    status === 'online' ? 'text-green-500' :
    status === 'incall' ? 'text-blue-500' : 'text-neutral-400'
  }`}>
    {status === 'online' ? '● Online' : status === 'incall' ? '● In Call' : '○ Offline'}
  </span>
);

const RoleBadge = ({ role }) => (
  <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
    role === 'host'  ? 'bg-amber-100 text-amber-700' :
    role === 'admin' ? 'bg-purple-100 text-purple-700' :
                       'bg-neutral-100 text-neutral-600'
  }`}>
    {role === 'host' && <Crown size={10} />}
    {role === 'admin' && <Shield size={10} />}
    <span className="capitalize">{role}</span>
  </span>
);

// ─── mother tongue multi-select ───────────────────────────────────────────────

const MotherTongueSelect = ({ value = [], onChange, languages, loading }) => {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < 230);
    }
    setOpen((o) => !o);
  };

  const getLangName = (l) => l?.name ?? l?.languageName ?? l?.language ?? String(l);

  const filtered = languages.filter((l) =>
    getLangName(l).toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (name) => {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  };

  return (
    <div ref={ref} className="relative">
      {/* Selected chips */}
      <div
        onClick={openDropdown}
        className="min-h-[42px] w-full cursor-pointer rounded-xl border border-neutral-200 px-3 py-2 focus-within:border-neutral-400 flex flex-wrap gap-1.5 items-start"
      >
        {value.length === 0 && (
          <span className="text-sm text-neutral-400 py-0.5">Select languages…</span>
        )}
        {value.map((lang) => (
          <span key={lang} className="flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-medium text-white">
            {lang}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(lang); }}
              className="hover:opacity-70"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <span className="ml-auto py-0.5 text-neutral-400">
          <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 w-full rounded-xl border border-neutral-200 bg-white shadow-lg ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search language…"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-neutral-50">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-neutral-400 text-sm gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-400">No languages found</p>
            ) : (
              filtered.map((lang) => {
                const name = getLangName(lang);
                const checked = value.includes(name);
                return (
                  <label
                    key={lang._id ?? name}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(name)}
                      className="h-4 w-4 rounded accent-black"
                    />
                    <span className="text-sm">{name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── pagination ───────────────────────────────────────────────────────────────

const PaginationBar = ({ pagination, onPage }) => {
  const { page = 1, pages = 1, total = 0 } = pagination;
  return (
    <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 sm:px-6">
      <p className="text-xs text-neutral-400">{total} total</p>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs text-neutral-500">{page} / {pages || 1}</span>
        <button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

// ─── user detail page ─────────────────────────────────────────────────────────

const UserDetailPage = ({ user, activeTab, onBack, onEdit, onDelete, onPromote, promotingId }) => {
  const canPromote = activeTab === 'users' && user.gender === 'female' && user.role === 'user';
  const isPromoting = promotingId === user._id;

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-neutral-50 last:border-0">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</p>
        <div className="mt-0.5 text-sm text-neutral-800">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-900"
      >
        <ArrowLeft size={16} />
        Back to {activeTab === 'users' ? 'Users' : 'Hosts'}
      </button>

      {/* Profile header */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: avatar + identity */}
          <div className="flex items-start gap-4">
            <AvatarDisplay src={user.avatar} name={user.username} size="xl" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight">{user.username || '—'}</h2>
              <p className="text-sm text-neutral-400">{user.phone || 'No phone'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
                {user.isVerified && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <ShieldCheck size={10} /> Verified
                  </span>
                )}
                <OnlineBadge status={user.userCurrentStatus} />
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
            >
              <Pencil size={14} /> Edit Profile
            </button>
            {canPromote && (
              <button
                onClick={onPromote}
                disabled={!!promotingId}
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                {isPromoting ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
                Make Host
              </button>
            )}
            <button
              onClick={onDelete}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
            >
              <Trash2 size={14} /> Delete User
            </button>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Personal Info */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Personal</p>
          <InfoRow icon={UserCircle} label="Gender" value={<span className="capitalize">{user.gender || '—'}</span>} />
          <InfoRow icon={Calendar}   label="Date of Birth" value={fmtDate(user.dob)} />
          <InfoRow icon={Globe}      label="Mother Tongue" value={
            user.motherTongue?.length
              ? <div className="flex flex-wrap gap-1 mt-0.5">{user.motherTongue.map((l) => (
                  <span key={l} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{l}</span>
                ))}</div>
              : '—'
          } />
          <InfoRow icon={Lock} label="Screen Lock" value={
            user.activateScreenlock === 'allowed'
              ? <span className="text-green-600">Allowed</span>
              : user.activateScreenlock === 'not_allowed'
              ? <span className="text-red-500">Not Allowed</span>
              : '—'
          } />
        </div>

        {/* Account Info */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Account</p>
          <InfoRow icon={CreditCard} label="Balance" value={<span className="font-semibold">₹{user.balance ?? 0}</span>} />
          <InfoRow icon={Phone}      label="Phone"   value={user.phone || '—'} />
          <InfoRow icon={ShieldCheck} label="Verified" value={
            user.isVerified
              ? <span className="text-blue-600 font-medium">Yes</span>
              : <span className="text-neutral-400">No</span>
          } />
          <InfoRow icon={Wifi}  label="Current Status" value={<OnlineBadge status={user.userCurrentStatus} />} />
        </div>

        {/* Timestamps */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Timeline</p>
          <div className="grid gap-0 sm:grid-cols-3">
            <InfoRow icon={Clock} label="Joined"       value={fmtDateTime(user.createdAt)} />
            <InfoRow icon={Clock} label="Last Seen"    value={fmtDateTime(user.lastSeen)} />
            <InfoRow icon={Clock} label="Username Updated" value={fmtDate(user.lastUsernameUpdate)} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── main section ─────────────────────────────────────────────────────────────

const UserManagementSection = () => {
  const dispatch = useDispatch();
  const {
    users, usersLoading, usersError, usersPagination,
    hosts, hostsLoading, hostsError, hostsPagination,
    stats,
    updateLoading, updateError, updateSuccess,
    deletingId, deleteError,
    promotingId, promoteError,
  } = useSelector((s) => s.user);

  // tab / filter
  const [activeTab, setActiveTab]   = useState('users');
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDs]    = useState('');
  const [sort, setSort]             = useState('-createdAt');
  const [page, setPage]             = useState(1);

  // detail page — store only the ID; derive the object from Redux list
  const [selectedId, setSelectedId] = useState(null);

  // modals
  const [editTarget, setEditTarget]     = useState(null);
  const [editForm, setEditForm]         = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  // languages
  const [languages, setLanguages]     = useState([]);
  const [langsLoading, setLangsLoading] = useState(false);

  // ── fetch languages once ────────────────────────────────────────────────
  useEffect(() => {
    setLangsLoading(true);
    getLanguages()
      .then(setLanguages)
      .catch(() => {})
      .finally(() => setLangsLoading(false));
  }, []);

  // ── fetch hosts count on mount so stat card is always populated ─────────
  useEffect(() => {
    dispatch(fetchHosts({ page: 1, limit: 1 }));
  }, [dispatch]);

  // ── debounce search ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDs(search); setPage(1); }, 450);
    return () => clearTimeout(t);
  }, [search]);

  // ── fetch on filter change ──────────────────────────────────────────────
  const doFetch = useCallback(() => {
    const params = { page, limit: 20, sort, ...(debouncedSearch && { search: debouncedSearch }) };
    if (activeTab === 'users') dispatch(fetchUsers(params));
    else                       dispatch(fetchHosts(params));
  }, [dispatch, activeTab, page, sort, debouncedSearch]);

  useEffect(() => { doFetch(); }, [doFetch]);

  // ── close edit on success ───────────────────────────────────────────────
  useEffect(() => {
    if (updateSuccess) {
      setEditTarget(null);
      const t = setTimeout(() => dispatch(resetUpdateStatus()), 100);
      return () => clearTimeout(t);
    }
  }, [updateSuccess, dispatch]);

  // ── close detail after promote (user removed from list) ─────────────────
  useEffect(() => {
    if (!promotingId && selectedId) {
      const inList = [...users, ...hosts].find((u) => u._id === selectedId);
      if (!inList) setSelectedId(null);
    }
  }, [promotingId, users, hosts, selectedId]);

  // ── handlers ────────────────────────────────────────────────────────────

  const openEdit = (user) => {
    setEditTarget(user);
    setEditForm({
      username:          user.username          || '',
      phone:             user.phone             || '',
      dob:               user.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
      gender:            user.gender            || '',
      activateScreenlock: user.activateScreenlock || '',
      motherTongue:      Array.isArray(user.motherTongue) ? [...user.motherTongue] : [],
      role:              user.role              || 'user',
      status:            user.status            || 'active',
      avatar:            user.avatar            || '',
      isVerified:        !!user.isVerified,
      balance:           user.balance           ?? 0,
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    dispatch(updateUser({ userId: editTarget._id, payload: { ...editForm } }));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    dispatch(deleteUser(deleteTarget._id));
    setDeleteTarget(null);
    if (deleteTarget._id === selectedId) setSelectedId(null);
  };

  const handlePromote = (userId) => {
    dispatch(clearUserErrors());
    dispatch(changeToHost(userId));
  };

  // ── derived ─────────────────────────────────────────────────────────────

  const isUsersTab  = activeTab === 'users';
  const list        = isUsersTab ? users        : hosts;
  const listLoading = isUsersTab ? usersLoading  : hostsLoading;
  const listError   = isUsersTab ? usersError    : hostsError;
  const pagination  = isUsersTab ? usersPagination : hostsPagination;

  // derive selected user from Redux list so edits instantly reflect
  const selectedUser = selectedId ? [...users, ...hosts].find((u) => u._id === selectedId) : null;

  const displayStats = {
    totalUsers:    stats.totalUsers    || usersPagination.total,
    activeUsers:   stats.activeUsers   || users.filter((u) => u.status === 'active').length,
    verifiedUsers: stats.verifiedUsers || users.filter((u) => u.isVerified).length,
    onlineUsers:   stats.onlineUsers   || [...users, ...hosts].filter((u) => u.userCurrentStatus === 'online').length,
    totalHosts:    stats.totalHosts    || hostsPagination.total,
  };

  const STAT_CARDS = [
    { label: 'Total Users',   value: displayStats.totalUsers,   icon: Users,      color: 'bg-neutral-900 text-white' },
    { label: 'Active',        value: displayStats.activeUsers,  icon: UserCheck,  color: 'bg-green-50 text-green-800 border border-green-200' },
    { label: 'Verified',      value: displayStats.verifiedUsers,icon: ShieldCheck,color: 'bg-blue-50 text-blue-800 border border-blue-200' },
    { label: 'Online Now',    value: displayStats.onlineUsers,  icon: Wifi,       color: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
    { label: 'Total Hosts',   value: displayStats.totalHosts,   icon: Crown,      color: 'bg-amber-50 text-amber-800 border border-amber-200' },
  ];

  const COL_HEADERS = isUsersTab
    ? ['User', 'Phone', 'Gender', 'Status', 'Verified', 'Joined', 'Actions']
    : ['Host', 'Phone', 'Status', 'Verified', 'Last Seen', 'Actions'];

  // ── detail page view ─────────────────────────────────────────────────────

  if (selectedUser) {
    return (
      <>
        <UserDetailPage
          user={selectedUser}
          activeTab={activeTab}
          onBack={() => setSelectedId(null)}
          onEdit={() => openEdit(selectedUser)}
          onDelete={() => setDeleteTarget(selectedUser)}
          onPromote={() => handlePromote(selectedUser._id)}
          promotingId={promotingId}
        />
        {/* Error toast */}
        {(deleteError || promoteError) && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-lg">
            <AlertCircle size={15} /> {deleteError || promoteError}
          </div>
        )}
        {/* Edit + delete modals rendered on top of detail page */}
        {editTarget && <EditModal {...{ editTarget, editForm, setEditForm, handleEditSubmit, updateLoading, updateError, languages, langsLoading, dispatch, resetUpdateStatus, setEditTarget }} />}
        {deleteTarget && <DeleteModal deleteTarget={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
      </>
    );
  }

  // ── table view ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl p-3 sm:rounded-2xl sm:p-4 ${color}`}>
            <div className="flex items-start justify-between">
              <p className="text-2xl font-black sm:text-3xl">{value}</p>
              <Icon size={17} className="opacity-50" />
            </div>
            <p className="mt-0.5 text-xs font-medium opacity-70 sm:mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-neutral-100 px-4 pt-3 sm:px-6">
          {[
            { id: 'users', label: 'Users', count: usersPagination.total },
            { id: 'hosts', label: 'Hosts', count: hostsPagination.total },
          ].map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => { if (id !== activeTab) { setActiveTab(id); setPage(1); } }}
              className={`-mb-px flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === id
                  ? 'border-b-2 border-black text-black'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === id ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-500'
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:px-6 sm:py-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search username or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 outline-none focus:border-neutral-400"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={doFetch}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
            >
              <RefreshCw size={13} className={listLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error bar */}
        {(listError || deleteError || promoteError) && (
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-red-50 px-6 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {listError || deleteError || promoteError}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-neutral-100">
                {COL_HEADERS.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {listLoading ? (
                <TableRowsSkeleton rows={8} />
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={COL_HEADERS.length} className="py-20 text-center">
                    <Users size={36} className="mx-auto mb-3 text-neutral-200" />
                    <p className="text-sm font-medium text-neutral-400">No {activeTab} found</p>
                    {debouncedSearch && <p className="mt-1 text-xs text-neutral-300">Try a different search term</p>}
                  </td>
                </tr>
              ) : (
                list.map((u) => {
                  const isDeleting  = deletingId === u._id;
                  const isPromoting = promotingId === u._id;
                  const canPromote  = isUsersTab && u.gender === 'female' && u.role === 'user';

                  return (
                    <tr
                      key={u._id}
                      onClick={() => { dispatch(clearUserErrors()); setSelectedId(u._id); }}
                      className="cursor-pointer transition hover:bg-neutral-50"
                    >
                      {/* User */}
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-3">
                          <AvatarDisplay src={u.avatar} name={u.username} size="sm" />
                          <div>
                            <p className="text-sm font-medium">{u.username || '—'}</p>
                            <OnlineBadge status={u.userCurrentStatus} />
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-sm text-neutral-600 sm:px-6">{u.phone || '—'}</td>

                      {/* Gender (users only) */}
                      {isUsersTab && (
                        <td className="px-4 py-3 text-sm capitalize text-neutral-600 sm:px-6">{u.gender || '—'}</td>
                      )}

                      {/* Status */}
                      <td className="px-4 py-3 sm:px-6"><StatusBadge status={u.status} /></td>

                      {/* Verified */}
                      <td className="px-4 py-3 sm:px-6">
                        {u.isVerified
                          ? <CheckCircle size={16} className="text-blue-500" />
                          : <span className="text-xs text-neutral-300">—</span>}
                      </td>

                      {/* Joined / Last Seen */}
                      <td className="px-4 py-3 text-xs text-neutral-500 sm:px-6">
                        {isUsersTab ? fmtDate(u.createdAt) : fmtDate(u.lastSeen)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(u)}
                            title="Edit"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900"
                          >
                            <Pencil size={13} />
                          </button>
                          {canPromote && (
                            <button
                              onClick={() => handlePromote(u._id)}
                              disabled={!!promotingId}
                              title="Promote to Host"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 text-amber-600 transition hover:bg-amber-50 disabled:opacity-50"
                            >
                              {isPromoting ? <Loader2 size={13} className="animate-spin" /> : <Crown size={13} />}
                            </button>
                          )}
                          <button
                            onClick={() => { dispatch(clearUserErrors()); setDeleteTarget(u); }}
                            disabled={!!deletingId}
                            title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!listLoading && list.length > 0 && (
          <PaginationBar pagination={pagination} onPage={(p) => setPage(p)} />
        )}
      </div>

      {/* Modals */}
      {editTarget && (
        <EditModal
          editTarget={editTarget}
          editForm={editForm}
          setEditForm={setEditForm}
          handleEditSubmit={handleEditSubmit}
          updateLoading={updateLoading}
          updateError={updateError}
          languages={languages}
          langsLoading={langsLoading}
          dispatch={dispatch}
          resetUpdateStatus={resetUpdateStatus}
          setEditTarget={setEditTarget}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          deleteTarget={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

// ─── edit modal (extracted to keep JSX readable) ──────────────────────────────

const EditModal = ({
  editTarget, editForm, setEditForm, handleEditSubmit,
  updateLoading, updateError,
  languages, langsLoading,
  dispatch, resetUpdateStatus, setEditTarget,
}) => {
  const closeEdit = () => { setEditTarget(null); dispatch(resetUpdateStatus()); };
  const set = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <AvatarDisplay src={editTarget.avatar} name={editTarget.username} size="sm" />
            <div>
              <p className="font-semibold">Edit {editTarget.username}</p>
              <p className="text-xs capitalize text-neutral-400">{editTarget.role}</p>
            </div>
          </div>
          <button onClick={closeEdit} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {updateError && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {updateError}
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="grid gap-4 p-5 sm:grid-cols-2">

          {/* Username */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Username</label>
            <input type="text" value={editForm.username} onChange={(e) => set('username', e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400" />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Phone</label>
            <input type="text" value={editForm.phone} onChange={(e) => set('phone', e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400" />
          </div>

          {/* DOB */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Date of Birth</label>
            <input type="date" value={editForm.dob} onChange={(e) => set('dob', e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400" />
          </div>

          {/* Gender */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Gender</label>
            <select value={editForm.gender} onChange={(e) => set('gender', e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400">
              <option value="">— select —</option>
              {['male', 'female', 'other'].map((g) => <option key={g} value={g} className="capitalize">{g}</option>)}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Role</label>
            <select value={editForm.role} onChange={(e) => set('role', e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400">
              {['user', 'host', 'admin'].map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </div>

          {/* Status — enum: active | blocked | suspended */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Status</label>
            <select value={editForm.status} onChange={(e) => set('status', e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400">
              {['active', 'blocked', 'suspended'].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>

          {/* Screen Lock */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Screen Lock</label>
            <select value={editForm.activateScreenlock} onChange={(e) => set('activateScreenlock', e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400">
              <option value="">— select —</option>
              <option value="allowed">Allowed</option>
              <option value="not_allowed">Not Allowed</option>
            </select>
          </div>

          {/* Balance */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Balance (₹)</label>
            <input
              type="number"
              min={0}
              value={editForm.balance}
              onChange={(e) => set('balance', Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          {/* Avatar URL */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">Avatar URL</label>
            <input type="text" value={editForm.avatar} onChange={(e) => set('avatar', e.target.value)}
              placeholder="https://cdn.example.com/avatar.jpg"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400" />
          </div>

          {/* Mother Tongue — multi-select from API */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Mother Tongue
              <span className="ml-1 font-normal normal-case text-neutral-400">(multi-select)</span>
            </label>
            <MotherTongueSelect
              value={editForm.motherTongue}
              onChange={(v) => set('motherTongue', v)}
              languages={languages}
              loading={langsLoading}
            />
          </div>

          {/* isVerified toggle */}
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Verified Account</p>
              <p className="text-xs text-neutral-400">Show verified badge on profile</p>
            </div>
            <button
              type="button"
              onClick={() => set('isVerified', !editForm.isVerified)}
              className={`relative h-6 w-11 rounded-full transition-colors ${editForm.isVerified ? 'bg-black' : 'bg-neutral-200'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editForm.isVerified ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1 sm:col-span-2">
            <button type="button" onClick={closeEdit}
              className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium transition hover:bg-neutral-50">
              Cancel
            </button>
            <button type="submit" disabled={updateLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-medium text-white transition hover:opacity-80 disabled:opacity-50">
              {updateLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {updateLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── delete confirm modal ─────────────────────────────────────────────────────

const DeleteModal = ({ deleteTarget, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
        <Trash2 size={22} className="text-red-600" />
      </div>
      <h3 className="text-base font-bold">Delete @{deleteTarget.username}?</h3>
      <p className="mt-1.5 text-sm text-neutral-500">
        This permanently removes the user from the database. This action cannot be undone.
      </p>
      <div className="mt-5 flex gap-3">
        <button onClick={onCancel}
          className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
          Cancel
        </button>
        <button onClick={onConfirm}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700">
          <Trash2 size={14} /> Delete Forever
        </button>
      </div>
    </div>
  </div>
);

export default UserManagementSection;
