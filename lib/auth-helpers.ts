import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AuthError = { ok: false; response: NextResponse };

/**
 * Verifies the admin_dev cookie matches ADMIN_DEV_PASSWORD env var.
 * Cookie value is the actual password (set at login), not a static string.
 */
const ADMIN_PASSWORD = process.env.ADMIN_DEV_PASSWORD || 'villagemart@2024';

export async function requireAdmin(req?: NextRequest): Promise<AuthError | { ok: true }> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get('admin_dev');

  if (!adminCookie?.value || adminCookie.value !== ADMIN_PASSWORD) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (req) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const ua = req.headers.get('user-agent') ?? null;
    const path = new URL(req.url).pathname;
    void (async () => {
      await supabase.from('admin_access_log').insert({
        path, method: req.method, ip, user_agent: ua,
      });
    })();
  }

  return { ok: true };
}

/**
 * Verifies the merchant_session cookie maps to an approved merchant in the DB.
 * Returns the verified merchantId — always use this value in queries, never
 * trust any merchantId from the request body.
 */
export async function requireMerchant(): Promise<AuthError | { ok: true; merchantId: string }> {
  const cookieStore = await cookies();
  const merchantId = cookieStore.get('merchant_session')?.value;

  if (!merchantId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, status')
    .eq('id', merchantId)
    .not('status', 'in', '("rejected","suspended")')
    .single();

  if (!merchant) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { ok: true, merchantId: merchant.id };
}

export async function requireRider(): Promise<AuthError | { ok: true; riderId: string }> {
  const cookieStore = await cookies();
  const riderId = cookieStore.get('rider_session')?.value;

  if (!riderId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: rider } = await supabase
    .from('vm_riders')
    .select('id')
    .eq('id', riderId)
    .eq('is_active', true)
    .single();

  if (!rider) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { ok: true, riderId: rider.id };
}
