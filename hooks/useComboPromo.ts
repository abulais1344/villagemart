'use client';

import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';

interface ComboRule {
  id: string;
  required_product_ids: string[];
  free_product: Product;
}

export function useComboPromo(merchantId: string | null) {
  const [combos, setCombos] = useState<ComboRule[]>([]);
  // Track which combo is currently active so we don't call setPromoItem on every render
  const activeComboIdRef = useRef<string | null>(null);
  const { items, setPromoItem } = useCartStore();

  // Derive a stable key from non-promo cart item IDs — avoids re-running on every setPromoItem call
  const cartIdsKey = items
    .filter(i => !i.product.is_promo_item)
    .map(i => i.product.id)
    .sort()
    .join(',');

  useEffect(() => {
    if (!merchantId) return;
    const controller = new AbortController();
    fetch(`/api/customer/combo-promo?merchant_id=${merchantId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setCombos(data.combos ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [merchantId]);

  useEffect(() => {
    if (!combos.length) return;

    const cartProductIds = new Set(
      items.filter(i => !i.product.is_promo_item).map(i => i.product.id)
    );

    const matched = combos.find(c =>
      c.required_product_ids.every(id => cartProductIds.has(id))
    );

    if (matched) {
      if (activeComboIdRef.current !== matched.id) {
        activeComboIdRef.current = matched.id;
        // Force is_promo_item=true on the client side so setPromoItem's filter handles
        // it correctly regardless of the DB flag. Server verification is independent.
        setPromoItem({ ...matched.free_product, is_promo_item: true }, 1);
      }
    } else {
      if (activeComboIdRef.current !== null) {
        activeComboIdRef.current = null;
        setPromoItem(null, 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartIdsKey, combos]);
}
