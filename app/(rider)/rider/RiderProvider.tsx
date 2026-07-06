'use client';

import { createContext, useContext } from 'react';

const RiderContext = createContext<any>(null);

export function RiderProvider({ rider, children }: { rider: any; children: React.ReactNode }) {
  return (
    <RiderContext.Provider value={rider}>
      {children}
    </RiderContext.Provider>
  );
}

export function useRider() {
  const ctx = useContext(RiderContext);
  if (!ctx) throw new Error('useRider must be used inside RiderProvider');
  return ctx;
}
