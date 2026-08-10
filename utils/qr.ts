import CryptoJS from 'crypto-js';

const QR_SECRET = process.env.EXPO_PUBLIC_QR_SECRET_KEY ?? '';
const QR_EXPIRY_MS = 48 * 60 * 60 * 1000;
const QR_CLOCK_SKEW_MS = 5 * 60 * 1000;
export const QR_VERSION = 'V2';

export interface ParsedQrPayload {
  checkerId: string;
  tphId: string;
  qty: number;
  timestamp: number;
}

export function buildQrPayload(
  checkerId: string,
  tphId: string,
  quantity: number,
  timestamp: number
): string {
  const unsigned = `${QR_VERSION}|${checkerId}|${tphId}|${quantity}|${timestamp}`;
  const signature = CryptoJS.HmacSHA256(unsigned, QR_SECRET).toString(CryptoJS.enc.Base64url);
  return `${unsigned}|${signature}`;
}

export function verifyQrPayload(payload: string): ParsedQrPayload | null {
  const parts = payload.split('|');
  if (parts.length !== 6 || parts[0] !== QR_VERSION) return null;

  const [, checkerId, tphId, qtyStr, timestampStr, signature] = parts;
  const qty = parseInt(qtyStr, 10);
  const timestamp = parseInt(timestampStr, 10);

  if (!checkerId || !tphId || isNaN(qty) || qty < 0 || isNaN(timestamp)) return null;

  const unsigned = `${QR_VERSION}|${checkerId}|${tphId}|${qty}|${timestamp}`;
  const expected = CryptoJS.HmacSHA256(unsigned, QR_SECRET).toString(CryptoJS.enc.Base64url);
  if (expected !== signature) return null;

  return { checkerId, tphId, qty, timestamp };
}

export function isQrFresh(timestamp: number, now: number = Date.now()): boolean {
  const ageMs = now - timestamp;
  return ageMs >= -QR_CLOCK_SKEW_MS && ageMs <= QR_EXPIRY_MS;
}
