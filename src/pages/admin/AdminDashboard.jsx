import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Shield, Users, CreditCard,
  Package, Megaphone, Settings, LogOut, Crown, Menu, Languages, PhoneCall, IdCard,
} from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import AvatarDisplay from '../../components/ui/AvatarDisplay';

import OverviewSection from './sections/OverviewSection';
import AdminManagementSection from './sections/AdminManagementSection';
import UserManagementSection from './sections/UserManagementSection';
import PaymentManagementSection from './sections/PaymentManagementSection';
import PackageManagementSection from './sections/PackageManagementSection';
import AdsManagementSection from './sections/AdsManagementSection';
import CallManagementSection from './sections/CallManagementSection';
import KycManagementSection from './sections/KycManagementSection';
import ProfileManagementSection from './sections/ProfileManagementSection';
import SettingsSection from './sections/SettingsSection';

// ─── config ───────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'overview',  label: 'Overview',            Icon: LayoutDashboard },
  { id: 'admins',    label: 'Admin Management',     Icon: Shield          },
  { id: 'users',     label: 'User Management',      Icon: Users           },
  { id: 'payments',  label: 'Payment Management',   Icon: CreditCard      },
  { id: 'packages',  label: 'Package Management',   Icon: Package         },
  { id: 'ads',       label: 'Ads Management',       Icon: Megaphone       },
  { id: 'calls',     label: 'Call Management',      Icon: PhoneCall       },
  { id: 'kyc',       label: 'KYC Management',       Icon: IdCard          },
  { id: 'profile',   label: 'Profile Management',   Icon: Languages       },
  { id: 'settings',  label: 'Settings',             Icon: Settings        },
];

const PAGE_META = {
  overview:  { title: 'Overview',            sub: 'Your profile and account details'           },
  admins:    { title: 'Admin Management',    sub: 'Create, view and manage admin accounts'     },
  users:     { title: 'User Management',     sub: 'View and manage platform users'             },
  payments:  { title: 'Payment Management',  sub: 'Track transactions and revenue'             },
  packages:  { title: 'Package Management',  sub: 'Manage subscription packages and plans'    },
  ads:       { title: 'Ads Management',      sub: 'Monitor and control ad campaigns'           },
  calls:     { title: 'Call Management',     sub: 'Browse and inspect all platform calls'      },
  kyc:       { title: 'KYC Management',      sub: 'Review and approve host identity submissions' },
  profile:   { title: 'Profile Management',  sub: 'Manage platform languages and tags'         },
  settings:  { title: 'Settings',            sub: 'Manage your account settings'               },
};

const SECTION_MAP = {
  overview:  OverviewSection,
  admins:    AdminManagementSection,
  users:     UserManagementSection,
  payments:  PaymentManagementSection,
  packages:  PackageManagementSection,
  ads:       AdsManagementSection,
  calls:     CallManagementSection,
  kyc:       KycManagementSection,
  profile:   ProfileManagementSection,
  settings:  SettingsSection,
};

const VALID_TABS = new Set(NAV.map((n) => n.id));

// ─── component ────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { currentAdmin } = useSelector((s) => s.auth);

  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam   = searchParams.get('tab');
  const tab        = VALID_TABS.has(tabParam) ? tabParam : 'overview';

  // open on lg+, closed on smaller screens by default
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  // incremented on every nav click — forces section remount even when same tab is clicked
  const [sectionKey, setSectionKey] = useState(0);

  // auto-close sidebar when viewport grows back to mobile after a resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleTabChange = (id) => {
    // replace only when re-clicking the active tab (resets section state without polluting history)
    // push a new entry for any different tab so browser back/forward works within the dashboard
    setSearchParams({ tab: id }, { replace: id === tab });
    setSectionKey((k) => k + 1);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const adminUsername = currentAdmin?.user?.username || 'Admin';
  const adminEmail    = currentAdmin?.email           || '';
  const adminAvatar   = currentAdmin?.user?.avatar;
  const isSuperAdmin  = currentAdmin?.isSuperAdmin;

  const ActiveSection = SECTION_MAP[tab];

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">

      {/* ── Mobile backdrop ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-72 flex-shrink-0 flex-col
          border-r border-neutral-200 bg-white
          transition-all duration-200 ease-in-out
          lg:relative lg:inset-auto lg:z-auto
          ${sidebarOpen
            ? 'translate-x-0 lg:w-60'
            : '-translate-x-full lg:translate-x-0 lg:w-16'}
        `}
      >
        {/* Brand */}
        <div
          className={`flex items-center border-b border-neutral-100 py-4 transition-all duration-200 ${
            sidebarOpen ? 'gap-3 px-4' : 'justify-center px-3'
          }`}
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-black font-black text-lg text-white">
            T
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className=" text-base font-black ">Toppz Dynamics</p>
              <p className="text-[11px] text-neutral-400">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-x-hidden overflow-y-auto p-2">
          {sidebarOpen && (
            <p className="mb-2 mt-1 px-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Menu
            </p>
          )}
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              title={!sidebarOpen ? label : undefined}
              className={`my-0.5 flex w-full items-center rounded-xl py-2.5 text-sm font-medium transition-all ${
                sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'
              } ${
                tab === id
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon size={17} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Profile + Logout */}
        <div className="border-t border-neutral-100 p-2">
          {sidebarOpen ? (
            <>
              <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5">
                <AvatarDisplay src={adminAvatar} name={adminUsername} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-none">{adminUsername}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-400">{adminEmail}</p>
                </div>
                {isSuperAdmin && <Crown size={12} className="flex-shrink-0 text-amber-500" />}
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-2 text-sm text-neutral-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div title={adminUsername}>
                <AvatarDisplay src={adminAvatar} name={adminUsername} size="sm" />
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Top header */}
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
          >
            <Menu size={17} />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold leading-none sm:text-xl">
              {PAGE_META[tab]?.title}
            </h2>
            <p className="mt-0.5 hidden truncate text-sm text-neutral-400 sm:block">
              {PAGE_META[tab]?.sub}
            </p>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <ActiveSection key={sectionKey} />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
