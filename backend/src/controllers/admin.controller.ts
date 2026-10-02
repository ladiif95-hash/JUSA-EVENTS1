import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { count, isUniqueViolation, isUuid, one, query, transaction, updateSet, type Db, type Row } from '../db';
import { createQrToken, hashToken } from '../utils/auth';
import { registrationsWithRelations } from '../services/registration.service';
import { SEMINAR_WITH_COUNTS, withCounts } from './seminar.controller';
import { isOwnImageUrl, seminarColumns } from '../db/sql';

// Never persist secrets or large uploads in the audit trail.
const auditMetadata = (body: unknown) => {
  if (!body || typeof body !== 'object') return body ?? null;
  const { password, passwordHash, coverImage, ...rest } = body as Record<string, unknown>;
  return { ...rest, ...(password || passwordHash ? { password: '[redacted]' } : {}), ...(coverImage ? { coverImage: '[image]' } : {}) };
};
const audit = (request: Request, action: string, entityType: string, entityId: string) =>
  query('INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)', [request.user!.id, action, entityType, entityId, JSON.stringify(auditMetadata(request.body))]);

const USER_COLUMNS = 'id, full_name, email, phone, faculty, department, semester, gender, role, status, auth_provider, created_at, updated_at';

function extractQrToken(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.searchParams.get('token') || url.searchParams.get('qr') || value;
  } catch {
    const prefixed = value.match(/^JUSA1:(.+)$/i);
    return prefixed?.[1] || value;
  }
}

function studentPayload(user: Row | null) {
  return {
    fullName: user?.fullName || 'JUTSA Student',
    email: user?.email || '',
    phone: user?.phone || '',
    faculty: user?.faculty || '',
    department: user?.department || '',
    semester: user?.semester || '',
    gender: user?.gender || '',
    profilePhoto: user?.profilePhoto || '',
  };
}

const withPercentages = <T extends { count: number }>(rows: T[]) => {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return { total, rows: rows.map((row) => ({ ...row, percentage: total > 0 ? Math.round((row.count / total) * 100) : 0 })) };
};

export async function dashboard(_request: Request, response: Response) {
  const totals = await one(`
    SELECT (SELECT count(*) FROM seminars)::int AS total_seminars,
           (SELECT count(*) FROM seminars WHERE status = 'PUBLISHED' AND start_date_time > now())::int AS upcoming_seminars,
           (SELECT count(*) FROM registrations WHERE status = 'REGISTERED')::int AS registrations,
           (SELECT count(*) FROM registrations WHERE status = 'WAITLISTED')::int AS waitlisted,
           (SELECT count(*) FROM registrations WHERE status = 'CANCELLED')::int AS cancelled,
           (SELECT count(*) FROM attendance WHERE status = 'CHECKED_IN')::int AS attendance`);

  // Demographics come from active registrations; before anyone registers, fall back to student profiles.
  const breakdown = async (column: 'semester' | 'gender', empty: string) => {
    const fromRegistrations = await query<{ label: string; count: number }>(
      `SELECT COALESCE(NULLIF(u.${column}, ''), '${empty}') AS label, count(*)::int AS count
       FROM registrations r JOIN users u ON u.id = r.user_id
       WHERE r.status IN ('REGISTERED', 'WAITLISTED') GROUP BY 1 ORDER BY 2 DESC`);
    if (fromRegistrations.length) return fromRegistrations;
    return query<{ label: string; count: number }>(
      `SELECT ${column} AS label, count(*)::int AS count FROM users
       WHERE role = 'STUDENT' AND ${column} IS NOT NULL AND ${column} <> '' GROUP BY 1 ORDER BY 2 DESC`);
  };
  const semesters = withPercentages(await breakdown('semester', 'Unspecified'));
  const genders = withPercentages(await breakdown('gender', 'OTHER'));

  // Per-seminar seat and attendance figures for the registrations chart and the upcoming list.
  const seminarStats = await query(`
    SELECT s.id, s.title, s.slug, s.venue, s.capacity, s.status, s.start_date_time, s.end_date_time,
      (SELECT count(*) FROM registrations r WHERE r.seminar_id = s.id AND r.status = 'REGISTERED')::int AS registered,
      (SELECT count(*) FROM registrations r WHERE r.seminar_id = s.id AND r.status = 'WAITLISTED')::int AS waitlisted,
      (SELECT count(*) FROM attendance a WHERE a.seminar_id = s.id AND a.status = 'CHECKED_IN')::int AS checked_in
    FROM seminars s WHERE s.status <> 'ARCHIVED'
    ORDER BY (s.start_date_time >= now()) DESC, abs(extract(epoch FROM s.start_date_time - now())) ASC
    LIMIT 8`);
  const recentRegistrations = await query(`
    SELECT r.id, r.status, r.registered_at, u.full_name, u.profile_photo, s.title AS seminar_title, s.slug AS seminar_slug
    FROM registrations r JOIN users u ON u.id = r.user_id JOIN seminars s ON s.id = r.seminar_id
    ORDER BY r.registered_at DESC LIMIT 6`);

  return response.json({
    data: {
      totalSeminars: totals!.totalSeminars,
      upcomingSeminars: totals!.upcomingSeminars,
      registrations: totals!.registrations,
      attendance: totals!.attendance,
      waitlisted: totals!.waitlisted,
      cancelled: totals!.cancelled,
      semesterStats: semesters.rows.map((row) => ({ semester: row.label, count: row.count, percentage: row.percentage })),
      genderStats: genders.rows.map((row) => ({ gender: row.label === 'MALE' ? 'Male' : row.label === 'FEMALE' ? 'Female' : 'Other', rawGender: row.label, count: row.count, percentage: row.percentage })),
      totalApplicants: semesters.total,
      seminarStats,
      recentRegistrations,
    },
  });
}

export async function listSeminars(_request: Request, response: Response) {
  const rows = await query(`${SEMINAR_WITH_COUNTS} ORDER BY s.start_date_time DESC`);
  return response.json({ data: rows.map(withCounts) });
}

const parseDate = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date');
  return date;
};

async function uniqueSlug(title: string, db: Db, ignoreId?: string) {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'seminar';
  const taken = new Set((await query<{ slug: string }>('SELECT slug FROM seminars WHERE (slug = $1 OR slug LIKE $2) AND ($3::uuid IS NULL OR id <> $3)', [base, `${base}-%`, ignoreId ?? null], db)).map((row) => row.slug));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export async function createSeminar(request: Request, response: Response) {
  const body = request.body;
  const title = String(body.title || '').trim();
  const capacity = Number(body.capacity);
  if (!title || !body.startDateTime || !Number.isInteger(capacity) || capacity < 1) return response.status(400).json({ message: 'Title, start date and a capacity of at least 1 are required' });
  let startDateTime: Date, endDateTime: Date, registrationOpenAt: Date, registrationCloseAt: Date, cancellationCloseAt: Date;
  try {
    startDateTime = parseDate(body.startDateTime)!;
    endDateTime = parseDate(body.endDateTime) ?? new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);
    registrationOpenAt = parseDate(body.registrationOpenAt) ?? new Date();
    registrationCloseAt = parseDate(body.registrationCloseAt) ?? startDateTime;
    cancellationCloseAt = parseDate(body.cancellationCloseAt) ?? startDateTime;
  } catch {
    return response.status(400).json({ message: 'One of the dates is invalid' });
  }
  if (endDateTime <= startDateTime) return response.status(400).json({ message: 'The end time must be after the start time' });
  const description = String(body.description || body.shortDescription || title);
  const seminar = await transaction(async (db) => one(
    `INSERT INTO seminars (title, slug, short_description, description, cover_image, category, speaker, speaker_position, organizer, venue,
       start_date_time, end_date_time, capacity, registration_open_at, registration_close_at, cancellation_close_at, waitlist_enabled, featured, status, created_by, speaker_photo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING ${seminarColumns('seminars')}`,
    [title, await uniqueSlug(String(body.slug || title), db), String(body.shortDescription || description).slice(0, 220), description, body.coverImage || null,
      body.category || 'Education', body.speaker || 'JUTSA', body.speakerPosition || 'Guest speaker', body.organizer || 'JUTSA', body.venue || 'JUST Main Campus',
      startDateTime, endDateTime, capacity, registrationOpenAt, registrationCloseAt, cancellationCloseAt, body.waitlistEnabled !== false, Boolean(body.featured),
      body.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED', request.user!.id, body.speakerPhoto || null],
    db,
  ));
  await audit(request, 'CREATE', 'SEMINAR', seminar!.id);
  return response.status(201).json({ data: seminar });
}

// Promote the oldest waitlisted registrations while seats are free.
async function fillFromWaitlist(db: Db, seminar: Row) {
  const free = seminar.capacity - await count("SELECT count(*) FROM registrations WHERE seminar_id = $1 AND status = 'REGISTERED'", [seminar.id], db);
  if (free <= 0 || seminar.status !== 'PUBLISHED') return;
  const waiting = await query("SELECT id, user_id FROM registrations WHERE seminar_id = $1 AND status = 'WAITLISTED' ORDER BY registered_at ASC LIMIT $2 FOR UPDATE", [seminar.id, free], db);
  for (const registration of waiting) {
    const token = createQrToken();
    await db.query("UPDATE registrations SET status = 'REGISTERED', promoted_from_waitlist_at = now(), qr_token = $2, qr_token_hash = $3, updated_at = now() WHERE id = $1", [registration.id, token, hashToken(token)]);
    await db.query("INSERT INTO attendance (seminar_id, user_id, registration_id) VALUES ($1, $2, $3) ON CONFLICT (registration_id) DO NOTHING", [seminar.id, registration.userId, registration.id]);
  }
}

export async function updateSeminar(request: Request, response: Response) {
  const id = String(request.params.id);
  if (!isUuid(id)) return response.status(404).json({ message: 'Seminar not found' });
  const body = request.body;
  const patch: Row = {};
  for (const key of ['title', 'shortDescription', 'description', 'category', 'speaker', 'speakerPosition', 'organizer', 'venue']) {
    if (typeof body[key] === 'string' && body[key].trim()) patch[key] = body[key].trim();
  }
  if (patch.shortDescription) patch.shortDescription = String(patch.shortDescription).slice(0, 220);
  for (const key of ['coverImage', 'speakerPhoto']) {
    if (key in body && !isOwnImageUrl(body[key])) patch[key] = body[key] || null;
  }
  for (const key of ['waitlistEnabled', 'reminderEnabled', 'featured']) if (typeof body[key] === 'boolean') patch[key] = body[key];
  if (['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(body.status)) patch.status = body.status;
  if (body.capacity !== undefined) {
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) return response.status(400).json({ message: 'Capacity must be at least 1' });
    patch.capacity = capacity;
  }
  try {
    for (const key of ['startDateTime', 'endDateTime', 'registrationOpenAt', 'registrationCloseAt', 'cancellationCloseAt']) patch[key] = parseDate(body[key]);
  } catch {
    return response.status(400).json({ message: 'One of the dates is invalid' });
  }
  const seminar = await transaction(async (db) => {
    const current = await one('SELECT * FROM seminars WHERE id = $1 FOR UPDATE', [id], db);
    if (!current) return null;
    // When the event is rescheduled without explicit deadlines, move the deadlines that followed the old start time.
    if (patch.startDateTime && !patch.registrationCloseAt && +current.registrationCloseAt === +current.startDateTime) patch.registrationCloseAt = patch.startDateTime;
    if (patch.startDateTime && !patch.cancellationCloseAt && +current.cancellationCloseAt === +current.startDateTime) patch.cancellationCloseAt = patch.startDateTime;
    const { sql, values } = updateSet(patch, 2);
    const updated = await one(`UPDATE seminars SET ${sql} WHERE id = $1 RETURNING ${seminarColumns('seminars')}`, [id, ...values], db);
    if (+updated!.endDateTime <= +updated!.startDateTime) throw new RangeError('The end time must be after the start time');
    await fillFromWaitlist(db, updated!);
    return updated;
  }).catch((error) => { if (error instanceof RangeError) return error; throw error; });
  if (seminar instanceof RangeError) return response.status(400).json({ message: seminar.message });
  if (!seminar) return response.status(404).json({ message: 'Seminar not found' });
  await audit(request, 'UPDATE', 'SEMINAR', seminar.id);
  return response.json({ data: seminar });
}

const PARTICIPANT_USER_FIELDS = 'id, full_name, email, phone, faculty, department, semester, gender, profile_photo';

export async function participants(request: Request, response: Response) {
  const id = String(request.params.id);
  if (!isUuid(id)) return response.json({ data: [] });
  const status = request.query.status ? String(request.query.status) : null;
  const data = await registrationsWithRelations(status ? 'r.seminar_id = $1 AND r.status = $2' : 'r.seminar_id = $1', status ? [id, status] : [id], { userFields: PARTICIPANT_USER_FIELDS });
  return response.json({ data });
}

export async function checkIn(request: Request, response: Response) {
  const qrToken = extractQrToken(String(request.body.qrToken || ''));
  if (!qrToken) return response.status(400).json({ message: 'QR token is required' });
  const seminarFilter = isUuid(request.body.seminarId) ? request.body.seminarId : null;
  const registration = await one(
    "SELECT * FROM registrations WHERE qr_token_hash = $1 AND status = 'REGISTERED' AND ($2::uuid IS NULL OR seminar_id = $2)",
    [hashToken(qrToken), seminarFilter],
  );
  if (!registration) return response.status(404).json({ code: 'INVALID_TOKEN', message: 'This QR pass is invalid or expired.' });
  const [user, seminar] = await Promise.all([
    one(`SELECT ${PARTICIPANT_USER_FIELDS} FROM users WHERE id = $1`, [registration.userId]),
    one('SELECT title, venue, start_date_time FROM seminars WHERE id = $1', [registration.seminarId]),
  ]);
  const payload = {
    student: studentPayload(user),
    seminar: { title: seminar?.title || 'JUTSA Seminar', venue: seminar?.venue || '', startDateTime: seminar?.startDateTime },
    registration: { id: registration.id, reference: registration.reference, status: registration.status },
  };
  // The conditional upsert makes simultaneous scans of the same pass record a single check-in.
  const attendance = await one(
    `INSERT INTO attendance (seminar_id, user_id, registration_id, status, checked_in_at, check_in_method, checked_in_by)
     VALUES ($1, $2, $3, 'CHECKED_IN', now(), $4, $5)
     ON CONFLICT (registration_id) DO UPDATE SET status = 'CHECKED_IN', checked_in_at = now(), check_in_method = EXCLUDED.check_in_method, checked_in_by = EXCLUDED.checked_in_by, updated_at = now()
     WHERE attendance.status <> 'CHECKED_IN' RETURNING *`,
    [registration.seminarId, registration.userId, registration.id, request.body.method === 'MANUAL' ? 'MANUAL' : 'QR', request.user!.id],
  );
  if (!attendance) {
    const existing = await one('SELECT * FROM attendance WHERE registration_id = $1', [registration.id]);
    return response.json({ message: 'Already checked in', data: { ...payload, attendance: existing, alreadyCheckedIn: true } });
  }
  await audit(request, 'CHECK_IN', 'REGISTRATION', registration.id);
  return response.json({ message: 'Check-in successful', data: { ...payload, attendance, alreadyCheckedIn: false } });
}

export async function report(request: Request, response: Response) {
  const id = String(request.params.seminarId);
  const seminar = isUuid(id) ? await one(`${SEMINAR_WITH_COUNTS} WHERE s.id = $1`, [id]) : null;
  if (!seminar) return response.status(404).json({ message: 'Seminar not found' });
  const attended = await count("SELECT count(*) FROM attendance WHERE seminar_id = $1 AND status = 'CHECKED_IN'", [id]);
  const { registered, waitlisted, cancelled, capacity } = seminar;
  return response.json({ data: { capacity, registered, waitlisted, cancelled, attended, absent: Math.max(0, registered - attended), attendanceRate: registered ? Number((attended / registered * 100).toFixed(1)) : 0 } });
}

export async function users(request: Request, response: Response) {
  // SUPER_ADMIN manages ADMIN + STAFF; ADMIN manages STAFF only. Students are public users, not managed here.
  const roles = request.user?.role === 'SUPER_ADMIN' ? ['ADMIN', 'STAFF'] : ['STAFF'];
  return response.json({ data: await query(`SELECT ${USER_COLUMNS} FROM users WHERE role = ANY($1) ORDER BY created_at DESC`, [roles]) });
}

export async function createUser(request: Request, response: Response) {
  const fullName = String(request.body.fullName || '').trim();
  const email = String(request.body.email || '').trim().toLowerCase();
  const password = String(request.body.password || '');
  const requestedRole = String(request.body.role || 'STAFF').toUpperCase();
  const role = ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(requestedRole) ? requestedRole : 'STAFF';
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return response.status(400).json({ message: 'Name, valid email and a password of at least 8 characters are required' });
  // ADMIN can only create STAFF; only SUPER_ADMIN can create ADMIN or SUPER_ADMIN.
  if (request.user?.role !== 'SUPER_ADMIN' && role !== 'STAFF') return response.status(403).json({ message: 'Only Super Administrators can create Admin accounts.' });
  let user: Row | null;
  try {
    user = await one(`INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING ${USER_COLUMNS}`, [fullName, email, await bcrypt.hash(password, 12), role]);
  } catch (error) {
    if (isUniqueViolation(error)) return response.status(409).json({ message: 'A user with this email already exists' });
    throw error;
  }
  await audit(request, 'CREATE', 'USER', user!.id);
  return response.status(201).json({ data: user });
}

export async function updateUser(request: Request, response: Response) {
  const userId = String(request.params.id);
  if (userId === request.user!.id) return response.status(400).json({ message: 'You cannot modify your own account here.' });
  const target = isUuid(userId) ? await one('SELECT id, role, status FROM users WHERE id = $1', [userId]) : null;
  if (!target) return response.status(404).json({ message: 'User not found' });
  if ((target.role === 'SUPER_ADMIN' || target.role === 'ADMIN') && request.user?.role !== 'SUPER_ADMIN') return response.status(403).json({ message: 'Only Super Administrators can edit Admin accounts.' });
  const newRole = String(request.body.role || target.role).toUpperCase();
  const newStatus = String(request.body.status || target.status).toUpperCase();
  if (!['STUDENT', 'STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(newRole)) return response.status(400).json({ message: 'Invalid role' });
  if (!['ACTIVE', 'SUSPENDED'].includes(newStatus)) return response.status(400).json({ message: 'Invalid status' });
  // ADMIN may only manage STAFF accounts and may never grant a role above STAFF.
  if (request.user?.role !== 'SUPER_ADMIN') {
    if (target.role !== 'STAFF') return response.status(403).json({ message: 'Admins can only edit Staff accounts.' });
    if (newRole !== 'STAFF') return response.status(403).json({ message: 'Only Super Administrators can change account roles.' });
  }
  const { sql, values } = updateSet({ fullName: request.body.fullName ? String(request.body.fullName).trim() : undefined, role: newRole, status: newStatus }, 2);
  const updated = await one(`UPDATE users SET ${sql} WHERE id = $1 RETURNING ${USER_COLUMNS}`, [userId, ...values]);
  await audit(request, 'UPDATE', 'USER', userId);
  return response.json({ data: updated });
}

export async function deleteUser(request: Request, response: Response) {
  const userId = String(request.params.id);
  if (userId === request.user!.id) return response.status(400).json({ message: 'You cannot delete your own administrator account.' });
  const user = isUuid(userId) ? await one('SELECT id, role FROM users WHERE id = $1', [userId]) : null;
  if (!user) return response.status(404).json({ message: 'User not found' });
  if ((user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && request.user?.role !== 'SUPER_ADMIN') return response.status(403).json({ message: 'Only Super Administrators can delete Administrator or Super Admin accounts.' });
  if (await count('SELECT count(*) FROM registrations WHERE user_id = $1', [userId])) return response.status(409).json({ message: 'This user has event registrations and cannot be deleted.' });
  await query('DELETE FROM users WHERE id = $1', [userId]);
  await audit(request, 'DELETE', 'USER', userId);
  return response.status(204).send();
}

export async function exportParticipants(request: Request, response: Response) {
  const id = String(request.params.id);
  if (!isUuid(id)) return response.status(404).json({ message: 'Seminar not found' });
  const records = await registrationsWithRelations('r.seminar_id = $1', [id], { userFields: PARTICIPANT_USER_FIELDS });
  const rows = records.map((record) => ({
    Name: record.userId?.fullName, Email: record.userId?.email, Phone: record.userId?.phone, Faculty: record.userId?.faculty,
    Department: record.userId?.department, Semester: record.userId?.semester, 'Registration Status': record.status,
    'Registered At': record.registeredAt ? new Date(record.registeredAt).toISOString() : '',
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Participants');
  const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  response.setHeader('Content-Disposition', 'attachment; filename="jusa-participants.xlsx"');
  return response.send(buffer);
}
