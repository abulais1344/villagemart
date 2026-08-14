'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getItemCount: () => number;
  getItemsByMerchant: () => Record<string, CartItem[]>;
  // Atomically set the promo item to the given qty (at ₹0), or remove it if qty=0/product=null
  setPromoItem: (product: Product | null, qty: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find(i => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map(i =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity: 1 }] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.product.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map(i =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      setPromoItem: (product, qty) => {
        set((state) => {
          const withoutPromo = state.items.filter(i => !i.product.is_promo_item);
          if (!product || qty <= 0) return { items: withoutPromo };
          // Defensive: promo product must belong to the same merchant as the cart.
          // With merchant-scoped fetching this should never fire, but guards against
          // a stale config race or future misconfiguration corrupting the cart.
          const cartMerchantId = withoutPromo[0]?.product.merchant_id ?? null;
          if (cartMerchantId !== null && product.merchant_id !== cartMerchantId) {
            console.error('[setPromoItem] merchant mismatch — skipping promo add', {
              cartMerchantId,
              promoMerchantId: product.merchant_id,
            });
            return { items: withoutPromo };
          }
          const promoCartItem: CartItem = {
            product: { ...product, selling_price: 0, mrp: 0 },
            quantity: qty,
          };
          return { items: [...withoutPromo, promoCartItem] };
        });
      },

      getTotal: () => {
        const { items } = get();
        return items.reduce(
          (sum, item) => sum + item.product.selling_price * item.quantity,
          0
        );
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce(
          (sum, item) => sum + item.product.selling_price * item.quantity,
          0
        );
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getItemsByMerchant: () => {
        const { items } = get();
        return items.reduce<Record<string, CartItem[]>>((acc, item) => {
          const key = item.product.merchant_id ?? 'own_store';
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});
      },
    }),
    {
      name: 'villagemart-cart',
    }
  )
);
