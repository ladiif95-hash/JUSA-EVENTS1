import { useEffect, useState } from 'react';
import { GraduationCap, Loader2, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import { ErrorState, LoadingState } from '../components/StateViews';
import PhotoUpload from '../components/PhotoUpload';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { facultyDepartments, semesters } from '../data/faculties';
import { authService } from '../services/auth.service';

const roleLabels: Record<string, string> = { STUDENT: 'Student', STAFF: 'Staff', ADMIN: 'Administrator', SUPER_ADMIN: 'Super Admin' };

export default function Profile() {
  const { user, setSession } = useAuth();
  const { show } = useToast();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', faculty: '', department: '', semester: '', gender: '', profilePhoto: '' });
  const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    authService.profile()
      .then(({ data }) => { setForm({ fullName: data.fullName || '', email: data.email || '', phone: data.phone || '', faculty: data.faculty || '', department: data.department || '', semester: data.semester || '', gender: data.gender || '', profilePhoto: data.profilePhoto || '' }); setState('ready'); })
      .catch((issue) => { setError(issue instanceof Error ? issue.message : 'Unable to load your profile.'); setState('error'); });
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const departments = facultyDepartments[form.faculty] || [];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('saving');
    try {
      const { email: _email, ...changes } = form;
      const result = await authService.updateProfile(changes);
      // Refresh the signed-in user so the navbar name and photo update immediately.
      const token = localStorage.getItem('jusa_token');
      if (token && result.data) setSession(token, result.data);
      show('Your profile has been saved.', 'success');
    } catch (issue) {
      show(issue instanceof Error ? issue.message : 'Unable to save your profile.', 'error');
    } finally {
      setState('ready');
    }
  };

  if (state === 'loading') return <section className="page container profile-page"><LoadingState kind="table" /></section>;
  if (state === 'error') return <section className="page container profile-page"><ErrorState message={error} /></section>;

  const complete = Boolean(form.phone && form.faculty && form.department && form.semester && form.gender);
  return (
    <section className="page container profile-page">
      <span className="eyebrow">MY ACCOUNT</span>
      <h1 className="page-title">Profile</h1>
      <p className="lead">Keep your details up to date. They are used for seminar registration and check-in.</p>

      <form className="profile-layout" onSubmit={submit}>
        <aside className="profile-card">
          <PhotoUpload value={form.profilePhoto} onChange={(photo) => set('profilePhoto', photo)} label="Upload your photo" hint="Shown on your ticket at check-in" changeLabel="Change photo" removeLabel="Remove photo" />
          <h2>{form.fullName || 'Your name'}</h2>
          <p><Mail aria-hidden="true" />{form.email}</p>
          <span className="pill">{roleLabels[user?.role || 'STUDENT'] || user?.role}</span>
          <div className={complete ? 'profile-status ok' : 'profile-status'}>
            <ShieldCheck aria-hidden="true" />
            <span>{complete ? 'Profile complete — you can reserve seats.' : 'Complete your academic details to reserve seats.'}</span>
          </div>
        </aside>

        <div className="profile-sections">
          <fieldset className="form-section">
            <legend><UserRound aria-hidden="true" />Personal details</legend>
            <div className="form-grid">
              <label>Full name<input required value={form.fullName} onChange={(event) => set('fullName', event.target.value)} autoComplete="name" /></label>
              <label>Email<input value={form.email} disabled /></label>
              <label>Phone number<input type="tel" value={form.phone} onChange={(event) => set('phone', event.target.value)} placeholder="+252 61 000 0000" autoComplete="tel" /></label>
              <label>Gender
                <select value={form.gender} onChange={(event) => set('gender', event.target.value)}>
                  <option value="">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend><GraduationCap aria-hidden="true" />Academic details</legend>
            <div className="form-grid">
              <label>Faculty
                <select value={form.faculty} onChange={(event) => setForm((current) => ({ ...current, faculty: event.target.value, department: '' }))}>
                  <option value="">Select your faculty</option>
                  {form.faculty && !facultyDepartments[form.faculty] && <option>{form.faculty}</option>}
                  {Object.keys(facultyDepartments).map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>Department
                <select value={form.department} onChange={(event) => set('department', event.target.value)} disabled={!form.faculty}>
                  <option value="">Select your department</option>
                  {form.department && !departments.includes(form.department) && <option>{form.department}</option>}
                  {departments.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>Class / semester
                <select value={form.semester} onChange={(event) => set('semester', event.target.value)}>
                  <option value="">Select class</option>
                  {form.semester && !semesters.includes(form.semester) && <option>{form.semester}</option>}
                  {semesters.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          <div className="form-footer">
            <button className="button" disabled={state === 'saving'}>
              {state === 'saving' ? <><Loader2 className="spin" aria-hidden="true" />Saving…</> : <><Save aria-hidden="true" />Save changes</>}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
