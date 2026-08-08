-- Add live GPS location columns to vm_riders.
-- These are updated by the rider app every ~15 s while an order is out_for_delivery.
ALTER TABLE vm_riders
  ADD COLUMN IF NOT EXISTS current_lat          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS current_lng          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_updated_at  TIMESTAMPTZ;

-- The 20260721 migration REVOKEd table-level SELECT on vm_riders and re-GRANTed
-- only a safe allowlist to anon + authenticated.  The three new columns must be
-- added to that grant so that customer-side Realtime postgres_changes payloads
-- include the coordinates.  portal_username / portal_password / push_subscription
-- remain withheld.
GRANT SELECT (current_lat, current_lng, location_updated_at) ON vm_riders TO anon, authenticated;
