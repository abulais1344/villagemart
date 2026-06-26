export const statusMessages: Record<string, string> = {
  pending:          '⏳ Your Zupr order has been placed! We\'ll confirm it shortly.',
  confirmed:        '✅ Your order has been confirmed and is being prepared!',
  preparing:        '👨‍🍳 Your order is being prepared. Hang tight!',
  ready:            '📦 Your order is packed and ready for pickup by our delivery partner!',
  out_for_delivery: '🛵 Your order is on the way! Expected delivery in 20-30 mins.',
  delivered:        '🎉 Your order has been delivered! Enjoy your meal. Thank you for ordering from Zupr!',
  cancelled:        '❌ Your order has been cancelled. If you have any questions, contact us on WhatsApp.',
};

export async function sendWhatsAppNotification(toPhone: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM;

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
