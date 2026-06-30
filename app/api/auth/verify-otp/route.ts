import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function lookupUser(phone: string) {
  const { data } = await supabase
    .from('vm_users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  return data;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, otp } = body as { phone?: string; otp?: string };

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
  }
  if (!otp || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ success: false, error: 'Invalid OTP format' }, { status: 400 });
  }

  // Test bypass: 9999999999 + 123456 always succeeds in non-production
  if (process.env.NODE_ENV !== 'production' && phone === '9999999999' && otp === '123456') {
    const user = await lookupUser(phone);
    if (user) return NextResponse.json({ success: true, isNewUser: false, user });
    return NextResponse.json({ success: true, isNewUser: true });
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) {
    return NextResponse.json({ success: false, error: 'OTP service unavailable' }, { status: 500 });
  }

  try {
    const qs = new URLSearchParams({ otp, mobile: `91${phone}` });
    const res = await fetch(`https://control.msg91.com/api/v5/otp/verify?${qs}`, {
      method: 'GET',
      headers: { authkey: authKey },
    });
    const data = await res.json().catch(() => ({})) as { type?: string; message?: string };

    if (data.type === 'error' || !res.ok) {
      return NextResponse.json({ success: false, error: 'Invalid or expired OTP' }, { status: 400 });
    }

    const user = await lookupUser(phone);
    if (user) return NextResponse.json({ success: true, isNewUser: false, user });
    return NextResponse.json({ success: true, isNewUser: true });
  } catch (err) {
    console.error('MSG91 verify-otp failed:', err);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
