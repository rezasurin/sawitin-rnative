/** Offline fallback only; the server's value comes from `/orgConfig`. */
export const QR_EXPIRY_MS = 48 * 60 * 60 * 1000;
const QR_CLOCK_SKEW_MS = 5 * 60 * 1000;
export const QR_VERSION = 'V3';

export interface ParsedQrPayload {
  checkerId: string;
  tphId: string;
  qty: number;
  timestamp: number;
}

// This only decodes the display fields. The backend verifies the signature,
// approved Checker, quantity, tenant, and one-time use when weighing is saved.
export function parseQrPayload(payload: string): ParsedQrPayload | null {
  const parts = payload.split('|');
  if (parts.length !== 6 || parts[0] !== QR_VERSION) return null;

  const [, checkerId, tphId, qtyStr, timestampStr, signature] = parts;
  const qty = Number(qtyStr);
  const timestamp = Number(timestampStr);

  if (!checkerId || !tphId || !signature || !Number.isSafeInteger(qty) || qty <= 0 || !Number.isSafeInteger(timestamp)) return null;

  return { checkerId, tphId, qty, timestamp };
}

export function isQrFresh(timestamp: number, now: number = Date.now(), expiryMs: number = QR_EXPIRY_MS): boolean {
  const ageMs = now - timestamp;
  return ageMs >= -QR_CLOCK_SKEW_MS && ageMs <= expiryMs;
}
