import { Link } from 'react-router-dom';
import { useSiteText } from '../i18n/site';
import { Brand } from './Navbar';

export default function Footer() {
  const t = useSiteText().footer;
  return (
    <footer>
      <div className="container footer-grid">
        <div><div className="footer-brand"><Brand /></div><p>{t.tagline}</p></div>
        <div><h4>{t.explore}</h4><Link to="/seminars">{t.upcoming}</Link><Link to="/my-events">{t.myEvents}</Link><Link to="/about">{t.about}</Link></div>
        <div><h4>{t.contact}</h4><p>Jamhuriya University of Science & Technology<br />Mogadishu, Somalia</p></div>
      </div>
      <div className="container footer-bottom">© 2026 Jamhuriya University Technology Students Association.</div>
    </footer>
  );
}
