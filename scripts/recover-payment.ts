// One-off recovery script for a captured Razorpay payment whose order was never
// created because the client navigated away before verify-payment ran.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/recover-payment.ts <razorpay_payment_id> <razorpay_order_id>
//
// Example:
//   npx tsx --env-file=.env.local scripts/recover-payment.ts pay_XXXXXXXXXXXXXXXXXX order_XXXXXXXXXXXXXXXXXX
//
// Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TWILIO_*, VAPID_* from .env.local.
// Fully idempotent — running twice for the same payment ID is safe (returns existing order).

import { createClient } from '@supabase/supabase-js';
import { createOrderFromPayment } from '../lib/orders/createOrderFromPayment';

const RAZORPAY_PAYMENT_ID = process.argv[2];
const RAZORPAY_ORDER_ID   = process.argv[3];

if (!RAZORPAY_PAYMENT_ID || !RAZORPAY_ORDER_ID) {
  console.error('Usage: npx tsx --env-file=.env.local scripts/recover-payment.ts <razorpay_payment_id> <razorpay_order_id>');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  console.log(`\nRecovering payment: ${RAZORPAY_PAYMENT_ID}`);
  console.log(`Razorpay order:     ${RAZORPAY_ORDER_ID}\n`);

  // Merchant: Hotel Hari Om Restaurant
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('id, store_name')
    .ilike('store_name', '%hari om%')
    .single();

  if (merchantError || !merchant) {
    console.error('Could not find Hotel Hari Om Restaurant:', merchantError?.message);
    process.exit(1);
  }
  console.log(`Merchant: ${merchant.store_name} (${merchant.id})`);

  // Product: Puri Bhaji
  const { data: product, error: productError } = await supabase
    .from('vm_products')
    .select('id, name, selling_price')
    .eq('merchant_id', merchant.id)
    .ilike('name', '%puri%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Could not find Puri Bhaji product:', productError?.message);
    process.exit(1);
  }
  console.log(`Product: ${product.name} @ Rs.${product.selling_price} (${product.id})`);

  // Customer: Abulais
  const { data: vmUser } = await supabase
    .from('vm_users')
    .select('id, name, phone, address, area')
    .ilike('name', '%abulais%')
    .limit(1)
    .maybeSingle();

  if (!vmUser?.phone) {
    console.error('Could not find Abulais in vm_users.');
    console.error('Set RECOVERY_CUSTOMER_PHONE and RECOVERY_CUSTOMER_ADDRESS env vars and edit this script.');
    process.exit(1);
  }
  console.log(`Customer: ${vmUser.name} (${vmUser.phone})\n`);

  const result = await createOrderFromPayment(
    RAZORPAY_ORDER_ID!,
    RAZORPAY_PAYMENT_ID!,
    '', // client HMAC signature not available for recovery
    {
      items: [{ id: product.id, quantity: 4 }], // Puri Bhaji 4pcs
      customer: {
        id:       vmUser.id,
        name:     vmUser.name,
        phone:    vmUser.phone,
        address:  vmUser.address ?? '',
        landmark: null,
        area:     vmUser.area ?? null,
      },
      merchantId: merchant.id,
      offerId:    null,
    },
    'recovery',
  );

  if (result.created) {
    console.log(`\nOrder created: ${result.orderId}`);
    console.log('WhatsApp alerts fired to admin, merchant, and customer.');
    console.log('View: https://zupr.in/admin/orders');
  } else {
    console.log(`\nOrder already existed: ${result.orderId}`);
    console.log('No duplicate created.');
  }
}

main().catch(err => {
  console.error('\nRecovery failed:', err);
  process.exit(1);
});
