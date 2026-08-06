'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { formatDateTime } from '@/lib/utils/format';

interface LogEntry {
  id: number;
  path: string;
  method: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function AccessLogPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('admin_access_log')
      .select('id, path, method, ip, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setEntries((data as LogEntry[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <AdminHeader title="Access Log" />

      <div className="max-w-3xl mx-auto px-4 pt-6">
        <p className="text-xs text-gray-400 mb-4">
          Every authenticated admin API request — last 200 entries. Use this to confirm "was that really us" by IP.
        </p>

        {loading && <p className="text-center text-gray-400 text-sm py-12">Loading…</p>}

        {!loading && entries.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">No entries yet — they appear once admin API routes are called.</p>
        )}

        {!loading && entries.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Time</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-400 uppercase tracking-wide">Method</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-400 uppercase tracking-wide">Path</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap font-tabular-nums">
                        {formatDateTime(e.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`font-mono font-semibold ${
                          e.method === 'GET' ? 'text-blue-600' :
                          e.method === 'POST' ? 'text-green-600' :
                          e.method === 'PATCH' || e.method === 'PUT' ? 'text-orange-500' :
                          e.method === 'DELETE' ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {e.method ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-700 break-all">{e.path}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-500 whitespace-nowrap">{e.ip ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
