import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, CalendarDays, CalendarPlus, CheckCircle2, ChevronRight, ClipboardList, Clock3, FileSpreadsheet, MapPin, Plus, QrCode, UserPlus, Users, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mapSeminar, seminarService, type DashboardData } from '../services/seminar.service';
import type { Seminar } from '../types/seminar.types';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { formatCampusDate, formatCampusTime } from '../utils/campus';

type SeminarStat = NonNullable<DashboardData['seminarStats']>[number];

const statusTone: Record<string, string> = { PUBLISHED: 'ok', REGISTERED: 'ok', DRAFT: 'muted', COMPLETED: 'info', CANCELLED: 'danger', WAITLISTED: 'warn', ARCHIVED: 'muted' };
const semesterLabel = (value: string) => (/^\d+$/.test(value) ? `Semester ${value}` : value);
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function timeAgo(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of steps) if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  return 'just now';
}

const quickActions = [
  { to: '/admin/seminars/new', label: 'Create seminar', hint: 'Publish a new event', Icon: CalendarPlus },
  { to: '/admin/check-in', label: 'Check in attendees', hint: 'Scan QR passes at the door', Icon: QrCode },
  { to: '/admin/voting', label: 'Start a vote', hint: 'Let students choose the next topic', Icon: Vote },
  { to: '/admin/reports', label: 'Reports & exports', hint: 'Attendance and Excel downloads', Icon: FileSpreadsheet },
  { to: '/admin/users', label: 'Manage team', hint: 'Staff and administrator accounts', Icon: UserPlus },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Seminar[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([seminarService.adminList(), seminarService.dashboard()])
      .then(([seminarsRes, dashRes]) => { setItems(seminarsRes.data.map(mapSeminar)); setData(dashRes.data); })
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load dashboard data.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Older API builds don't send seminarStats; derive them from the seminar list instead.
  const stats: SeminarStat[] = useMemo(() => data?.seminarStats ?? items.slice(0, 8).map((item) => ({
    id: item.id, title: item.title, slug: item.slug, venue: item.venue, capacity: item.capacity, status: item.status || 'PUBLISHED',
    startDateTime: item.startDateTime || '', endDateTime: item.endDateTime || '', registered: item.reserved || 0, waitlisted: item.waitlisted || 0, checkedIn: 0,
  })), [data, items]);

  if (loading) return <section className="admin-page"><LoadingState /></section>;
  if (error) return <section className="admin-page"><ErrorState message={error} retry={load} /></section>;

  const registrations = data?.registrations ?? 0;
  const attended = data?.attendance ?? 0;
  const capacity = items.reduce((sum, item) => sum + item.capacity, 0);
  const fillRate = percent(registrations, capacity);
  const upcoming = stats.filter((item) => item.startDateTime && new Date(item.startDateTime).getTime() >= Date.now()).slice(0, 4);
  const recent = data?.recentRegistrations ?? [];
  const semesters = (data?.semesterStats || []).slice(0, 3);
  const male = data?.genderStats.find((g) => g.rawGender === 'MALE')?.count ?? 0;
  const female = data?.genderStats.find((g) => g.rawGender === 'FEMALE')?.count ?? 0;
  const firstName = user?.fullName?.split(' ')[0] || 'Admin';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Mogadishu' });

  const kpis = [
    { label: 'Total seminars', value: items.length, note: `${data?.upcomingSeminars ?? 0} upcoming`, Icon: CalendarDays },
    { label: 'Registrations', value: registrations, note: `${fillRate}% of seats filled`, Icon: Users },
    { label: 'Checked in', value: attended, note: `${percent(attended, registrations)}% attendance rate`, Icon: CheckCircle2 },
    { label: 'Waitlisted', value: data?.waitlisted ?? 0, note: `${data?.cancelled ?? 0} cancelled`, Icon: ClipboardList },
  ];

  return (
    <section className="admin-page db">
      <header className="db-head">
        <div>
          <span className="db-date">{today}</span>
          <h1>Welcome back, {firstName}</h1>
          <p>Here is what is happening across JUTSA events today.</p>
        </div>
        <div className="db-head-actions">
          <Link className="button button-outline" to="/admin/check-in"><QrCode aria-hidden="true" />Check-in</Link>
          <Link className="button" to="/admin/seminars/new"><Plus aria-hidden="true" />Create seminar</Link>
        </div>
      </header>

      <div className="db-kpis">
        {kpis.map(({ label, value, note, Icon }) => (
          <article key={label} className="db-kpi">
            <div className="db-kpi-top"><span>{label}</span><i><Icon aria-hidden="true" /></i></div>
            <b>{value.toLocaleString()}</b>
            <small>{note}</small>
          </article>
        ))}
      </div>

      <div className="db-grid">
        <article className="db-card">
          <header className="db-card-head">
            <div><h2>Registrations overview</h2><p>Seats, registrations and check-ins per seminar</p></div>
            <Link className="text-link" to="/admin/reports">Reports <ArrowRight aria-hidden="true" /></Link>
          </header>
          <div className="db-capacity">
            <div><strong>{fillRate}%</strong><span>{registrations.toLocaleString()} of {capacity.toLocaleString()} seats reserved</span></div>
            <div className="db-capacity-bar" role="progressbar" aria-valuenow={fillRate} aria-valuemin={0} aria-valuemax={100} aria-label="Seat capacity"><i style={{ width: `${Math.min(100, fillRate)}%` }} /></div>
          </div>
          {stats.length ? <>
            <ul className="db-legend" aria-hidden="true"><li className="in">Checked in</li><li className="reg">Registered</li><li className="free">Available</li></ul>
            <ul className="db-bars">
              {stats.slice(0, 6).map((item) => {
                const cap = Math.max(item.capacity, item.registered, 1);
                return (
                  <li key={item.id}>
                    <div className="db-bar-label"><Link to={`/admin/seminars/${item.id}/participants`}>{item.title}</Link><span>{item.registered}/{item.capacity}</span></div>
                    <div className="db-bar" title={`${item.checkedIn} checked in · ${item.registered} registered · ${item.capacity} seats`}>
                      <i className="in" style={{ width: `${(item.checkedIn / cap) * 100}%` }} />
                      <i className="reg" style={{ width: `${(Math.max(0, item.registered - item.checkedIn) / cap) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </> : <div className="db-empty"><BarChart3 aria-hidden="true" /><b>No registration data yet</b><span>Charts appear once students start reserving seats.</span></div>}
        </article>

        <article className="db-card">
          <header className="db-card-head"><div><h2>Quick actions</h2><p>Common admin tasks</p></div></header>
          <nav className="db-actions" aria-label="Quick actions">
            {quickActions.map(({ to, label, hint, Icon }) => (
              <Link key={to} to={to}><i><Icon aria-hidden="true" /></i><span><b>{label}</b><small>{hint}</small></span><ChevronRight aria-hidden="true" className="db-chevron" /></Link>
            ))}
          </nav>
        </article>

        <article className="db-card">
          <header className="db-card-head">
            <div><h2>Upcoming seminars</h2><p>The next events on the calendar</p></div>
            <Link className="text-link" to="/admin/seminars">Manage all <ArrowRight aria-hidden="true" /></Link>
          </header>
          {upcoming.length ? (
            <ul className="db-upcoming">
              {upcoming.map((item) => {
                const fill = percent(item.registered, item.capacity);
                return (
                  <li key={item.id}>
                    <span className="db-date-block"><b>{formatCampusDate(item.startDateTime, { day: 'numeric' })}</b><small>{formatCampusDate(item.startDateTime, { month: 'short' })}</small></span>
                    <div className="db-upcoming-main">
                      <Link to={`/admin/seminars/${item.id}/participants`}>{item.title}</Link>
                      <span><Clock3 aria-hidden="true" />{formatCampusTime(item.startDateTime)}<MapPin aria-hidden="true" />{item.venue}</span>
                    </div>
                    <div className="db-upcoming-seats">
                      <span>{item.registered}/{item.capacity}</span>
                      <i><u style={{ width: `${Math.min(100, fill)}%` }} /></i>
                    </div>
                    <span className={`status-pill ${statusTone[item.status] || 'muted'}`}>{item.status.toLowerCase()}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="db-empty"><CalendarDays aria-hidden="true" /><b>No upcoming seminars</b><span>Create an event to open registrations.</span><Link className="button button-sm" to="/admin/seminars/new"><Plus aria-hidden="true" />Create seminar</Link></div>
          )}
        </article>

        <div className="db-stack">
          <article className="db-card">
            <header className="db-card-head"><div><h2>Recent registrations</h2><p>Latest student sign-ups</p></div></header>
            {recent.length ? (
              <ul className="db-recent">
                {recent.map((item) => (
                  <li key={item.id}>
                    <span className="db-avatar">{item.profilePhoto ? <img src={item.profilePhoto} alt="" /> : initials(item.fullName)}</span>
                    <div><b>{item.fullName}</b><small>{item.seminarTitle} · {timeAgo(item.registeredAt)}</small></div>
                    <span className={`status-pill ${statusTone[item.status] || 'muted'}`}>{item.status.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            ) : <div className="db-empty compact"><Users aria-hidden="true" /><span>New registrations will appear here.</span></div>}
          </article>

          <article className="db-card">
            <header className="db-card-head"><div><h2>Audience</h2><p>Who is registering</p></div></header>
            {semesters.length || male || female ? (
              <div className="db-audience">
                <div className="db-gender">
                  <div><small>Male</small><b>{male}</b><span>{percent(male, male + female)}%</span></div>
                  <div><small>Female</small><b>{female}</b><span>{percent(female, male + female)}%</span></div>
                </div>
                {semesters.length > 0 && <ul className="db-semesters">
                  {semesters.map((item) => <li key={item.semester}><span>{semesterLabel(item.semester)}</span><b>{item.count} applicant{item.count === 1 ? '' : 's'} ({item.percentage}%)</b></li>)}
                </ul>}
              </div>
            ) : <div className="db-empty compact"><Users aria-hidden="true" /><span>Demographics appear after the first registrations.</span></div>}
          </article>
        </div>
      </div>
    </section>
  );
}
