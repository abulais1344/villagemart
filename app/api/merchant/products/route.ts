import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getMerchantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('merchant_session')?.value ?? null;
}

export async function PATCH(request: NextRequest) {
  const merchantId = await getMerchantId();
  if (!merchantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, is_bestseller } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vm_products')
    .update({ is_bestseller })
    .eq('id', id)
    .eq('merchant_id', merchantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
