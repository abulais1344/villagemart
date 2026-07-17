import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COOLDOWN_SECONDS = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone } = body as { phone?: string };

  if (!phone || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ allowed: false, error: 'Invalid phone' }, { status: 400 });
  }

  const { data } = await supabase
    .from('otp_rate_limit')
    .select('last_sent_at')
    .eq('phone', phone)
    .maybeSingle();

  if (data?.last_sent_at) {
    const elapsedSeconds = (Date.now() - new Date(data.last_sent_at).getTime()) / 1000;
    if (elapsedSeconds < COOLDOWN_SECONDS) {
      const waitSeconds = Math.ceil(COOLDOWN_SECONDS - elapsedSeconds);
      return NextResponse.json({ allowed: false, waitSeconds }, { status: 429 });
    }
  }

  await supabase
    .from('otp_rate_limit')
    .upsert({ phone, last_sent_at: new Date().toISOString() }, { onConflict: 'phone' });

  return NextResponse.json({ allowed: true });
}
