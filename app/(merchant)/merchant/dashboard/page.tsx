'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMerchant } from '../MerchantProvider';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  accepted:  'bg-blue-100 text-blue-700',
  packed:    'bg-purple-100 text-purple-700',
  ready:     'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

function fmt(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function countableOrder(o: any) {
  return o.payment_status === 'paid' || o.status !== 'cancelled';
}

export default function MerchantDashboard() {
  const merchant = useMerchant();
  const router = useRouter();

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean>(merchant.is_open ?? true);
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    const newVal = !isOpen;
    setIsOpen(newVal);
    setToggling(true);
    try {
      const res = await fetch('/api/merchant/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: newVal }),
      });
      if (!res.ok) setIsOpen(!newVal);
    } catch {
      setIsOpen(!newVal);
    } finally {
      setToggling(false);
    }
  }

  useEffect(() => {
    setShowDebug(new URLSearchParams(window.location.search).has('debug'));
  }, []);

  useEffect(() => {
    if (!showDebug) return;
    navigator.serviceWorker.ready.then(reg => {
      Promise.race([
        reg.pushManager.getSubscription(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ]).then(sub => {
        const el = document.getElementById('subStatus');
        if (el) el.textContent = 'Subscription: ' + (sub ? '✅ exists' : '❌ none');
      }).catch((err: Error) => {
        const el = document.getElementById('subStatus');
        if (el) el.textContent = 'Subscription: ❌ error: ' + err.message;
      });
    });
  }, [showDebug]);

  useEffect(() => {
    fetch('/api/merchant/orders')
      .then(r => r.json())
      .then(json => {
        setAllOrders(json.orders ?? []);
        setLoading(false);
      });
  }, []);

  // ── commission ───────────────────────────────────────────────────────────
  const commissionRate: number = merchant.commission_rate ?? 10;
  const keepRate = (100 - commissionRate) / 100;

  // ── date boundaries ──────────────────────────────────────────────────────
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── stat computations ────────────────────────────────────────────────────
  const todayOrders  = allOrders.filter(o => new Date(o.created_at) >= todayStart);
  const pendingCount = allOrders.filter(o => o.status === 'pending').length;

  const earn = (o: any) => (o.subtotal ?? 0) - (o.commission_amount ?? 0);

  const incomeToday = todayOrders.filter(countableOrder).reduce((s, o) => s + earn(o), 0);
  const incomeWeek  = allOrders.filter(o => new Date(o.created_at) >= weekStart  && countableOrder(o)).reduce((s, o) => s + earn(o), 0);
  const incomeMonth = allOrders.filter(o => new Date(o.created_at) >= monthStart && countableOrder(o)).reduce((s, o) => s + earn(o), 0);
  const incomeTotal = allOrders.filter(countableOrder).reduce((s, o) => s + earn(o), 0);

  const recentOrders = allOrders.slice(0, 5);

  const STAT_CARDS = [
    { label: "Today's Orders",  value: todayOrders.length, emoji: '📦', bg: 'bg-purple-50' },
    { label: "Today's Revenue", value: fmt(incomeToday),   emoji: '💰', bg: 'bg-green-50'  },
    { label: 'Pending Orders',  value: pendingCount,       emoji: '⏳', bg: 'bg-yellow-50' },
    { label: 'Total Orders',    value: allOrders.length,   emoji: '📋', bg: 'bg-blue-50'   },
  ];

  const INCOME_ROWS = [
    { label: 'Today',      amount: incomeToday },
    { label: 'This Week',  amount: incomeWeek  },
    { label: 'This Month', amount: incomeMonth },
    { label: 'All Time',   amount: incomeTotal },
  ];

  return (
    <>
      <MerchantHeader storeName={merchant.store_name} />

      {showDebug && (
        <div style={{
          background: '#1a1a1a', color: '#00ff00',
          padding: '12px', fontSize: '11px',
          fontFamily: 'monospace', margin: '8px',
          borderRadius: '8px'
        }}>
          <div>SW: {'serviceWorker' in navigator ? '✅' : '❌'}</div>
          <div>Push: {'PushManager' in window ? '✅' : '❌'}</div>
          <div>Permission: {Notification.permission}</div>
          <div>VAPID: {VAPID_PUBLIC_KEY ? '✅ ' + VAPID_PUBLIC_KEY.substring(0, 15) + '...' : '❌ missing'}</div>
          <div id="subStatus">Subscription: checking...</div>
          <button
            onClick={async () => {
              try {
                document.getElementById('subStatus')!.textContent = 'Subscription: testing...';

                const reg: ServiceWorkerRegistration = await Promise.race([
                  navigator.serviceWorker.ready,
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('SW timeout')), 3000)
                  ),
                ]);

                document.getElementById('subStatus')!.textContent = 'SW ready ✅ trying subscribe...';

                const sub = await Promise.race([
                  reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                  }),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Subscribe timeout')), 5000)
                  ),
                ]);

                document.getElementById('subStatus')!.textContent = 'Subscribed ✅ saving...';

                const res = await fetch('/api/merchant/push-subscription', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscription: sub }),
                });

                document.getElementById('subStatus')!.textContent = 'Saved! Status: ' + res.status;
              } catch (err: any) {
                document.getElementById('subStatus')!.textContent = '❌ Error: ' + err.message;
              }
            }}
            style={{
              marginTop: '8px',
              background: '#7C3AED',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            Test Subscribe
          </button>
        </div>
      )}

      <main className="px-4 py-4 space-y-4">
        {/* Admin override banner */}
        {merchant.admin_override !== null && (
          <div className={`rounded-2xl px-4 py-3 text-sm ${
            merchant.admin_override === true
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            ⚠️ Admin has forced your restaurant{' '}
            <strong>{merchant.admin_override === true ? 'OPEN' : 'CLOSED'}</strong>
            , overriding your setting.
          </div>
        )}

        {/* Open / Closed toggle */}
        <div className={`rounded-2xl p-4 flex items-center justify-between ${isOpen ? 'bg-green-50' : 'bg-red-50'}${merchant.admin_override !== null ? ' opacity-50' : ''}`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{isOpen ? '🟢' : '🔴'}</span>
              <span className={`font-semibold text-base ${isOpen ? 'text-green-800' : 'text-red-800'}`}>
                {isOpen ? 'Restaurant Open' : 'Restaurant Closed'}
              </span>
            </div>
            {!isOpen && (
              <p className="text-xs text-red-500 mt-1 ml-7">Customers will see your restaurant as closed</p>
            )}
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            aria-label={isOpen ? 'Close restaurant' : 'Open restaurant'}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${isOpen ? 'bg-green-500' : 'bg-gray-300'} ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isOpen ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
          </>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {STAT_CARDS.map(card => (
                <div key={card.label} className={`${card.bg} rounded-2xl p-4`}>
                  <p className="text-2xl mb-1">{card.emoji}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Income overview */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900">Income Overview</h2>
                <span className="text-xs text-gray-400">After {commissionRate}% platform commission</span>
              </div>
              <div className="space-y-0">
                {INCOME_ROWS.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between py-2.5 ${i < INCOME_ROWS.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <span className="text-sm text-gray-500">{row.label}</span>
                    <span className="text-sm font-bold text-gray-900">{fmt(row.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent orders */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Recent Orders</h2>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No orders yet</p>
              ) : (
                <div className="space-y-0">
                  {recentOrders.map((order, i) => (
                    <div
                      key={order.id}
                      className={`py-3 ${i < recentOrders.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-gray-400">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {order.customer_name ?? '—'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{shortDate(order.created_at)}</p>
                        </div>
                        <span className="text-sm font-bold text-[#7C3AED] shrink-0">
                          {fmt(order.total_amount ?? 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => router.push('/merchant/orders')}
                className="mt-3 w-full text-center text-sm text-[#7C3AED] font-medium pt-3 border-t border-gray-100"
              >
                View all orders →
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
