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

// Module-level state keyed by merchantId — survives component remounts.
// useRef resets on every mount; module scope does not.
const sodaPromoReqCounters = new Map<string, number>();
function nextSodaPromoReqId(key: string): number {
  const next = (sodaPromoReqCounters.get(key) ?? 0) + 1;
  sodaPromoReqCounters.set(key, next);
  return next;
}

// Sticky eligibility per merchantId: true once full eligibility has been
// confirmed at least once.  Keyed by merchantId so switching merchants
// automatically starts fresh without any explicit reset needed.
const eligibilityConfirmedMap = new Map<string, boolean>();

// merchantType accepts three states:
//   undefined  — not yet loaded (cart page before merchant-status resolves); skip all action
//   null       — loaded but merchant has no type (correctly ineligible)
//   string     — loaded; promoApplies() decides eligibility
export function useSodaPromo(merchantType: string | null | undefined, merchantId: string | null) {
  const [config, setConfig] = useState<SodaPromoConfig | null>(null);
  const { items, setPromoItem } = useCartStore();

  // Derive stable primitives from items so the second effect only re-runs on
  // meaningful external changes, not on array reference churn from setPromoItem's
  // own set() call.  After setPromoItem ADD:
  //   eligibleSubtotal — unchanged (promo is ₹0 and filtered out)
  //   currentPromoQty  — ticks 0→1, triggers one re-fire, guard passes, done
  //   hasPromoItem     — ticks false→true, same re-fire
  // No further dep changes → no further firings.
  const eligibleSubtotal = items
    .filter(i => !i.product.is_promo_item)
    .reduce((s, i) => s + i.product.selling_price * i.quantity, 0);
  const currentPromoQty = items.find(i => i.product.is_promo_item)?.quantity ?? 0;
  const hasPromoItem = items.some(i => i.product.is_promo_item);

  useEffect(() => {
    if (!merchantId) return;
    const reqId = nextSodaPromoReqId(merchantId);
    const controller = new AbortController();
    fetch(`/api/customer/soda-promo?merchant_id=${merchantId}`, { signal: controller.signal })
      .then(r => r.json())
      .then((data: SodaPromoConfig) => {
        if (reqId !== sodaPromoReqCounters.get(merchantId)) {
          console.log('[useSodaPromo] soda-promo fetch STALE — discarding', { reqId, latest: sodaPromoReqCounters.get(merchantId), merchantId });
          return;
        }
        console.log('[useSodaPromo] soda-promo config loaded', { reqId, merchantId, isActive: data.isActive, hasPromoProduct: !!data.promoProduct });
        setConfig(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [merchantId]);

  useEffect(() => {
    if (!config) return;
    // merchantType===undefined means the caller hasn't resolved it yet; don't remove
    // a correctly-added promo item based on stale null state.
    if (merchantType === undefined) return;

    const confirmed = !!(merchantId && eligibilityConfirmedMap.get(merchantId));
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
      eligibilityConfirmed: confirmed,
    });

    if (!confirmed && !applicable) {
      // Never confirmed eligible for this merchant and currently ineligible —
      // remove any stale promo and stop.
      if (hasPromoItem) {
        console.log('[useSodaPromo] not applicable, no prior eligibility — removing promo');
        setPromoItem(null, 0);
      }
      return;
    }

    // Reach here when confirmed=true (bypass live promoApplies check — flicker cannot
    // gate tier logic) OR when applicable=true for the first time (lock in the flag).
    // Either way, tier logic always runs so qty adjustments stay in sync with the cart.
    if (merchantId && applicable) eligibilityConfirmedMap.set(merchantId, true);

    // Determine earned qty from pre-computed eligible subtotal
    const sortedTiers = [...config.tiers].sort((a, b) => b.threshold - a.threshold);
    let earnedQty = 0;
    for (const tier of sortedTiers) {
      if (eligibleSubtotal >= tier.threshold) { earnedQty = tier.qty; break; }
    }

    console.log('[useSodaPromo] eligible', {
      eligibleSubtotal,
      tiers: config.tiers,
      earnedQty,
      currentPromoQty,
      willCallSetPromoItem: earnedQty !== currentPromoQty,
    });

    if (earnedQty === currentPromoQty) return; // already correct — no mutation, no loop
    console.log('[useSodaPromo] calling setPromoItem', earnedQty > 0 ? 'ADD' : 'REMOVE', { product: config.promoProduct?.id, qty: earnedQty });
    setPromoItem(earnedQty > 0 ? config.promoProduct : null, earnedQty);
  }, [eligibleSubtotal, currentPromoQty, hasPromoItem, config, merchantType, merchantId]);
}
