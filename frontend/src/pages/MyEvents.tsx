import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Info, MapPin, QrCode, Sparkles, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import EventTicket, { type EventTicketData } from '../components/EventTicket';
import Modal from '../components/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { seminarService } from '../services/seminar.service';
import { assetUrl, formatCampusDate, formatCampusTime } from '../utils/campus';

type EventRegistration = {
  id?: string;
  _id?: string;
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';
  attendanceStatus?: string;
  registeredAt?: string;
  seminarId?: {
    id?: string;
    _id?: string;
    title?: string;
    coverImage?: string;
    image?: string;
    venue?: string;
    startDateTime?: string;
    endDateTime?: string;
    category?: string;
    speaker?: string;
  };
};

const titleCase = (value: string) =>
  value.replace('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value?: string) =>
  value ? formatCampusDate(value, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date to be confirmed';

const formatTime = (value?: string) => (value ? formatCampusTime(value) : 'Time to be confirmed');

export default function MyEvents() {
  const { user } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<EventRegistration | null>(null);
  const [busy, setBusy] = useState(false);

  // In-page Ticket Modal State
  const [ticketData, setTicketData] = useState<EventTicketData | null>(null);
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    seminarService
      .myEvents()
      .then((result) => setItems(result.data as EventRegistration[]))
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load your registrations.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // An event is past once it has ended (or started, when no end time is known).
  const isPast = (item: EventRegistration) => { const end = item.seminarId?.endDateTime || item.seminarId?.startDateTime; return end ? new Date(end).getTime() < Date.now() : false; };
  const filtered = items.filter((item) =>
    tab === 'cancelled'
      ? item.status === 'CANCELLED'
      : tab === 'past'
      ? item.status !== 'CANCELLED' && isPast(item)
      : item.status !== 'CANCELLED' && !isPast(item)
  );

  const viewTicketModal = async (registration: EventRegistration) => {
    const regId = registration.id || registration._id || '';
    if (!regId) return;
    if (registration.status === 'WAITLISTED') { show('You are on the waitlist. Your ticket appears here as soon as a seat opens.', 'warning'); return; }
    setLoadingTicketId(regId);
    try {
      const qrRes = await seminarService.qr(regId);
      const sem = registration.seminarId;
      setTicketData({
        title: sem?.title || 'JUTSA Seminar',
        date: formatDate(sem?.startDateTime),
        time: formatTime(sem?.startDateTime),
        venue: sem?.venue || 'JUST Main Campus',
        attendee: user?.fullName || qrRes.registration?.userId?.fullName || 'JUTSA Student',
        dataUrl: qrRes.dataUrl,
      });
    } catch (issue) {
      show(issue instanceof Error ? issue.message : 'Your ticket is not available right now.', 'error');
    } finally {
      setLoadingTicketId(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const targetId = cancelTarget.id || cancelTarget._id || cancelTarget.seminarId?.id || cancelTarget.seminarId?._id || '';
    setBusy(true);
    setError('');
    try {
      await seminarService.cancel(targetId);
      show(`Your reservation for "${cancelTarget.seminarId?.title || 'the seminar'}" was cancelled.`, 'success');
      setCancelTarget(null);
      load();
    } catch (issue) {
      show(issue instanceof Error ? issue.message : 'Unable to cancel this reservation.', 'error');
      setCancelTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page container">
      <span className="eyebrow">YOUR RESERVATIONS &amp; TICKETS</span>
      <h1 className="page-title">My Events</h1>
      <p className="lead">Manage your seminar registrations, access your QR digital tickets, or cancel reservations.</p>

      {successMsg && (
        <div className="status-bar status-bar-ok" role="alert" style={{ marginBottom: 20 }}>
          <CheckCircle2 />
          <div>
            <b>Reservation Cancelled</b>
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="event-tabs" role="tablist">
        {(['upcoming', 'past', 'cancelled'] as const).map((item) => {
          const count = items.filter((i) =>
            item === 'cancelled'
              ? i.status === 'CANCELLED'
              : item === 'past'
              ? i.attendanceStatus === 'CHECKED_IN'
              : i.status !== 'CANCELLED' && i.attendanceStatus !== 'CHECKED_IN'
          ).length;

          return (
            <button
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? 'active' : ''}
              onClick={() => setTab(item)}
              key={item}
            >
              {titleCase(item)} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={load} />
      ) : filtered.length ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map((registration) => {
            const seminar = registration.seminarId;
            const regId = registration.id || registration._id || '';
            const isCancelled = registration.status === 'CANCELLED';
            const isWaitlisted = registration.status === 'WAITLISTED';
            const isCheckedIn = registration.attendanceStatus === 'CHECKED_IN';

            return (
              <article
                className="my-event"
                key={regId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px minmax(0, 1fr) auto',
                  gap: 20,
                  alignItems: 'center',
                  padding: 20,
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                }}
              >
                <img
                  src={
                    assetUrl(seminar?.coverImage || seminar?.image) ||
                    'https://www.just.edu.so/assets/images/slider3.jpg'
                  }
                  alt=""
                  style={{ width: '100%', height: 130, objectFit: 'contain', borderRadius: 10, background: '#EEF0F6' }}
                />

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span
                      className={`pill ${isCancelled ? 'cancelled' : ''}`}
                      style={{
                        background: isCancelled ? '#fee2e2' : isCheckedIn ? '#dbeafe' : isWaitlisted ? '#fef3c7' : '#dcfce7',
                        color: isCancelled ? '#991b1b' : isCheckedIn ? '#1e40af' : isWaitlisted ? '#92400e' : '#166534',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {isCheckedIn ? 'Attended / Checked-in' : isWaitlisted ? 'Waitlisted' : titleCase(registration.status)}
                    </span>
                    {seminar?.category && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>• {seminar.category}</span>
                    )}
                  </div>

                  <h2 style={{ fontSize: 19, margin: '0 0 6px', color: '#111827', fontWeight: 700 }}>
                    {seminar?.title || 'JUTSA Seminar Event'}
                  </h2>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, color: '#4b5563', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CalendarDays style={{ width: 15, color: '#2D368D' }} /> {formatDate(seminar?.startDateTime)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock3 style={{ width: 15, color: '#2D368D' }} /> {formatTime(seminar?.startDateTime)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin style={{ width: 15, color: '#2D368D' }} /> {seminar?.venue || 'JUST Campus'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  {isCancelled ? (
                    <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <XCircle style={{ width: 16 }} /> Cancelled
                    </span>
                  ) : (
                    <>
                      <button
                        className="button"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '8px 16px', fontSize: 13 }}
                        disabled={loadingTicketId === regId}
                        onClick={() => viewTicketModal(registration)}
                      >
                        <QrCode style={{ width: 16 }} />
                        {loadingTicketId === regId ? 'Loading ticket…' : 'View Ticket (QR)'}
                      </button>

                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: '1px solid #fca5a5',
                          borderRadius: 8,
                          color: '#dc2626',
                          padding: '7px 12px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                        }}
                        onClick={() => setCancelTarget(registration)}
                      >
                        <XCircle style={{ width: 15 }} /> Iska celi booska
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={`No ${tab} events`}
          message={tab === 'upcoming' ? 'Browse upcoming JUTSA seminars and reserve a seat.' : 'Your event history will appear here.'}
          action={tab === 'upcoming' ? { to: '/seminars', label: 'Explore seminars' } : undefined}
        />
      )}

      {/* Ticket Modal Popup */}
      {ticketData && (
        <div className="ticket-backdrop" role="presentation">
          <EventTicket ticket={ticketData} onClose={() => setTicketData(null)} />
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <Modal title="Ma hubtaa inaad rabto inaad iska celiso booskaaga?" onClose={() => !busy && setCancelTarget(null)}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', margin: '8px 0 16px' }}>
            <Info style={{ width: 24, color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, color: '#374151', fontSize: 14, lineHeight: 1.6 }}>
                Haddii aad iska celiso booskaaga seminaarka <strong>"{cancelTarget.seminarId?.title}"</strong>, kuraastaada waxay toos u furmi doontaa arday kale oo jaamacadda ah.
              </p>
              <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 13 }}>
                Tigidhkaaga QR-ka ah wuxuu noqon doonaa mid aan shaqeynayn.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
            <button
              className="button button-outline"
              type="button"
              disabled={busy}
              onClick={() => setCancelTarget(null)}
            >
              Maya, hayso booska
            </button>
            <button
              className="button"
              type="button"
              style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
              disabled={busy}
              onClick={confirmCancel}
            >
              <XCircle style={{ width: 16 }} />
              {busy ? 'Waa la kansalayaa…' : 'Haa, iska celi booska'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

