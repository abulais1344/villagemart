'use client';

import { createContext, useContext } from 'react';

const MerchantContext = createContext<any>(null);

export function MerchantProvider({ merchant, children }: { merchant: any; children: React.ReactNode }) {
  return (
    <MerchantContext.Provider value={merchant}>
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error('useMerchant must be used inside MerchantProvider');
  return ctx;
}
