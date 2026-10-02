import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, HelpCircle, Hourglass, Info, Lightbulb, MapPin, Ticket, UserRound, Users } from 'lucide-react';
import EventTicket, { type EventTicketData } from '../components/EventTicket';
import Modal from '../components/Modal';
import PhotoUpload from '../components/PhotoUpload';
import { PosterFrame } from '../components/SeminarCard';
import { LoadingState } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/auth.service';
import { mapSeminar, seminarService } from '../services/seminar.service';
import type { Seminar } from '../types/seminar.types';
import { formatCampusDate, formatCampusTime } from '../utils/campus';

type Tab = 'about' | 'speaker' | 'learn' | 'faqs';
const tabs: { id: Tab; label: string; Icon: typeof Info }[] = [
  { id: 'about', label: 'About This Seminar', Icon: Info },
  { id: 'speaker', label: 'Speaker', Icon: UserRound },
  { id: 'learn', label: 'What You Will Learn', Icon: BookOpen },
  { id: 'faqs', label: 'FAQs', Icon: HelpCircle },
];
const highlights = ['Practical steps you can use the same day', 'Live examples tailored for JUST students', 'Time to ask questions and meet the speaker'];
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export default function SeminarDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, setSession } = useAuth();
  const { show } = useToast();
  const [seminar, setSeminar] = useState<Seminar | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('about');
  const [modal, setModal] = useState(false);
  const [myStatus, setMyStatus] = useState<'REGISTERED' | 'WAITLISTED' | null>(null);
  const [ticket, setTicket] = useState<EventTicketData | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    faculty: user?.faculty || '',
    department: user?.department || '',
    semester: user?.semester || '',
    gender: user?.gender || '',
    photo: user?.profilePhoto || '',
  });

  useEffect(() => {
    if (!slug) return;
    seminarService.get(slug)
      .then((response) => {
        const mapped = mapSeminar(response.data);
        setSeminar(mapped);
        const status = mapped.myRegistration?.status;
        if (status === 'REGISTERED' || status === 'WAITLISTED') setMyStatus(status);
        if (status === 'REGISTERED' && mapped.myRegistration?.id) {
          seminarService.qr(mapped.myRegistration.id).then((pass) => {
            setTicket({ title: mapped.title, date: mapped.date, time: mapped.time.split('–')[0].trim(), venue: mapped.venue, attendee: user?.fullName || pass.registration.userId?.fullName || 'JUTSA Student', dataUrl: pass.dataUrl });
          }).catch(() => undefined);
        }
      })
      .catch(() => setSeminar(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <section className="page container"><LoadingState /></section>;
  if (!seminar) return <section className="page container"><h1 className="page-title">Seminar not found</h1><Link className="text-link" to="/seminars">Browse seminars <ArrowRight /></Link></section>;

  const remaining = seminar.remainingSeats ?? seminar.capacity - seminar.reserved;
  const filled = seminar.capacity ? Math.min(100, (seminar.reserved / seminar.capacity) * 100) : 0;
  const closesAt = seminar.registrationCloseAt ? `${formatCampusDate(seminar.registrationCloseAt, { day: 'numeric', month: 'short' })}, ${formatCampusTime(seminar.registrationCloseAt)}` : '';
  const cancelBy = seminar.cancellationCloseAt ? `${formatCampusDate(seminar.cancellationCloseAt, { day: 'numeric', month: 'short' })}, ${formatCampusTime(seminar.cancellationCloseAt)}` : 'the event starts';

  const openReservation = () => {
    if (!user) return navigate('/login', { state: { from: `/seminars/${seminar.slug}` } });
    setModal(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const profile = await authService.updateProfile({ fullName: form.fullName, phone: form.phone, faculty: form.faculty, department: form.department, semester: form.semester, gender: form.gender, profilePhoto: form.photo });
      // Keep the signed-in user (navbar name, photo) in sync with the saved profile.
      const token = localStorage.getItem('jusa_token');
      if (token && profile.data) setSession(token, profile.data);
      const created = await seminarService.register(seminar.id);
      const registrationId = created.data.id || (created.data as { _id?: string })._id;
      const status = created.data.status === 'WAITLISTED' ? 'WAITLISTED' : 'REGISTERED';
      setMyStatus(status);
      setModal(false);
      show(status === 'WAITLISTED' ? 'The seminar is full — you have joined the waitlist.' : 'Your seat is reserved!', status === 'WAITLISTED' ? 'warning' : 'success');
      if (status === 'REGISTERED' && registrationId) {
        const pass = await seminarService.qr(registrationId);
        setTicket({ title: seminar.title, date: seminar.date, time: seminar.time.split('–')[0].trim(), venue: seminar.venue, attendee: form.fullName, dataUrl: pass.dataUrl });
        setTicketOpen(true);
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to reserve your seat');
    }
  };

  const speakerAvatar = seminar.speakerPhoto ? <img src={seminar.speakerPhoto} alt="" /> : <span>{initials(seminar.speaker)}</span>;

  return (
    <section className="page container seminar-detail">
      <div className="sd-hero">
        <div className="sd-hero-text">
          <span className="pill">{seminar.category}</span>
          <h1>{seminar.title}</h1>
          {seminar.shortDescription && <p>{seminar.shortDescription}</p>}
          <div className="sd-chips">
            <span><i><CalendarDays /></i><small>Date</small><b>{seminar.date}</b></span>
            <span><i><Clock3 /></i><small>Time</small><b>{seminar.time}</b></span>
            <span><i><MapPin /></i><small>Venue</small><b>{seminar.venue}</b></span>
          </div>
        </div>
        <PosterFrame src={seminar.image} label={seminar.category} className="sd-poster" />
      </div>

      <div className="sd-grid">
        <article className="sd-tabs-card">
          <div className="sd-tabs" role="tablist" aria-label="Seminar information">
            {tabs.map(({ id, label, Icon }) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon aria-hidden="true" />{label}</button>
            ))}
          </div>
          <div className="sd-panel" role="tabpanel">
            {tab === 'about' && <>
              <h2>About This Seminar</h2>
              {seminar.description.split(/\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              <div className="sd-gets">
                <b><Lightbulb aria-hidden="true" />What you will get</b>
                <ul>{highlights.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" />{item}</li>)}</ul>
              </div>
            </>}
            {tab === 'speaker' && <div className="sd-speaker-full">
              <div className="sd-speaker-photo large">{speakerAvatar}</div>
              <div><small>FEATURED SPEAKER</small><h2>{seminar.speaker}</h2><p>{seminar.speakerPosition}</p></div>
            </div>}
            {tab === 'learn' && <>
              <h2>What You Will Learn</h2>
              <ul className="sd-learn">{highlights.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ul>
            </>}
            {tab === 'faqs' && <div className="sd-faqs">
              <details open><summary>How do I get my ticket?</summary><p>After reserving, your QR pass appears in My Events. Show it at the entrance to check in.</p></details>
              <details><summary>What if the seminar is full?</summary><p>Join the waitlist. When a seat opens you are moved up automatically and your QR pass becomes available.</p></details>
              <details><summary>Can I cancel my registration?</summary><p>Yes, from My Events until {cancelBy}. Your seat is then offered to the next student on the waitlist.</p></details>
              <details><summary>What should I bring?</summary><p>Your QR pass on your phone (or printed) and your student details for check-in.</p></details>
            </div>}
          </div>
        </article>

        <aside className="sd-side">
          <div className="sd-register">
            <div className="sd-register-head">
              <span className="sd-register-icon"><Users aria-hidden="true" /></span>
              <div><small>Registration</small><h2>{remaining ? `${remaining} seats remaining` : 'This seminar is full'}</h2></div>
            </div>
            <div className="sd-progress"><i style={{ width: `${filled}%` }} /></div>
            <p className="sd-progress-label">{seminar.reserved} of {seminar.capacity} seats reserved</p>
            {myStatus === 'REGISTERED' ? (
              <div className="sd-status ok">
                <CheckCircle2 aria-hidden="true" /><div><b>Your seat is reserved!</b><span>Your QR pass is ready.</span></div>
                <button type="button" className="button" onClick={() => (ticket ? setTicketOpen(true) : navigate('/my-events'))}><Ticket aria-hidden="true" />View ticket</button>
              </div>
            ) : myStatus === 'WAITLISTED' ? (
              <div className="sd-status wait">
                <Hourglass aria-hidden="true" /><div><b>You are on the waitlist</b><span>We will move you up automatically when a seat opens.</span></div>
                <Link className="button button-outline" to="/my-events">My events</Link>
              </div>
            ) : (
              <button className="button sd-reserve" onClick={openReservation}><Ticket aria-hidden="true" />{remaining ? 'Reserve My Seat' : 'Join Waitlist'}<ArrowRight aria-hidden="true" /></button>
            )}
            {closesAt && <small className="sd-note"><Clock3 aria-hidden="true" />Registration closes {closesAt} (Somalia time).</small>}
          </div>

          <div className="sd-speaker">
            <div className="sd-speaker-photo">{speakerAvatar}</div>
            <div><small>SPEAKER</small><b>{seminar.speaker}</b><span>{seminar.speakerPosition}</span></div>
          </div>
        </aside>
      </div>

      <div className="sd-facts">
        <div><i><CalendarDays /></i><span><small>Date</small><b>{seminar.date}</b></span></div>
        <div><i><Clock3 /></i><span><small>Time</small><b>{seminar.time}</b></span></div>
        <div><i><MapPin /></i><span><small>Venue</small><b>{seminar.venue}</b></span></div>
        <div><i><Users /></i><span><small>Capacity</small><b>{seminar.capacity} seats</b></span></div>
      </div>

      {modal && (
        <Modal title="Your registration details" onClose={() => setModal(false)}>
          <form className="registration-form" onSubmit={submit}>
            <p className="registration-intro">Review your profile details before reserving a place for <strong>{seminar.title}</strong>.</p>
            <PhotoUpload compact value={form.photo} onChange={(photo) => setForm({ ...form, photo })} label="Upload your image" hint="Shown on your ticket at check-in · PNG or JPG" changeLabel="Change photo" removeLabel="Remove photo" />
            <div className="registration-fields">
              <label>Full name<input required autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
              <label>Email<input required disabled aria-describedby="email-note" value={form.email} /></label>
              <label>Phone number<input required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+252 61 0000000" /></label>
              <label>Faculty<input required value={form.faculty} onChange={(event) => setForm({ ...form, faculty: event.target.value })} /></label>
              <label>Department<input required value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
              <label>Class / semester<input required value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} /></label>
              <label>Gender
                <select required value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
            </div>
            <small id="email-note" className="registration-note">Your email is linked to your account and cannot be changed here.</small>
            {error && <div className="status-bar status-bar-fail" role="alert">{error}</div>}
            <div className="registration-actions">
              <button className="button button-outline" type="button" onClick={() => setModal(false)}>Cancel</button>
              <button className="button" type="submit">Confirm reservation</button>
            </div>
          </form>
        </Modal>
      )}
      {ticketOpen && ticket && (
        <div className="ticket-backdrop" role="presentation">
          <EventTicket ticket={ticket} onClose={() => setTicketOpen(false)} />
        </div>
      )}
    </section>
  );
}
