-- Date-range support for delivery charge slabs (NULL = always active)
ALTER TABLE delivery_charges
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at   timestamptz;

-- Promo item flag on products (used by Jeera Soda reward logic)
ALTER TABLE vm_products
  ADD COLUMN IF NOT EXISTS is_promo_item boolean NOT NULL DEFAULT false;

-- Jeera Soda reward tiers in admin_settings
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS iday_soda_threshold_1 integer DEFAULT 120,
  ADD COLUMN IF NOT EXISTS iday_soda_qty_1       integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS iday_soda_threshold_2 integer DEFAULT 240,
  ADD COLUMN IF NOT EXISTS iday_soda_qty_2       integer DEFAULT 2;

UPDATE admin_settings SET
  iday_soda_threshold_1 = 120,
  iday_soda_qty_1       = 1,
  iday_soda_threshold_2 = 240,
  iday_soda_qty_2       = 2
WHERE id = 1;
