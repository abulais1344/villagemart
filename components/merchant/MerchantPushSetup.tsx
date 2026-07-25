'use client';

import { useEffect } from 'react';

// Runs inside the Capacitor Android WebView only.
// In a regular browser Capacitor.isNativePlatform() returns false → exits immediately.
// Responsibility: create the 'new_orders' notification channel, request permission,
// register for FCM, and persist the device token to the server.
export function MerchantPushSetup() {
  useEffect(() => {
    let tokenListener: { remove: () => void } | null = null;

    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Create a dedicated channel for new-order alerts.
      // importance 5 = IMPORTANCE_MAX → bypasses DND, full-screen on lock screen.
      // Sound name references android/app/src/main/res/raw/new_order_sound.mp3
      await PushNotifications.createChannel({
        id: 'new_orders',
        name: 'New Orders',
        description: 'Loud alerts for incoming customer orders — do not mute',
        importance: 5,
        sound: 'new_order_sound',
        vibration: true,
        visibility: 1, // VISIBILITY_PUBLIC — show on lock screen
        lights: true,
        lightColor: '#7C3AED',
      });

      const result = await PushNotifications.requestPermissions();
      if (result.receive !== 'granted') return;

      await PushNotifications.register();

      tokenListener = await PushNotifications.addListener('registration', (token) => {
        fetch('/api/merchant/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.value }),
        }).catch(() => {});
      });
    })();

    return () => { tokenListener?.remove(); };
  }, []);

  return null;
}
