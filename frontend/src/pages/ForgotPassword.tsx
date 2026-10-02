import { useState } from 'react';
import { Link } from 'react-router-dom';
import AlertDialog, { type AlertTone } from '../components/AlertDialog';
import { AuthShell, Field } from '../components/AuthShell';
import { usePreferences } from '../context/PreferencesContext';
import { friendlyAuthError, useAuthText } from '../i18n/auth';
import { api } from '../services/api';

export default function ForgotPassword() {
  const { language } = usePreferences();
  const t = useAuthText(language);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState<{ tone: AlertTone; message: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setAlert({ tone: 'warning', message: t.invalidEmail });
    setSending(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setAlert({ tone: 'success', message: t.linkSent });
    } catch (issue) {
      setAlert({ tone: 'error', message: friendlyAuthError(issue instanceof Error ? issue.message : '', t) });
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell title={t.forgotTitle} subtitle={t.forgotSubtitle} footer={<Link to="/login">{t.backToSignIn}</Link>}>
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label={t.email} required>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder={t.emailPlaceholder} required />
        </Field>
        <button className="button auth-submit" disabled={sending || !email.trim()}>{sending ? t.sending : t.sendLink}</button>
      </form>
      {alert && <AlertDialog tone={alert.tone} title={alert.tone === 'success' ? t.success : alert.tone === 'error' ? t.failed : t.warning} message={alert.message} action={t.okay} onClose={() => setAlert(null)} />}
    </AuthShell>
  );
}
