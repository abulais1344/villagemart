-- Single-row admin settings table, mirroring merchants.push_subscription pattern.
-- The CHECK constraint enforces exactly one row forever.
CREATE TABLE IF NOT EXISTS admin_settings (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  push_subscription JSONB,
  CONSTRAINT admin_settings_single_row CHECK (id = 1)
);

INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
