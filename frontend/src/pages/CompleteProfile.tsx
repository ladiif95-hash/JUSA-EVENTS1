import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, SkipForward } from 'lucide-react';
import { authService } from '../services/auth.service';
import { facultyDepartments } from '../data/faculties';

export default function CompleteProfile() {
  const [form, setForm] = useState({ phone: '', faculty: '', department: '', semester: '', gender: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await authService.updateProfile(form);
      navigate(from || '/seminars', { replace: true });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page profile-page container">
      <span className="eyebrow">ONE LAST STEP</span>
      <h1 className="page-title">Complete your profile</h1>
      <p className="lead">
        Your academic details are required for seminar reservations. You can also complete this later.
      </p>

      <form className="profile-form" onSubmit={submit}>
        <label>
          Phone number
          <input
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+252 ..."
          />
        </label>

        <label>
          Gender
          <select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label>
          Faculty
          <select
            required
            value={form.faculty}
            onChange={(e) => setForm({ ...form, faculty: e.target.value, department: '' })}
          >
            <option value="">Select your faculty</option>
            {Object.keys(facultyDepartments).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Department
          <select
            required
            disabled={!form.faculty}
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          >
            <option value="">Select your department</option>
            {(facultyDepartments[form.faculty] || []).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Class / semester
          <select required value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
            <option value="">Select class</option>
            {Array.from({ length: 10 }, (_, index) => (
              <option key={index + 1}>Semester {index + 1}</option>
            ))}
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="button" disabled={saving}>
            {saving ? 'Saving…' : <>Save and continue <ArrowRight /></>}
          </button>
          <button
            type="button"
            className="button button-outline"
            onClick={() => navigate(from || '/vote', { replace: true })}
          >
            <SkipForward style={{ width: 16 }} /> Skip for now
          </button>
        </div>
      </form>
    </section>
  );
}

