'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

// Shown once after the user grants permission, so they know to enable Sound
// in iPhone Settings (iOS doesn't guarantee sound is on just from granting).
const FOLLOWUP_SEEN_KEY = 'iospush_followup_seen';
// Suppresses the prompt for the remainder of this browser session ("Not now").
const SESSION_DISMISSED_KEY = 'iospush_dismissed_session';

type Phase =
  | 'idle'           // nothing to show (non-iOS, not standalone, or all done)
  | 'prompt'         // permission=default, show onboarding call-to-action
  | 'requesting'     // waiting for Notification.requestPermission() to resolve
  | 'followup'       // just granted — show iOS Sounds setting instructions
  | 'denied-banner'  // permission=denied — show persistent slim strip
  | 'denied-detail'; // user tapped the denied strip — show full instructions

function isIOSStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (navigator as any).standalone === 'boolean' &&
    (navigator as any).standalone === true
  );
}

export function IOSNotifOnboarding() {
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    // Only relevant for iOS home-screen installs with the Notification API.
    if (!isIOSStandalone()) return;
    if (typeof Notification === 'undefined') return;

    const perm = Notification.permission;

    if (perm === 'denied') {
      setPhase('denied-banner');
      return;
    }

    if (perm === 'granted') {
      if (!localStorage.getItem(FOLLOWUP_SEEN_KEY)) {
        setPhase('followup');
      }
      return;
    }

    // permission === 'default': show onboarding unless dismissed this session.
    if (!sessionStorage.getItem(SESSION_DISMISSED_KEY)) {
      setPhase('prompt');
    }
  }, []);

  async function requestPermission() {
    setPhase('requesting');
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setPhase('followup');
    } else {
      setPhase('denied-banner');
    }
  }

  function dismissPrompt() {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, '1');
    setPhase('idle');
  }

  function dismissFollowup() {
    localStorage.setItem(FOLLOWUP_SEEN_KEY, '1');
    setPhase('idle');
  }

  // ── Onboarding prompt ────────────────────────────────────────────────────

  if (phase === 'prompt' || phase === 'requesting') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-6">
          <Bell className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Stay on top of new orders
        </h1>
        <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
          Enable notifications so Zupr can alert you the moment a customer
          places an order. Without them, you may miss orders while the app
          is in the background.
        </p>
        <button
          onClick={requestPermission}
          disabled={phase === 'requesting'}
          className="w-full max-w-xs bg-purple-600 text-white font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-60 transition-opacity"
        >
          {phase === 'requesting' ? 'Requesting…' : 'Turn On Notifications'}
        </button>
        <button
          onClick={dismissPrompt}
          className="mt-4 text-sm text-gray-400 py-2"
        >
          Not now
        </button>
      </div>
    );
  }

  // ── Follow-up: sound instructions after granting ─────────────────────────

  if (phase === 'followup') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-6">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Notifications enabled!
        </h1>
        <p className="text-sm text-gray-500 mb-4 max-w-xs leading-relaxed">
          One more step for sound alerts on new orders:
        </p>
        <div className="bg-gray-50 rounded-2xl p-4 text-left max-w-xs w-full mb-8">
          <p className="text-sm font-medium text-gray-700 leading-7">
            iPhone <span className="font-bold">Settings</span>
            {' → '}
            <span className="font-bold">Notifications</span>
            {' → '}
            <span className="font-bold">Zupr</span>
            {' → turn on '}
            <span className="font-bold">Sounds</span>
          </p>
        </div>
        <button
          onClick={dismissFollowup}
          className="w-full max-w-xs bg-purple-600 text-white font-semibold py-3.5 rounded-2xl text-sm"
        >
          Got it
        </button>
      </div>
    );
  }

  // ── Denied: persistent slim banner ───────────────────────────────────────

  if (phase === 'denied-banner') {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
        <BellOff className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800 flex-1">
          Notifications are off —{' '}
          <button
            onClick={() => setPhase('denied-detail')}
            className="font-semibold underline underline-offset-2"
          >
            tap here to see how to enable them
          </button>
        </p>
      </div>
    );
  }

  // ── Denied detail: full instructions screen ──────────────────────────────

  if (phase === 'denied-detail') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-6">
          <BellOff className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Enable notifications
        </h1>
        <p className="text-sm text-gray-500 mb-4 max-w-xs leading-relaxed">
          Notifications were blocked. To re-enable them and turn on sounds:
        </p>
        <div className="bg-gray-50 rounded-2xl p-4 text-left max-w-xs w-full mb-8 space-y-2">
          {[
            ['1', 'Open', 'iPhone Settings'],
            ['2', 'Tap', 'Notifications'],
            ['3', 'Find and tap', 'Zupr'],
            ['4', 'Toggle on', 'Allow Notifications'],
            ['5', 'Also turn on', 'Sounds'],
          ].map(([n, verb, target]) => (
            <p key={n} className="text-sm text-gray-700">
              <span className="font-bold">{n}.</span> {verb}{' '}
              <span className="font-bold">{target}</span>
            </p>
          ))}
        </div>
        <button
          onClick={() => setPhase('denied-banner')}
          className="w-full max-w-xs border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl text-sm"
        >
          Close
        </button>
      </div>
    );
  }

  return null;
}
