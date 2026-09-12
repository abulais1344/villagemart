create table if not exists promo_combos (
  id                   uuid primary key default gen_random_uuid(),
  merchant_id          uuid not null references merchants(id) on delete cascade,
  required_product_ids uuid[] not null,
  free_product_id      uuid not null references vm_products(id),
  label                text,
  is_active            boolean not null default true,
  starts_at            timestamptz,
  ends_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists promo_combos_merchant_id_idx on promo_combos(merchant_id);

-- RLS: block all direct client access; service-role key (used by all API routes) bypasses automatically.
alter table promo_combos enable row level security;
