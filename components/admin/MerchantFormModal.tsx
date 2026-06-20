'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ImageUpload } from '@/components/shared/ImageUpload';

interface MerchantFormModalProps {
  merchant?: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const FOOD_TYPES = new Set(['restaurant', 'home_cook', 'bakery']);

export function MerchantFormModal({ merchant, onClose, onSaved }: MerchantFormModalProps) {
  const isEdit = !!merchant;
  const supabase = createClient();

  const [store_name, setStoreName]             = useState(merchant?.store_name ?? '');
  const [owner_name, setOwnerName]             = useState(merchant?.owner_name ?? '');
  const [phone, setPhone]                      = useState(merchant?.phone ?? '');
  const [email, setEmail]                      = useState(merchant?.email ?? '');
  const [merchant_type, setMerchantType]       = useState(merchant?.merchant_type ?? 'restaurant');
  const [cuisine_type, setCuisineType]         = useState(merchant?.cuisine_type ?? '');
  const [is_food, setIsFood]                   = useState<boolean>(merchant?.is_food ?? true);
  const [address, setAddress]                  = useState(merchant?.address ?? '');
  const [area, setArea]                        = useState(merchant?.area ?? '');
  const [avg_delivery_time, setAvgDelivery]    = useState<number>(merchant?.avg_delivery_time ?? 30);
  const [min_order_amount, setMinOrder]        = useState<number>(merchant?.min_order_amount ?? 50);
  const [commission_rate, setCommission]       = useState<string>(merchant?.commission_rate?.toString() ?? '');
  const [status, setStatus]                    = useState(merchant?.status ?? 'approved');
  const [description, setDescription]          = useState(merchant?.description ?? '');
  const [opening_time, setOpeningTime]         = useState(merchant?.opening_time ?? '08:00');
  const [closing_time, setClosingTime]         = useState(merchant?.closing_time ?? '22:00');
  const [cover_image_url, setCoverImageUrl]    = useState<string>(merchant?.cover_image_url ?? '');

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  function handleTypeChange(type: string) {
    setMerchantType(type);
    setIsFood(FOOD_TYPES.has(type));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!store_name.trim()) { setError('Store name is required.'); return; }
    setError('');
    setSaving(true);

    const payload: Record<string, unknown> = {
      store_name:        store_name.trim(),
      owner_name:        owner_name.trim() || null,
      phone:             phone.trim() || null,
      email:             email.trim() || null,
      merchant_type,
      cuisine_type:      FOOD_TYPES.has(merchant_type) ? cuisine_type.trim() || null : null,
      is_food,
      address:           address.trim() || null,
      area:              area.trim() || null,
      avg_delivery_time: Number(avg_delivery_time),
      min_order_amount:  Number(min_order_amount),
      commission_rate:   commission_rate !== '' ? Number(commission_rate) : null,
      status,
      description:       description.trim() || null,
      opening_time:      opening_time || null,
      closing_time:      closing_time || null,
      cover_image_url:   cover_image_url || null,
    };

    const { error: dbError } = isEdit
      ? await supabase.from('merchants').update(payload).eq('id', merchant.id)
      : await supabase.from('merchants').insert(payload);

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    onSaved();
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400';
  const sectionCls = 'text-sm font-semibold text-purple-600 uppercase tracking-wide mt-6 mb-3';

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">
          {isEdit ? 'Edit Merchant' : 'Add Merchant'}
        </h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">

        {/* ── Section 1: Basic Info ── */}
        <p className={sectionCls}>Basic Info</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Restaurant / Store Name *</label>
            <input
              type="text"
              value={store_name}
              onChange={e => setStoreName(e.target.value)}
              required
              className={inputCls}
              placeholder="Sharma Dhaba"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Owner Name</label>
            <input
              type="text"
              value={owner_name}
              onChange={e => setOwnerName(e.target.value)}
              className={inputCls}
              placeholder="Ramesh Sharma"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className={inputCls}
              placeholder="+91XXXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputCls}
              placeholder="owner@example.com"
            />
          </div>
        </div>

        {/* ── Section 2: Type & Cuisine ── */}
        <p className={sectionCls}>Type & Cuisine</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Merchant Type</label>
            <select
              value={merchant_type}
              onChange={e => handleTypeChange(e.target.value)}
              className={inputCls}
            >
              <option value="restaurant">Restaurant / Dhaba</option>
              <option value="kirana">Kirana Store</option>
              <option value="bakery">Bakery</option>
              <option value="medical">Medical Store</option>
              <option value="vegetables">Vegetables</option>
              <option value="home_cook">Home Cook</option>
            </select>
          </div>

          {(merchant_type === 'restaurant' || merchant_type === 'home_cook') && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cuisine Type</label>
              <input
                type="text"
                value={cuisine_type}
                onChange={e => setCuisineType(e.target.value)}
                className={inputCls}
                placeholder="e.g. North Indian, Home Food"
              />
            </div>
          )}

          <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-700">Food establishment</span>
            <button
              type="button"
              onClick={() => setIsFood(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${is_food ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${is_food ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </div>

        {/* ── Section 3: Location & Operations ── */}
        <p className={sectionCls}>Location & Operations</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className={inputCls}
              placeholder="Near Bus Stand, Main Road"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Area / Village</label>
            <input
              type="text"
              value={area}
              onChange={e => setArea(e.target.value)}
              className={inputCls}
              placeholder="e.g. Ardhapur"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Delivery Time (min)</label>
              <input
                type="number"
                min={5}
                value={avg_delivery_time}
                onChange={e => setAvgDelivery(Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Order (₹)</label>
              <input
                type="number"
                min={0}
                value={min_order_amount}
                onChange={e => setMinOrder(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ── Section 4: Business ── */}
        <p className={sectionCls}>Business</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Commission %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commission_rate}
              onChange={e => setCommission(e.target.value)}
              className={inputCls}
              placeholder="Leave empty to use global (10%)"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className={inputCls}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* ── Section 5: Description ── */}
        <p className={sectionCls}>Description</p>

        <textarea
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          className={inputCls}
          placeholder="Authentic home-style food. Dal, roti, sabzi daily."
        />

        {/* ── Section 6: Cover Image ── */}
        <p className={sectionCls}>Cover Image</p>
        <ImageUpload
          bucket="merchants"
          onUpload={url => setCoverImageUrl(url)}
          currentUrl={cover_image_url || null}
          label=""
        />

        {/* ── Section 7: Opening Hours ── */}
        <p className={sectionCls}>Opening Hours</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Opens at</label>
            <input
              type="time"
              value={opening_time}
              onChange={e => setOpeningTime(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Closes at</label>
            <input
              type="time"
              value={closing_time}
              onChange={e => setClosingTime(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl py-4 font-semibold mt-6 mb-10 transition-colors"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Merchant'}
        </button>
      </form>
    </div>
  );
}
