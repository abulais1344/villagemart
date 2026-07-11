import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireMerchant } from '@/lib/auth-helpers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.is_open === 'boolean') updates.is_open = body.is_open;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('merchants')
    .update(updates)
    .eq('id', auth.merchantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/');
  return NextResponse.json({ success: true });
}
