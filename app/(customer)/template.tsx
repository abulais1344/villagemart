'use client';
import { useEffect, useRef } from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.opacity = '0';
      ref.current.style.transform = 'translateY(8px)';
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
          ref.current.style.opacity = '1';
          ref.current.style.transform = 'translateY(0)';
        }
      });
    }
  }, []);
  return <div ref={ref}>{children}</div>;
}
