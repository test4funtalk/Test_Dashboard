import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';

const NotFound = () => (
  <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-neutral-200 bg-neutral-50">
        <Search size={32} className="text-neutral-400" />
      </div>

      <h1 className="text-8xl font-black tracking-tighter text-neutral-900">404</h1>
      <p className="mt-3 text-xl font-semibold text-neutral-700">Page not found</p>
      <p className="mt-2 text-sm text-neutral-400">
        The page you're looking for doesn't exist or you don't have permission to access it.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:opacity-80 sm:w-auto"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
        <Link
          to="/"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 sm:w-auto"
        >
          Go to Home
        </Link>
      </div>
    </div>
  </main>
);

export default NotFound;
