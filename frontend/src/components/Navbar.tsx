import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, ChevronRight, Compass, Home, Info, LayoutDashboard, LogIn, LogOut, Menu, UserPlus, Vote, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSiteText } from '../i18n/site';
import { roleRedirect } from '../utils/roleRedirect';
import PreferencesBar from './PreferencesBar';

export function Brand() {
  return <Link to="/" className="brand"><img src="/images/jutsa-logo.svg" alt="Jamhuriya University Technology Students Association logo"/><span><b>JUTSA</b><small>TECHNOLOGY STUDENTS ASSOCIATION</small></span></Link>;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const t = useSiteText();
  const close = () => setOpen(false);
  useEffect(close, [pathname]);

  const isTeam = user && user.role !== 'STUDENT';
  const initials = (user?.fullName || '').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const avatar = <span className="nav-avatar">{user?.profilePhoto ? <img src={user.profilePhoto} alt="" /> : initials}</span>;

  return (
    <header className={open ? 'site-header menu-open' : 'site-header'}>
      <div className="nav">
        <div className="sidebar-top">
          <Brand />
          <PreferencesBar className="prefs-mobile" />
          <button className="menu-button" aria-label={t.nav.menu} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
          <span className="nav-label">{t.nav.discover}</span>
          <NavLink end to="/"><Home /> <span>{t.nav.home}</span></NavLink>
          <NavLink to="/seminars"><Compass /> <span>{t.nav.browse}</span></NavLink>
          <NavLink to="/vote"><Vote /> <span>{t.nav.vote}</span></NavLink>
          {user && <NavLink to="/my-events"><CalendarDays /> <span>{t.nav.myEvents}</span></NavLink>}
          <NavLink to="/about"><Info /> <span>{t.nav.about}</span></NavLink>
          {isTeam && <NavLink to={roleRedirect(user.role)} className="nav-admin-link"><LayoutDashboard /> <span>{t.nav.adminPanel}</span></NavLink>}

          <div className="nav-mobile-account">
            {user ? (
              <>
                <Link to="/profile" className="nav-mobile-profile">{avatar}<span><b>{user.fullName}</b><small>{t.nav.roles[user.role] || user.role}</small></span><ChevronRight /></Link>
                <button type="button" className="nav-mobile-logout" onClick={() => { logout(); close(); }}><LogOut />{t.nav.logout}</button>
              </>
            ) : (
              <div className="nav-mobile-guest">
                <Link to="/login" className="button button-outline"><LogIn />{t.nav.signIn}</Link>
                <Link to="/register" className="button"><UserPlus />{t.nav.join}</Link>
              </div>
            )}
          </div>
        </nav>

        <div className={user ? 'sidebar-account signed-in' : 'sidebar-account guest'}>
          {user ? (
            <>
              <Link className="account-identity" to="/profile">
                {avatar}
                <span><b>{user.fullName}</b><small>{t.nav.roles[user.role] || user.role}</small></span>
                <ChevronRight className="account-chevron" />
              </Link>
              <div className="account-actions">
                <Link to="/my-events"><CalendarDays />{t.nav.myEvents}</Link>
                <button type="button" onClick={logout} aria-label={t.nav.logout} title={t.nav.logout}><LogOut /></button>
              </div>
            </>
          ) : (
            <>
              <img src="/images/jutsa-logo.svg" alt="" className="account-guest-logo" />
              <p>{t.nav.joinText}</p>
              <Link to="/register" className="button button-white">{t.nav.join}</Link>
              <Link to="/login" className="login-link">{t.nav.signIn}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
