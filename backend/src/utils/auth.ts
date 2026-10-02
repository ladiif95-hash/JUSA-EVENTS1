import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export type TokenUser = { id: string; role: 'STUDENT' | 'ADMIN' | 'STAFF' | 'SUPER_ADMIN' };
export const hashToken = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const createQrToken = () => crypto.randomBytes(32).toString('base64url');
// A missing secret in production would let anyone forge admin tokens, so refuse to sign or verify.
function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) throw new Error('JWT_SECRET must be set to at least 32 characters in production');
  return secret || 'development-only-change-me';
}
export const signToken = (user: TokenUser) => jwt.sign({ id: user.id, role: user.role }, jwtSecret(), { expiresIn: '7d' });
export const verifyToken = (token: string) => jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] }) as TokenUser;
