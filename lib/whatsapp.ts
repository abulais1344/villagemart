export const statusMessages: Record<string, (name: string, orderShortId: string, storeName?: string, total?: number) => string> = {
  pending: (name, id) =>
    `🛒 Hi ${name}! Your order #${id} has been placed on Zupr. We'll confirm it shortly!\n\n_Zupr - Ardhapur_ 🏠`,

  confirmed: (name, id, storeName) =>
    `✅ Great news ${name}! Your order #${id} has been confirmed.\n\n🍽️ ${storeName || 'The restaurant'} is now preparing your food.\n\n_Zupr - Ardhapur_ 🏠`,

  preparing: (name, id, storeName) =>
    `👨‍🍳 ${name}, your food is being prepared!\n\n🍽️ ${storeName || 'The restaurant'} is cooking your order #${id}. Hang tight!\n\n_Zupr - Ardhapur_ 🏠`,

  ready: (name, id) =>
    `📦 ${name}, your order #${id} is packed and ready!\n\nOur delivery partner will pick it up shortly.\n\n_Zupr - Ardhapur_ 🏠`,

  out_for_delivery: (name, id, _storeName, total) =>
    `🛵 On the way, ${name}!\n\nYour order #${id} is out for delivery. Expected arrival in 20-30 mins.\n\n💰 Total: ₹${total || ''}\n\nPlease be available at your address! 😊\n\n_Zupr - Ardhapur_ 🏠`,

  delivered: (name, id, storeName) =>
    `🎉 Delivered, ${name}!\n\nYour order #${id} from ${storeName || 'Zupr'} has arrived. Enjoy your meal! 😊\n\nOrder again anytime 👉 zupr.in\n\n_Zupr - Ardhapur_ 🏠`,

  cancelled: (name, id) =>
    `❌ Hi ${name}, your order #${id} has been cancelled.\n\nSorry for the inconvenience. For any queries, reach us on WhatsApp.\n\n_Zupr - Ardhapur_ 🏠`,
};

export async function sendWhatsAppNotification(
  toPhone: string,
  status: string,
  name: string,
  orderShortId: string,
  storeName?: string,
  total?: number,
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM;

  const template = statusMessages[status];
  if (!template) return;
  const message = template(name, orderShortId, storeName, total);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from!,
        To:   `whatsapp:+91${toPhone}`,
        Body: message,
      }),
    }
  );
  return response.json();
}

export async function sendRiderPickupAlert(
  riderPhone: string,
  params: {
    storeName: string;
    orderShortId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    items: Array<{ name: string; quantity: number }>;
  },
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM;

  const itemsList = params.items
    .map(i => `  • ${i.name} x${i.quantity}`)
    .join('\n');

  const message = [
    '🛵 *Order Ready for Pickup!*',
    '',
    `Order #${params.orderShortId}`,
    `🍽️ Restaurant: ${params.storeName}`,
    '',
    `📋 Items:\n${itemsList}`,
    '',
    `👤 Customer: ${params.customerName}`,
    `📞 Phone: ${params.customerPhone}`,
    `🏠 Deliver to: ${params.deliveryAddress}`,
    '',
    '_Zupr - Ardhapur_ 🏠',
  ].join('\n');

  const rawPhone = String(riderPhone).replace(/\D/g, '');
  const e164 = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from!,
        To:   `whatsapp:+${e164}`,
        Body: message,
      }),
    }
  );
  return response.json();
}
