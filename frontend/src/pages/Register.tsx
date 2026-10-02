import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AlertDialog, { type AlertTone } from '../components/AlertDialog';
import { AuthShell, GoogleButton, PasswordInput } from '../components/AuthShell';
import PhotoUpload from '../components/PhotoUpload';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { friendlyAuthError, useAuthText } from '../i18n/auth';
import { API_URL } from '../services/api';

const countries = [
  { code: '252', name: 'Somalia' },
  { code: '254', name: 'Kenya' },
  { code: '251', name: 'Ethiopia' },
  { code: '253', name: 'Djibouti' },
  { code: '256', name: 'Uganda' },
  { code: '90', name: 'Türkiye' },
] as const;

export default function Register() {
  const { language } = usePreferences();
  const t = useAuthText(language);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', country: '252', phone: '', password: '', confirm: '', photo: '', terms: false });
  const [alert, setAlert] = useState<{ tone: AlertTone; message: string; signIn?: boolean } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string } | null;
  const { register, isLoading } = useAuth();
  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const ready = Boolean(form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.phone.trim() && form.password && form.confirm && form.terms);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return setAlert({ tone: 'warning', message: t.nameRequired });
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setAlert({ tone: 'warning', message: t.invalidEmail });
    if (form.password.length < 8) return setAlert({ tone: 'warning', message: t.passwordShort });
    if (form.password !== form.confirm) return setAlert({ tone: 'warning', message: t.mismatch });
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const phone = `+${form.country} ${form.phone.trim().replace(/^0+/, '')}`;
    try {
      await register(fullName, form.email.trim(), form.password, phone, form.photo || undefined);
      navigate(locationState?.from || '/complete-profile', { replace: true, state: locationState });
    } catch (issue) {
      const message = friendlyAuthError(issue instanceof Error ? issue.message : '', t);
      setAlert({ tone: 'error', message, signIn: message === t.emailTaken });
    }
  };

  const required = (text: string) => `${text} *`;

  return (
    <AuthShell
      variant="compact"
      title={t.registerHeading}
      subtitle={t.registerLead}
      footer={<span>{t.haveAccount} <Link to="/login" state={location.state}>{t.signIn}</Link></span>}
    >
      <form className="auth-form compact-form" onSubmit={submit} noValidate>
        <PhotoUpload value={form.photo} onChange={(photo) => update({ photo })} label={t.uploadPhoto} hint={t.photoHint} changeLabel={t.changePhoto} removeLabel={t.removePhoto} />
        <div className="auth-row keep">
          <input aria-label={t.firstName} value={form.firstName} onChange={(event) => update({ firstName: event.target.value })} autoComplete="given-name" placeholder={required(t.firstName)} required />
          <input aria-label={t.lastName} value={form.lastName} onChange={(event) => update({ lastName: event.target.value })} autoComplete="family-name" placeholder={required(t.lastName)} required />
        </div>
        <input aria-label={t.email} value={form.email} onChange={(event) => update({ email: event.target.value })} type="email" autoComplete="email" placeholder={required(t.email)} required />
        <div className="auth-row phone-row">
          <select aria-label={t.country} value={form.country} onChange={(event) => update({ country: event.target.value })} autoComplete="tel-country-code">
            {countries.map((country) => <option key={country.code} value={country.code}>{country.name} (+{country.code})</option>)}
          </select>
          <span className="phone-input"><em>+{form.country}</em><input aria-label={t.phone} value={form.phone} onChange={(event) => update({ phone: event.target.value })} type="tel" autoComplete="tel-national" inputMode="tel" placeholder={required(t.phone)} required /></span>
        </div>
        <PasswordInput value={form.password} onChange={(password) => update({ password })} placeholder={required(t.password)} autoComplete="new-password" showLabel={t.show} hideLabel={t.hide} />
        <PasswordInput value={form.confirm} onChange={(confirm) => update({ confirm })} placeholder={required(t.confirmPassword)} autoComplete="new-password" showLabel={t.show} hideLabel={t.hide} />
        <label className="auth-terms">
          <input type="checkbox" checked={form.terms} onChange={(event) => update({ terms: event.target.checked })} required />
          <span><b>{t.terms}<i aria-hidden="true">*</i></b><small>{t.termsNote} <Link to="/about">{t.termsLink}</Link></small></span>
        </label>
        <button className="button auth-submit" disabled={isLoading || !ready}>
          {isLoading ? t.signingUp : <>{t.signUp} <ArrowRight aria-hidden="true" /></>}
        </button>
        <div className="or">{t.or}</div>
        <GoogleButton label={t.google} href={`${API_URL}/auth/google`} />
      </form>
      {alert && (
        <AlertDialog
          tone={alert.tone}
          title={alert.tone === 'error' ? t.failed : t.warning}
          message={alert.message}
          action={alert.signIn ? t.signIn : t.okay}
          onClose={() => { const goSignIn = alert.signIn; setAlert(null); if (goSignIn) navigate('/login', { state: location.state }); }}
        />
      )}
    </AuthShell>
  );
}
