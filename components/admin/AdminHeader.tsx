'use client';

import { Bell, LogOut } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface AdminHeaderProps {
  title: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  async function handleLogout() {
    await fetch('/api/admin-logout', { method: 'POST' });
    toast.success('Logged out');
    window.location.href = '/admin-login';
  }

  return (
    <header className="bg-[#7C3AED] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard">
          <div className="flex items-center gap-0">
            <span className="text-white font-black text-xl tracking-tight leading-none">Z</span>
            <span className="text-purple-200 font-bold text-xl tracking-tight leading-none">upr</span>
          </div>
        </Link>
        <div>
          <p className="text-xs text-purple-200 font-semibold">ADMIN</p>
          <h1 className="text-base font-bold text-white">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-white font-medium px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          Refresh
        </button>
        <button className="p-2 rounded-xl hover:bg-purple-700 transition-colors">
          <Bell className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:bg-purple-700 transition-colors"
        >
          <LogOut className="w-5 h-5 text-purple-200" />
        </button>
      </div>
    </header>
  );
}
