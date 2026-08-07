-- Fix: vm_riders Realtime publication + customer read access for live tracking.
--
-- Two separate gaps prevented the customer-side live map from working:
--
-- 1. vm_riders was never added to the supabase_realtime publication, so
--    postgres_changes events for rider location updates were never delivered
--    to the customer's Realtime subscription. All other realtime (e.g. orders)
--    was wired via the Supabase dashboard; vm_riders was missed.
--
-- 2. With RLS enabled on vm_riders, the authenticated customer key had no
--    SELECT policy, so both the initial seed query (supabase.from('vm_riders')...)
--    and any Realtime payload returned empty. The write path was fine because
--    the rider API uses the service-role key which bypasses RLS entirely.

-- ── 1. Realtime publication ───────────────────────────────────────────────────
-- Idempotent: catches the "already member" error if this migration is re-run.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE vm_riders;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ── 2. Customer RLS policy ────────────────────────────────────────────────────
-- Allow an authenticated customer to read a rider's row only while that rider
-- is assigned to one of their own out_for_delivery orders. The set of readable
-- columns is still bounded by the column grants from 20260721 + 20260808.

DO $$
BEGIN
  CREATE POLICY "customers can read rider location for their active delivery"
  ON vm_riders
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT rider_id
      FROM orders
      WHERE customer_id = auth.uid()
        AND status = 'out_for_delivery'
        AND rider_id IS NOT NULL
    )
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ── 3. Re-grant location columns ─────────────────────────────────────────────
-- GRANT is idempotent — safe to run again; ensures the columns are definitely
-- readable by anon + authenticated even if the earlier migration was partially applied.

GRANT SELECT (current_lat, current_lng, location_updated_at) ON vm_riders TO anon, authenticated;
