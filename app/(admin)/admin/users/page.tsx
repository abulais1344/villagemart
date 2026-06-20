'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, formatPhone } from '@/lib/utils/format';
import type { User, UserRole } from '@/types';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const supabase = createClient();

  const loadUsers = async () => {
    let q = supabase.from('vm_users').select('*').order('created_at', { ascending: false });
    if (roleFilter !== 'all') q = q.eq('role', roleFilter);
    const { data } = await q.limit(50);
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, [roleFilter]);

  const toggleActive = async (user: User) => {
    await supabase.from('vm_users').update({ is_active: !user.is_active }).eq('id', user.id);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    toast.success(user.is_active ? 'User deactivated' : 'User activated');
  };

  const filtered = users.filter(u =>
    u.phone.includes(search) || (u.name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <>
      <AdminHeader title="Users" />
      <main className="px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'customer', 'merchant', 'rider', 'admin'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${roleFilter === r ? 'bg-primary-600 text-white border-primary-600' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(user => (
              <div key={user.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                  {(user.name ?? user.phone)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A]">{user.name ?? 'Unnamed'}</p>
                  <p className="text-xs text-[#6B7280]">{formatPhone(user.phone)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="gray">{user.role}</Badge>
                    <span className="text-xs text-[#6B7280]">{formatDate(user.created_at)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={user.is_active ? 'ghost' : 'secondary'}
                  onClick={() => toggleActive(user)}
                >
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
