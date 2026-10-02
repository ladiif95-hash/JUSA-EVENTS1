import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { isUniqueViolation, one, type Row } from '../db';
import { sendEmail } from '../services/email.service';
import { profilePhotoError } from './profile.controller';
import { hashToken, signToken } from '../utils/auth';

const appUrl = () => process.env.APP_URL || 'http://localhost:5173';
export const userResponse = (user: Row) => ({ id: user.id, _id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, faculty: user.faculty, department: user.department, semester: user.semester, gender: user.gender, role: user.role, status: user.status, profileComplete: Boolean(user.phone && user.faculty && user.department && user.semester && user.gender), profilePhoto: user.profilePhoto });

export async function register(request: Request, response: Response) {
  const fullName = String(request.body.fullName || '').trim();
  const email = String(request.body.email || '').trim().toLowerCase();
  const phone = String(request.body.phone || '').trim();
  const password = String(request.body.password || '');
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !phone || password.length < 8) return response.status(400).json({ message: 'Name, email, phone number and a password of at least 8 characters are required' });
  const profilePhoto = request.body.profilePhoto ? String(request.body.profilePhoto) : null;
  const photoError = profilePhoto ? profilePhotoError(profilePhoto) : null;
  if (photoError) return response.status(400).json({ message: photoError });
  let user: Row | null;
  try {
    user = await one('INSERT INTO users (full_name, email, phone, password_hash, profile_photo) VALUES ($1, $2, $3, $4, $5) RETURNING *', [fullName, email, phone, await bcrypt.hash(password, 12), profilePhoto]);
  } catch (error) {
    if (isUniqueViolation(error)) return response.status(409).json({ message: 'Email already registered' });
    throw error;
  }
  void sendEmail({ userId: user!.id, recipient: email, subject: 'Welcome to JUTSA Events', title: `Welcome, ${fullName}!`, body: 'You can now discover upcoming seminars, reserve seats and manage your registrations online.', cta: { label: 'Explore Seminars', url: `${appUrl()}/seminars` } });
  return response.status(201).json({ user: userResponse(user!), token: signToken({ id: user!.id, role: user!.role }) });
}

export async function login(request: Request, response: Response) {
  const user = await one('SELECT * FROM users WHERE email = $1', [String(request.body.email || '').trim().toLowerCase()]);
  if (!user?.passwordHash || !(await bcrypt.compare(String(request.body.password || ''), user.passwordHash))) return response.status(401).json({ message: 'Invalid email or password' });
  if (user.status === 'SUSPENDED') return response.status(403).json({ message: 'This account has been suspended. Please contact JUTSA.' });
  return response.json({ user: userResponse(user), token: signToken({ id: user.id, role: user.role }) });
}

export async function me(request: Request, response: Response) {
  const user = await one('SELECT * FROM users WHERE id = $1', [request.user!.id]);
  return user ? response.json({ user: userResponse(user) }) : response.status(404).json({ message: 'User not found' });
}

export async function forgotPassword(request: Request, response: Response) {
  const token = crypto.randomBytes(24).toString('hex');
  const user = await one(
    "UPDATE users SET reset_token_hash = $2, reset_token_expires_at = now() + interval '1 hour', updated_at = now() WHERE email = $1 RETURNING id, email",
    [String(request.body.email || '').trim().toLowerCase(), hashToken(token)],
  );
  if (user) {
    await sendEmail({ userId: user.id, recipient: user.email, subject: 'Reset your JUTSA Events password', title: 'Reset your password', body: 'Use the secure link below to choose a new password. This link expires in one hour.', cta: { label: 'Reset password', url: `${appUrl()}/reset-password?token=${token}` } });
  }
  return response.json({ message: 'If that email exists, a password reset message has been sent.' });
}

export async function resetPassword(request: Request, response: Response) {
  const token = String(request.body.token || '');
  const password = String(request.body.password || '');
  if (password.length < 8) return response.status(400).json({ message: 'Password must be at least 8 characters' });
  const user = await one(
    'UPDATE users SET password_hash = $2, reset_token_hash = NULL, reset_token_expires_at = NULL, updated_at = now() WHERE reset_token_hash = $1 AND reset_token_expires_at > now() RETURNING id',
    [hashToken(token), await bcrypt.hash(password, 12)],
  );
  if (!user) return response.status(400).json({ message: 'Reset link is invalid or expired' });
  return response.json({ message: 'Password updated successfully' });
}

export function googleStart(_request: Request, response: Response) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) return response.status(503).json({ message: 'Google sign-in is not configured' });
  const state = crypto.randomBytes(24).toString('hex');
  response.cookie('jusa_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600000 });
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: process.env.GOOGLE_CALLBACK_URL, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
  return response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function googleCallback(request: Request, response: Response) {
  const fail = (message: string) => response.redirect(`${appUrl()}/login?oauthError=${encodeURIComponent(message)}`);
  if (!request.query.code || !request.query.state || request.query.state !== request.cookies?.jusa_oauth_state) return fail('Google sign-in could not be verified. Please try again.');
  response.clearCookie('jusa_oauth_state');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: String(request.query.code), client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: process.env.GOOGLE_CALLBACK_URL || '', grant_type: 'authorization_code' }) });
  const tokens = await tokenResponse.json() as { access_token?: string };
  if (!tokenResponse.ok || !tokens.access_token) return fail('Google sign-in failed. Please try again.');
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
  if (!profileResponse.ok || !profile.sub || !profile.email || !profile.email_verified) return fail('A verified Google email address is required.');
  const googleEmail = profile.email.toLowerCase();
  let user = await one('SELECT * FROM users WHERE google_id = $1 OR email = $2 ORDER BY (google_id = $1) DESC NULLS LAST LIMIT 1', [profile.sub, googleEmail]);
  if (!user) {
    const fullName = profile.name || googleEmail.split('@')[0];
    user = await one("INSERT INTO users (full_name, email, google_id, profile_photo, auth_provider) VALUES ($1, $2, $3, $4, 'GOOGLE') RETURNING *", [fullName, googleEmail, profile.sub, profile.picture ?? null]);
    void sendEmail({ userId: user!.id, recipient: googleEmail, subject: 'Welcome to JUTSA Events', title: `Welcome, ${fullName}!`, body: 'Your verified Google email is now connected. Complete your profile to start registering for seminars.' });
  } else if (!user.googleId) {
    user = await one("UPDATE users SET google_id = $2, profile_photo = COALESCE(profile_photo, $3), auth_provider = 'GOOGLE', updated_at = now() WHERE id = $1 RETURNING *", [user.id, profile.sub, profile.picture ?? null]);
  }
  if (user!.status === 'SUSPENDED') return fail('This account has been suspended. Please contact JUTSA.');
  return response.redirect(`${appUrl()}/oauth/callback?token=${encodeURIComponent(signToken({ id: user!.id, role: user!.role }))}`);
}
