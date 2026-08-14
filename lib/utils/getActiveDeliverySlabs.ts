interface DeliverySlab {
  free_delivery_above: number | null;
  charge: number;
}

export async function getActiveDeliverySlabs(supabase: any): Promise<DeliverySlab[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('delivery_charges')
    .select('free_delivery_above, charge')
    .eq('is_active', true)
    .not('free_delivery_above', 'is', null)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`);
  return (data ?? []) as DeliverySlab[];
}
