import type { DeliveryCharge } from '@/types';

// Haversine formula to calculate distance between two lat/lng points in km
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Look up delivery charge for a given distance and order amount
export function getDeliveryCharge(
  distanceKm: number,
  orderAmount: number,
  slabs: DeliveryCharge[]
): number {
  const activeSlabs = slabs.filter(s => s.is_active);

  // Check free delivery threshold first
  for (const slab of activeSlabs) {
    if (slab.free_delivery_above !== null && orderAmount >= slab.free_delivery_above) {
      return 0;
    }
  }

  // Find matching distance slab
  const slab = activeSlabs.find(
    s => distanceKm >= s.min_km && distanceKm < s.max_km
  );

  return slab ? slab.charge : 0;
}
