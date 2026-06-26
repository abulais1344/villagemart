import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireMerchant } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  const { data, error } = await supabase
    .from('vm_products')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  const body = await request.json();
  const { name, description, selling_price, mrp, unit, is_veg, is_bestseller, is_active, images } = body;

  const { data, error } = await supabase
    .from('vm_products')
    .insert({
      name,
      description,
      selling_price,
      mrp,
      unit,
      is_veg,
      is_bestseller,
      is_active,
      images: images ?? [],
      merchant_id: merchantId, // always from session, never from body
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  const body = await request.json();
  const { id, is_bestseller } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vm_products')
    .update({ is_bestseller })
    .eq('id', id)
    .eq('merchant_id', merchantId); // ownership enforced

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
