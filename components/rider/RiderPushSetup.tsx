'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Runs inside the Capacitor Android WebView only.
// In a regular browser Capacitor.isNativePlatform() returns false → exits immediately.
// Static imports are intentional — dynamic imports hang silently on the fast HTTP-redirect
// login path inside Capacitor WebView (Promise never settles). Do not change to dynamic.
//
// Logging convention: all log lines are prefixed [RiderPushSetup] so they are
// greppable in adb logcat: adb logcat | grep RiderPushSetup
export function RiderPushSetup() {
  useEffect(() => {
    let tokenListener: { remove: () => void } | null = null;

    (async () => {
      try {
        console.log('[RiderPushSetup] platform:', Capacitor.getPlatform(), '| isNative:', Capacitor.isNativePlatform());

        if (!Capacitor.isNativePlatform()) return;

        // Register the token listener BEFORE calling register() — the 'registration'
        // event can fire immediately after register() returns, so adding the listener
        // afterwards risks missing the token entirely (race condition).
        tokenListener = await PushNotifications.addListener('registration', (token) => {
          console.log('[RiderPushSetup] FCM token received, saving to server');
          fetch('/api/rider/fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value }),
          })
            .then(res => {
              if (!res.ok) console.error('[RiderPushSetup] fcm-token save failed, status:', res.status);
              else console.log('[RiderPushSetup] fcm-token saved successfully');
            })
            .catch(err => console.error('[RiderPushSetup] fcm-token fetch error:', err));
        });

        await PushNotifications.addListener('registrationError', (err) => {
          console.error('[RiderPushSetup] FCM registration error:', JSON.stringify(err));
        });

        // Create a dedicated channel for new-order alerts.
        // importance 5 = IMPORTANCE_MAX → bypasses DND, full-screen on lock screen.
        // Sound name references rider-android/app/src/main/res/raw/new_order_sound.mp3
        console.log('[RiderPushSetup] creating notification channel');
        await PushNotifications.createChannel({
          id: 'rider_orders',
          name: 'Rider Orders',
          description: 'Alerts for newly assigned delivery orders — do not mute',
          importance: 5,
          sound: 'new_order_sound',
          vibration: true,
          visibility: 1, // VISIBILITY_PUBLIC — show on lock screen
          lights: true,
          lightColor: '#7C3AED',
        });

        console.log('[RiderPushSetup] requesting notification permission');
        const result = await PushNotifications.requestPermissions();
        console.log('[RiderPushSetup] permission result:', result.receive);

        if (result.receive !== 'granted') {
          console.warn('[RiderPushSetup] notification permission not granted — aborting FCM registration');
          return;
        }

        console.log('[RiderPushSetup] registering with FCM');
        await PushNotifications.register();

        const androidVersion = parseInt(
          (navigator.userAgent.match(/Android (\d+)/) ?? [])[1] ?? '0', 10,
        );
        if (androidVersion >= 14) {
          console.warn(
            '[RiderPushSetup] Android 14+ detected. If full-screen order alerts ' +
            'are not appearing on the lock screen, go to: ' +
            'Settings → Apps → Zupr Rider → Special app access → Alarms & reminders → Allow.',
          );
        }

      } catch (err) {
        console.error('[RiderPushSetup] fatal error during push setup:', err);
      }
    })();

    return () => { tokenListener?.remove(); };
  }, []);

  return null;
}
