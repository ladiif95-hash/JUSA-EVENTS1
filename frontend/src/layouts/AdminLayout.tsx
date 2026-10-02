import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Crown, ExternalLink, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, QrCode, Settings, Users, Vote, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeSwitch from '../components/ThemeSwitch';

const overviewLinks = [['dashboard', 'Dashboard', LayoutDashboard], ['seminars', 'Seminars', CalendarDays], ['voting', 'Voting', Vote], ['users', 'Users', Users]] as const;
const operationsLinks = [['check-in', 'Check-in', QrCode], ['reports', 'Reports', BarChart3], ['settings', 'Settings', Settings]] as const;
type AdminLink = typeof overviewLinks[number] | typeof operationsLinks[number];

const roleLabels: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrator', STAFF: 'Staff Member' };
const COLLAPSE_KEY = 'jutsa_sidebar_collapsed';

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const close = () => setOpen(false);
  useEffect(close, [pathname]);
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* preference only */ } }, [collapsed]);

  const isStaff = user?.role === 'STAFF';
  const visibleOverview = overviewLinks.filter(([to]) => to !== 'users' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN');
  const current = [...overviewLinks, ...operationsLinks].find(([to]) => pathname.startsWith(`/admin/${to}`));
  const renderLink = ([to, label, Icon]: AdminLink) => <NavLink end={to === 'dashboard'} to={to} key={to} data-tooltip={label}><Icon aria-hidden="true" /><span>{label}</span></NavLink>;
  const initials = (user?.fullName || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const avatar = user?.profilePhoto ? <img src={user.profilePhoto} alt="" /> : initials;

  return (
    <div className={collapsed ? 'admin-layout collapsed' : 'admin-layout'}>
      {open && <button className="admin-overlay" aria-label="Close menu" onClick={close} />}
      <aside className={open ? 'admin-sidebar open' : 'admin-sidebar'}>
        <button className="admin-close" aria-label="Close menu" onClick={close}><X /></button>
        <div className="admin-brand">
          <img src="/images/jutsa-logo.svg" alt="JUTSA logo" />
          <div><b>JUTSA EVENTS</b><small>JUST ADMIN PORTAL</small></div>
        </div>
        <nav aria-label="Admin navigation">
          {!isStaff && <>
            <p className="admin-nav-label">OVERVIEW</p>
            {visibleOverview.map(renderLink)}
          </>}
          <p className="admin-nav-label">EVENT OPERATIONS</p>
          {isStaff ? renderLink(operationsLinks[0]) : operationsLinks.map(renderLink)}
          <p className="admin-nav-label">WEBSITE</p>
          <Link to="/" className="admin-site-link" data-tooltip="View public site"><ExternalLink aria-hidden="true" /><span>View public site</span></Link>
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-user">
            <span className={user?.role === 'SUPER_ADMIN' ? 'is-super' : ''}>{user?.role === 'SUPER_ADMIN' && !user?.profilePhoto ? <Crown aria-hidden="true" /> : avatar}</span>
            <div>
              <b>{user?.fullName || 'Administrator'}</b>
              <small>{roleLabels[user?.role || ''] || 'Team member'}</small>
            </div>
          </div>
          <button onClick={logout} data-tooltip="Logout"><LogOut aria-hidden="true" /><span>Logout</span></button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu" aria-label="Open admin navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu /></button>
          <button className="admin-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
          <div className="admin-topbar-title">
            <img src="/images/jutsa-logo.svg" alt="" />
            <span><small>Admin</small><b>{current?.[1] || 'Admin'}</b></span>
          </div>
          <div className="admin-topbar-right">
            <ThemeSwitch />
            <Link to="/admin/settings" className="admin-user-chip">
              <span>{avatar}</span>
              <div><b>{user?.fullName || 'Administrator'}</b><small>{roleLabels[user?.role || ''] || 'Team member'}</small></div>
            </Link>
          </div>
        </header>
        <main className="admin-content"><Outlet /></main>
      </div>
    </div>
  );
}
