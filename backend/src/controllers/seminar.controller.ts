import type { Request, Response } from 'express';
import { isUuid, one, query, type Row } from '../db';
import { seminarColumns } from '../db/sql';

const PLACEHOLDER = 'https://www.just.edu.so/assets/images/slider3.jpg';

// Seminars with live seat counts in a single query.
export const SEMINAR_WITH_COUNTS = `
  SELECT ${seminarColumns('s')},
    COALESCE(c.registered, 0)::int AS registered,
    COALESCE(c.waitlisted, 0)::int AS waitlisted,
    COALESCE(c.cancelled, 0)::int AS cancelled
  FROM seminars s
  LEFT JOIN (
    SELECT seminar_id,
      count(*) FILTER (WHERE status = 'REGISTERED') AS registered,
      count(*) FILTER (WHERE status = 'WAITLISTED') AS waitlisted,
      count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled
    FROM registrations GROUP BY seminar_id
  ) c ON c.seminar_id = s.id`;

export function withCounts(seminar: Row) {
  return { ...seminar, coverImage: seminar.coverImage || PLACEHOLDER, remainingSeats: Math.max(0, seminar.capacity - (seminar.registered ?? 0)) };
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export async function listSeminars(request: Request, response: Response) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  // "?" in the condition is replaced by the placeholder of the pushed value.
  const add = (sql: string, value?: unknown) => { if (value !== undefined) params.push(value); conditions.push(sql.replace(/\?/g, `$${params.length}`)); };
  const status = String(request.query.status || 'upcoming');
  if (status === 'past') add("(s.status IN ('COMPLETED', 'ARCHIVED') OR (s.start_date_time < now() AND s.status <> 'DRAFT'))");
  else if (status === 'all') add("s.status IN ('PUBLISHED', 'COMPLETED', 'CANCELLED')");
  else add("s.status = 'PUBLISHED' AND s.start_date_time >= now()");
  if (request.query.category && request.query.category !== 'All') add('s.category = ?', String(request.query.category));
  if (request.query.search) add('(s.title ILIKE ? OR s.description ILIKE ? OR s.short_description ILIKE ?)', `%${escapeLike(String(request.query.search))}%`);
  if (request.query.featured === 'true') add('s.featured = true');
  const order = request.query.sort === 'latest' ? 's.created_at DESC' : 's.start_date_time ASC';
  const rows = await query(`${SEMINAR_WITH_COUNTS} WHERE ${conditions.join(' AND ')} ORDER BY ${order}`, params);
  return response.json({ data: rows.map(withCounts) });
}

export async function seminarDetails(request: Request, response: Response) {
  const seminar = await one(`${SEMINAR_WITH_COUNTS} WHERE s.slug = $1`, [String(request.params.slug)]);
  const isStaff = request.user && request.user.role !== 'STUDENT';
  if (!seminar || (seminar.status === 'DRAFT' && !isStaff)) return response.status(404).json({ message: 'Seminar not found' });
  const myRegistration = request.user
    ? await one('SELECT id, status, reference, registered_at FROM registrations WHERE seminar_id = $1 AND user_id = $2', [seminar.id, request.user.id])
    : null;
  return response.json({ data: { ...withCounts(seminar), myRegistration } });
}

// Serves an uploaded poster or speaker photo as a real image; the ?v= version in its URL lets browsers cache it forever.
const imageHandler = (column: 'cover_image' | 'speaker_photo') => async (request: Request, response: Response) => {
  const id = String(request.params.id);
  const row = isUuid(id) ? await one<{ image: string | null }>(`SELECT ${column} AS image FROM seminars WHERE id = $1`, [id]) : null;
  const image = row?.image;
  if (!image) return response.status(404).json({ message: 'Image not found' });
  if (/^https?:\/\//.test(image)) return response.redirect(image);
  const match = image.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (!match) return response.status(404).json({ message: 'Image not found' });
  response.setHeader('Content-Type', match[1]);
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return response.send(Buffer.from(match[2], 'base64'));
};
export const seminarCover = imageHandler('cover_image');
export const seminarSpeakerPhoto = imageHandler('speaker_photo');
