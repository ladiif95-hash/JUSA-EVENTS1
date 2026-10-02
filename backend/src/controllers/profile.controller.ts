import type { Request, Response } from 'express';
import { one, updateSet } from '../db';
import { userResponse } from './auth.controller';

// Photos are resized in the browser; accept only image data URLs or https links of a sane size.
export function profilePhotoError(photo: string) {
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(photo) && !/^https:\/\//.test(photo)) return 'Profile photo must be a PNG, JPG or WEBP image';
  if (photo.length > 400_000) return 'Profile photo is too large. Please choose a smaller image.';
  return null;
}

export async function getProfile(request: Request, response: Response) {
  const user = await one('SELECT * FROM users WHERE id = $1', [request.user!.id]);
  return user ? response.json({ data: userResponse(user) }) : response.status(404).json({ message: 'User not found' });
}

export async function updateProfile(request: Request, response: Response) {
  const allowed = ['fullName', 'phone', 'faculty', 'department', 'semester', 'gender', 'profilePhoto'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in request.body)) continue;
    const value = request.body[key] == null ? '' : String(request.body[key]).trim();
    // Empty values clear a field ("Prefer not to say"), except the required name.
    if (key === 'fullName') { if (value) patch.fullName = value; continue; }
    patch[key] = value || null;
  }
  if (patch.gender && !['MALE', 'FEMALE', 'OTHER'].includes(String(patch.gender))) return response.status(400).json({ message: 'Invalid gender' });
  const photoError = patch.profilePhoto ? profilePhotoError(String(patch.profilePhoto)) : null;
  if (photoError) return response.status(400).json({ message: photoError });
  const { sql, values } = updateSet(patch, 2);
  const user = await one(`UPDATE users SET ${sql} WHERE id = $1 RETURNING *`, [request.user!.id, ...values]);
  return user ? response.json({ data: userResponse(user) }) : response.status(404).json({ message: 'User not found' });
}
