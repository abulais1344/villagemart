'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { relativeTime } from '@/lib/relative-time';

interface Notification {
  id: string;
  type: 'order_update' | 'promo';
  title: string;
  body: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

function groupByDate(items: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = [
    { label: 'Today', items: [] as Notification[] },
    { label: 'Yesterday', items: [] as Notification[] },
    { label: 'Earlier', items: [] as Notification[] },
  ];

  for (const n of items) {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups[0].items.push(n);
    else if (d.getTime() === yesterday.getTime()) groups[1].items.push(n);
    else groups[2].items.push(n);
  }

  return groups.filter(g => g.items.length > 0);
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('vm_customer');
    if (!raw) { setLoading(false); return; }
    const { phone: p } = JSON.parse(raw);
    if (!p) { setLoading(false); return; }
    setPhone(p);
    load(p);
  }, []);

  function goToLogin() {
    localStorage.setItem('login_redirect', '/notifications');
    router.push('/auth/login');
  }

  async function load(phone: string) {
    const supabase = createClient();

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_phone', phone)
      .order('created_at', { ascending: false });

    const items = (data ?? []) as Notification[];
    setNotifications(items);
    setLoading(false);

    const hasUnread = items.some(n => !n.is_read);
    if (hasUnread) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_phone', phone)
        .eq('is_read', false);
      window.dispatchEvent(new Event('notificationsRead'));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 text-gray-700 rotate-180" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Notifications</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6">
            <Bell className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Stay in the loop</h2>
          <p className="text-sm text-[#6B7280] mb-8 max-w-xs">
            Login to see order updates and offers from your favourite stores.
          </p>
          <button
            onClick={goToLogin}
            className="w-full max-w-xs py-3.5 bg-[#7C3AED] text-white rounded-xl font-semibold text-sm mb-3"
          >
            Login / Sign up
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full max-w-xs py-3.5 border border-[#E5E7EB] text-[#6B7280] rounded-xl font-semibold text-sm"
          >
            Browse Menu →
          </button>
        </div>
      </div>
    );
  }

  const groups = groupByDate(notifications);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronRight className="w-5 h-5 text-gray-700 rotate-180" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Notifications</h1>
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-4">
          <Bell className="w-16 h-16 text-gray-200" />
          <h2 className="text-lg font-bold text-[#1A1A1A]">No notifications yet</h2>
          <p className="text-sm text-[#6B7280]">Order updates and offers will appear here</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 pb-24 space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { if (n.type === 'order_update') router.push('/orders'); }}
                    className={`relative bg-white rounded-2xl border border-gray-100 shadow-sm p-4 pl-5 flex items-start gap-3 ${n.type === 'order_update' ? 'cursor-pointer active:bg-gray-50' : ''}`}
                  >
                    {!n.is_read && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-600" />
                    )}

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${n.type === 'order_update' ? 'bg-purple-100' : 'bg-amber-100'}`}>
                      {n.type === 'order_update' ? '🛍️' : '📢'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{relativeTime(n.created_at)}</p>
                    </div>

                    {n.type === 'order_update' && (
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 self-center" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
