import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabase
    .from('promo_combos')
    .select('id, merchant_id, required_product_ids, free_product_id, label, is_active, starts_at, ends_at, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ combos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { merchant_id, required_product_ids, free_product_id, label, starts_at, ends_at } = body;

  if (!merchant_id || !required_product_ids?.length || !free_product_id) {
    return NextResponse.json(
      { error: 'merchant_id, required_product_ids, and free_product_id are required' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('promo_combos')
    .insert({
      merchant_id,
      required_product_ids,
      free_product_id,
      label: label || null,
      starts_at: starts_at || null,
      ends_at: ends_at || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ combo: data });
}
