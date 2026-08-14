import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';

interface SodaTier { threshold: number; qty: number; }

interface SodaPromoConfig {
  tiers: SodaTier[];
  promoProduct: Product | null;
  isActive: boolean;
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

// merchantType accepts three states:
//   undefined  — not yet loaded (cart page before merchant-status resolves); skip all action
//   null       — loaded but merchant has no type (correctly ineligible)
//   string     — loaded; promoApplies() decides eligibility
export function useSodaPromo(merchantType: string | null | undefined, merchantId: string | null) {
  const [config, setConfig] = useState<SodaPromoConfig | null>(null);
  const { items, setPromoItem } = useCartStore();

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/customer/soda-promo?merchant_id=${merchantId}`)
      .then(r => r.json())
      .then((data: SodaPromoConfig) => setConfig(data))
      .catch(() => {});
  }, [merchantId]);

  useEffect(() => {
    if (!config) return;
    // merchantType===undefined means the caller hasn't resolved it yet; don't remove
    // a correctly-added promo item based on stale null state.
    if (merchantType === undefined) return;

    const applicable =
      config.isActive &&
      isPromoWindowActive(config.startsAt, config.endsAt) &&
      config.promoProduct &&
      promoApplies(merchantType);

    console.log('[useSodaPromo] effect fired', {
      merchantType,
      promoApplies: promoApplies(merchantType),
      isActive: config.isActive,
      windowActive: isPromoWindowActive(config.startsAt, config.endsAt),
      hasPromoProduct: !!config.promoProduct,
      applicable: !!applicable,
    });

    if (!applicable) {
      // Remove promo item if present
      const hasPromo = items.some(i => i.product.is_promo_item);
      console.log('[useSodaPromo] not applicable — hasPromo in cart:', hasPromo);
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

    console.log('[useSodaPromo] eligible', {
      eligibleSubtotal,
      tiers: config.tiers,
      earnedQty,
      currentQty,
      willCallSetPromoItem: earnedQty !== currentQty,
    });

    if (earnedQty === currentQty) return; // already correct — no mutation, no loop
    console.log('[useSodaPromo] calling setPromoItem', earnedQty > 0 ? 'ADD' : 'REMOVE', { product: config.promoProduct?.id, qty: earnedQty });
    setPromoItem(earnedQty > 0 ? config.promoProduct : null, earnedQty);
  }, [items, config, merchantType, merchantId]);
}
