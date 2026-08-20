import { useState } from 'react';
import { BarChart3, CalendarDays, Crown, LayoutDashboard, LogOut, Menu, QrCode, Settings, Users, Vote, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const overviewLinks = [['dashboard', 'Dashboard', LayoutDashboard], ['seminars', 'Seminars', CalendarDays], ['voting', 'Voting', Vote], ['users', 'Users', Users]] as const;
const operationsLinks = [['check-in', 'Check-in', QrCode], ['reports', 'Reports', BarChart3], ['settings', 'Settings', Settings]] as const;

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const close = () => setOpen(false);
  const renderLink = ([to, label, Icon]: typeof overviewLinks[number] | typeof operationsLinks[number]) => <NavLink end={to === 'dashboard'} to={to} key={to} onClick={close}><Icon/><span>{label}</span></NavLink>;

  const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin (Ugu Weyn)' : user?.role === 'ADMIN' ? 'Administrator' : 'Staff Member';

  return (
    <div className="admin-layout">
      <button className="admin-menu min-[761px]:hidden" aria-label="Open admin navigation" onClick={() => setOpen(true)}><Menu/></button>
      {open && <button className="admin-overlay min-[761px]:hidden" aria-label="Close menu" onClick={close}/>}
      <aside className={open ? 'admin-sidebar open' : 'admin-sidebar'}>
        <button className="admin-close" aria-label="Close menu" onClick={close}><X/></button>
        <div className="admin-brand">
          <img src="/images/jusa-logo.png" alt="JUSA logo" />
          <div><b>JUSA EVENTS</b><small>JUST ADMIN PORTAL</small></div>
        </div>
        <nav aria-label="Admin navigation">
          {user?.role === 'STAFF' ? (
            <>
              <p className="admin-nav-label">EVENT OPERATIONS</p>
              {renderLink(['check-in', 'Check-in', QrCode])}
            </>
          ) : (
            <>
              <p className="admin-nav-label">OVERVIEW</p>
              {overviewLinks.filter(([to]) => to !== 'users' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN').map(renderLink)}
              <p className="admin-nav-label">EVENT OPERATIONS</p>
              {operationsLinks.map(renderLink)}
            </>
          )}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-user">
            <span>{user?.role === 'SUPER_ADMIN' ? <Crown style={{ width: 18, height: 18, color: '#f59e0b' }} /> : user?.fullName.slice(0, 1) || 'A'}</span>
            <div>
              <b>{user?.fullName || 'Administrator'}</b>
              <small style={{ color: user?.role === 'SUPER_ADMIN' ? '#d97706' : undefined, fontWeight: user?.role === 'SUPER_ADMIN' ? 600 : undefined }}>
                {roleLabel}
              </small>
            </div>
          </div>
          <button onClick={logout}><LogOut/>Logout</button>
        </div>
      </aside>
      <main className="admin-content"><Outlet/></main>
    </div>
  );
}
