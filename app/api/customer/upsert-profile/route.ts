import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@/lib/firebase/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { idToken, phone, name, address, landmark, area, addresses, active_address_index } = body;

  if (!idToken) {
    return NextResponse.json({ success: false, error: 'Missing idToken' }, { status: 400 });
  }
  if (!phone || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error('[upsert-profile] token verification failed:', err);
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
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
