import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';

interface SodaTier { threshold: number; qty: number; }

interface SodaPromoConfig {
  tiers: SodaTier[];
  promoProduct: Product | null;
  startsAt: string | null;
  endsAt: string | null;
}

function isPromoWindowActive(startsAt: string | null, endsAt: string | null): boolean {
  const now = new Date().toISOString();
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}

function promoApplies(merchantType: string | null): boolean {
  return merchantType === 'restaurant' || merchantType === 'bakery';
}

export function useSodaPromo(merchantType: string | null) {
  const [config, setConfig] = useState<SodaPromoConfig | null>(null);
  const { items, setPromoItem } = useCartStore();

  useEffect(() => {
    fetch('/api/customer/soda-promo')
      .then(r => r.json())
      .then((data: SodaPromoConfig) => setConfig(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!config) return;

    const applicable =
      isPromoWindowActive(config.startsAt, config.endsAt) &&
      config.promoProduct &&
      promoApplies(merchantType);

    if (!applicable) {
      // Remove promo item if present
      const hasPromo = items.some(i => i.product.is_promo_item);
      if (hasPromo) setPromoItem(null, 0);
      return;
    }

    // Eligible subtotal: exclude promo items
    const eligibleSubtotal = items
      .filter(i => !i.product.is_promo_item)
      .reduce((s, i) => s + i.product.selling_price * i.quantity, 0);

    // Determine earned qty: highest tier whose threshold is met
    const sortedTiers = [...config.tiers].sort((a, b) => b.threshold - a.threshold);
    let earnedQty = 0;
    for (const tier of sortedTiers) {
      if (eligibleSubtotal >= tier.threshold) { earnedQty = tier.qty; break; }
    }

    const currentPromoItem = items.find(i => i.product.is_promo_item);
    const currentQty = currentPromoItem?.quantity ?? 0;

    if (earnedQty === currentQty) return; // already correct — no mutation, no loop
    setPromoItem(earnedQty > 0 ? config.promoProduct : null, earnedQty);
  }, [items, config, merchantType]);
}
