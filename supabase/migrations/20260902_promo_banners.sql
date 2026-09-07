create table promo_banners (
  id         uuid        primary key default gen_random_uuid(),
  image_url  text        not null,
  link_url   text,
  is_active  boolean     not null default true,
  sort_order int         not null default 0,
  start_at   timestamptz,
  end_at     timestamptz,
  created_at timestamptz not null default now()
);

-- Rows with no start_at/end_at are always eligible; null means "no constraint".
-- Query pattern: .eq('is_active', true)
--               .or('start_at.is.null,start_at.lte.<now>')
--               .or('end_at.is.null,end_at.gt.<now>')

-- Optional: allow public read, admin-only write (adjust to match your RLS setup)
alter table promo_banners enable row level security;

create policy "Public can read active banners"
  on promo_banners for select
  using (is_active = true);
