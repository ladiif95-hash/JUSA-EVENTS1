import { Globe } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { useSiteText } from '../i18n/site';
import ThemeSwitch from './ThemeSwitch';

// Compact language (EN/SO) + light/dark control.
export default function PreferencesBar({ className = '' }: { className?: string }) {
  const { language, setLanguage } = usePreferences();
  const t = useSiteText();
  return (
    <div className={`prefs-bar ${className}`}>
      <div className="prefs-lang" role="group" aria-label={t.nav.language}>
        <Globe aria-hidden="true" />
        {(['en', 'so'] as const).map((code) => (
          <button key={code} type="button" className={language === code ? 'active' : ''} aria-pressed={language === code} onClick={() => setLanguage(code)}>
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      <span className="prefs-divider" aria-hidden="true" />
      <ThemeSwitch />
    </div>
  );
}
