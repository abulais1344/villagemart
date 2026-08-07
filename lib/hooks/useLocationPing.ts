'use client';

import { useEffect, useRef } from 'react';

const PING_INTERVAL_MS = 15_000;

/**
 * While `active` is true, sends the device's GPS coordinates to
 * POST /api/rider/update-location every ~15 s.  Stops and cleans up
 * as soon as `active` becomes false (e.g. order delivered).
 */
export function useLocationPing(active: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.geolocation) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    function sendCurrentPosition() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch('/api/rider/update-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 8_000 },
      );
    }

    sendCurrentPosition(); // immediate first ping
    intervalRef.current = setInterval(sendCurrentPosition, PING_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active]);
}
