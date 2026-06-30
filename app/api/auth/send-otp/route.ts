import { NextRequest, NextResponse } from 'next/server';

// Best-effort in-memory rate limiting. Resets on cold-start (acceptable for serverless).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_SENDS = 3;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(phone);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_SENDS) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone } = body as { phone?: string };

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
  }

  // Test bypass: phone 9999999999 always succeeds, OTP is 123456
  if (process.env.NODE_ENV !== 'production' && phone === '9999999999') {
    return NextResponse.json({ success: true });
  }

  if (isRateLimited(phone)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Try again in 10 minutes.' },
      { status: 429 }
    );
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) {
    console.error('MSG91_AUTH_KEY is not configured');
    return NextResponse.json({ success: false, error: 'OTP service unavailable' }, { status: 500 });
  }

  const qs = new URLSearchParams({ mobile: `91${phone}`, otp_expiry: '10' });
  if (process.env.MSG91_TEMPLATE_ID) qs.set('template_id', process.env.MSG91_TEMPLATE_ID);

  try {
    const res = await fetch(`https://control.msg91.com/api/v5/otp?${qs}`, {
      method: 'POST',
      headers: { authkey: authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: `91${phone}` }),
    });
    const data = await res.json().catch(() => ({})) as { type?: string; message?: string };

    if (data.type === 'error') {
      console.error('MSG91 send-otp error:', data.message);
      return NextResponse.json(
        { success: false, error: data.message ?? 'Failed to send OTP' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('MSG91 send-otp request failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 });
  }
}
