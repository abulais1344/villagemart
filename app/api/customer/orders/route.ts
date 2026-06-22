import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Missing phone param' }, { status: 400 });
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Orders fetch error:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const orderList = orders ?? [];

    // Fetch order items — plain select, no join (avoids FK ambiguity)
    let orderItems: any[] = [];
    if (orderList.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderList.map((o: any) => o.id));

      if (itemsError) {
        console.error('Order items fetch error:', itemsError);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }

      orderItems = items ?? [];
    }

    // Step 1: try product_snapshot.merchant_id (stored at checkout time)
    // Step 2: for items where snapshot has no merchant_id, query vm_products by product_id
    const itemsMissingMerchant = orderItems.filter(
      (i: any) => !i.product_snapshot?.merchant_id && i.product_id
    );

    let productMerchantMap: Record<string, string | null> = {};
    if (itemsMissingMerchant.length > 0) {
      const productIds = [
        ...new Set(itemsMissingMerchant.map((i: any) => i.product_id).filter(Boolean)),
      ] as string[];

      const { data: products, error: productsError } = await supabase
        .from('vm_products')
        .select('id, merchant_id')
        .in('id', productIds);

      if (productsError) {
        console.error('vm_products merchant_id fetch error:', productsError);
      } else {
        productMerchantMap = Object.fromEntries(
          products?.map((p: any) => [p.id, p.merchant_id ?? null]) ?? []
        );
      }
    }

    // Collect all unique merchant_ids across every item
    const merchantIds = [
      ...new Set(
        orderItems
          .map((i: any) =>
            i.product_snapshot?.merchant_id ?? productMerchantMap[i.product_id] ?? null
          )
          .filter(Boolean)
      ),
    ] as string[];

    let merchantMap: Record<string, string> = {};
    if (merchantIds.length > 0) {
      const { data: merchants, error: merchantsError } = await supabase
        .from('merchants')
        .select('*')
        .in('id', merchantIds);

      console.log('DEBUG merchants sample:', JSON.stringify(merchants?.[0] ?? null));
      console.log('DEBUG merchantsError:', merchantsError);

      if (merchantsError) {
        console.error('Merchants fetch error:', merchantsError);
      } else {
        merchantMap = Object.fromEntries(
          merchants?.map((m: any) => [
            m.id,
            // try every plausible column name
            m.name ?? m.store_name ?? m.merchant_name ?? m.business_name ?? '',
          ]) ?? []
        );
      }
    }

    const result = orderList.map((o: any) => {
      const items = orderItems.filter((i: any) => i.order_id === o.id);

      // Pick merchant_id from the first item that has one
      const merchantId = items
        .map((i: any) =>
          i.product_snapshot?.merchant_id ?? productMerchantMap[i.product_id] ?? null
        )
        .find(Boolean) ?? null;

      return {
        ...o,
        merchant_name: merchantId ? (merchantMap[merchantId] ?? null) : null,
        items,
      };
    });

    return NextResponse.json({ orders: result });

  } catch (err) {
    console.error('Orders API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
