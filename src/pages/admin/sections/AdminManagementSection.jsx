import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus, X, Eye, EyeOff, Crown, Shield, Loader2,
  AlertCircle, UserX, RefreshCw, CheckCircle,
} from 'lucide-react';
import {
  fetchAdminList, createAdmin, deactivateAdmin, resetCreateSuccess,
} from '../../../store/slices/authSlice';
import { StatsSkeleton, TableRowsSkeleton } from '../../../components/ui/Skeleton';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';

// deterministic bar-height pattern for the barcode-style mini chart on stat cards
const BAR_HEIGHTS = [45, 90, 60, 100, 55, 80, 40, 95, 65, 85, 50, 75, 40, 100, 60, 90];
const BAR_COUNT = 32;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const AdminManagementSection = () => {
  const dispatch = useDispatch();
  const {
    currentAdmin, adminList, adminListLoading, adminListError,
    createLoading, createError, createSuccess, deactivatingId, deactivateError,
  } = useSelector((s) => s.auth);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ userId: '', email: '', password: '', isSuperAdmin: false });
  const [showCreatePw, setShowCreatePw] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminList());
  }, [dispatch]);

  useEffect(() => {
    if (createSuccess) {
      setShowCreate(false);
      setCreateForm({ userId: '', email: '', password: '', isSuperAdmin: false });
      dispatch(fetchAdminList());
      dispatch(resetCreateSuccess());
    }
  }, [createSuccess, dispatch]);

  const myAdminId = currentAdmin?.adminId;
  const isSuperAdmin = currentAdmin?.isSuperAdmin;
  const totalAdmins = adminList.length;
  const superAdmins = adminList.filter((a) => a.isSuperAdmin).length;
  const activeAdmins = adminList.filter((a) => a.isActive).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats + action row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {adminListLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid flex-1 grid-cols-3 gap-3">
            {[
              { label: 'Total Admins', value: totalAdmins, Icon: Shield,      iconColor: 'text-neutral-900', barColor: 'bg-neutral-900' },
              { label: 'Super Admins', value: superAdmins, Icon: Crown,       iconColor: 'text-amber-600',    barColor: 'bg-amber-500' },
              { label: 'Active',       value: activeAdmins, Icon: CheckCircle, iconColor: 'text-green-600',   barColor: 'bg-green-500' },
            ].map(({ label, value, Icon, iconColor, barColor }) => {
              const maxStat = Math.max(totalAdmins, superAdmins, activeAdmins, 1);
              const pct = Math.round(((value || 0) / maxStat) * 100);
              const filledBars = Math.round((pct / 100) * BAR_COUNT);
              return (
                <div key={label} className="rounded-xl border border-neutral-200 bg-white p-3 sm:rounded-2xl sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-neutral-700 sm:text-sm">{label}</span>
                    <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 sm:h-9 sm:w-9 sm:rounded-xl ${iconColor}`}>
                      <Icon size={14} className="sm:hidden" />
                      <Icon size={15} className="hidden sm:block" />
                    </div>
                  </div>
                  <div className="mt-1.5 sm:mt-2">
                    <span className="text-xl font-black text-neutral-900 sm:text-3xl">{value}</span>
                  </div>
                  <div className="mt-2 flex h-5 items-end gap-[3px] overflow-hidden sm:mt-2.5 sm:h-6">
                    {Array.from({ length: BAR_COUNT }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-[3px] flex-shrink-0 rounded-full ${i < filledBars ? barColor : 'bg-neutral-200'}`}
                        style={{ height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}%` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isSuperAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-80 sm:self-auto"
          >
            <Plus size={16} />
            <span>Create Admin</span>
          </button>
        )}
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <p className="font-semibold">All Admins</p>
          <button
            onClick={() => dispatch(fetchAdminList())}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
          >
            <RefreshCw size={13} className={adminListLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {adminListError ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-red-500">
            <AlertCircle size={24} />
            <p className="text-sm">{adminListError}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Admin', 'Email', 'Role', 'Status', 'Last Login', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:px-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {adminListLoading ? (
                  <TableRowsSkeleton rows={5} />
                ) : adminList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-neutral-400">No admins found</td>
                  </tr>
                ) : (
                  adminList.map((admin) => {
                    const isMe = admin.adminId === myAdminId;
                    const isDeactivating = deactivatingId === admin.adminId;
                    return (
                      <tr key={admin.adminId} className="transition hover:bg-neutral-50">
                        <td className="px-4 py-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <AvatarDisplay src={admin.user?.avatar} name={admin.user?.username} size="sm" isSuperAdmin={admin.isSuperAdmin} />
                            <div>
                              <p className="text-sm font-medium">{admin.user?.username || '—'}</p>
                              {isMe && <p className="text-xs text-neutral-400">You</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-neutral-600 sm:px-6">{admin.email}</td>
                        <td className="px-4 py-4 sm:px-6">
                          {admin.isSuperAdmin ? (
                            <span className="flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                              <Crown size={10} /> Super Admin
                            </span>
                          ) : (
                            <span className="flex w-fit items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                              <Shield size={10} /> Admin
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 sm:px-6">
                          <span className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${admin.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${admin.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-neutral-500 sm:px-6">{fmtDate(admin.lastLogin)}</td>
                        <td className="px-4 py-4 sm:px-6">
                          {(() => {
                            const canDeactivate =
                              admin.isActive &&
                              !isMe &&
                              (isSuperAdmin || !admin.isSuperAdmin);

                            if (canDeactivate) {
                              return (
                                <button
                                  onClick={() => dispatch(deactivateAdmin(admin.adminId))}
                                  disabled={!!deactivatingId}
                                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isDeactivating ? <Loader2 size={12} className="animate-spin" /> : <UserX size={13} />}
                                  Deactivate
                                </button>
                              );
                            }

                            const reason = isMe
                              ? 'Current user'
                              : admin.isSuperAdmin && !isSuperAdmin
                              ? 'Super Admin'
                              : '—';

                            return <span className="text-xs text-neutral-300">{reason}</span>;
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {deactivateError && (
          <div className="flex items-center gap-2 border-t border-neutral-100 px-6 py-3 text-sm text-red-600">
            <AlertCircle size={15} /> {deactivateError}
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <p className="font-semibold">Create New Admin</p>
                <p className="text-sm text-neutral-400">Grant admin access to an existing user</p>
              </div>
              <button
                onClick={() => { setShowCreate(false); dispatch(resetCreateSuccess()); }}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            {createError && (
              <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle size={15} /> {createError}
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); dispatch(createAdmin(createForm)); }}
              className="space-y-4 p-5"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  User ID <span className="text-neutral-400">(MongoDB ObjectId)</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.userId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, userId: e.target.value }))}
                  placeholder="665e1a2b3c4d5e6f7a8b9c99"
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Password</label>
                <div className="flex items-center overflow-hidden rounded-xl border border-neutral-200 focus-within:border-neutral-400">
                  <input
                    type={showCreatePw ? 'text' : 'password'}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full bg-transparent px-4 py-3 text-sm outline-none"
                  />
                  <button type="button" onClick={() => setShowCreatePw((v) => !v)} className="px-3 text-neutral-400 hover:text-neutral-700">
                    {showCreatePw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Super Admin</p>
                  <p className="text-xs text-neutral-400">Full dashboard privileges</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateForm((p) => ({ ...p, isSuperAdmin: !p.isSuperAdmin }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${createForm.isSuperAdmin ? 'bg-black' : 'bg-neutral-200'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${createForm.isSuperAdmin ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium transition hover:bg-neutral-50">
                  Cancel
                </button>
                <button type="submit" disabled={createLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-medium text-white transition hover:opacity-80 disabled:opacity-50">
                  {createLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  {createLoading ? 'Creating…' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementSection;
