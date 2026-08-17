'use client';

import { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface Rating {
  id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  merchants: { store_name: string } | null;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-400 tracking-tight">
      {'★'.repeat(n)}
      <span className="text-gray-200">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/ratings')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setRatings(data.ratings ?? []);
      })
      .catch(() => setError('Failed to load ratings'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminHeader title="Order Ratings" />
      <main className="px-4 py-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2 animate-pulse">
                <div className="h-3 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-12">{error}</p>
        ) : ratings.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No ratings yet</p>
        ) : (
          <div className="space-y-3">
            {ratings.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-mono mb-0.5">
                      #{r.order_id.slice(-6).toUpperCase()}
                      {r.merchants?.store_name
                        ? <span className="text-gray-500 font-sans not-italic"> · {r.merchants.store_name}</span>
                        : null}
                    </p>
                    <Stars n={r.rating} />
                    {r.comment && (
                      <p className="text-sm text-gray-700 mt-1 leading-snug">{r.comment}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 shrink-0 text-right leading-tight">
                    {formatDate(r.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
