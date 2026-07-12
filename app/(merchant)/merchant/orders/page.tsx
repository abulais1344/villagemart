'use client';

import { useEffect, useRef, useState } from 'react';
import { useMerchant } from '../MerchantProvider';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';

const STATUS_TABS = [
  { key: 'all',              label: 'All'         },
  { key: 'pending',          label: 'New'         },
  { key: 'preparing',        label: 'Preparing'   },
  { key: 'ready',            label: 'Ready'       },
  { key: 'out_for_delivery', label: 'On the Way'  },
  { key: 'delivered',        label: 'Delivered'   },
];

const STATUS_COLOR: Record<string, string> = {
  pending:          'bg-orange-100 text-orange-700',
  confirmed:        'bg-blue-50 text-blue-600',
  preparing:        'bg-blue-100 text-blue-700',
  accepted:         'bg-blue-100 text-blue-700',
  packed:           'bg-purple-100 text-purple-700',
  ready:            'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered:        'bg-gray-100 text-gray-600',
  cancelled:        'bg-red-100 text-red-700',
};

const earn = (o: any) => (o.subtotal ?? 0) - (o.commission_amount ?? 0);

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function getItemName(item: any): string {
  return item.product_snapshot?.name ?? item.product_name ?? 'Item';
}

export default function MerchantOrdersPage() {
  const merchant = useMerchant();
  const [orders, setOrders]               = useState<any[]>([]);
  const [tab, setTab]                     = useState('pending');
  const [loading, setLoading]             = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<any>(null);
  const [alarmPlaying, setAlarmPlaying]   = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [justInstalled, setJustInstalled] = useState(false);

  const prevPendingCount = useRef<number | null>(null);
  const alarmRef         = useRef<HTMLAudioElement | null>(null);
  const alarmActiveRef   = useRef(false);
  const beepIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise alarm audio on mount
  useEffect(() => {
    const audio = new Audio('/alarm.mp3');
    audio.loop   = true;
    audio.volume = 1.0;
    alarmRef.current = audio;

    return () => {
      alarmActiveRef.current = false;
      audio.pause();
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    };
  }, []);

  // Notification permission
  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, []);

  // PWA install prompt
  useEffect(() => {
    const onPrompt    = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstallPrompt(null); setJustInstalled(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Repeat push check every 60s for unaccepted orders
  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/merchant/notify-pending').catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  async function handleEnableNotifications() {
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  }

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setJustInstalled(true); }
  }

  // ── Alarm helpers ────────────────────────────────────────────────────────────

  function playOnceBeep() {
    try {
      const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  function stopAlarm() {
    setAlarmPlaying(false);
    setNewOrderAlert(null);
    alarmActiveRef.current = false;

    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  }

  function startAlarm() {
    setAlarmPlaying(true);
    alarmActiveRef.current = true;

    if (alarmRef.current) {
      alarmRef.current.play().catch(() => {
        // Web Audio API fallback when autoplay blocked
        playOnceBeep();
        beepIntervalRef.current = setInterval(playOnceBeep, 800);
      });
    } else {
      playOnceBeep();
      beepIntervalRef.current = setInterval(playOnceBeep, 800);
    }
  }

  // ── Order polling (unchanged 30s interval) ──────────────────────────────────

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30_000);
    return () => clearInterval(interval);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOrders() {
    const res  = await fetch(`/api/merchant/orders?status=${tab}`);
    const json = await res.json();
    const fetched: any[] = json.orders ?? [];
    setOrders(fetched);
    setLoading(false);

    const pendingOrders = fetched.filter((o: any) => o.status === 'pending');
    const pendingCount  = pendingOrders.length;

    if (
      prevPendingCount.current !== null &&
      pendingCount > prevPendingCount.current &&
      !alarmActiveRef.current
    ) {
      setNewOrderAlert(pendingOrders[0]);
      startAlarm();
    }
    prevPendingCount.current = pendingCount;
  }

  // ── Order status updates ─────────────────────────────────────────────────────

  async function updateStatus(order: any, status: string) {
    await fetch('/api/merchant/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, status }),
    });
    loadOrders();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── New Order Alarm Overlay ───────────────────────────────────────── */}
      {newOrderAlert && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 ${alarmPlaying ? 'animate-pulse' : ''}`}
          style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}
        >
          {/* Pulsing ring */}
          <div className="relative mb-8">
            <div
              className="absolute rounded-full bg-white opacity-20 animate-ping"
              style={{ inset: '-50%' }}
            />
            <div className="relative bg-white rounded-full p-6 shadow-2xl">
              <span className="text-6xl">🔔</span>
            </div>
          </div>

          <h1 className="text-white text-4xl font-black text-center mb-2 tracking-tight">
            NEW ORDER!
          </h1>
          <p className="text-red-200 text-lg mb-6 text-center">
            Tap Accept or Reject to stop alarm
          </p>

          {/* Order info card */}
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm mb-8 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 text-sm">Order ID</span>
              <span className="font-bold text-gray-900">
                #{newOrderAlert.id?.slice(-6).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 text-sm">Customer</span>
              <span className="font-bold text-gray-900">
                {newOrderAlert.customer_name ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 text-sm">Items</span>
              <span className="font-bold text-gray-900">
                {newOrderAlert.order_items?.length ?? 1} items
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <span className="text-gray-700 font-semibold">Your Payout</span>
              <span className="text-2xl font-black text-green-600">
                ₹{earn(newOrderAlert)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 w-full max-w-sm">
            <button
              onClick={async () => {
                stopAlarm();
                await updateStatus(newOrderAlert, 'preparing');
              }}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black text-xl py-5 rounded-2xl shadow-lg active:scale-95 transition-transform"
            >
              ✅ Accept
            </button>
            <button
              onClick={async () => {
                stopAlarm();
                await updateStatus(newOrderAlert, 'cancelled');
              }}
              className="flex-1 bg-white hover:bg-gray-100 text-red-600 font-black text-xl py-5 rounded-2xl shadow-lg active:scale-95 transition-transform"
            >
              ❌ Reject
            </button>
          </div>

          <button
            onClick={stopAlarm}
            className="mt-4 text-red-200 text-sm underline"
          >
            Dismiss (order stays pending)
          </button>
        </div>
      )}

      <MerchantHeader storeName={merchant.store_name} />

      {/* 🔔 Enable Notifications banner */}
      {notifPermission === 'default' && (
        <div className="bg-orange-500 text-white px-4 py-3">
          <p className="text-sm font-semibold">🔔 Enable Notifications</p>
          <p className="text-xs opacity-90 mt-0.5">Get notified instantly when new orders arrive</p>
          <button
            onClick={handleEnableNotifications}
            className="mt-2 bg-white text-orange-600 rounded-lg px-4 py-1.5 text-sm font-semibold"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* 📲 Install App banner */}
      {installPrompt && (
        <div className="bg-[#7C3AED] text-white px-4 py-3">
          <p className="text-sm font-semibold">📲 Install App for easy access</p>
          <p className="text-xs opacity-90 mt-0.5">Works like a native app!</p>
          <div className="flex justify-center mt-2">
            <button
              onClick={handleInstall}
              className="bg-white text-[#7C3AED] rounded-lg px-6 py-1.5 text-sm font-semibold"
            >
              Install App
            </button>
          </div>
        </div>
      )}
      {justInstalled && !installPrompt && (
        <div className="bg-green-600 text-white text-sm font-medium text-center px-4 py-2">
          App installed! ✅
        </div>
      )}

      {/* 🔔 New order banner */}
      {newOrderAlert && !alarmPlaying && (
        <button
          onClick={() => {
            setTab('pending');
            setNewOrderAlert(null);
          }}
          className="w-full flex items-center justify-between px-4 py-3 animate-pulse"
          style={{ background: '#f97316' }}
        >
          <span className="text-white font-bold text-sm">
            🔔 New Order! #{(newOrderAlert.id as string).slice(-6).toUpperCase()} — Payout ₹{earn(newOrderAlert)}
          </span>
          <span className="text-orange-100 text-xs font-medium">Tap to view →</span>
        </button>
      )}

      {/* Filter tabs */}
      <div
        className="flex overflow-x-auto bg-white border-b border-gray-100 sticky top-[61px] z-30"
        style={{ scrollbarWidth: 'none' }}
      >
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-[#7C3AED] text-[#7C3AED]'
                : 'border-transparent text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm text-gray-500">No orders here</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">
                  Order #{(order.id as string).slice(-6).toUpperCase()}
                </span>
                <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
              </div>

              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3 ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {order.status}
              </span>

              <div className="mb-3 space-y-0.5">
                {(order.order_items ?? []).map((item: any, i: number) => (
                  <p key={item.id ?? i} className="text-sm text-gray-700">
                    {item.quantity}x {getItemName(item)} — ₹{item.unit_price ?? item.total_price ?? 0}
                  </p>
                ))}
              </div>

              {order.customer_name && (
                <p className="text-xs text-gray-500 mb-1">
                  👤 {order.customer_name}
                  {order.customer_phone ? ` · ${order.customer_phone}` : ''}
                </p>
              )}
              {order.delivery_address?.area && (
                <p className="text-xs text-gray-400 mb-3">📍 {order.delivery_address.area}</p>
              )}

              <p className="font-semibold text-gray-900 mb-3">Your Payout: ₹{earn(order)}</p>

              {order.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { stopAlarm(); updateStatus(order, 'preparing'); }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold"
                  >
                    ✅ Accept Order
                  </button>
                  <button
                    onClick={() => { stopAlarm(); updateStatus(order, 'cancelled'); }}
                    className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-xl py-2.5 text-sm font-semibold"
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
              {order.status === 'confirmed' && (
                <button
                  onClick={() => updateStatus(order, 'preparing')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold"
                >
                  👨‍🍳 Mark Preparing
                </button>
              )}
              {order.status === 'preparing' && (
                <button
                  onClick={() => updateStatus(order, 'ready')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2.5 text-sm font-semibold"
                >
                  📦 Mark Ready
                </button>
              )}
              {order.status === 'ready' && (
                <button
                  onClick={() => updateStatus(order, 'out_for_delivery')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-semibold"
                >
                  🛵 Out for Delivery
                </button>
              )}
            </div>
          ))
        )}
      </main>
    </>
  );
}
