ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS iday_soda_is_active boolean NOT NULL DEFAULT true;

UPDATE admin_settings SET iday_soda_is_active = true WHERE id = 1;
