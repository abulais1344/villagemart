'use client';

import { useState, useEffect } from 'react';

export function PWAInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (isStandalone || dismissed) return;

    const onPrompt = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstallPrompt(null); setJustInstalled(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    function trackInstall() {
      fetch('/api/track-install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'customer' }) }).catch(() => {});
      window.removeEventListener('appinstalled', trackInstall);
    }
    window.addEventListener('appinstalled', trackInstall);
    return () => window.removeEventListener('appinstalled', trackInstall);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setJustInstalled(true); }
  }

  function handleDismiss() {
    localStorage.setItem('pwa_install_dismissed', '1');
    setInstallPrompt(null);
  }

  if (justInstalled) {
    return (
      <div className="bg-green-600 text-white text-sm font-medium text-center px-4 py-2">
        App installed! ✅
      </div>
    );
  }

  if (!installPrompt) return null;

  return (
    <div className="bg-[#7C3AED] text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">📲 Install App for easy access</p>
        <p className="text-xs opacity-80 mt-0.5">Order faster — works like a native app</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-white text-[#7C3AED] rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-white/60 text-lg leading-none px-1"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
