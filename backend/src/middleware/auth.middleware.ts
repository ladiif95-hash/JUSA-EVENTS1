import type { NextFunction, Request, Response } from 'express';
import { isUuid, one } from '../db';
import { verifyToken, type TokenUser } from '../utils/auth';

declare global { namespace Express { interface Request { user?: TokenUser; } } }

// Resolve the token against the database so suspensions, deletions and role changes apply immediately.
async function currentUser(token: string): Promise<TokenUser | null> {
  const payload = verifyToken(token);
  if (!isUuid(payload.id)) return null;
  const user = await one<{ id: string; role: TokenUser['role']; status: string }>('SELECT id, role, status FROM users WHERE id = $1', [payload.id]);
  if (!user || user.status === 'SUSPENDED') return null;
  return { id: user.id, role: user.role };
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.header('Authorization')?.replace('Bearer ', '');
  if (!token) return response.status(401).json({ message: 'Authentication required' });
  let user: TokenUser | null;
  try { user = await currentUser(token); } catch { return response.status(401).json({ message: 'Invalid or expired token' }); }
  if (!user) return response.status(401).json({ message: 'Your account is unavailable. Please sign in again.' });
  request.user = user;
  next();
}
export async function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const token = request.header('Authorization')?.replace('Bearer ', '');
    if (token) request.user = (await currentUser(token)) ?? undefined;
  } catch { /* guests can still view live results */ }
  next();
}
export const requireRole = (...roles: TokenUser['role'][]) => (request: Request, response: Response, next: NextFunction) => {
  if (!request.user) return response.status(401).json({ message: 'Authentication required' });
  if (request.user.role === 'SUPER_ADMIN' || roles.includes(request.user.role)) return next();
  return response.status(403).json({ message: 'Insufficient permissions' });
};
