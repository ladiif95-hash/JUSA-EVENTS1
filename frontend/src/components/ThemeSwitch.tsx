import { usePreferences } from '../context/PreferencesContext';
import { useAuthText } from '../i18n/auth';

// Animated sun/moon switch; size follows the font-size of `className`.
export default function ThemeSwitch({ className = '', showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { theme, language, toggleTheme } = usePreferences();
  const t = useAuthText(language);
  const dark = theme === 'dark';
  return (
    <label className={`theme-switch ${className}`} title={dark ? t.light : t.dark}>
      {showLabel && <span className="theme-switch-label">{dark ? t.dark : t.light}</span>}
      <span className="theme-switch-wrap">
        <input type="checkbox" role="switch" checked={dark} onChange={toggleTheme} aria-label={t.dark} />
        <span className="theme-switch-icon" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
        </span>
      </span>
    </label>
  );
}
