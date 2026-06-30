'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';

// Mounts Firebase's session listener so the Firebase SDK maintains its own
// internal session state across page refreshes — supplementary to vm_customer
// localStorage, not a replacement.
export default function FirebaseAuthStateListener() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, () => {});
    return () => unsubscribe();
  }, []);

  return null;
}
