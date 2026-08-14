-- Date-range window for Jeera Soda promo (NULL = always active)
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS iday_soda_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS iday_soda_ends_at   timestamptz;

-- 15–17 Aug 2026 window (IST: midnight 15 Aug → midnight 18 Aug)
UPDATE admin_settings SET
  iday_soda_starts_at = '2026-08-14T18:30:00Z',
  iday_soda_ends_at   = '2026-08-17T18:29:59Z'
WHERE id = 1;
