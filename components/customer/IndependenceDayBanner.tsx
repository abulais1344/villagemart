'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { isPromoWindowActive } from '@/lib/utils/promoWindow';

const SESSION_KEY = 'iday_banner_dismissed';

const BANNER_TEXT = '🎉 Independence Day Special — Free delivery above ₹60 · Free Campa Zeera Soda on food orders above ₹120 (2 free above ₹240) · 15–17 Aug';

export function IndependenceDayBanner() {
  const [status, setStatus] = useState<'loading' | 'visible' | 'hidden'>('loading');

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setStatus('hidden');
      return;
    }
    fetch('/api/customer/iday-promo-status')
      .then(r => r.json())
      .then((data: { isActive: boolean; startsAt: string | null; endsAt: string | null }) => {
        const show = data.isActive && isPromoWindowActive(data.startsAt, data.endsAt);
        setStatus(show ? 'visible' : 'hidden');
      })
      .catch(() => setStatus('hidden'));
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setStatus('hidden');
  }

  if (status === 'hidden') return null;

  // During the fetch, render the same markup invisibly so the exact height is
  // reserved and carousel rows below don't jump when the banner appears.
  const invisible = status === 'loading';

  return (
    <div
      className="w-full flex items-start gap-2 px-4 py-2.5"
      style={{
        background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
        visibility: invisible ? 'hidden' : 'visible',
      }}
      aria-hidden={invisible}
    >
      <p className="flex-1 text-xs font-medium text-white leading-snug">
        {BANNER_TEXT}
      </p>
      {!invisible && (
        <button
          onClick={dismiss}
          className="shrink-0 mt-0.5 text-white/75 hover:text-white transition-colors"
          aria-label="Dismiss Independence Day offer banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {invisible && <span className="shrink-0 w-3.5 h-3.5" aria-hidden="true" />}
    </div>
  );
}
