-- ── Parcel Orders pilot feature ────────────────────────────────────────────
-- Adds three columns to merchants, creates parcel_orders table, and enables
-- the feature for Indian Dhabha only.

-- 1. Merchant columns (non-breaking: all defaulted, all IF NOT EXISTS)
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS parcel_service_enabled   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parcel_delivery_charge   numeric DEFAULT 150,
  ADD COLUMN IF NOT EXISTS parcel_order_cutoff_time time    DEFAULT '17:30:00';

-- 2. Enable for Indian Dhabha only (never hardcoded in application code)
UPDATE merchants
SET parcel_service_enabled = true
WHERE LOWER(TRIM(store_name)) = 'indian dhabha';

-- 3. parcel_orders table
CREATE TABLE IF NOT EXISTS parcel_orders (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       uuid        NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  destination_area  text        NOT NULL,
  customer_name     text        NOT NULL,
  customer_phone    text        NOT NULL,
  delivery_address  text        NOT NULL,
  items             jsonb       NOT NULL DEFAULT '[]',
  subtotal          numeric     NOT NULL DEFAULT 0,
  delivery_charge   numeric     NOT NULL DEFAULT 0,
  commission_amount numeric     NOT NULL DEFAULT 0,
  status            text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','scheduled','dispatched','delivered','cancelled')),
  order_date        date        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS: block anon/auth; service role bypasses automatically
ALTER TABLE parcel_orders ENABLE ROW LEVEL SECURITY;
