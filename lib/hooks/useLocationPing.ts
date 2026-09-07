'use client';

import { useEffect, useRef } from 'react';

const PING_INTERVAL_MS = 15_000;
const FAILURE_THRESHOLD = 2;

/**
 * While `active` is true, sends the device's GPS coordinates to
 * POST /api/rider/update-location every ~15 s.  Stops and cleans up
 * as soon as `active` becomes false (e.g. order delivered).
 *
 * onRepeatedFailure — called after FAILURE_THRESHOLD consecutive ping failures
 *   (device GPS likely turned off mid-delivery). Clears automatically on next success.
 * onPingSuccess — called on each successful ping; use to clear the GPS-lost state.
 */
export function useLocationPing(
  active: boolean,
  onRepeatedFailure?: () => void,
  onPingSuccess?: () => void,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveFailures = useRef(0);
  // Keep callback refs current without re-running the main effect
  const onRepeatedFailureRef = useRef(onRepeatedFailure);
  const onPingSuccessRef = useRef(onPingSuccess);
  useEffect(() => { onRepeatedFailureRef.current = onRepeatedFailure; }, [onRepeatedFailure]);
  useEffect(() => { onPingSuccessRef.current = onPingSuccess; }, [onPingSuccess]);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.geolocation) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      consecutiveFailures.current = 0;
      return;
    }

    function sendCurrentPosition() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          consecutiveFailures.current = 0;
          onPingSuccessRef.current?.();
          fetch('/api/rider/update-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          }).catch(() => {});
        },
        () => {
          consecutiveFailures.current += 1;
          if (consecutiveFailures.current >= FAILURE_THRESHOLD) {
            onRepeatedFailureRef.current?.();
          }
        },
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
