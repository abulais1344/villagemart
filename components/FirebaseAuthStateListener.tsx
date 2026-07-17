'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';

// Keeps Firebase SDK alive AND silently restores the vm_customer session when
// Firebase still has a valid auth state but localStorage was cleared (e.g. by
// browser storage eviction). Without this, the user would have to re-OTP for
// something Firebase already knows — burning an SMS unnecessarily.
export default function FirebaseAuthStateListener() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) return;
      try {
        if (localStorage.getItem('vm_customer')) return;
        const idToken = await user.getIdToken();
        const res = await fetch('/api/auth/verify-firebase-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        const data = await res.json();
        if (data.success && !data.isNewUser) {
          const u = data.user;
          localStorage.setItem('vm_customer', JSON.stringify({
            id:                   u.id,
            name:                 u.name,
            phone:                u.phone,
            address:              u.address || '',
            landmark:             u.landmark || '',
            area:                 u.area || 'Ardhapur',
            addresses:            u.addresses || [],
            active_address_index: u.active_address_index || 0,
          }));
        }
      } catch {
        // Best-effort restore — never block the page on failure
      }
    });
    return () => unsubscribe();
  }, []);

  return null;
}
