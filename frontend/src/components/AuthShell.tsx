import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Eye, EyeOff, Languages, Moon, Settings, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePreferences } from '../context/PreferencesContext';
import { useAuthText } from '../i18n/auth';
import ThemeSwitch from './ThemeSwitch';

export function SettingsMenu() {
  const { theme, language, setLanguage } = usePreferences();
  const t = useAuthText(language);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', escape); };
  }, [open]);

  return (
    <div className="settings-menu" ref={ref}>
      <button type="button" className="settings-trigger" aria-label={t.settings} aria-expanded={open} onClick={() => setOpen(!open)}><Settings /></button>
      {open && (
        <div className="settings-popover" role="menu">
          <small>{t.language}</small>
          {(['en', 'so'] as const).map((code) => (
            <button key={code} type="button" role="menuitemradio" aria-checked={language === code} onClick={() => setLanguage(code)}>
              <Languages aria-hidden="true" /><span>{code === 'en' ? t.english : t.somali}</span>{language === code && <Check className="settings-check" aria-hidden="true" />}
            </button>
          ))}
          <hr />
          <small>{t.appearance}</small>
          <div className="settings-theme-row">
            {theme === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            <span>{theme === 'dark' ? t.dark : t.light}</span>
            <ThemeSwitch />
          </div>
        </div>
      )}
    </div>
  );
}

export function AuthShell({ title, subtitle, children, footer, below, variant = 'default' }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode; below?: ReactNode; variant?: 'default' | 'compact' }) {
  const { language } = usePreferences();
  const t = useAuthText(language);
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <SettingsMenu />
        <Link to="/" className="auth-logo" aria-label="JUTSA Events home">
          <img src="/images/jutsa-logo.svg" alt="" />
          <span><b>JUTSA</b> <em>Events</em></span>
        </Link>
        <div className={`auth-box ${variant}`}>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
        {below}
        <div className="auth-footer">
          {footer}
          <Link to="/about" className="auth-about">{t.about} <b>{t.aboutName}</b></Link>
        </div>
      </div>
    </section>
  );
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="auth-field">
      <span className="auth-label">{label}{required && <i aria-hidden="true">*</i>}</span>
      {children}
      {hint}
    </label>
  );
}

export function PasswordInput({ value, onChange, placeholder, autoComplete, showLabel, hideLabel }: { value: string; onChange: (value: string) => void; placeholder: string; autoComplete: string; showLabel: string; hideLabel: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-input">
      <input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} required />
      <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? hideLabel : showLabel}>{visible ? <EyeOff /> : <Eye />}</button>
    </span>
  );
}

export function GoogleButton({ label, href }: { label: string; href: string }) {
  return (
    <button type="button" className="google-button" onClick={() => window.location.assign(href)}>
      <svg viewBox="0 0 48 48" aria-hidden="true" width="20" height="20">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
