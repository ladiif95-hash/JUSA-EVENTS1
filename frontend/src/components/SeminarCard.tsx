import { ArrowRight, CalendarDays, Clock3, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Seminar } from '../types/seminar.types';

// Shows the whole poster (never cropped); a blurred copy fills the spare space.
export function PosterFrame({ src, label, className = '' }: { src?: string; label: string; className?: string }) {
  if (!src) return <div className={`poster-frame poster-empty ${className}`} aria-hidden="true">{label}</div>;
  return (
    <div className={`poster-frame ${className}`}>
      <img className="poster-bg" src={src} alt="" aria-hidden="true" />
      <img className="poster-img" src={src} alt="" loading="lazy" />
    </div>
  );
}

export default function SeminarCard({ seminar }: { seminar: Seminar }) {
  const remaining = seminar.remainingSeats ?? seminar.capacity - seminar.reserved;
  return (
    <article className="seminar-card">
      <Link to={`/seminars/${seminar.slug}`} tabIndex={-1} aria-hidden="true"><PosterFrame src={seminar.image} label={seminar.category} /></Link>
      <div className="card-body">
        <span className="pill">{seminar.category}</span>
        <h3><Link to={`/seminars/${seminar.slug}`}>{seminar.title}</Link></h3>
        <div className="event-meta">
          <span><CalendarDays /> {seminar.date}</span>
          <span><Clock3 /> {seminar.time}</span>
          <span><MapPin /> {seminar.venue}</span>
        </div>
        <div className="card-footer">
          <span className={remaining ? 'seats' : 'seats full'}><Users /> {remaining ? `${remaining} seats left` : 'Seminar full'}</span>
          <Link to={`/seminars/${seminar.slug}`} className="text-link">View seminar <ArrowRight /></Link>
        </div>
      </div>
    </article>
  );
}
