import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AlertDialog, { type AlertTone } from '../components/AlertDialog';
import { AuthShell, Field, PasswordInput } from '../components/AuthShell';
import { usePreferences } from '../context/PreferencesContext';
import { friendlyAuthError, useAuthText } from '../i18n/auth';
import { api } from '../services/api';

export default function ResetPassword() {
  const { language } = usePreferences();
  const t = useAuthText(language);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ tone: AlertTone; message: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setAlert({ tone: 'warning', message: t.passwordShort });
    if (password !== confirm) return setAlert({ tone: 'warning', message: t.mismatch });
    setSaving(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: params.get('token'), password }) });
      setAlert({ tone: 'success', message: t.passwordUpdated });
    } catch (issue) {
      setAlert({ tone: 'error', message: friendlyAuthError(issue instanceof Error ? issue.message : '', t) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell title={t.resetTitle} subtitle={t.resetSubtitle} footer={<Link to="/login">{t.backToSignIn}</Link>}>
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label={t.password} required>
          <PasswordInput value={password} onChange={setPassword} placeholder={t.newPasswordPlaceholder} autoComplete="new-password" showLabel={t.show} hideLabel={t.hide} />
        </Field>
        <Field label={t.confirmPassword} required>
          <PasswordInput value={confirm} onChange={setConfirm} placeholder={t.confirmPlaceholder} autoComplete="new-password" showLabel={t.show} hideLabel={t.hide} />
        </Field>
        <button className="button auth-submit" disabled={saving || !password || !confirm}>{saving ? t.updating : t.updatePassword}</button>
      </form>
      {alert && <AlertDialog tone={alert.tone} title={alert.tone === 'success' ? t.success : alert.tone === 'error' ? t.failed : t.warning} message={alert.message} action={alert.tone === 'success' ? t.signIn : t.okay} onClose={() => { const done = alert.tone === 'success'; setAlert(null); if (done) navigate('/login'); }} />}
    </AuthShell>
  );
}
