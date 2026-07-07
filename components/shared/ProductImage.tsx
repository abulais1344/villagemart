import Image from 'next/image';

const CATEGORY_DEFAULTS: Record<string, string> = {
  dairy:                  '/defaults/dairy.svg',
  groceries:              '/defaults/groceries.svg',
  snacks:                 '/defaults/snacks.svg',
  'fruits-vegetables':    '/defaults/fruits-vegetables.svg',
  'veg-main-course':      '/defaults/veg-main-course.svg',
  'non-veg-main-course':  '/defaults/non-veg-main-course.svg',
  'roti-bread':           '/defaults/roti-bread.svg',
  rice:                   '/defaults/rice.svg',
  biryani:                '/defaults/rice.svg',
  egg:                    '/defaults/egg.svg',
  beverages:              '/defaults/beverages.svg',
  drinks:                 '/defaults/beverages.svg',
  soup:                   '/defaults/beverages.svg',
  starters:               '/defaults/starters.svg',
  'veg-starters':         '/defaults/veg-main-course.svg',
  'non-veg-starters':     '/defaults/non-veg-main-course.svg',
  desserts:               '/defaults/desserts.svg',
  sweets:                 '/defaults/desserts.svg',
};

const GENERIC = '/defaults/generic.svg';

function svgSrc(categorySlug?: string | null): string {
  return (categorySlug && CATEGORY_DEFAULTS[categorySlug]) || GENERIC;
}

type BaseProps = {
  images?: string[] | null;
  categorySlug?: string | null;
  alt: string;
  className?: string;
};

type FillProps = BaseProps & {
  fill: true;
  sizes?: string;
  priority?: boolean;
  width?: never;
  height?: never;
};

type SizedProps = BaseProps & {
  fill?: false;
  width: number;
  height: number;
  sizes?: never;
  priority?: never;
};

export type ProductImageProps = FillProps | SizedProps;

/**
 * Renders a product photo if available, or a category-specific SVG placeholder.
 * Real photos use next/image (Supabase CDN, optimised).
 * SVG defaults use <img loading="lazy"> — no next/image optimisation needed for tiny local SVGs.
 */
export function ProductImage(props: ProductImageProps) {
  const { images, categorySlug, alt } = props;
  const src = images?.[0];

  if (src) {
    if (props.fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          className={props.className ?? 'object-cover'}
          sizes={props.sizes}
          priority={props.priority}
        />
      );
    }
    return (
      <Image
        src={src}
        alt={alt}
        width={props.width}
        height={props.height}
        className={props.className ?? 'object-cover w-full h-full'}
      />
    );
  }

  // SVG placeholder — centred + padded so icon is always fully visible
  const defaultClass = props.fill
    ? 'absolute inset-0 w-full h-full object-contain p-[18%]'
    : 'w-full h-full object-contain p-[15%]';

  if (props.fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={svgSrc(categorySlug)}
        alt={alt}
        className={defaultClass}
        loading="lazy"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={svgSrc(categorySlug)}
      alt={alt}
      width={props.width}
      height={props.height}
      className={defaultClass}
      loading="lazy"
    />
  );
}
