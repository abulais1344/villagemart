interface DeliverySlab {
  free_delivery_above: number | null;
  charge: number;
}

/**
 * Returns active delivery slabs.
 *
 * When merchantType is provided, first checks for a category-specific flat-charge row
 * (merchant_type = merchantType). If found, returns it immediately as a single slab with
 * free_delivery_above = null (meaning: apply charge directly, no threshold logic).
 * Callers must handle free_delivery_above === null as a flat charge.
 *
 * Falls through to the standard distance-slab query when no category override is active.
 */
export async function getActiveDeliverySlabs(supabase: any, merchantType?: string | null): Promise<DeliverySlab[]> {
  const now = new Date().toISOString();

  if (merchantType) {
    const { data: typeRow } = await supabase
      .from('delivery_charges')
      .select('charge')
      .eq('merchant_type', merchantType)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .limit(1)
      .maybeSingle();

    if (typeRow) {
      return [{ free_delivery_above: null, charge: typeRow.charge }];
    }
  }

  // Standard distance-based slabs — exclude category-specific rows (merchant_type IS NULL)
  const { data } = await supabase
    .from('delivery_charges')
    .select('free_delivery_above, charge')
    .eq('is_active', true)
    .is('merchant_type', null)
    .not('free_delivery_above', 'is', null)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`);
  return (data ?? []) as DeliverySlab[];
}
