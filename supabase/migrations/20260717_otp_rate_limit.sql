-- Rate-limit table for Firebase phone OTP sends.
-- Keyed by phone (10-digit, no +91) so it covers both new and existing users
-- without needing a Firebase UID or vm_users row first.
CREATE TABLE IF NOT EXISTS otp_rate_limit (
  phone         TEXT        PRIMARY KEY,
  last_sent_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed — this table is only accessed via service-role key from the API.
ALTER TABLE otp_rate_limit DISABLE ROW LEVEL SECURITY;
