import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Mail, Phone, Calendar, Clock, Shield, User, BadgeCheck, Crown,
} from 'lucide-react';
import { fetchMe } from '../../../store/slices/authSlice';
import { OverviewSkeleton } from '../../../components/ui/Skeleton';
import AvatarDisplay from '../../../components/ui/AvatarDisplay';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100">
      <Icon size={15} className="text-neutral-500" />
    </div>
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-sm font-medium text-neutral-800">{value || '—'}</p>
    </div>
  </div>
);

const OverviewSection = () => {
  const dispatch = useDispatch();
  const { currentAdmin, loading } = useSelector((s) => s.auth);

  useEffect(() => {
    // skip API call if data already loaded from localStorage on startup
    if (!currentAdmin) dispatch(fetchMe());
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !currentAdmin) return <OverviewSkeleton />;
  if (!currentAdmin) return null;

  const me = currentAdmin;
  const u = me.user || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex items-center gap-4">
            <AvatarDisplay src={u.avatar} name={u.username} size="xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold sm:text-2xl">{u.username || '—'}</h3>
                {me.isSuperAdmin && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    <Crown size={11} /> Super Admin
                  </span>
                )}
                {u.isVerified && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    <BadgeCheck size={11} /> Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-500">{me.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-neutral-400'}`} />
                <span className="text-xs capitalize text-neutral-500">{u.status || '—'}</span>
                {u.userCurrentStatus === 'online' && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Online</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail cards grid */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Contact</p>
          <div className="space-y-3 sm:space-y-4">
            <InfoRow icon={Mail} label="Email" value={me.email} />
            <InfoRow icon={Phone} label="Phone" value={u.phone} />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Personal</p>
          <div className="space-y-3 sm:space-y-4">
            <InfoRow icon={User} label="Gender" value={u.gender} />
            <InfoRow icon={Calendar} label="Date of Birth" value={u.dob} />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Account</p>
          <div className="space-y-3 sm:space-y-4">
            <InfoRow icon={Shield} label="Role" value={u.role} />
            <InfoRow icon={Clock} label="Last Login" value={fmtDate(me.lastLogin)} />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:col-span-2 sm:p-5 lg:col-span-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Timestamps</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoRow icon={Clock} label="Member Since" value={fmtDate(me.createdAt)} />
            <InfoRow icon={Clock} label="Last Updated" value={fmtDate(me.updatedAt)} />
            <InfoRow icon={Clock} label="User Last Seen" value={fmtDate(u.lastSeen)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
