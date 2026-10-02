import type { Request, Response } from 'express';
import { one } from '../db';
import { cancelRegistration, getQrDataUrl, registerForSeminar, registrationsWithRelations } from '../services/registration.service';
import { escapeHtml, sendEmail } from '../services/email.service';

const appUrl = () => process.env.APP_URL || 'http://localhost:5173';
const publicRegistration = ({ qrToken: _qrToken, qrTokenHash: _qrTokenHash, ...registration }: Record<string, any>) => registration;

export async function register(request: Request, response: Response) {
  const seminarId = String(request.params.id);
  const user = await one('SELECT * FROM users WHERE id = $1', [request.user!.id]);
  if (!user?.fullName || !user.phone || !user.faculty || !user.department || !user.semester || !user.gender) return response.status(422).json({ message: 'Complete your name, phone, faculty, department, class and gender before registering' });
  try {
    const { registration, seminar, waitlistPosition } = await registerForSeminar(seminarId, user.id);
    const title = escapeHtml(seminar.title);
    const confirmed = registration.status === 'REGISTERED';
    void sendEmail({
      userId: user.id, seminarId, recipient: user.email,
      subject: confirmed ? 'Your JUTSA Seminar Registration is Confirmed' : 'You Have Joined the JUTSA Seminar Waitlist',
      title: confirmed ? 'Your seat is reserved' : 'You are on the waitlist',
      body: confirmed ? `Your seat for <b>${title}</b> has been successfully reserved. Please keep your QR pass ready.` : `You are #${waitlistPosition} on the waitlist for <b>${title}</b>.`,
      cta: { label: 'My events', url: `${appUrl()}/my-events` },
    });
    return response.status(201).json({ data: publicRegistration(registration), waitlistPosition });
  } catch (error) {
    return response.status(409).json({ message: error instanceof Error ? error.message : 'Registration failed' });
  }
}

export async function cancel(request: Request, response: Response) {
  try {
    const { registration, promoted, seminar } = await cancelRegistration(String(request.params.id), request.user!.id);
    if (promoted) {
      const student = await one('SELECT email FROM users WHERE id = $1', [promoted.userId]);
      if (student) void sendEmail({ userId: promoted.userId, seminarId: seminar.id, recipient: student.email, subject: 'A seat opened up for you', title: 'You are off the waitlist', body: `A seat became available and is now reserved for you at <b>${escapeHtml(seminar.title)}</b>. Your QR pass is ready.`, cta: { label: 'View my pass', url: `${appUrl()}/my-events` } });
    }
    return response.json({ message: 'Registration cancelled', registration: registration && publicRegistration(registration), promoted });
  } catch (error) {
    return response.status(409).json({ message: error instanceof Error ? error.message : 'Cancellation failed' });
  }
}

export async function myEvents(request: Request, response: Response) {
  const data = await registrationsWithRelations('r.user_id = $1', [request.user!.id], { order: 'r.created_at DESC' });
  return response.json({ data });
}

export async function qrPass(request: Request, response: Response) {
  try {
    const data = await getQrDataUrl(String(request.params.id), request.user!.id);
    return response.json({ dataUrl: data.dataUrl, registration: data.registration, attendance: data.attendance });
  } catch (error) {
    return response.status(404).json({ message: error instanceof Error ? error.message : 'QR unavailable' });
  }
}
