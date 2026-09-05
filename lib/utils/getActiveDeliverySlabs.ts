interface DeliverySlab {
  free_delivery_above: number | null;
  charge: number;
}

/**
 * Returns active delivery slabs for the given merchant type.
 *
 * When merchantType is provided, checks first for a category-specific row
 * (merchant_type = merchantType, exact match). If found, returns it as a
 * single slab — its free_delivery_above and charge are honoured directly,
 * so a subtotal threshold (e.g. free above ₹100) works as expected.
 *
 * Falls through to standard distance slabs (merchant_type IS NULL) when no
 * category override exists, so all other merchant types are unaffected.
 */
export async function getActiveDeliverySlabs(supabase: any, merchantType?: string | null): Promise<DeliverySlab[]> {
  const now = new Date().toISOString();

  if (merchantType) {
    const { data: typeRow } = await supabase
      .from('delivery_charges')
      .select('charge, free_delivery_above')
      .eq('merchant_type', merchantType)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .limit(1)
      .maybeSingle();

    if (typeRow) {
      return [{ free_delivery_above: typeRow.free_delivery_above ?? null, charge: typeRow.charge }];
    }
  }

  // Standard distance-based slabs — exclude category-specific rows so a
  // vegetables row with free_delivery_above set doesn't pollute other merchants.
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
