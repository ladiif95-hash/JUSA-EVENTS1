import { Outlet, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import PreferencesBar from '../components/PreferencesBar';

export default function PublicLayout() {
  const { pathname } = useLocation();
  const isAuthScreen = ['/login', '/register', '/forgot-password', '/reset-password', '/oauth/callback', '/complete-profile'].some((path) => pathname.startsWith(path));
  if (isAuthScreen) return <main><Outlet /></main>;
  return (
    <div className="public-shell">
      <Navbar />
      <div className="public-content">
        <PreferencesBar className="prefs-floating" />
        <main><Outlet /></main>
        <Footer />
      </div>
      <BottomNavigation />
    </div>
  );
}
