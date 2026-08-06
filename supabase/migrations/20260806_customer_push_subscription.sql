-- Push subscription (VAPID/PushManager) for PWA customers.
-- Single JSONB object per user — one active subscription per browser/device.
-- Matches the same column name as vm_riders.push_subscription for consistency.
ALTER TABLE vm_users ADD COLUMN IF NOT EXISTS push_subscription JSONB;
