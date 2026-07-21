import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '7', 10)));

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const supabase = await createServiceClient();
  const { data: events, error } = await supabase
    .from('vm_events')
    .select('event_type, reason, source')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const countByType: Record<string, number> = {};
  const blockedByReason: Record<string, number> = {};
  const geocodeBySource: Record<string, number> = {};

  for (const e of events ?? []) {
    countByType[e.event_type] = (countByType[e.event_type] ?? 0) + 1;
    if (e.event_type === 'checkout_blocked' && e.reason) {
      blockedByReason[e.reason] = (blockedByReason[e.reason] ?? 0) + 1;
    }
    if (e.event_type === 'geocode_request' && e.source && !e.reason) {
      geocodeBySource[e.source] = (geocodeBySource[e.source] ?? 0) + 1;
    }
  }

  return NextResponse.json({ countByType, blockedByReason, geocodeBySource, total: events?.length ?? 0 });
}
