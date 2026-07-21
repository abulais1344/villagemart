interface EventPayload {
  event_type: string;
  reason?: string;
  source?: string;
  customer_id?: string | null;
  merchant_id?: string | null;
  session_id?: string | null;
  metadata?: Record<string, unknown>;
}

export function logEvent(payload: EventPayload): void {
  try {
    fetch('/api/events/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // never throw — logging must never affect the caller
  }
}
