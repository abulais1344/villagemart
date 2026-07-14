CREATE TABLE IF NOT EXISTS pwa_installs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source     TEXT        NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
