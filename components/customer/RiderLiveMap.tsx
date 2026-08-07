'use client';

import { useEffect, useRef, useState } from 'react';

interface RiderLiveMapProps {
  riderLat: number | null;
  riderLng: number | null;
  merchantLat?: number | null;
  merchantLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
}

const SCRIPT_ID = 'gm-rider-tracking';
const GM_CB = '__gmRiderCb';

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();

  return new Promise((resolve) => {
    if (document.getElementById(SCRIPT_ID)) {
      // Script already injected — poll until google.maps is available
      const timer = setInterval(() => {
        if ((window as any).google?.maps) { clearInterval(timer); resolve(); }
      }, 100);
      return;
    }
    (window as any)[GM_CB] = resolve;
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${GM_CB}`;
    script.async = true;
    document.head.appendChild(script);
  });
}

function circleIcon(g: any, color: string, scale = 9) {
  return {
    path: g.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  };
}

export function RiderLiveMap({
  riderLat,
  riderLng,
  merchantLat,
  merchantLng,
  deliveryLat,
  deliveryLng,
}: RiderLiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [mapsReady, setMapsReady] = useState(false);

  // Load Maps JS API once, gated to this component
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
    loadGoogleMaps(key).then(() => setMapsReady(true));
  }, []);

  // Initialize map on first valid coordinates
  useEffect(() => {
    if (!mapsReady || !containerRef.current || initializedRef.current) return;
    if (riderLat === null || riderLng === null) return;

    initializedRef.current = true;
    const g = window as any;
    const center = { lat: riderLat, lng: riderLng };

    const map = new g.google.maps.Map(containerRef.current, {
      zoom: 15,
      center,
      disableDefaultUI: true,
      zoomControl: true,
    });
    mapRef.current = map;

    riderMarkerRef.current = new g.google.maps.Marker({
      position: center,
      map,
      title: 'Rider',
      icon: circleIcon(g.google, '#7C3AED', 11),
      zIndex: 10,
    });

    if (merchantLat != null && merchantLng != null) {
      new g.google.maps.Marker({
        position: { lat: merchantLat, lng: merchantLng },
        map,
        title: 'Restaurant',
        icon: circleIcon(g.google, '#10B981', 9),
      });
    }

    if (deliveryLat != null && deliveryLng != null) {
      new g.google.maps.Marker({
        position: { lat: deliveryLat, lng: deliveryLng },
        map,
        title: 'Delivery address',
        icon: circleIcon(g.google, '#EF4444', 9),
      });
    }
  }, [mapsReady, riderLat, riderLng, merchantLat, merchantLng, deliveryLat, deliveryLng]);

  // Smoothly update rider marker on each location ping
  useEffect(() => {
    if (!riderMarkerRef.current || riderLat === null || riderLng === null) return;
    const pos = { lat: riderLat, lng: riderLng };
    riderMarkerRef.current.setPosition(pos);
    mapRef.current?.panTo(pos);
  }, [riderLat, riderLng]);

  if (riderLat === null) {
    return (
      <div className="w-full h-52 rounded-2xl bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400 animate-pulse">Waiting for rider location…</p>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-52 rounded-2xl overflow-hidden" />;
}
