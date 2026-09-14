import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const [merchantsRes, commissionsRes] = await Promise.all([
    supabase.from('merchants').select('*').order('created_at', { ascending: false }),
    supabase.from('commissions').select('type, reference_id, rate').eq('is_active', true),
  ]);

  if (merchantsRes.error) return NextResponse.json({ error: merchantsRes.error.message }, { status: 500 });

  const commissions = (commissionsRes.data ?? []) as Array<{ type: string; reference_id: string | null; rate: number }>;
  const globalRule = commissions.find(c => c.type === 'global');

  const merchants = (merchantsRes.data ?? []).map(m => {
    const merchantRule = commissions.find(c => c.type === 'merchant' && c.reference_id === m.id);
    const effective_commission_rate = merchantRule?.rate ?? globalRule?.rate ?? m.commission_rate ?? 10;
    const commission_tier: 'merchant' | 'global' | 'fallback' = merchantRule ? 'merchant' : globalRule ? 'global' : 'fallback';
    return { ...m, effective_commission_rate, commission_tier };
  });

  return NextResponse.json({ merchants });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const payload = await request.json();
  if (!payload.store_name) {
    return NextResponse.json({ error: 'store_name is required' }, { status: 400 });
  }

  if (payload.portal_password) {
    payload.portal_password = await bcrypt.hash(payload.portal_password, 10);
  }

  const { data, error } = await supabase
    .from('merchants')
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ merchant: data });
}
