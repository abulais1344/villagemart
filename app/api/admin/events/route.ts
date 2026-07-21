import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '7', 10)));

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
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
