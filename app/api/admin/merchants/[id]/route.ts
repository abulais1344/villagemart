import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const payload = await request.json();

  if (payload.portal_password) {
    payload.portal_password = await bcrypt.hash(payload.portal_password, 10);
  }

  const { error } = await supabase
    .from('merchants')
    .update(payload)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/');
  return NextResponse.json({ success: true });
}
