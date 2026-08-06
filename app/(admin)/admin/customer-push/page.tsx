'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/utils/format';
import toast from 'react-hot-toast';

interface SendResult {
  total: number;
  succeeded: number;
  failed: number;
  failures: { userId: string; status: number | string }[];
}

interface BroadcastEvent {
  id: number;
  created_at: string;
  metadata: { total: number; succeeded: number; failed: number };
}

export default function CustomerPushPage() {
  const supabase = createClient();
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [history, setHistory] = useState<BroadcastEvent[]>([]);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);

  async function loadData() {
    const [countRes, historyRes] = await Promise.all([
      supabase
        .from('vm_users')
        .select('id', { count: 'exact', head: true })
        .not('push_subscription', 'is', null),
      supabase
        .from('vm_events')
        .select('id, created_at, metadata')
        .eq('event_type', 'admin_push_broadcast')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (countRes.count !== null) setSubscriberCount(countRes.count);
    if (historyRes.data) setHistory(historyRes.data as BroadcastEvent[]);
  }

  useEffect(() => { loadData(); }, []);

  async function handleSend() {
    setSending(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/admin/send-customer-push', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Send failed');
        return;
      }
      setLastResult(data);
      toast.success(`Sent to ${data.succeeded} of ${data.total} subscriber(s)`);
      await loadData(); // refresh count + history
    } catch (err) {
      toast.error('Network error — check console');
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <AdminHeader title="Customer Push" />

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-6">

        {/* Subscriber count */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Active subscribers
          </p>
          <p className="text-4xl font-black text-[#7C3AED]">
            {subscriberCount === null ? '—' : subscriberCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            vm_users with push_subscription IS NOT NULL
          </p>
        </div>

        {/* Send button + result */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-900 mb-0.5">Send re-engagement push</p>
            <p className="text-xs text-gray-500">
              "Order before 10 PM for quick delivery!" · links to homepage
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || subscriberCount === 0}
            className="w-full"
          >
            {sending ? 'Sending…' : '📣 Send to all subscribers'}
          </Button>

          {lastResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              lastResult.failed === 0
                ? 'bg-green-50 text-green-800'
                : lastResult.succeeded === 0
                ? 'bg-red-50 text-red-800'
                : 'bg-orange-50 text-orange-800'
            }`}>
              <p className="font-semibold mb-1">
                {lastResult.succeeded} / {lastResult.total} delivered
                {lastResult.failed > 0 && ` · ${lastResult.failed} failed`}
              </p>
              {lastResult.failures.length > 0 && (
                <ul className="text-xs space-y-0.5 opacity-80">
                  {lastResult.failures.map((f, i) => (
                    <li key={i}>…{f.userId.slice(-8)} — HTTP {f.status}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Broadcast history */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Past broadcasts
            </p>
            <ul className="space-y-2">
              {history.map(evt => (
                <li key={evt.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 text-xs">
                    {formatDateTime(evt.created_at)}
                  </span>
                  <span className="font-medium text-gray-900">
                    {evt.metadata.succeeded}/{evt.metadata.total} delivered
                    {evt.metadata.failed > 0 && (
                      <span className="text-red-500 ml-1">· {evt.metadata.failed} failed</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}
