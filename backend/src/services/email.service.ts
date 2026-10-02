import nodemailer from 'nodemailer';
import { one, query } from '../db';

const smtpPort = Number(process.env.SMTP_PORT || 587);
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: smtpPort, secure: smtpPort === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const template = (title: string, body: string, cta?: { label: string; url: string }) => `<!doctype html><html><body style="margin:0;background:#f7f9fa;font-family:Arial,sans-serif;color:#171717"><main style="max-width:600px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden"><div style="padding:24px;background:#2D368D;color:#fff"><b style="font-size:22px">JUTSA EVENTS</b><div style="font-size:11px;letter-spacing:1px;margin-top:5px">JAMHURIYA UNIVERSITY TECHNOLOGY STUDENTS ASSOCIATION</div></div><div style="padding:30px"><h1 style="font-size:25px">${title}</h1><div style="line-height:1.65;color:#4d5b66">${body}</div>${cta ? `<p><a href="${cta.url}" style="display:inline-block;background:#00A451;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${cta.label}</a></p>` : ''}</div><div style="padding:18px 30px;border-top:1px solid #e5e7eb;color:#667085;font-size:12px">Jamhuriya University Technology Students Association<br/>Jamhuriya University of Science and Technology</div></main></body></html>`;

export { escapeHtml };

// Never throws: email problems are recorded on the notification instead of failing the request.
export async function sendEmail(input: { userId?: string; seminarId?: string; recipient: string; subject: string; title: string; body: string; cta?: { label: string; url: string } }) {
  try {
    const notification = await one<{ id: string }>(
      'INSERT INTO notifications (user_id, seminar_id, recipient, subject, type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [input.userId ?? null, input.seminarId ?? null, input.recipient, input.subject, input.title],
    );
    try {
      if (!mailer) throw new Error('SMTP is not configured');
      await mailer.sendMail({ from: `${process.env.MAIL_FROM_NAME || 'JUTSA'} <${process.env.MAIL_FROM_EMAIL || ''}>`, to: input.recipient, subject: input.subject, html: template(escapeHtml(input.title), input.body, input.cta) });
      await query("UPDATE notifications SET status = 'SENT', sent_at = now(), updated_at = now() WHERE id = $1", [notification!.id]);
    } catch (error) {
      await query("UPDATE notifications SET status = 'FAILED', failed_at = now(), error_message = $2, updated_at = now() WHERE id = $1", [notification!.id, error instanceof Error ? error.message : 'Unknown mail error']);
    }
  } catch (error) {
    console.error('Unable to record email notification', error);
  }
}
