import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  console.log('[upsert-profile] body:', JSON.stringify(body));

  const { uid, phone, name, address, landmark, area, addresses, active_address_index } = body;

  if (!phone || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  }
  if (!uid) {
    return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vm_users')
    .upsert(
      { id: uid, phone, name, address, landmark, area, addresses, active_address_index },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('[upsert-profile] Supabase error:', error.message, '| code:', error.code);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
