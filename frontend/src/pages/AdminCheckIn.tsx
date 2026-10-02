import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertTriangle, BadgeCheck, Camera, CheckCircle2, Clock3, KeyRound, Loader2, QrCode, RotateCcw, ShieldCheck, X, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { formatCampusTime } from '../utils/campus';

type ScanResult = {
  alreadyCheckedIn?: boolean;
  attendance: { status: string; checkedInAt?: string };
  student: { fullName: string; email: string; phone?: string; faculty?: string; department?: string; semester?: string; gender?: string; profilePhoto?: string };
  seminar: { title: string; venue?: string };
  registration: { reference?: string; status?: string };
};

const genderLabel = (value?: string) => (value === 'MALE' ? 'Male' : value === 'FEMALE' ? 'Female' : value === 'OTHER' ? 'Other' : '—');
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export default function AdminCheckIn() {
  const [qrToken, setQrToken] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const scanner = useRef<Html5Qrcode | null>(null);
  const cameraWanted = useRef(false);
  const busyRef = useRef(false);

  const stopCamera = async () => {
    cameraWanted.current = false;
    const active = scanner.current;
    scanner.current = null;
    setCameraOpen(false);
    if (active?.isScanning) await active.stop().catch(() => undefined);
    try { active?.clear(); } catch { /* already cleared */ }
  };

  const verifyTicket = async (rawValue: string) => {
    const value = rawValue.trim();
    // A ref, not state: the camera callback keeps the closure from when scanning started.
    if (!value || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await api<{ data: ScanResult }>('/admin/check-in/qr', { method: 'POST', body: JSON.stringify({ qrToken: value }) });
      setResult(response.data);
      setQrToken('');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'This QR pass could not be verified.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const startCamera = async () => {
    setError('');
    setResult(null);
    cameraWanted.current = true;
    setCameraOpen(true);
    window.setTimeout(async () => {
      try {
        const reader = new Html5Qrcode('jusa-qr-reader');
        scanner.current = reader;
        await reader.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          async (decodedText) => {
            await stopCamera();
            void verifyTicket(decodedText);
          },
          () => undefined,
        );
        // Stop was pressed (or the page left) while the camera was still starting.
        if (!cameraWanted.current) { await reader.stop().catch(() => undefined); try { reader.clear(); } catch { /* noop */ } }
      } catch {
        cameraWanted.current = false;
        setCameraOpen(false);
        setError('Unable to open the camera. Allow camera access, or paste the QR token instead.');
      }
    }, 0);
  };

  useEffect(() => () => { void stopCamera(); }, []);

  const reset = () => { setResult(null); setError(''); setQrToken(''); };
  const checkedInAt = formatCampusTime(result?.attendance?.checkedInAt);

  return (
    <section className="admin-page">
      <div className="admin-title">
        <div>
          <span className="eyebrow">EVENT ATTENDANCE</span>
          <h1>Check in attendee</h1>
          <p className="admin-lead">Scan the student QR pass or paste its code. A valid ticket records attendance and shows the registration profile.</p>
        </div>
      </div>

      <div className="checkin-layout">
        <article className="checkin-card">
          <header className="checkin-card-head">
            <span className="checkin-badge"><QrCode aria-hidden="true" /></span>
            <div><span className="eyebrow">CHECK-IN</span><h2>Scan a pass</h2></div>
          </header>

          {cameraOpen ? (
            <div className="qr-scanner-wrap">
              <div id="jusa-qr-reader" className="qr-scanner" />
              <p className="qr-scanner-hint">Point the camera at the student’s QR pass</p>
              <button type="button" className="scan-camera-stop" onClick={() => void stopCamera()}><X aria-hidden="true" />Stop camera</button>
            </div>
          ) : (
            <button type="button" className="button scan-primary" onClick={() => void startCamera()} disabled={busy}>
              <Camera aria-hidden="true" /><span>Scan with camera</span>
            </button>
          )}

          <div className="scan-divider"><span>or enter code manually</span></div>

          <form className="scan-manual" onSubmit={(event) => { event.preventDefault(); void verifyTicket(qrToken); }}>
            <label>
              QR token
              <span className="token-input"><KeyRound aria-hidden="true" /><input value={qrToken} onChange={(event) => setQrToken(event.target.value)} placeholder="Paste QR token…" autoComplete="off" spellCheck={false} /></span>
            </label>
            <button className="button button-outline scan-verify" disabled={busy || !qrToken.trim()}>{busy ? 'Checking…' : 'Verify ticket'}</button>
          </form>
        </article>

        <article className={`ticket-card ${result ? (result.alreadyCheckedIn ? 'is-warn' : 'is-ok') : error ? 'is-error' : busy ? 'is-busy' : 'is-empty'}`} aria-live="polite">
          {busy ? (
            <div className="ticket-state">
              <span className="ticket-state-icon busy"><Loader2 aria-hidden="true" /></span>
              <h2>Verifying ticket…</h2>
              <p>Checking the pass against the registration list.</p>
            </div>
          ) : error ? (
            <div className="ticket-state">
              <span className="ticket-state-icon error"><XCircle aria-hidden="true" /></span>
              <h2>Invalid ticket</h2>
              <p>{error}</p>
              <button type="button" className="button ticket-retry" onClick={reset}><RotateCcw aria-hidden="true" />Try again</button>
            </div>
          ) : result ? (
            <div className="ticket-verified">
              <div className={`ticket-banner ${result.alreadyCheckedIn ? 'warn' : 'ok'}`}>
                {result.alreadyCheckedIn ? <AlertTriangle aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}
                <b>{result.alreadyCheckedIn ? 'Already checked in' : 'Ticket verified'}</b>
              </div>
              <div className="ticket-person">
                {result.student.profilePhoto ? <img src={result.student.profilePhoto} alt="" /> : <span className="ticket-initials">{initials(result.student.fullName)}</span>}
                <h2>{result.student.fullName}</h2>
                {result.registration.reference && <p className="ticket-id">Ticket ID: <b>{result.registration.reference}</b></p>}
                <p className="ticket-seminar">{result.seminar.title}{result.seminar.venue ? ` · ${result.seminar.venue}` : ''}</p>
              </div>
              <dl className="ticket-details">
                <div><dt>Faculty</dt><dd>{result.student.faculty || '—'}</dd></div>
                <div><dt>Department</dt><dd>{result.student.department || '—'}</dd></div>
                <div><dt>Class</dt><dd>{result.student.semester ? `Semester ${result.student.semester}` : '—'}</dd></div>
                <div><dt>Gender</dt><dd>{genderLabel(result.student.gender)}</dd></div>
                <div><dt>Phone</dt><dd>{result.student.phone || '—'}</dd></div>
                <div><dt>Email</dt><dd>{result.student.email || '—'}</dd></div>
              </dl>
              <div className="ticket-footer">
                <span className={`checked-badge ${result.alreadyCheckedIn ? 'warn' : ''}`}>
                  {result.alreadyCheckedIn ? <Clock3 aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  {result.alreadyCheckedIn ? `Present since ${checkedInAt || 'earlier'}` : `Checked in${checkedInAt ? ` · ${checkedInAt}` : ''}`}
                </span>
                <button type="button" className="text-link" onClick={() => void startCamera()}>Scan next <Camera aria-hidden="true" /></button>
              </div>
            </div>
          ) : (
            <div className="ticket-state">
              <span className="ticket-state-icon waiting"><ShieldCheck aria-hidden="true" /></span>
              <h2>Waiting for a ticket</h2>
              <p>Scan a student QR pass to display their registration information here.</p>
              <button type="button" className="ticket-hint" onClick={() => void startCamera()}><QrCode aria-hidden="true" />Scan QR to continue</button>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
