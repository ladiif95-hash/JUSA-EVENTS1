import { CalendarDays, Compass, Home, UserRound, Vote } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSiteText } from '../i18n/site';

export default function BottomNavigation() {
  const { user } = useAuth();
  const t = useSiteText().bottom;
  if (!user || user.role !== 'STUDENT') return null;
  const links = [['/', t.home, Home], ['/seminars', t.explore, Compass], ['/vote', t.vote, Vote], ['/my-events', t.myEvents, CalendarDays], ['/profile', t.profile, UserRound]] as const;
  return <nav className="bottom-nav" aria-label="Student navigation">{links.map(([to, label, Icon]) => <NavLink end={to === '/'} to={to} key={to}><Icon /><span>{label}</span></NavLink>)}</nav>;
}
