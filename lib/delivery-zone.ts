export const ARDHAPUR_CENTER = { lat: 19.2819, lng: 77.3736 };
export const DELIVERY_RADIUS_KM = 3.5;

export function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinDeliveryZone(lat: number, lng: number): boolean {
  return (
    getDistanceKm(ARDHAPUR_CENTER.lat, ARDHAPUR_CENTER.lng, lat, lng) <=
    DELIVERY_RADIUS_KM
  );
}
