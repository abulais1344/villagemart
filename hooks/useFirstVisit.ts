'use client';
import { useState, useEffect } from 'react';

export function useFirstVisit(key: string): [boolean, () => void] {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`vm_seen_${key}`);
    if (!seen) setIsFirstVisit(true);
  }, [key]);

  const markSeen = () => {
    localStorage.setItem(`vm_seen_${key}`, '1');
    setIsFirstVisit(false);
  };

  return [isFirstVisit, markSeen];
}
