-- Prevent two active flat-charge rows for the same merchant_type.
-- A partial unique index covers only rows where merchant_type IS NOT NULL and is_active = true,
-- so distance slabs (merchant_type IS NULL) are unaffected.
-- This protects every future write path, not just the admin form.
CREATE UNIQUE INDEX IF NOT EXISTS delivery_charges_active_merchant_type_unique
  ON delivery_charges (merchant_type)
  WHERE merchant_type IS NOT NULL AND is_active = true;
