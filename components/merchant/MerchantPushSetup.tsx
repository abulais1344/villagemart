'use client';

import { useEffect } from 'react';

// Runs inside the Capacitor Android WebView only.
// In a regular browser Capacitor.isNativePlatform() returns false → exits immediately.
// Responsibility: create the 'new_orders' notification channel, request permission,
// register for FCM, and persist the device token to the server.
//
// Logging convention: all log lines are prefixed [MerchantPushSetup] so they are
// greppable in adb logcat: adb logcat | grep MerchantPushSetup
export function MerchantPushSetup() {
  useEffect(() => {
    let tokenListener: { remove: () => void } | null = null;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');

        console.log('[MerchantPushSetup] platform:', Capacitor.getPlatform(), '| isNative:', Capacitor.isNativePlatform());

        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Register the token listener BEFORE calling register() — the 'registration'
        // event can fire immediately after register() returns, so adding the listener
        // afterwards risks missing the token entirely (race condition).
        tokenListener = await PushNotifications.addListener('registration', (token) => {
          console.log('[MerchantPushSetup] FCM token received, saving to server');
          fetch('/api/merchant/fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value }),
          })
            .then(res => {
              if (!res.ok) console.error('[MerchantPushSetup] fcm-token save failed, status:', res.status);
              else console.log('[MerchantPushSetup] fcm-token saved successfully');
            })
            .catch(err => console.error('[MerchantPushSetup] fcm-token fetch error:', err));
        });

        await PushNotifications.addListener('registrationError', (err) => {
          console.error('[MerchantPushSetup] FCM registration error:', JSON.stringify(err));
        });

        // Create a dedicated channel for new-order alerts.
        // importance 5 = IMPORTANCE_MAX → bypasses DND, full-screen on lock screen.
        // Sound name references android/app/src/main/res/raw/new_order_sound.mp3
        console.log('[MerchantPushSetup] creating notification channel');
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

        console.log('[MerchantPushSetup] requesting notification permission');
        const result = await PushNotifications.requestPermissions();
        console.log('[MerchantPushSetup] permission result:', result.receive);

        if (result.receive !== 'granted') {
          console.warn('[MerchantPushSetup] notification permission not granted — aborting FCM registration');
          return;
        }

        console.log('[MerchantPushSetup] registering with FCM');
        await PushNotifications.register();

      } catch (err) {
        // Surface the full error — a silent catch here was what made tonight's
        // debugging so painful. Any failure in this flow must leave a log trail.
        console.error('[MerchantPushSetup] fatal error during push setup:', err);
      }
    })();

    return () => { tokenListener?.remove(); };
  }, []);

  return null;
}
