'use client';

import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface AdminHeaderProps {
  title: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-primary-600 font-semibold">ADMIN</p>
        <h1 className="text-base font-bold text-[#1A1A1A]">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-xl hover:bg-gray-100">
          <Bell className="w-5 h-5 text-[#1A1A1A]" />
        </button>
        <button
          onClick={async () => { await signOut(); toast.success('Logged out'); router.push('/auth/login'); }}
          className="p-2 rounded-xl hover:bg-gray-100"
        >
          <LogOut className="w-5 h-5 text-[#6B7280]" />
        </button>
      </div>
    </header>
  );
}
