'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Order-confirmation is post-payment — always accessible
    if (pathname?.startsWith('/order-confirmation')) {
      setAllowed(true);
      setChecked(true);
      return;
    }

    const customer = localStorage.getItem('vm_customer');
    if (!customer) {
      router.push('/auth/login');
      setChecked(true);
      return;
    }

    setAllowed(true);
    setChecked(true);
  }, [router, pathname]);

  if (!checked) return null;
  if (!allowed) return null;

  return <>{children}</>;
}
