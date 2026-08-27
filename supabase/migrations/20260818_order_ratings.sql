-- Order ratings: one rating per delivered order, admin-visible only.
-- customer_id matches the Firebase UID stored in orders.customer_id.
CREATE TABLE IF NOT EXISTS order_ratings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id text        NOT NULL,
  merchant_id uuid        REFERENCES merchants(id) ON DELETE SET NULL,
  rating      integer     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

-- Service-role bypasses RLS entirely; anon/authenticated must never reach this table.
ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;
-- No permissive policies: only service-role key can read/write.
