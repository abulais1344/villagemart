import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const { source } = await request.json();
    const user_agent = request.headers.get('user-agent') ?? null;

    await supabase.from('pwa_installs').insert({ source, user_agent });
  } catch {
    // best-effort — never surface errors to the client
  }

  return NextResponse.json({ ok: true });
}
