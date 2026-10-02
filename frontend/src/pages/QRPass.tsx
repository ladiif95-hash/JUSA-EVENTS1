import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EventTicket from '../components/EventTicket';
import { seminarService } from '../services/seminar.service';
import { formatCampusDate, formatCampusTime } from '../utils/campus';

type PassData = {
  dataUrl: string;
  registration: {
    reference?: string;
    seminarId?: { title?: string; venue?: string; startDateTime?: string; endDateTime?: string };
    userId?: { fullName?: string };
  };
};

function formatDate(value?: string) {
  if (!value) return 'To be confirmed';
  return formatCampusDate(value, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(start?: string) {
  return start ? formatCampusTime(start) : 'TBC';
}

export default function QRPass() {
  const { registrationId } = useParams();
  const [pass, setPass] = useState<PassData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!registrationId) return;
    seminarService.qr(registrationId).then(setPass).catch((issue) => setError(issue instanceof Error ? issue.message : 'QR pass is unavailable'));
  }, [registrationId]);

  if (error) {
    return (
      <section className="page container">
        <h1>QR pass unavailable</h1>
        <div className="status-bar status-bar-fail">{error}</div>
        <Link to="/my-events" className="text-link">Back to my events</Link>
      </section>
    );
  }
  if (!pass) return <section className="page container"><h1>Loading your ticket…</h1></section>;

  const seminar = pass.registration.seminarId;

  return (
    <section className="page container ticket-page">
      <EventTicket
        ticket={{
          title: seminar?.title || 'JUTSA Event',
          date: formatDate(seminar?.startDateTime),
          time: formatTime(seminar?.startDateTime),
          venue: seminar?.venue || 'JUST campus',
          attendee: pass.registration.userId?.fullName || 'JUTSA Student',
          dataUrl: pass.dataUrl,
        }}
      />
      <Link to="/my-events" className="text-link">Back to my events</Link>
    </section>
  );
}
