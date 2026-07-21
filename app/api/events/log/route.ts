import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, reason, source, customer_id, merchant_id, session_id, metadata } = body;

    if (!event_type) return NextResponse.json({ error: 'event_type required' }, { status: 400 });

    const supabase = await createServiceClient();
    await supabase.from('vm_events').insert({
      event_type,
      reason: reason ?? null,
      source: source ?? null,
      customer_id: customer_id ?? null,
      merchant_id: merchant_id ?? null,
      session_id: session_id ?? null,
      metadata: metadata ?? null,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
