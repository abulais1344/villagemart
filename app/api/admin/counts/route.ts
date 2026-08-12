import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const [users, merchants, riders] = await Promise.all([
    supabase.from('vm_users').select('id', { count: 'exact', head: true }),
    supabase.from('merchants').select('id', { count: 'exact', head: true }),
    supabase.from('vm_riders').select('id', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    users:     users.count     ?? 0,
    merchants: merchants.count ?? 0,
    riders:    riders.count    ?? 0,
  });
}
