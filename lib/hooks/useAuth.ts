'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, UserRole } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !mounted) {
        if (mounted) { setUser(null); setLoading(false); }
        return;
      }

      const { data } = await supabase
        .from('vm_users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (mounted) {
        setUser(data ?? null);
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await getUser();
      } else if (event === 'SIGNED_OUT') {
        if (mounted) { setUser(null); setLoading(false); }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: UserRole) => user?.role === role;

  return { user, loading, signOut, hasRole };
}
