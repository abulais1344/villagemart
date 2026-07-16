'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { loadGoogleMaps } from '@/lib/google-maps';

interface LatLng {
  lat: number;
  lng: number;
  address?: string;
}

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onConfirm: (location: LatLng) => void;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

// Shared with LocationPickerModal — same key format (4dp)
const geocodeCache = new Map<string, string>();
function cacheKey(lat: number, lng: number) { return `${lat.toFixed(4)},${lng.toFixed(4)}`; }

export function MapPicker({ initialLat = 18.6784, initialLng = 77.5897, onConfirm }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: initialLat, lng: initialLng },
        zoom: 16,
        disableDefaultUI: true,
        zoomControl: true,
      });

      const marker = new window.google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map,
        draggable: true,
      });

      const geocoder = new window.google.maps.Geocoder();

      const reverseGeocode = (latLng: google.maps.LatLng) => {
        const key = cacheKey(latLng.lat(), latLng.lng());
        const cached = geocodeCache.get(key);
        if (cached) { setAddress(cached); return; }
        geocoder.geocode({ location: latLng }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            geocodeCache.set(key, results[0].formatted_address);
            setAddress(results[0].formatted_address);
          }
        });
      };

      // No geocode on mount — only on explicit user interaction (drag/click)
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          setCoords({ lat: pos.lat(), lng: pos.lng() });
          reverseGeocode(pos);
        }
      });

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          marker.setPosition(e.latLng);
          setCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          reverseGeocode(e.latLng);
        }
      });

      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div ref={mapRef} className="w-full h-64 rounded-2xl overflow-hidden border border-[#E5E7EB] relative bg-gray-100">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        )}
      </div>
      {address && (
        <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-xl">
          <MapPin className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
          <p className="text-sm text-[#1A1A1A]">{address}</p>
        </div>
      )}
      <Button onClick={() => onConfirm({ ...coords, address })} disabled={loading} fullWidth>
        Confirm Location
      </Button>
    </div>
  );
}
