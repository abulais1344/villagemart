'use client';

import { useState, useEffect, type ReactNode } from 'react';

interface PulseHintProps {
  show: boolean;
  label?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

const TOOLTIP_CLASS: Record<string, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right:  'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

export function PulseHint({ show, label, position = 'top', children }: PulseHintProps) {
  const [done, setDone] = useState(false);

  // Reset if show flips back to true (e.g. during dev hot-reload)
  useEffect(() => {
    if (show) setDone(false);
  }, [show]);

  if (!show || done) return <>{children}</>;

  return (
    <div
      className="relative inline-block pulse-ring rounded-lg"
      onAnimationEnd={() => setDone(true)}
    >
      {children}
      {label && (
        <span
          className={`hint-label absolute whitespace-nowrap bg-purple-600 text-white text-[10px] font-medium px-2 py-0.5 rounded-full pointer-events-none z-50 ${TOOLTIP_CLASS[position]}`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
