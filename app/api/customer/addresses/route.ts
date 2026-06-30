import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }

  const { data } = await supabase
    .from('vm_users')
    .select('addresses, active_address_index')
    .eq('phone', phone)
    .single();

  return NextResponse.json({
    addresses: data?.addresses ?? [],
    active_address_index: data?.active_address_index ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, addresses, active_address_index } = body as {
    phone?: string;
    addresses?: unknown[];
    active_address_index?: number;
  };

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }
  if (!Array.isArray(addresses)) {
    return NextResponse.json({ error: 'Invalid addresses' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vm_users')
    .update({ addresses, active_address_index: active_address_index ?? 0 })
    .eq('phone', phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
