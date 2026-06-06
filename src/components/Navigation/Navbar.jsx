import React from 'react';
import { User, Bell, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const HIDDEN_ROUTES = ['/admindashboard', '/login'];

const Navbar = () => {
  const { pathname } = useLocation();
  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <div>
          <h1 className="text-2xl font-black tracking-tight">BrandName</h1>
          <p className="text-xs text-neutral-500">Admin Portal</p>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <button className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <Bell size={18} className="transition-transform duration-300 group-hover:scale-110" />
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <Link
            to="/login"
            className="group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 transition-all duration-300 hover:-translate-y-1 hover:border-black hover:shadow-xl"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 transition-all duration-300 group-hover:bg-black">
              <User size={18} className="transition-all duration-300 group-hover:text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">Sign In</p>
              <p className="text-xs text-neutral-500">Admin Access</p>
            </div>
            <ChevronRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
