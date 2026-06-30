import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, name, address, landmark, area, addresses, active_address_index } = body;

  if (!phone || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  }

  const payload = { phone, name, address, landmark, area, addresses, active_address_index };

  const { error } = await supabase
    .from('vm_users')
    .upsert(payload, { onConflict: 'phone' });

  if (error) {
    console.error('[upsert-profile] Supabase error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
