import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AlertDialog, { type AlertTone } from '../components/AlertDialog';
import { AuthShell, Field, GoogleButton, PasswordInput } from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { friendlyAuthError, useAuthText } from '../i18n/auth';
import { API_URL } from '../services/api';
import { roleRedirect } from '../utils/roleRedirect';

type LocationState = { from?: string; message?: string };

export default function Login() {
  const { language } = usePreferences();
  const t = useAuthText(language);
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const oauthError = new URLSearchParams(location.search).get('oauthError');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState<{ tone: AlertTone; message: string } | null>(() => {
    if (oauthError) return { tone: 'error', message: oauthError };
    if (locationState?.message) return { tone: 'warning', message: locationState.message };
    return null;
  });

  if (user) return <Navigate to={locationState?.from || roleRedirect(user.role)} replace />;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setAlert({ tone: 'warning', message: t.invalidEmail });
    if (!password) return setAlert({ tone: 'warning', message: t.passwordRequired });
    try {
      const signedInUser = await login(email.trim(), password);
      navigate(locationState?.from || roleRedirect(signedInUser.role), { replace: true });
    } catch (issue) {
      setAlert({ tone: 'error', message: friendlyAuthError(issue instanceof Error ? issue.message : '', t) || t.invalidCredentials });
    }
  };

  return (
    <AuthShell
      title={t.loginTitle}
      subtitle={t.loginSubtitle}
      footer={<span>{t.noAccount} <Link to="/register" state={location.state}>{t.createAccount}</Link></span>}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <GoogleButton label={t.google} href={`${API_URL}/auth/google`} />
        <div className="or">{t.or}</div>
        <Field label={t.email} required>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder={t.emailPlaceholder} required />
        </Field>
        <Field label={t.password} required>
          <PasswordInput value={password} onChange={setPassword} placeholder={t.passwordPlaceholder} autoComplete="current-password" showLabel={t.show} hideLabel={t.hide} />
        </Field>
        <Link className="auth-forgot" to="/forgot-password" state={location.state}>{t.forgot}</Link>
        <button className="button auth-submit" disabled={isLoading}>
          {isLoading ? t.signingIn : <>{t.signIn} <ArrowRight aria-hidden="true" /></>}
        </button>
      </form>
      {alert && <AlertDialog tone={alert.tone} title={alert.tone === 'error' ? t.failed : alert.tone === 'success' ? t.success : t.warning} message={alert.message} action={t.okay} onClose={() => setAlert(null)} />}
    </AuthShell>
  );
}
