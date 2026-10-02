import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Award, Briefcase, CalendarDays, Cpu, FlaskConical, GraduationCap, HeartPulse, MapPin, Rocket, Search, ShieldCheck, Sparkles, Ticket, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SeminarCard, { PosterFrame } from '../components/SeminarCard';
import { mapSeminar, seminarService } from '../services/seminar.service';
import { categories, type Seminar } from '../types/seminar.types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { useSiteText } from '../i18n/site';
import VotePollCard from '../components/VotePollCard';

const topicIcons: Record<string, typeof Cpu> = { Technology: Cpu, Career: Briefcase, Education: GraduationCap, Entrepreneurship: Rocket, Leadership: Award, Health: HeartPulse, Research: FlaskConical, Community: Users, Other: Sparkles };
const stepIcons = [Search, Ticket, ShieldCheck];
const seatsLeft = (seminar: Seminar) => seminar.remainingSeats ?? Math.max(0, seminar.capacity - seminar.reserved);
const startTime = (seminar: Seminar) => (seminar.startDateTime ? new Date(seminar.startDateTime).getTime() : Number.MAX_SAFE_INTEGER);

export default function Home() {
  const { user } = useAuth();
  const t = useSiteText().home;
  const navigate = useNavigate();
  const [items, setItems] = useState<Seminar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    seminarService.list()
      .then((result) => setItems(result.data.map(mapSeminar)))
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load seminars.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return items
      .filter((seminar) => !seminar.startDateTime || new Date(seminar.startDateTime).getTime() >= now)
      .sort((a, b) => startTime(a) - startTime(b));
  }, [items]);
  const featured = useMemo(() => upcoming.filter((item) => item.featured).concat(upcoming.filter((item) => !item.featured)).slice(0, 3), [upcoming]);
  const next = upcoming[0];
  const openSeats = upcoming.reduce((total, seminar) => total + seatsLeft(seminar), 0);
  const topicCounts = useMemo(() => items.reduce<Record<string, number>>((counts, seminar) => ({ ...counts, [seminar.category]: (counts[seminar.category] || 0) + 1 }), {}), [items]);
  const topicTotal = Object.keys(topicCounts).length;

  const search = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/seminars?q=${encodeURIComponent(value)}` : '/seminars');
  };

  return <>
    <section className="hero home-hero">
      <div className="hero-bg" />
      <div className="container home-hero-grid">
        <div className="hero-content">
          <span className="eyebrow light">JAMHURIYA UNIVERSITY TECHNOLOGY STUDENTS ASSOCIATION</span>
          <h1>{t.titleA}<br /><em>{t.titleB}</em> {t.titleC}</h1>
          <p>{t.lead}</p>
          <form className="hero-search" onSubmit={search} role="search">
            <Search aria-hidden="true" />
            <input aria-label={t.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} />
            <button className="button" type="submit">{t.search}</button>
          </form>
          <div className="hero-actions">
            <Link to="/seminars" className="button">{t.explore} <ArrowRight /></Link>
            {user ? <Link to="/my-events" className="button button-ghost">{t.myEvents}</Link> : <Link to="/register" className="button button-ghost">{t.createAccount}</Link>}
          </div>
        </div>

        <aside className="next-up" aria-label={t.nextUp}>
          {loading ? <div className="next-up-skeleton" aria-busy="true"><i /><i /><i /></div> : next ? <>
            <span className="next-up-label"><Sparkles /> {t.nextUp}</span>
            <Link to={`/seminars/${next.slug}`} className="next-up-media">
              <PosterFrame src={next.image} label={next.category} />
            </Link>
            <span className="pill">{t.topics[next.category] || next.category}</span>
            <h2><Link to={`/seminars/${next.slug}`}>{next.title}</Link></h2>
            <div className="next-up-meta">
              <span><CalendarDays /> {next.date}</span>
              <span><MapPin /> {next.venue}</span>
            </div>
            <div className="next-up-seats">
              <div className="progress"><i style={{ width: `${next.capacity ? Math.min(100, (next.reserved / next.capacity) * 100) : 0}%` }} /></div>
              <small>{seatsLeft(next) ? t.seatsLeft(seatsLeft(next), next.capacity) : t.full}</small>
            </div>
            <Link to={`/seminars/${next.slug}`} className="button button-white">{seatsLeft(next) ? t.reserve : t.view} <ArrowRight /></Link>
          </> : <div className="next-up-empty">
            <CalendarDays />
            <h2>{t.emptyTitle}</h2>
            <p>{t.emptyText}</p>
            <Link to="/vote" className="button button-white">{t.voteCta} <ArrowRight /></Link>
          </div>}
        </aside>
      </div>
    </section>

    {!loading && upcoming.length > 0 && <section className="container home-stats" aria-label="At a glance">
      <div><b>{upcoming.length}</b><span>{t.upcomingStat(upcoming.length)}</span></div>
      <div><b>{openSeats.toLocaleString()}</b><span>{t.seatsStat(openSeats)}</span></div>
      <div><b>{topicTotal}</b><span>{t.topicsStat(topicTotal)}</span></div>
    </section>}

    <section className="section container">
      <div className="section-heading">
        <div><span className="eyebrow">{t.topicsEyebrow}</span><h2>{t.topicsTitle}</h2></div>
      </div>
      <div className="topic-grid">
        {categories.filter((topic) => topic !== 'Other').map((topic) => {
          const Icon = topicIcons[topic] || Sparkles;
          const count = topicCounts[topic] || 0;
          return <Link key={topic} to={`/seminars?category=${encodeURIComponent(topic)}`} className="topic-card">
            <span><Icon /></span>
            <b>{t.topics[topic] || topic}</b>
            <small>{count ? t.seminarCount(count) : t.comingSoon}</small>
          </Link>;
        })}
      </div>
    </section>

    <section className="section container home-featured">
      <div className="section-heading">
        <div><span className="eyebrow">{t.upcomingEyebrow}</span><h2>{t.upcomingTitle}</h2></div>
        <Link className="text-link" to="/seminars">{t.viewAll} <ArrowRight /></Link>
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={load} /> : featured.length ? <div className="card-grid">
        {featured.map((seminar) => <SeminarCard key={seminar.id} seminar={seminar} />)}
      </div> : <EmptyState title={t.emptyUpcomingTitle} message={t.emptyUpcomingText} action={{ to: '/vote', label: t.voteNext }} />}
    </section>

    <section className="section container home-vote"><VotePollCard compact /></section>

    <section className="how-section">
      <div className="container">
        <span className="eyebrow">{t.howEyebrow}</span>
        <h2>{t.howTitle}</h2>
        <div className="steps">
          {t.steps.map(([title, text], index) => {
            const Icon = stepIcons[index];
            return <div key={title}><span>0{index + 1}</span><Icon /><h3>{title}</h3><p>{text}</p></div>;
          })}
        </div>
      </div>
    </section>

    <section className="section container home-about">
      <img src="/images/jutsa-logo.svg" alt="JUTSA logo" />
      <div>
        <span className="eyebrow">{t.aboutEyebrow}</span>
        <h2>{t.aboutTitle}</h2>
        <p>{t.aboutText}</p>
        <Link className="text-link" to="/about">{t.learnMore} <ArrowRight /></Link>
      </div>
    </section>

    <section className="cta-section container">
      <div><span className="eyebrow light">{t.ctaEyebrow}</span><h2>{t.ctaTitleA}<br />{t.ctaTitleB}</h2></div>
      {user ? <Link className="button button-white" to="/seminars">{t.ctaFind} <ArrowRight /></Link> : <Link className="button button-white" to="/register">{t.ctaCreate} <ArrowRight /></Link>}
    </section>
  </>;
}
