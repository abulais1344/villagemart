// Returns each admin number as a digits-only string (no leading +).
// Reads ADMIN_WHATSAPP_NUMBERS (comma-separated, e.g. "918856931402,918446222893")
// and falls back to the legacy single-value ADMIN_WHATSAPP_NUMBER.
function adminNumbers(): string[] {
  const raw = process.env.ADMIN_WHATSAPP_NUMBERS ?? process.env.ADMIN_WHATSAPP_NUMBER ?? '';
  return raw
    .split(',')
    .map(n => n.trim().replace(/^\+/, ''))
    .filter(Boolean);
}

// Sends `body` to every configured admin number in parallel.
// Fire-and-forget safe — all errors are logged but never thrown.
export async function sendAdminWhatsApp(body: string): Promise<void> {
  const numbers = adminNumbers();
  if (!numbers.length) return;

  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_WHATSAPP_FROM: from } = process.env;
  if (!sid || !tok || !from) return;

  await Promise.all(
    numbers.map(phone =>
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${sid}:${tok}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: `whatsapp:+${phone}`, Body: body }),
      })
        .then(res => { if (!res.ok) console.error(`[whatsapp] admin send to ${phone} failed:`, res.status); })
        .catch(err => console.error(`[whatsapp] admin send to ${phone} error:`, err))
    )
  );
}

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
  const rawText = await response.text();
  if (!response.ok) {
    console.error('[whatsapp] sendWhatsAppNotification failed', {
      status: response.status,
      phone: toPhone,
      body: rawText,
    });
  }
  try { return JSON.parse(rawText); } catch { return null; }
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
    total?: number;
  },
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM;

  const itemsList = params.items
    .map(i => `  • ${i.name} x${i.quantity}`)
    .join('\n');

  const message = [
    '🛵 *New Delivery Assigned!*',
    '',
    `Order #${params.orderShortId}`,
    `🍽️ Restaurant: ${params.storeName}`,
    '',
    `📋 Items:\n${itemsList}`,
    ...(params.total !== undefined ? [`💰 Order Total: ₹${params.total}`] : []),
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
