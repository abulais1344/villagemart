'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Navigation } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/google-maps';
import { isWithinDeliveryZone, ARDHAPUR_CENTER } from '@/lib/delivery-zone';
import type { AddressData } from '@/lib/customer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddressData) => void;
  defaultLat?: number;
  defaultLng?: number;
}

const LABELS: { key: AddressData['label']; emoji: string }[] = [
  { key: 'Home', emoji: '🏠' },
  { key: 'Work', emoji: '💼' },
  { key: 'Other', emoji: '📍' },
];

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSave,
  defaultLat,
  defaultLng,
}: Props) {
  const [loadError, setLoadError] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [lat, setLat] = useState(defaultLat ?? ARDHAPUR_CENTER.lat);
  const [lng, setLng] = useState(defaultLng ?? ARDHAPUR_CENTER.lng);
  const [inZone, setInZone] = useState<boolean | null>(null);
  const [label, setLabel] = useState<AddressData['label']>('Home');
  const [flatNo, setFlatNo] = useState('');
  const [landmark, setLandmark] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const geocodeCounter = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function reverseGeocode(newLat: number, newLng: number) {
    setLat(newLat);
    setLng(newLng);
    setInZone(isWithinDeliveryZone(newLat, newLng));
    setGeocoding(true);

    const reqId = ++geocodeCounter.current;

    geocoderRef.current.geocode(
      { location: { lat: newLat, lng: newLng } },
      (results: any[], status: string) => {
        if (reqId !== geocodeCounter.current) return;
        setGeocoding(false);
        if (status !== 'OK' || !results?.[0]) return;

        const r = results[0];
        setAddress(r.formatted_address);

        let foundArea = '';
        let foundPincode = '';
        for (const comp of (r.address_components as any[])) {
          const types: string[] = comp.types;
          if (
            !foundArea &&
            (types.includes('sublocality_level_1') || types.includes('locality'))
          ) {
            foundArea = comp.long_name;
          }
          if (types.includes('postal_code')) foundPincode = comp.long_name;
        }
        setArea(foundArea);
        setPincode(foundPincode);
      },
    );
  }

  useEffect(() => {
    if (!isOpen) return;

    loadGoogleMaps()
      .then(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!mapRef.current) return;

            const center = {
              lat: defaultLat ?? ARDHAPUR_CENTER.lat,
              lng: defaultLng ?? ARDHAPUR_CENTER.lng,
            };

            const map = new window.google.maps.Map(mapRef.current, {
              center,
              zoom: 19,
              disableDefaultUI: true,
              zoomControl: true,
              gestureHandling: 'greedy',
            });

            mapInstanceRef.current = map;
            geocoderRef.current = new window.google.maps.Geocoder();

            // Force tile load
            window.google.maps.event.trigger(map, 'resize');
            map.setCenter(center);

            // Geocode on map idle
            map.addListener('idle', () => {
              const c = map.getCenter();
              if (c) reverseGeocode(c.lat(), c.lng());
            });

            // Search autocomplete
            if (searchInputRef.current) {
              const autocomplete = new window.google.maps.places.Autocomplete(
                searchInputRef.current,
                {
                  componentRestrictions: { country: 'in' },
                  locationBias: {
                    center: { lat: 19.2819, lng: 77.3736 },
                    radius: 30000,
                  },
                  fields: ['geometry', 'formatted_address', 'address_components'],
                } as google.maps.places.AutocompleteOptions,
              );
              autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place?.geometry?.location) {
                  map.panTo(place.geometry.location);
                  map.setZoom(15);
                }
              });
            }
          });
        });
      })
      .catch(() => setLoadError(true));
  }, [isOpen]);

  function handleCurrentLocation() {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapInstanceRef.current.panTo({ lat: coords.latitude, lng: coords.longitude });
        mapInstanceRef.current.setZoom(16);
      },
      () => alert('Please allow location access in your browser settings.'),
    );
  }

  function handleSave() {
    if (!inZone || !address) return;
    const fullAddress = [flatNo, address, landmark ? `Near: ${landmark}` : ''].filter(Boolean).join(', ');
    onSave({ label, address: fullAddress, area, lat, lng, pincode });
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex flex-col bg-white" style={{ zIndex: 60 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h2 className="text-base font-bold text-gray-900">Set Delivery Location</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search your area or locality..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400"
        />
      </div>

      {/* Map */}
      <div className="relative shrink-0" style={{ height: 260 }}>
        {loadError ? (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-center px-6">
              <p className="text-gray-600 font-medium">Unable to load map</p>
              <p className="text-gray-400 text-sm mt-1">Check your internet connection</p>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={mapRef}
              style={{ width: '100%', height: '256px', minHeight: '256px' }}
            />

            {/* Fixed center pin */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div style={{ marginTop: -32 }}>
                {geocoding ? (
                  <div className="w-8 h-8 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
                ) : (
                  <span className="text-4xl leading-none drop-shadow-md">📍</span>
                )}
              </div>
            </div>

            {/* Use current location */}
            <button
              onClick={handleCurrentLocation}
              className="absolute bottom-3 right-3 z-10 bg-white rounded-xl px-3 py-2 shadow-md flex items-center gap-1.5 text-sm text-purple-600 font-medium"
            >
              <Navigation className="w-4 h-4" />
              Use my location
            </button>
          </>
        )}
      </div>

      {/* Address info + label */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {address ? (
          <div
            className={`rounded-xl p-3 border ${
              inZone
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <p
              className={`text-xs font-semibold mb-1 ${
                inZone ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {inZone
                ? '✅ Delivery available here'
                : '⚠️ Outside our delivery zone (10 km from Ardhapur)'}
            </p>
            <p className="text-sm text-gray-700 leading-snug">{address}</p>
          </div>
        ) : (
          <div className="rounded-xl p-3 border border-gray-200 bg-gray-50 text-center">
            <p className="text-sm text-gray-400">Move the map to select your location</p>
          </div>
        )}

        {address && (
          <div className="space-y-2">
            <input
              type="text"
              value={flatNo}
              onChange={e => setFlatNo(e.target.value)}
              placeholder="Flat / House No. *"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400"
            />
            <input
              type="text"
              value={landmark}
              onChange={e => setLandmark(e.target.value)}
              placeholder="Landmark (optional)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
        )}

        {inZone && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Save address as</p>
            <div className="flex gap-2">
              {LABELS.map(({ key, emoji }) => (
                <button
                  key={key}
                  onClick={() => setLabel(key)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    label === key
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200'
                  }`}
                >
                  {emoji} {key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm button */}
      <div className="px-4 py-4 border-t border-gray-100 shrink-0">
        <button
          onClick={handleSave}
          disabled={!inZone || !address || geocoding}
          className="w-full bg-purple-600 disabled:opacity-40 text-white rounded-xl py-3.5 font-semibold text-sm"
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
}
