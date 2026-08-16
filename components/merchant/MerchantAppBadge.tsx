'use client';

import { useEffect, useRef } from 'react';

function updateBadge(count: number) {
  if (!('setAppBadge' in navigator)) return;
  if (count > 0) {
    navigator.setAppBadge(count).catch(() => {});
  } else {
    navigator.clearAppBadge().catch(() => {});
  }
}

// Polls /api/merchant/orders every 30 s and keeps the home-screen app-icon
// badge count in sync with the number of pending orders.
// Works on iOS 16.4+ and Chrome/Android PWAs; no-ops silently elsewhere.
export function MerchantAppBadge() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const res = await fetch('/api/merchant/orders');
      if (!res.ok) return;
      const json = await res.json();
      const pending = (json.orders ?? []).filter(
        (o: { status: string }) => o.status === 'pending',
      ).length;
      updateBadge(pending);
    } catch {}
  }

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      navigator.clearAppBadge?.().catch(() => {});
    };
  }, []);

  return null;
}
