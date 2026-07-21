-- Column-level security for merchants and vm_riders.
--
-- Problem: anon and authenticated roles have table-level SELECT on these tables,
-- which means select('*') queries return sensitive credential and business columns.
--
-- Mechanism: REVOKE table-level SELECT, then re-GRANT only non-sensitive columns.
-- This does NOT modify any RLS policy (row-level access is unchanged).
-- Service-role queries (service_role key) bypass RLS and column grants entirely,
-- so all existing server-side routes using SUPABASE_SERVICE_ROLE_KEY are unaffected.
--
-- Columns withheld from anon + authenticated on merchants:
--   portal_username  — merchant login credential
--   portal_password  — merchant login credential (plaintext)
--   push_subscription — internal WebPush subscription key
--   commission_rate  — business-internal, never shown on public pages
--
-- Columns withheld from anon + authenticated on vm_riders:
--   portal_username  — rider login credential
--   portal_password  — rider login credential (plaintext)
--   push_subscription — internal WebPush subscription key

-- ── merchants ─────────────────────────────────────────────────────────────────

REVOKE SELECT ON merchants FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  store_name,
  description,
  category_id,
  phone,
  email,
  address,
  city,
  pincode,
  latitude,
  longitude,
  logo_url,
  banner_url,
  cover_image_url,
  status,
  is_open,
  opening_time,
  closing_time,
  admin_override,
  avg_delivery_time,
  min_order_amount,
  cuisine_type,
  area,
  is_food,
  coming_soon,
  parcel_service_enabled,
  parcel_delivery_charge,
  parcel_order_cutoff_time,
  created_at,
  updated_at
) ON merchants TO anon, authenticated;

-- ── vm_riders ─────────────────────────────────────────────────────────────────

REVOKE SELECT ON vm_riders FROM anon, authenticated;

GRANT SELECT (
  id,
  name,
  phone,
  vehicle_type,
  vehicle_number,
  license_url,
  aadhar_url,
  is_available,
  is_active,
  current_latitude,
  current_longitude,
  last_location_update,
  created_at
) ON vm_riders TO anon, authenticated;
