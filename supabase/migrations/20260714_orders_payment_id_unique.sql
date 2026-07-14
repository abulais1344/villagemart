-- Partial unique index on razorpay_payment_id.
-- Prevents duplicate order creation even under concurrent webhook + verify-payment races.
-- Partial (WHERE razorpay_payment_id IS NOT NULL) so non-Razorpay orders (parcel, etc.) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_id_unique
  ON orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;
