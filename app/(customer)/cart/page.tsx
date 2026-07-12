'use client';

import { useState, useEffect } from 'react';
import { ProductImage } from '@/components/shared/ProductImage';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ShoppingCart, Tag, MapPin } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Header } from '@/components/customer/Header';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils/format';
import { getCustomer, type Customer, type AddressData } from '@/lib/customer';
import { AddressManager } from '@/components/customer/AddressManager';
import { PulseHint } from '@/components/customer/PulseHint';
import { useFirstVisit } from '@/hooks/useFirstVisit';

const LocationPickerModal = dynamic(
  () => import('@/components/customer/LocationPickerModal'),
  { ssr: false },
);

const LABEL_EMOJI: Record<AddressData['label'], string> = {
  Home: '🏠',
  Work: '💼',
  Other: '📍',
};

export default function CartPage() {
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [mounted, setMounted] = useState(false);
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [merchantLogoUrl, setMerchantLogoUrl] = useState<string | null>(null);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | null>(null);
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showCheckoutHint, markCheckoutSeen] = useFirstVisit('checkout_btn');
  const router = useRouter();
  const merchantId = items[0]?.product.merchant_id ?? null;

  useEffect(() => {
    setCustomer(getCustomer());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/customer/merchant-status?id=${merchantId}`)
      .then(r => r.json())
      .then(d => {
        setMerchantName(d.store_name ?? null);
        setMerchantLogoUrl(d.logo_url ?? null);
      })
      .catch((err) => console.error('Failed to fetch merchant info:', err));
  }, [merchantId]);

  useEffect(() => {
    fetch('/api/customer/delivery-info')
      .then(r => r.json())
      .then(d => { if (typeof d.free_delivery_threshold === 'number') setFreeDeliveryThreshold(d.free_delivery_threshold); })
      .catch(() => {});
  }, []);

  const subtotal = getSubtotal();
  const deliveryCharge = subtotal >= (freeDeliveryThreshold ?? Infinity) ? 0 : 20;
  const total = subtotal + deliveryCharge;

  const activeAddr: AddressData | null =
    customer?.addresses?.length
      ? (customer.addresses[customer.active_address_index ?? 0] ?? null)
      : null;

  const fallbackAddr =
    !activeAddr && customer?.address
      ? { address: customer.address, area: customer.area ?? '' }
      : null;

  function handleAddressChange(_addr: AddressData) {
    setCustomer(getCustomer());
  }

  function handleAddNew(data: AddressData) {
    const raw = localStorage.getItem('vm_customer');
    if (!raw) return;
    const c = JSON.parse(raw);
    const existing: AddressData[] = c.addresses ?? [];
    if (existing.length >= 3) return;
    const updated = [...existing, data];
    const newActive = updated.length - 1;
    localStorage.setItem(
      'vm_customer',
      JSON.stringify({
        ...c,
        addresses: updated,
        active_address_index: newActive,
        address: data.address,
        area: data.area,
        lat: data.lat,
        lng: data.lng,
      }),
    );
    setCustomer(getCustomer());
  }

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <>
        <Header />
        <div className="flex flex-col items-center justify-center py-24 px-4 gap-4">
          <ShoppingCart className="w-20 h-20 text-gray-200" />
          <h2 className="text-lg font-bold text-[#1A1A1A]">Your cart is empty</h2>
          <p className="text-sm text-[#6B7280] text-center">Add items to get started</p>
          <Button onClick={() => router.push('/')}>Start Shopping</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="px-4 py-4 space-y-4 pb-8">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">My Cart ({items.length} items)</h1>
          {customer && (
            <p className="text-sm text-[#6B7280] mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Delivering to {customer.name}
            </p>
          )}
          {merchantName && (
            <p className="text-sm text-[#6B7280] mt-0.5 flex items-center gap-1.5">
              {merchantLogoUrl
                ? <Image src={merchantLogoUrl} alt={merchantName} width={16} height={16} className="rounded-full object-cover shrink-0" />
                : <span>🏪</span>}
              Ordering from <span className="font-medium text-[#1A1A1A]">{merchantName}</span>
            </p>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#E5E7EB]">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-3 p-4">
              <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-[#E5E7EB]">
                <ProductImage images={product.images} categorySlug={product.category?.slug} alt={product.name} width={64} height={64} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] line-clamp-2">{product.name}</p>
                <p className="text-xs text-[#6B7280]">{product.unit}</p>
                <p className="text-sm font-bold text-[#7C3AED] mt-1">{formatCurrency(product.selling_price * quantity)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => removeItem(product.id)} className="text-[#6B7280]">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-2 py-1">
                  <button onClick={() => quantity <= 1 ? removeItem(product.id) : updateQuantity(product.id, quantity - 1)} className="text-[#7C3AED]">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold w-5 text-center">{quantity}</span>
                  <button onClick={() => updateQuantity(product.id, quantity + 1)} className="text-[#7C3AED]">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add more items */}
        {items[0]?.product.merchant_id && (
          <button
            onClick={() => router.push(`/stores/${items[0].product.merchant_id}`)}
            className="w-full py-2.5 rounded-xl border border-dashed border-[#7C3AED] text-sm font-semibold text-[#7C3AED] hover:bg-purple-50 transition-colors flex items-center justify-center gap-1.5"
          >
            + Add more items
          </button>
        )}

        {/* Delivery address */}
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Deliver to</h3>

          {activeAddr ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {LABEL_EMOJI[activeAddr.label]} {activeAddr.label} · {activeAddr.area}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{activeAddr.address}</p>
                </div>
                <span className="text-green-500 text-base font-bold shrink-0">✓</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddressSheet(true)}
                  className="flex-1 py-2 text-xs font-semibold text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-50 transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Add New
                </button>
              </div>
            </div>
          ) : fallbackAddr ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    📍 {fallbackAddr.area || 'Saved Address'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{fallbackAddr.address}</p>
                </div>
                <span className="text-green-500 text-base font-bold shrink-0">✓</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddressSheet(true)}
                  className="flex-1 py-2 text-xs font-semibold text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-50 transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Add New
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-amber-700">📍 Add delivery address</p>
                <p className="text-xs text-amber-600 mt-0.5">Please add an address to continue</p>
              </div>
              <button
                onClick={() => setShowPicker(true)}
                className="w-full bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold"
              >
                Add Address
              </button>
            </div>
          )}
        </div>

        {/* Free delivery progress — only shown when threshold is loaded */}
        {freeDeliveryThreshold !== null && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
            {subtotal >= freeDeliveryThreshold ? (
              <div className="flex items-center gap-2">
                <span className="text-base">🎉</span>
                <p className="text-sm font-semibold text-green-600">You've unlocked free delivery!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      Add <span className="font-bold text-[#7C3AED]">{formatCurrency(freeDeliveryThreshold - subtotal)}</span> more for free delivery!
                    </p>
                  </div>
                  <span className="text-xs text-[#6B7280]">₹{freeDeliveryThreshold}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7C3AED] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((subtotal / freeDeliveryThreshold) * 100, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Bill details */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Bill Details</h3>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Delivery charge</span>
            {deliveryCharge === 0 ? (
              <span className="text-green-600 font-medium">FREE</span>
            ) : (
              <span>{formatCurrency(deliveryCharge)}</span>
            )}
          </div>
          <div className="flex justify-between text-base font-bold border-t border-[#E5E7EB] pt-2 mt-1">
            <span>Total</span>
            <span className="text-[#7C3AED]">{formatCurrency(total)}</span>
          </div>
        </div>

        <PulseHint show={showCheckoutHint} label="Tap to checkout ✓" position="top">
          <Button
            fullWidth size="lg"
            onClick={() => {
              markCheckoutSeen();
              if (!customer) {
                localStorage.setItem('login_redirect', '/checkout');
                window.location.href = '/auth/login';
              } else {
                window.location.href = '/checkout';
              }
            }}
          >
            {customer ? `Proceed to Checkout · ${formatCurrency(total)}` : 'Add address to continue'}
          </Button>
        </PulseHint>
      </main>

      <AddressManager
        isOpen={showAddressSheet}
        onClose={() => setShowAddressSheet(false)}
        onAddressChange={handleAddressChange}
      />
      <LocationPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSave={handleAddNew}
      />
    </>
  );
}
