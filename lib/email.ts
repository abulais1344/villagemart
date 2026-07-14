import { Resend } from 'resend';

interface OrderEmailData {
  orderId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  deliveryCharge: number;
  discountAmount: number;
  total: number;
  source: string;
}

export async function sendAdminOrderEmail(data: OrderEmailData): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !process.env.RESEND_API_KEY) return;

  const resend = new Resend(process.env.RESEND_API_KEY);

  const shortId = data.orderId.slice(-6).toUpperCase();

  const itemRows = data.items
    .map(i => `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;">${i.name}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;text-align:center;">×${i.quantity}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">₹${(i.unitPrice * i.quantity).toFixed(0)}</td>
    </tr>`)
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;">
      <div style="background:#7C3AED;padding:20px 24px;border-radius:12px 12px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🛒 New Order #${shortId}</h2>
        <p style="color:#ddd6fe;margin:4px 0 0;font-size:13px;">via ${data.source}</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:20px 24px;border-radius:0 0 12px 12px;">

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Merchant</td>
              <td style="padding:4px 0;font-size:13px;font-weight:600;text-align:right;">${data.storeName}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Customer</td>
              <td style="padding:4px 0;font-size:13px;text-align:right;">${data.customerName}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Phone</td>
              <td style="padding:4px 0;font-size:13px;text-align:right;">${data.customerPhone}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Address</td>
              <td style="padding:4px 0;font-size:13px;text-align:right;">${data.deliveryAddress}</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:6px 8px;text-align:left;font-weight:600;">Item</th>
              <th style="padding:6px 8px;text-align:center;font-weight:600;">Qty</th>
              <th style="padding:6px 8px;text-align:right;font-weight:600;">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
          <tr><td style="padding:3px 0;color:#6b7280;">Subtotal</td>
              <td style="text-align:right;">₹${data.subtotal.toFixed(0)}</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;">Delivery</td>
              <td style="text-align:right;">${data.deliveryCharge === 0 ? 'FREE' : `₹${data.deliveryCharge}`}</td></tr>
          ${data.discountAmount > 0 ? `<tr><td style="padding:3px 0;color:#16a34a;">Discount</td>
              <td style="text-align:right;color:#16a34a;">−₹${data.discountAmount}</td></tr>` : ''}
          <tr style="border-top:2px solid #e5e7eb;">
            <td style="padding:6px 0 0;font-weight:700;">Total Paid</td>
            <td style="padding:6px 0 0;text-align:right;font-weight:700;color:#7C3AED;">₹${data.total.toFixed(0)}</td>
          </tr>
        </table>

        <a href="https://zupr.in/admin/orders"
           style="display:block;background:#7C3AED;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View in Admin Panel →
        </a>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'VillageMart Orders <orders@zupr.in>',
    to: adminEmail,
    subject: `🛒 New Order #${shortId} — ${data.storeName} — ₹${data.total.toFixed(0)}`,
    html,
  });
}
