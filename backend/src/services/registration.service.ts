import crypto from 'crypto';
import QRCode from 'qrcode';
import { count, isUuid, one, query, transaction, type Db, type Row } from '../db';
import { createQrToken, hashToken } from '../utils/auth';
import { seminarColumns } from '../db/sql';

function referenceFor(id: string) {
  return `JUTSA-${id.replace(/-/g, '').slice(-8).toUpperCase()}`;
}

async function ensureAttendance(db: Db, registration: Row) {
  await db.query(
    `INSERT INTO attendance (seminar_id, user_id, registration_id) VALUES ($1, $2, $3)
     ON CONFLICT (registration_id) DO UPDATE SET status = 'NOT_CHECKED_IN', checked_in_at = NULL, check_in_method = NULL, checked_in_by = NULL, updated_at = now()`,
    [registration.seminarId, registration.userId, registration.id],
  );
}

export async function registerForSeminar(seminarId: string, userId: string) {
  if (!isUuid(seminarId)) throw new Error('Seminar is not available');
  return transaction(async (db) => {
    // Locking the seminar row serialises seat allocation, so concurrent requests can never overbook.
    const seminar = await one('SELECT * FROM seminars WHERE id = $1 FOR UPDATE', [seminarId], db);
    if (!seminar || seminar.status !== 'PUBLISHED') throw new Error('Seminar is not available');
    const now = new Date();
    if (seminar.registrationOpenAt && seminar.registrationOpenAt > now) throw new Error('Registration is not open yet');
    if (seminar.registrationCloseAt < now) throw new Error('Registration has closed');
    const existing = await one('SELECT * FROM registrations WHERE seminar_id = $1 AND user_id = $2', [seminarId, userId], db);
    if (existing && existing.status !== 'CANCELLED') throw new Error('You already have a registration for this seminar');
    const registered = await count("SELECT count(*) FROM registrations WHERE seminar_id = $1 AND status = 'REGISTERED'", [seminarId], db);
    if (registered >= seminar.capacity && !seminar.waitlistEnabled) throw new Error('Seminar is full');
    const status = registered < seminar.capacity ? 'REGISTERED' : 'WAITLISTED';
    const qrToken = status === 'REGISTERED' ? createQrToken() : null;
    const qrTokenHash = qrToken ? hashToken(qrToken) : null;

    let registration: Row | null;
    if (existing) {
      registration = await one(
        `UPDATE registrations SET status = $2, registered_at = now(), cancelled_at = NULL, promoted_from_waitlist_at = NULL, qr_token = $3, qr_token_hash = $4,
           reference = COALESCE(reference, $5), updated_at = now() WHERE id = $1 RETURNING *`,
        [existing.id, status, qrToken, qrTokenHash, referenceFor(existing.id)],
        db,
      );
    } else {
      const id = crypto.randomUUID();
      registration = await one(
        'INSERT INTO registrations (id, seminar_id, user_id, status, qr_token, qr_token_hash, reference) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [id, seminarId, userId, status, qrToken, qrTokenHash, referenceFor(id)],
        db,
      );
    }
    if (!registration) throw new Error('Unable to create registration');
    if (status === 'REGISTERED') await ensureAttendance(db, registration);
    const waitlistPosition = status === 'WAITLISTED'
      // Compare in SQL: JS Dates drop PostgreSQL's microseconds, which would exclude this row itself.
      ? await count("SELECT count(*) FROM registrations WHERE seminar_id = $1 AND status = 'WAITLISTED' AND registered_at <= (SELECT registered_at FROM registrations WHERE id = $2)", [seminarId, registration.id], db)
      : undefined;
    return { registration, seminar, waitlistPosition };
  });
}

export async function cancelRegistration(idOrSeminarId: string, userId: string) {
  if (!isUuid(idOrSeminarId)) throw new Error('Active registration not found');
  return transaction(async (db) => {
    const found = await one(
      "SELECT seminar_id FROM registrations WHERE user_id = $2 AND status IN ('REGISTERED', 'WAITLISTED') AND (seminar_id = $1 OR id = $1) LIMIT 1",
      [idOrSeminarId, userId],
      db,
    );
    if (!found) throw new Error('Active registration not found');
    const seminar = await one('SELECT * FROM seminars WHERE id = $1 FOR UPDATE', [found.seminarId], db);
    if (!seminar) throw new Error('Seminar not found');
    // Re-read under the seminar lock so a double click cannot cancel twice.
    const registration = await one(
      "SELECT * FROM registrations WHERE user_id = $2 AND seminar_id = $1 AND status IN ('REGISTERED', 'WAITLISTED') FOR UPDATE",
      [seminar.id, userId],
      db,
    );
    if (!registration) throw new Error('Active registration not found');
    if (registration.status === 'REGISTERED' && seminar.cancellationCloseAt && seminar.cancellationCloseAt < new Date()) throw new Error('Cancellation period has ended.');
    const wasRegistered = registration.status === 'REGISTERED';
    const cancelled = await one(
      "UPDATE registrations SET status = 'CANCELLED', cancelled_at = now(), qr_token = NULL, qr_token_hash = NULL, updated_at = now() WHERE id = $1 RETURNING *",
      [registration.id],
      db,
    );
    await db.query('DELETE FROM attendance WHERE registration_id = $1 AND status = $2', [registration.id, 'NOT_CHECKED_IN']);

    let promoted: { userId: string; registrationId: string } | undefined;
    const seatsTaken = await count("SELECT count(*) FROM registrations WHERE seminar_id = $1 AND status = 'REGISTERED'", [seminar.id], db);
    if (wasRegistered && seminar.status === 'PUBLISHED' && seatsTaken < seminar.capacity) {
      const next = await one("SELECT * FROM registrations WHERE seminar_id = $1 AND status = 'WAITLISTED' ORDER BY registered_at ASC LIMIT 1 FOR UPDATE", [seminar.id], db);
      if (next) {
        const token = createQrToken();
        const updated = await one(
          "UPDATE registrations SET status = 'REGISTERED', promoted_from_waitlist_at = now(), qr_token = $2, qr_token_hash = $3, updated_at = now() WHERE id = $1 RETURNING *",
          [next.id, token, hashToken(token)],
          db,
        );
        await ensureAttendance(db, updated!);
        promoted = { userId: next.userId, registrationId: next.id };
      }
    }
    return { registration: cancelled, promoted, seminar };
  });
}

const SEMINAR_FIELDS = seminarColumns('seminars');

// Registrations with their seminar (and optionally user) nested as objects, matching the API shape the frontend expects.
export async function registrationsWithRelations(where: string, params: unknown[], options: { userFields?: string; order?: string } = {}): Promise<Row[]> {
  const userJoin = options.userFields ? `, (SELECT to_jsonb(u) FROM (SELECT ${options.userFields} FROM users WHERE users.id = r.user_id) u) AS user_json` : '';
  const rows = await query(
    `SELECT r.*, (SELECT to_jsonb(s) FROM (SELECT ${SEMINAR_FIELDS} FROM seminars WHERE seminars.id = r.seminar_id) s) AS seminar_json${userJoin}
     FROM registrations r WHERE ${where} ORDER BY ${options.order || 'r.registered_at ASC'}`,
    params,
  );
  return rows.map(({ seminarJson, userJson, qrToken: _qrToken, qrTokenHash: _qrTokenHash, ...registration }) => ({
    ...registration,
    seminarId: seminarJson ?? registration.seminarId,
    ...(options.userFields ? { userId: userJson ?? registration.userId } : {}),
  }));
}

export async function getQrDataUrl(registrationId: string, userId: string) {
  if (!isUuid(registrationId)) throw new Error('QR pass is unavailable');
  const registration = await one('SELECT * FROM registrations WHERE id = $1 AND user_id = $2', [registrationId, userId]);
  if (!registration || registration.status === 'CANCELLED') throw new Error('This Registration Was Cancelled');
  if (registration.status !== 'REGISTERED' || !registration.qrToken) throw new Error('QR pass is unavailable');
  const dataUrl = await QRCode.toDataURL(registration.qrToken, { width: 360, margin: 2, color: { dark: '#087346', light: '#FFFFFFFF' } });
  const [withRelations] = await registrationsWithRelations('r.id = $1', [registration.id], { userFields: 'id, full_name, email' });
  const attendance = await one('SELECT * FROM attendance WHERE registration_id = $1', [registration.id]);
  return { dataUrl, registration: withRelations, attendance };
}

export async function seatCounts(seminarId: string) {
  const row = await one(
    `SELECT count(*) FILTER (WHERE status = 'REGISTERED')::int AS registered,
            count(*) FILTER (WHERE status = 'WAITLISTED')::int AS waitlisted,
            count(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
     FROM registrations WHERE seminar_id = $1`,
    [seminarId],
  );
  return { registered: row?.registered ?? 0, waitlisted: row?.waitlisted ?? 0, cancelled: row?.cancelled ?? 0 };
}
