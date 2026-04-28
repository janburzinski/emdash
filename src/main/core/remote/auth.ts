import crypto from 'node:crypto';

const TOKEN_BYTES = 24;

/** url-safe base64 (RFC 4648 §5), no padding. */
function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a fresh, url-safe random share token. */
export function generateShareToken(): string {
  return base64url(crypto.randomBytes(TOKEN_BYTES));
}

/** Deterministic SHA-256 hash of the token for DB storage. */
export function hashShareToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  return crypto.timingSafeEqual(aBuf, bBuf);
}
