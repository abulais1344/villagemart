import { createHmac, timingSafeEqual } from 'crypto';

const TTL_SECONDS = 3600; // tokens valid for 1 hour

function secret(): string {
  return process.env.MERCHANT_ACTION_SECRET ?? 'dev-secret-change-me';
}

/**
 * Generates a short-lived HMAC-signed token that authorises a single
 * accept/reject action on a specific order.  Embed in FCM data payloads;
 * validate server-side in /api/merchant/order-action.
 *
 * Format: {orderId}|{action}|{expUnix}|{sha256Hex}
 */
export function generateOrderActionToken(
  orderId: string,
  action: 'accept' | 'reject',
): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${orderId}|${action}|${exp}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}|${sig}`;
}

export function verifyOrderActionToken(
  token: string,
): { orderId: string; action: 'accept' | 'reject' } | null {
  try {
    const parts = token.split('|');
    if (parts.length !== 4) return null;
    const [orderId, action, expStr, sig] = parts;
    if (action !== 'accept' && action !== 'reject') return null;
    const exp = parseInt(expStr, 10);
    if (isNaN(exp) || Math.floor(Date.now() / 1000) > exp) return null;
    const payload = `${orderId}|${action}|${expStr}`;
    const expected = createHmac('sha256', secret()).update(payload).digest('hex');
    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(sig, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    return { orderId, action };
  } catch {
    return null;
  }
}
