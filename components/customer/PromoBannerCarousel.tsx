'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface PromoBanner {
  id: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
}

export function PromoBannerCarousel({ banners }: { banners: PromoBanner[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setActiveIndex(i => (i + 1) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const timer = setInterval(advance, 3500);
    return () => clearInterval(timer);
  }, [advance, paused, banners.length]);

  if (banners.length === 0) return null;

  return (
    <div>
      <div
        className="relative w-full aspect-[2.5/1] rounded-2xl overflow-hidden bg-gray-100 shadow-sm"
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {banners.map((banner, i) => {
          const isActive = i === activeIndex;
          const slideClass = `absolute inset-0 transition-opacity duration-500 ${
            isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`;
          const image = (
            <Image
              src={banner.image_url}
              alt="Promotion"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 700px"
              priority={i === 0}
            />
          );
          return banner.link_url ? (
            <Link key={banner.id} href={banner.link_url} className={slideClass}>
              {image}
            </Link>
          ) : (
            <div key={banner.id} className={slideClass}>
              {image}
            </div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setPaused(false); }}
              aria-label={`Banner ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === activeIndex
                  ? 'w-4 h-1.5 bg-primary-600'
                  : 'w-1.5 h-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
