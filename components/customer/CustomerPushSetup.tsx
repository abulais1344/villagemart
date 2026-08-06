'use client';

import { useEffect } from 'react';
import { firebaseAuth } from '@/lib/firebase/client';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) arr[i] = rawData.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

export function CustomerPushSetup() {
  useEffect(() => {
    // Browser push APIs not available (e.g. in-app browser, older Safari)
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) return;

    // User explicitly blocked notifications — never re-prompt
    if (Notification.permission === 'denied') return;

    // Already prompted once but user dismissed without deciding — don't ask again this session
    if (Notification.permission === 'default' && localStorage.getItem('vm_push_prompted')) return;

    (async () => {
      try {
        let permission = Notification.permission;
        if (permission === 'default') {
          localStorage.setItem('vm_push_prompted', '1');
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        }));

        // Requires a logged-in Firebase session — safe to skip silently if not authed
        const user = firebaseAuth.currentUser;
        if (!user) return;

        const idToken = await user.getIdToken();
        await fetch('/api/customer/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), idToken }),
        });
      } catch (err) {
        console.error('[CustomerPushSetup]', err);
      }
    })();
  }, []);

  return null;
}
