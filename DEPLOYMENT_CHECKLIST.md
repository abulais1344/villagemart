# Vercel Deployment Checklist

## Environment Variables

Set all of the following in Vercel → Project Settings → Environment Variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, bypasses RLS) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay key ID (public, used in browser) |
| `RAZORPAY_KEY_ID` | Razorpay key ID (server-side) |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (server-only) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token (server-only) |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender number (e.g. `whatsapp:+14155238886`) |
| `WHATSAPP_NOTIFICATIONS_ENABLED` | Set to `true` to enable WhatsApp order notifications |
