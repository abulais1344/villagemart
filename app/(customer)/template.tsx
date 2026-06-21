'use client';
import { useEffect, useRef } from 'react';

// opacity-only fade: avoids creating a CSS containing block for position:fixed children
// (CSS spec: transform!=none traps fixed descendants inside the element)
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.opacity = '0';
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.transition = 'opacity 0.15s ease';
          ref.current.style.opacity = '1';
        }
      });
    }
  }, []);
  return <div ref={ref}>{children}</div>;
}
