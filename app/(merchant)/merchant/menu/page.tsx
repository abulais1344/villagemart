'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMerchant } from '../MerchantProvider';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';

function getFoodEmoji(name: string): string {
  if (name.includes('Dal'))                         return '🍲';
  if (name.includes('Roti'))                        return '🫓';
  if (name.includes('Rice') || name.includes('Jeera')) return '🍚';
  if (name.includes('Sabzi'))                       return '🥘';
  if (name.includes('Chai'))                        return '☕';
  if (name.includes('Lassi'))                       return '🥛';
  if (name.includes('Poha'))                        return '🍽️';
  if (name.includes('Combo') || name.includes('Thali')) return '🍱';
  if (name.includes('Biryani'))                     return '🍛';
  if (name.includes('Paneer'))                      return '🧀';
  if (name.includes('Mandi'))                       return '🍖';
  return '🍴';
}

export default function MerchantMenuPage() {
  const merchant = useMerchant();
  const supabase = createClient();

  const [menu, setMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMenu(); }, []);

  async function loadMenu() {
    const { data } = await supabase
      .from('vm_products')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('name', { ascending: true });
    setMenu(data ?? []);
    setLoading(false);
  }

  async function toggleAvailable(productId: string, currentState: boolean) {
    await supabase.from('vm_products').update({ is_active: !currentState }).eq('id', productId);
    // Optimistic update — no need to re-fetch
    setMenu(prev => prev.map(p => p.id === productId ? { ...p, is_active: !currentState } : p));
  }

  return (
    <>
      <MerchantHeader storeName={merchant.store_name} />
      <main className="px-4 py-4">
        <p className="text-sm text-gray-500 mb-4">{menu.length} items</p>

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : menu.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">🍽️</p>
            <p className="text-sm text-gray-500">No menu items yet</p>
            <p className="text-xs text-gray-400 mt-1">Ask your admin to add items</p>
          </div>
        ) : (
          menu.map(product => (
            <div key={product.id} className="bg-white rounded-2xl p-4 border border-gray-100 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <span>{getFoodEmoji(product.name)}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">₹{product.selling_price}</p>
                </div>
              </div>

              <button
                onClick={() => toggleAvailable(product.id, product.is_active)}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  product.is_active ? 'bg-[#7C3AED]' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  product.is_active ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          ))
        )}
      </main>
    </>
  );
}
