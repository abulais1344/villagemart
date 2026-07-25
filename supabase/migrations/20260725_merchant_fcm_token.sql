-- Add FCM device token column for merchants using the Capacitor Android app.
-- Web Push (push_subscription) continues to work for browser/PWA users.
-- When a merchant has both, FCM takes priority in the notification send path.
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS fcm_token text;
