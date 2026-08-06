CREATE TABLE IF NOT EXISTS admin_access_log (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path       TEXT NOT NULL,
  method     TEXT,
  ip         TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_access_log_created_at
  ON admin_access_log (created_at DESC);
